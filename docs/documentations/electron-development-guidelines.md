# Electron 開発ガイドライン

## 概要

このドキュメントでは、Electron アプリケーション開発におけるセキュリティとベストプラクティスについて説明します。

**関連ドキュメント**：

- [Electron 基礎ガイド for React 開発者](./documentations/electorn-basic.md)
- [BrowserWindow の設定とセキュリティ](./notes/electron-BrowserWindow.md)
- [contextIsolation（コンテキスト分離）](./notes/electron-context-isolation.md)

---

## レンダラープロセスへの API の公開範囲は必要な機能のみに絞る

### 基本原則

プリロードスクリプトは、**レンダラープロセスへ Node.js でしか行えない処理を API として公開するためのもの**です。これによりデスクトップアプリケーションを OS の機能を含め利用できるように拡張することができます。

**重要**: 公開する API は**機能を絞るのが推奨**されています。

### 悪い例：汎用的な API を公開する

Node.js の API や IPC を使用する汎用的な API（例: `ipcHandler`）は**直接公開するべきではありません**。

```typescript
// ❌ 悪い例: 汎用的な API を公開（危険）
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // ❌ ipcRenderer を直接公開（超危険！）
  ipc: ipcRenderer,

  // ❌ 汎用的な invoke を公開（危険！）
  ipcHandler: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args),

  // ❌ 任意のチャネルにメッセージを送信できてしまう（危険！）
  send: (channel: string, data: any) =>
    ipcRenderer.send(channel, data)
})
```

**問題点**：

- レンダラープロセスから**任意の IPC チャネル**にメッセージを送信できてしまう
- 悪意のあるコードが**想定外の操作**を実行できてしまう
- セキュリティホールとなり、**強力な攻撃ベクトル**となる

### 良い例：用途を限定した API を公開する

**要件を満たすための最小限の API を公開**するのがセキュリティ的に良いとされています。

```typescript
// ✅ 良い例: 用途を限定した API を公開（安全）
import { contextBridge, ipcRenderer } from 'electron'

// 型定義
type RendererApi = {
  getVersions: () => {
    electron: string
    chrome: string
    node: string
  }
  ipc: {
    sendPing: () => Promise<PingResponse>
  }
}

// Custom APIs for renderer
const api: RendererApi = {
  // ✅ 機能が限定されている
  getVersions: () => ({
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }),

  // ✅ 特定のチャネルのみを公開
  ipc: {
    sendPing: async () => ipcRenderer.invoke('ping') as Promise<PingResponse>
  }
}

contextBridge.exposeInMainWorld('api', api)
```

**利点**：

- ✅ 公開する機能が**明確に定義**されている
- ✅ 悪意のあるコードが**想定外の操作を実行できない**
- ✅ 型安全で、**誤用を防げる**

---

## どのような API を expose すれば良いのか

### 基本的な考え方

`contextIsolation` を有効にした環境下では、**レンダラープロセスでは実行できない処理**をメインプロセスに実行させて、実行結果をレンダラープロセスに通知してもらう必要があります。

### レンダラープロセスでは実行できない処理の具体例

以下のような処理は、レンダラープロセスでは実行できないため、API として公開する必要があります：

#### 1. Node.js の API に依存している処理

```typescript
// ✅ 良い例: ファイル読み込み API
contextBridge.exposeInMainWorld('api', {
  readFile: (filePath: string) =>
    ipcRenderer.invoke('read-file', filePath),

  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('write-file', filePath, content)
})
```

```typescript
// src/main/index.ts（メインプロセス）
import fs from 'fs'
import path from 'path'
import { app, ipcMain } from 'electron'

ipcMain.handle('read-file', async (event, filePath: string) => {
  // ✅ パスの検証（セキュリティ対策）
  const basePath = app.getPath('home')
  const resolvedPath = path.resolve(basePath, filePath)

  if (!resolvedPath.startsWith(basePath)) {
    throw new Error('Invalid path')
  }

  // ✅ Node.js の fs モジュールを使用
  return fs.readFileSync(resolvedPath, 'utf-8')
})
```

#### 2. Node.js の API に依存しているライブラリを呼び出す処理

```typescript
// ✅ 良い例: データベース操作 API
contextBridge.exposeInMainWorld('api', {
  db: {
    getUser: (id: number) =>
      ipcRenderer.invoke('db:get-user', id),

    saveUser: (user: User) =>
      ipcRenderer.invoke('db:save-user', user)
  }
})
```

```typescript
// src/main/index.ts（メインプロセス）
import Database from 'better-sqlite3'

const db = new Database('app.db')

ipcMain.handle('db:get-user', async (event, id: number) => {
  // ✅ Node.js のライブラリ（better-sqlite3）を使用
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
})
```

#### 3. 認証情報などの秘匿情報を扱う処理

