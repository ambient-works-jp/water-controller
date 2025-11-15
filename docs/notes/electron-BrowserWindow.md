# BrowserWindow の設定とセキュリティ

## 概要

このドキュメントでは、Electronの`BrowserWindow`における重要な設定、特に`nodeIntegration`とセキュリティ設定について説明します。

**関連ドキュメント**：

- [Electron 基礎ガイド for React 開発者](../documentations/electorn-basic.md)
- [BrowserWindow 公式ドキュメント](https://www.electronjs.org/ja/docs/latest/api/browser-window)
- [セキュリティガイド（公式）](https://www.electronjs.org/ja/docs/latest/tutorial/security)

---

## `nodeIntegration` とは

`nodeIntegration`は、**Renderer プロセスで Node.js API を直接使えるかどうか**を制御するオプションです。

### 公式ドキュメント

- [webPreferences.nodeIntegration](https://www.electronjs.org/ja/docs/latest/api/browser-window#winwebcontentsid)

### `nodeIntegration: false`（推奨、Electron 5以降のデフォルト）

Renderer プロセスで Node.js API が**直接使えません**：

```typescript
// src/renderer/src/App.tsx
import fs from 'fs'  // ❌ エラー！ Renderer では使えない

function App() {
  const data = fs.readFileSync('config.json', 'utf-8')  // ❌ 動かない
  return <div>{data}</div>
}
```

**エラー例**:

```txt
Uncaught ReferenceError: require is not defined
```

### `nodeIntegration: true`（非推奨、危険）

Renderer プロセスで Node.js API が**直接使えます**：

```typescript
// src/renderer/src/App.tsx
import fs from 'fs'  // ✅ 使える（が、危険）

function App() {
  const data = fs.readFileSync('config.json', 'utf-8')  // ✅ 動く（が、危険）
  return <div>{data}</div>
}
```

**⚠️ セキュリティリスク**：XSS攻撃で任意のOSコマンドが実行される可能性があります。

---

## `nodeIntegration` と IPC の違い

### IPC は `nodeIntegration: false` でも使えます

`nodeIntegration: false` でも、**IPC 通信は問題なく動作**します：

```typescript
// src/main/index.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,      // ← Renderer で Node.js 直接使用は禁止
    contextIsolation: true,      // ← コンテキスト分離
    preload: path.join(__dirname, '../preload/index.js')
  }
})

ipcMain.handle('ping', () => 'pong')  // ✅ 動く
```

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

// Preload スクリプトは Node.js API にアクセスできる
contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('ping')  // ✅ IPC は使える
})
```

```typescript
// src/renderer/src/App.tsx
const result = await window.api.ping()  // ✅ 動く（'pong'が返る）
console.log(result)  // 'pong'
```

### なぜ IPC が使えるのか

| 場所 | Node.js API | IPC | 理由 |
|------|-----------|-----|------|
| **Renderer プロセス** | ❌ 使えない | ✅ 使える | `window.api`（Preloadが公開）経由で間接的に使える |
| **Preload スクリプト** | ✅ 使える | ✅ 使える | 特権的な立場。Node.js APIにもアクセス可能 |
| **Main プロセス** | ✅ 使える | ✅ 使える | Node.js環境 |

**詳細**: `contextIsolation` がどのように動作するかについては、[contextIsolation（コンテキスト分離）](./electron-context-isolation.md) を参照してください。

**ポイント**：

- **Renderer プロセス自体**は Node.js API を直接使えない（`nodeIntegration: false`）
- しかし**Preload スクリプト**は Node.js API にアクセスできる
- Preload が `ipcRenderer` を使って Main プロセスと通信する
- `contextBridge` で安全な API だけを Renderer に公開する

---

## セキュリティのベストプラクティス

### 推奨設定

```typescript
// src/main/index.ts
import { app, BrowserWindow } from 'electron'
import path from 'path'

const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    // 1. Renderer で Node.js を無効化
    nodeIntegration: false,

    // 2. コンテキスト分離を有効化
    contextIsolation: true,

    // 3. Preload スクリプトで安全な API のみを公開
    preload: path.join(__dirname, '../preload/index.js'),

    // 4. サンドボックスを有効化（推奨）
    sandbox: true
  }
})
```

### 各設定の役割

#### 1. `nodeIntegration: false`

- **目的**: Renderer プロセスで Node.js API を直接使えないようにする
- **デフォルト**: Electron 5以降は `false`
- **推奨値**: `false`

#### 2. `contextIsolation: true`

- **目的**: Preload スクリプトと Renderer のコンテキストを分離する
- **デフォルト**: Electron 12以降は `true`
- **推奨値**: `true`
- **詳細**: [contextIsolation 公式ドキュメント](https://www.electronjs.org/ja/docs/latest/tutorial/context-isolation)

`contextIsolation: true` の場合、Preload と Renderer は異なる JavaScript コンテキストで実行されます：

```typescript
// contextIsolation: false の場合（非推奨）
// src/preload/index.ts
window.myAPI = {  // ❌ グローバル汚染
  doSomething: () => {}
}

// contextIsolation: true の場合（推奨）
// src/preload/index.ts
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('api', {  // ✅ 安全に公開
  doSomething: () => {}
})
```

#### 3. `preload`

- **目的**: Renderer が読み込まれる前に実行されるスクリプトを指定
- **役割**: Main プロセスと Renderer プロセスの橋渡し
- **詳細**: [Preload スクリプト公式ドキュメント](https://www.electronjs.org/ja/docs/latest/tutorial/tutorial-preload)

#### 4. `sandbox: true`（オプション、推奨）

- **目的**: Renderer プロセスをさらに厳格にサンドボックス化
- **デフォルト**: `false`（Electron 20以降は `true` になる予定）
- **推奨値**: `true`
- **注意**: `sandbox: true` の場合、Preload スクリプトでも Node.js API の一部が制限されます
- **詳細**: [サンドボックス公式ドキュメント](https://www.electronjs.org/ja/docs/latest/tutorial/sandbox)

---

## なぜ `nodeIntegration: true` は危険なのか

### XSS攻撃のリスク

もし`nodeIntegration: true`にすると、XSS攻撃で任意のコマンドが実行される可能性があります：

```typescript
// src/renderer/src/App.tsx（nodeIntegration: true の場合）
import { exec } from 'child_process'