```typescript
// ✅ 良い例: 認証 API（秘匿情報はメインプロセスで管理）
contextBridge.exposeInMainWorld('api', {
  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke('auth:login', username, password),

    logout: () =>
      ipcRenderer.invoke('auth:logout'),

    // ✅ トークンはメインプロセスで管理、レンダラーには公開しない
    getCurrentUser: () =>
      ipcRenderer.invoke('auth:get-current-user')
  }
})
```

```typescript
// src/main/index.ts（メインプロセス）
let authToken: string | null = null  // ✅ トークンはメインプロセスのみで保持

ipcMain.handle('auth:login', async (event, username: string, password: string) => {
  // ✅ 認証処理（秘匿情報はメインプロセスで扱う）
  const response = await fetch('https://api.example.com/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })

  const { token, user } = await response.json()
  authToken = token  // ✅ トークンはメインプロセスで保持

  // ✅ レンダラーには必要な情報（ユーザー情報）のみを返す
  return { user }
})

ipcMain.handle('auth:get-current-user', async (event) => {
  if (!authToken) {
    throw new Error('Not authenticated')
  }

  // ✅ トークンを使って現在のユーザー情報を取得
  const response = await fetch('https://api.example.com/auth/me', {
    headers: { Authorization: `Bearer ${authToken}` }
  })

  return response.json()
})
```

---

## IPC セキュリティ

### 重要な注意点

公式ドキュメントより引用：

> 注意として、ここでは ipcRenderer モジュールを直接コンテキストブリッジで公開するのではなく、`ipcRenderer.invoke('ping')` の呼び出しをラップするヘルパー関数を用意しています。 **プリロードを介して ipcRenderer モジュール全体を直接公開しようという考えは取りやめてください**。 これによりレンダラーがメインプロセスへ任意の IPC メッセージを送信できるようになり、**悪意あるコードの強力な攻撃ベクトル**となります。