// ユーザーが入力した値を実行（危険！）
function handleInput(userInput: string) {
  exec(userInput)  // ⚠️ XSS攻撃で任意のコマンドが実行される
}

// 例: userInput が "<script>require('child_process').exec('rm -rf /')</script>"
// だった場合、システムファイルが削除される可能性がある
```

### 公式のセキュリティガイドライン

Electronの公式セキュリティガイドでは、以下のように推奨されています：

> **チェックリスト: セキュリティの推奨事項**
>
> 1. 信頼できるコンテンツのみを読み込む
> 2. リモートコンテンツを読み込むすべてのレンダラーで `nodeIntegration` を無効にする
> 3. リモートコンテンツを読み込むすべてのレンダラーで `contextIsolation` を有効にする
> 4. `webSecurity` を無効にしない
> 5. `allowRunningInsecureContent` を有効にしない

出典：[Electronセキュリティガイド](https://www.electronjs.org/ja/docs/latest/tutorial/security)

---

## 実際の動作フロー

### `nodeIntegration: false` の場合（推奨）

```txt
1. Renderer プロセス（React）
   │ window.api.readConfig() を呼び出し
   │ ❌ fs.readFileSync() は直接使えない（nodeIntegration: false）
   ▼
2. Preload スクリプト
   │ ipcRenderer.invoke('read-config') を実行
   │ ✅ ipcRenderer は使える（Preload は特権的）
   ▼
3. Main プロセス
   │ ipcMain.handle('read-config', ...) を実行
   │ ✅ fs.readFileSync() でファイル読み込み（Node.js環境）
   ▼
4. Renderer プロセス
   │ 結果を受け取る
```

### `nodeIntegration: true` の場合（非推奨）

```txt
Renderer プロセス（React）
   │ fs.readFileSync() を直接呼び出し
   │ ✅ 動く（が、セキュリティリスク）
```

---

## 設定の組み合わせと推奨度

| `nodeIntegration` | `contextIsolation` | `sandbox` | 推奨度 | 説明 |
|------------------|-------------------|-----------|-------|------|
| `false` | `true` | `true` | 🔒🔒🔒 最も安全 | 本番環境での推奨設定 |
| `false` | `true` | `false` | 🔒🔒 安全 | 一般的な開発環境での設定 |
| `false` | `false` | - | ⚠️ やや危険 | 非推奨（古いコード向けの互換性） |
| `true` | - | - | ⚠️⚠️⚠️ 危険 | **絶対に避けるべき** |

---

## 今回のプロジェクトでの設定

`water-controller-app` では、以下の設定を使用しています：

```typescript
// src/main/index.ts
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  webPreferences: {
    nodeIntegration: false,      // ✅ Renderer で Node.js を無効化
    contextIsolation: true,      // ✅ コンテキスト分離
    preload: join(__dirname, '../preload/index.js')
  }
})
```

この設定により：

- ✅ Renderer プロセスで Node.js API は直接使えない
- ✅ IPC 通信は問題なく使える
- ✅ Preload スクリプトで安全な API のみを公開
- ✅ XSS攻撃のリスクを最小化

---

## まとめ

| 項目 | `nodeIntegration: false` | `nodeIntegration: true` |
|------|------------------------|------------------------|
| **Renderer で Node.js API** | ❌ 使えない | ✅ 使える（危険） |
| **IPC 通信** | ✅ 使える（Preload経由） | ✅ 使える |
| **セキュリティ** | 🔒 安全（推奨） | ⚠️ 危険（非推奨） |
| **ベストプラクティス** | ✅ 推奨 | ❌ 避けるべき |

**結論**：

- `nodeIntegration: false` でも、**IPC は問題なく使えます**
- `nodeIntegration: false` + `contextIsolation: true` + Preload + IPC の組み合わせが**セキュリティのベストプラクティス**
- デフォルトのping/pongが動いたのは、Preload スクリプトが `ipcRenderer` を使っているからです

---

## 参考資料

### 公式ドキュメント

- [BrowserWindow](https://www.electronjs.org/ja/docs/latest/api/browser-window)
- [webPreferences](https://www.electronjs.org/ja/docs/latest/api/browser-window#new-browserwindowoptions)
- [セキュリティガイド](https://www.electronjs.org/ja/docs/latest/tutorial/security)
- [コンテキスト分離](https://www.electronjs.org/ja/docs/latest/tutorial/context-isolation)
- [Preload スクリプト](https://www.electronjs.org/ja/docs/latest/tutorial/tutorial-preload)
- [サンドボックス](https://www.electronjs.org/ja/docs/latest/tutorial/sandbox)

### プロジェクト内の関連ドキュメント

- [Electron 基礎ガイド](../documentations/electorn-basic.md)
- [contextIsolation（コンテキスト分離）](./electron-context-isolation.md) - `contextIsolation` の詳細な説明

### プロジェクト内の関連ファイル

- `water-controller-app/src/main/index.ts` - Main プロセスの実装
- `water-controller-app/src/preload/index.ts` - Preload スクリプトの実装
- `water-controller-app/src/renderer/src/App.tsx` - React のルートコンポーネント