出典：[Electron 公式ドキュメント - プロセス間通信](https://www.electronjs.org/ja/docs/latest/tutorial/tutorial-preload#%E3%83%97%E3%83%AD%E3%82%BB%E3%82%B9%E9%96%93%E9%80%9A%E4%BF%A1)

### 悪い例：ipcRenderer を直接公開

```typescript
// ❌ 絶対にやってはいけない
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  ipc: ipcRenderer  // ❌ ipcRenderer モジュール全体を公開（超危険！）
})
```

**問題点**：

- レンダラーから**任意の IPC チャネル**にアクセスできてしまう
- `ipcRenderer.send()`, `ipcRenderer.invoke()` などが**すべて使えてしまう**
- 攻撃者が**想定外の操作**を実行できる

### 良い例：特定のチャネルのみをラップして公開

```typescript
// ✅ 推奨: 特定のチャネルのみをラップして公開
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // ✅ 'ping' チャネルのみを公開
  sendPing: () => ipcRenderer.invoke('ping'),

  // ✅ 'read-config' チャネルのみを公開
  readConfig: () => ipcRenderer.invoke('read-config'),

  // ✅ 'ws-message' イベントのみをリッスン
  onWsMessage: (callback: (message: WsMessage) => void) => {
    ipcRenderer.on('ws-message', (_event, message) => callback(message))
  }
})
```

**利点**：

- ✅ 公開するチャネルが**明確に制限**されている
- ✅ 型安全で、**誤用を防げる**
- ✅ 攻撃者が**想定外の IPC メッセージを送信できない**

---

## ベストプラクティスのまとめ

### 1. 最小権限の原則

**要件を満たすための最小限の API のみを公開**する。

```typescript
// ✅ 良い例
contextBridge.exposeInMainWorld('api', {
  readConfig: () => ipcRenderer.invoke('read-config'),
  saveConfig: (config: Config) => ipcRenderer.invoke('save-config', config)
})

// ❌ 悪い例
contextBridge.exposeInMainWorld('api', {
  ipc: ipcRenderer  // 何でもできてしまう
})
```

### 2. 特定のチャネルのみを公開

汎用的な `invoke` や `send` ではなく、**特定のチャネルに対する関数**を公開する。

```typescript
// ✅ 良い例: 特定のチャネルのみ
contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('ping'),
  readFile: (path: string) => ipcRenderer.invoke('read-file', path)
})

// ❌ 悪い例: 汎用的な API
contextBridge.exposeInMainWorld('api', {
  invoke: (channel: string, ...args: any[]) =>
    ipcRenderer.invoke(channel, ...args)
})
```

### 3. メインプロセスで検証

レンダラーから送信されたデータは**必ずメインプロセスで検証**する。

```typescript
// ✅ メインプロセスでの検証
ipcMain.handle('read-file', async (event, filePath: string) => {
  // ✅ パスの検証
  const basePath = app.getPath('home')
  const resolvedPath = path.resolve(basePath, filePath)

  if (!resolvedPath.startsWith(basePath)) {
    throw new Error('Invalid path')
  }

  return fs.readFileSync(resolvedPath, 'utf-8')
})
```

### 4. 型安全に

TypeScript で型を定義し、**型安全な API** を提供する。

```typescript
// ✅ 型定義
type RendererApi = {
  readConfig: () => Promise<Config>
  saveConfig: (config: Config) => Promise<void>
}

const api: RendererApi = {
  readConfig: () => ipcRenderer.invoke('read-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config)
}

contextBridge.exposeInMainWorld('api', api)
```

### 5. 秘匿情報はメインプロセスで管理

認証トークンなどの秘匿情報は**メインプロセスのみで保持**し、レンダラーには公開しない。

```typescript
// ✅ メインプロセス
let authToken: string | null = null  // レンダラーには公開しない

ipcMain.handle('auth:login', async (event, username, password) => {
  const { token, user } = await authenticateUser(username, password)
  authToken = token  // メインプロセスで保持
  return { user }  // ユーザー情報のみ返す
})
```

---

## water-controller-app での実装例

### プリロードスクリプト

```typescript
// water-controller-app/src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

// ✅ 型定義
export type API = {
  readConfig: () => Promise<Config>
  saveConfig: (config: Config) => Promise<void>
  onWsMessage: (callback: (message: WsMessage) => void) => void
}

// ✅ 最小限の API のみを公開
contextBridge.exposeInMainWorld('api', {
  readConfig: () => ipcRenderer.invoke('read-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  onWsMessage: (callback) => {
    ipcRenderer.on('ws-message', (_event, message) => callback(message))
  }
} as API)
```

### メインプロセス

```typescript
// water-controller-app/src/main/index.ts
import { app, ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'

// ✅ read-config チャネル（検証付き）
ipcMain.handle('read-config', async () => {
  const configPath = path.join(app.getPath('home'), '.water-controller-app', 'config.json')

  // ✅ ファイルの存在確認
  if (!fs.existsSync(configPath)) {
    throw new Error('Config file not found')
  }

  // ✅ ファイル読み込み
  const content = fs.readFileSync(configPath, 'utf-8')
  return JSON.parse(content)
})

// ✅ save-config チャネル（検証付き）
ipcMain.handle('save-config', async (event, config: Config) => {
  const configPath = path.join(app.getPath('home'), '.water-controller-app', 'config.json')

  // ✅ 設定の検証
  if (!config.ws_url || !Array.isArray(config.contents)) {
    throw new Error('Invalid config format')
  }

  // ✅ ファイル書き込み
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
})
```

---

## 参考資料

### 公式ドキュメント

- **[Electron セキュリティガイド](https://www.electronjs.org/ja/docs/latest/tutorial/security)**
  - セキュリティのベストプラクティス全般
- **[プリロードスクリプト - プロセス間通信](https://www.electronjs.org/ja/docs/latest/tutorial/tutorial-preload#%E3%83%97%E3%83%AD%E3%82%BB%E3%82%B9%E9%96%93%E9%80%9A%E4%BF%A1)**
  - IPC セキュリティの重要性
  - ipcRenderer モジュールを直接公開しない理由
- **[Context Isolation](https://www.electronjs.org/ja/docs/latest/tutorial/context-isolation)**
  - コンテキスト分離の仕組み
- **[contextBridge](https://www.electronjs.org/ja/docs/latest/api/context-bridge)**
  - contextBridge の使い方と制約

### 外部記事

- **[Electronのプリロードスクリプトで公開するAPIの設計について](https://zenn.dev/kontam/articles/c00770c22e8e17)**
  - プリロードスクリプトで公開する API の設計指針
  - 汎用的な API を公開すべきでない理由
  - 具体的なコード例

### プロジェクト内の関連ドキュメント

- [Electron 基礎ガイド for React 開発者](./documentations/electorn-basic.md)
- [BrowserWindow の設定とセキュリティ](./notes/electron-BrowserWindow.md)
- [contextIsolation（コンテキスト分離）](./notes/electron-context-isolation.md)
- [macOS のウィンドウライフサイクル](./notes/electron-macos-window-lifecycle.md)

### プロジェクト内の関連ファイル

- `water-controller-app/src/main/index.ts` - メインプロセスの実装
- `water-controller-app/src/preload/index.ts` - プリロードスクリプトの実装
- `water-controller-app/src/renderer/src/App.tsx` - レンダラープロセスでの API 使用例

---

## まとめ

### セキュリティの鉄則

1. ✅ **最小権限の原則**: 必要な機能のみを公開
2. ✅ **特定のチャネルのみ**: 汎用的な API は公開しない
3. ✅ **検証を徹底**: メインプロセスで必ず検証
4. ✅ **型安全に**: TypeScript で型を定義
5. ✅ **秘匿情報の隔離**: メインプロセスのみで管理

### 絶対にやってはいけないこと

- ❌ `ipcRenderer` モジュール全体を公開する
- ❌ 汎用的な `invoke` や `send` を公開する
- ❌ 秘匿情報（トークンなど）をレンダラーに渡す
- ❌ メインプロセスでの検証を省略する

**結論**：

プリロードスクリプトでは、**要件を満たすための最小限の API のみを公開**し、**汎用的な API は絶対に公開しない**ことで、セキュアな Electron アプリケーションを実現できます。
