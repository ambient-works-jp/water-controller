# Electron 基礎ガイド for React 開発者

## はじめに

このドキュメントは、**React/Web 開発の経験はあるが、Electron は初めて**という開発者向けに、Electron の基本的な概念と Web 開発との違いを整理したものです。

### 前提知識

- React の基本（コンポーネント、Hooks、状態管理）
- TypeScript の基本
- Node.js の基本的な理解

### このドキュメントの目的

- React と Electron の共通点・相違点を理解する
- Electron 特有のプロセス構造と IPC 通信を理解する
- よくある落とし穴を事前に把握する

---

## 共通点：React はそのまま使える

Electron の Renderer プロセスは基本的に **Chromium 上のブラウザ環境**です。そのため、以下の技術はそのまま使えます。

### 1. UI レイヤーは同じ技術

- **React, Hooks, コンポーネント**: まったく同じように使えます
- **状態管理**: Redux, Zustand, Recoil, Context API などすべて利用可能
- **スタイリング**: CSS Modules, Tailwind CSS, Emotion など

### 2. モジュール構成・ESM/TypeScript

- ES Modules（`import`/`export`）の文法も同じ
- TypeScript の型システムもそのまま
- Vite を介した開発サーバ・HMR（ホットリロード）も同様に動作

### 3. Web API の利用

以下の Web API はそのまま利用可能です：

- `fetch`, `XMLHttpRequest`
- `WebSocket`
- `Canvas`, `WebGL`, `OffscreenCanvas`
- `localStorage`, `sessionStorage`
- `requestAnimationFrame`
- DOM 操作

### 4. React エコシステム

- React Router
- React Hook Form
- SWR, React Query
- その他 npm パッケージ

**つまり、React の UI 開発は Web とまったく同じ感覚で行えます。**

---

## 根本的な違い：プロセス構造

### Web React vs Electron の実行環境

|          | Web React          | Electron                                     |
| :------- | :------------------ | :------------------------------------------- |
| 実行場所     | ブラウザの中（1プロセス）       | **Main（Node.js）＋Renderer（Chromium）** の2階建て構成 |
| Node API | 使えない                | Main/Preload 限定で使える                          |
| ファイルアクセス | ブラウザ sandbox に制限される | Node の `fs`, `path` などを介してローカルファイル操作可能       |
| 通信方法     | HTTP / WebSocket    | IPC（プロセス間通信）                                 |

### プロセス構造の図解

```txt
[Web React]
┌─────────────────┐
│   Browser       │
│  (React UI)     │
└─────────────────┘

[Electron]
┌─────────────────┐
│  Main Process   │ ← Node.js 環境
│  (index.ts)     │    - ファイルアクセス
│                 │    - OS ネイティブ機能
│                 │    - ウィンドウ管理
└────────┬────────┘
         │ IPC（プロセス間通信）
┌────────▼────────┐
│ Renderer Process│ ← Chromium 環境
│  (React UI)     │    - Web API
│                 │    - React
└─────────────────┘
         │
┌────────▼────────┐
│ Preload Script  │ ← セキュリティブリッジ
│  (index.ts)     │    - contextBridge
│                 │    - IPC の橋渡し
└─────────────────┘
```

### 各プロセスの役割

#### Main プロセス（Node.js 環境）

- **実行場所**: Node.js
- **役割**:
  - アプリのライフサイクル管理（起動・終了）
  - ウィンドウの作成・管理
  - ファイルシステムへのアクセス（`fs`, `path`）
  - OS ネイティブ機能（通知、トレイアイコン、グローバルショートカットなど）
  - メニューバーの制御
- **ファイル**: `src/main/index.ts`

#### Renderer プロセス（Chromium 環境）

- **実行場所**: Chromium（ブラウザ）
- **役割**:
  - React UI の描画
  - ユーザーインタラクション処理
  - Web API の利用
- **ファイル**: `src/renderer/src/App.tsx`, `src/renderer/src/main.tsx`
- **注意**: **Node.js API は直接使えません**（セキュリティ上の理由）

#### Preload スクリプト（セキュリティブリッジ）

- **実行場所**: Renderer プロセスの前（特権的な立場）
- **役割**:
  - Main プロセスと Renderer プロセスの橋渡し
  - 安全な API のみを Renderer に公開（`contextBridge`）
  - IPC 通信の設定
- **ファイル**: `src/preload/index.ts`

### 各プロセスの実行順序、ライフサイクル

Electron アプリケーションは、Main プロセス → Preload スクリプト → Renderer プロセスの順で起動し、それぞれが固有のライフサイクルを持ちます。

#### 1. アプリ起動時の実行順序

```txt
1. Main プロセス起動（Node.js 環境）
   │
   ├─→ src/main/index.ts が実行される
   │
   ├─→ app.on('ready') イベント発火
   │   └─→ Electron の初期化完了
   │
   ├─→ BrowserWindow インスタンス作成
   │   └─→ new BrowserWindow({ ... })
   │
   ├─→ Preload スクリプト実行
   │   ├─→ src/preload/index.ts が実行される
   │   ├─→ Renderer プロセスのウェブ内容読み込み「前」に実行
   │   └─→ contextBridge で API を window に公開
   │
   └─→ Renderer プロセス起動（Chromium 環境）
       ├─→ index.html を読み込み
       ├─→ src/renderer/src/main.tsx が実行される
       └─→ React アプリが起動
```

**ポイント:**

- **Main プロセスが最初に起動**し、アプリ全体を管理する
- **`app.on('ready')`** イベントで Electron の初期化が完了
  - このイベント後に BrowserWindow を作成するのが推奨
  - `app.whenReady()` で Promise として待つことも可能
- **Preload スクリプトは Renderer の前に実行**される
  - Renderer が読み込まれる前に `window.api` を準備
- **Renderer プロセスは BrowserWindow ごとに独立して起動**する
  - 複数のウィンドウがあれば、複数の Renderer プロセスが存在

#### 2. 各プロセスのライフサイクル

**Main プロセス:**

- アプリ起動から終了まで**1つだけ存在**し続ける
- `app` モジュールを通じてアプリ全体のライフサイクルを制御
- 主要なライフサイクルイベント:
  - `ready`: Electron の初期化完了（1回のみ）
  - `window-all-closed`: すべてのウィンドウが閉じられた
  - `before-quit`: アプリ終了処理開始前
  - `will-quit`: すべてのウィンドウが閉じられた後
  - `quit`: アプリ終了時

**Renderer プロセス:**

- **BrowserWindow のライフサイクルに連動**
- ウィンドウが作成されると起動、破棄されると終了
- 複数のウィンドウがあれば、複数の Renderer プロセスが並行して動作
- ウィンドウを閉じても、Main プロセスは動き続ける

**Preload スクリプト:**

- **Renderer プロセス起動時に1回だけ実行**される
- Renderer のウェブ内容が読み込まれる前に実行
- Renderer プロセスと同じ `window` オブジェクトにアクセス可能
- Renderer が終了すると同時に破棄される

#### 3. アプリ終了時の処理順序

```txt
[ユーザーが終了操作（Cmd + Q など）]
   │
   ├─→ before-quit イベント発火
   │   └─→ event.preventDefault() で終了をキャンセル可能
   │
   ├─→ ウィンドウが順次閉じられる
   │   └─→ 各 Renderer プロセスが終了
   │
   ├─→ window-all-closed イベント発火
   │   └─→ macOS 以外は app.quit() を呼ぶのが一般的
   │
   ├─→ will-quit イベント発火
   │   └─→ すべてのウィンドウが閉じられた後
   │
   ├─→ quit イベント発火
   │
   └─→ Main プロセス終了
       └─→ アプリケーション完全終了
```

**ポイント:**

- **macOS では `window-all-closed` でアプリは終了しない**
  - ウィンドウを閉じてもアプリがバックグラウンドで動き続ける
  - 明示的に `app.quit()` を呼ぶか、Dock から終了する必要がある
- **Windows/Linux では `window-all-closed` で自動終了**するのが一般的
- **`before-quit` で終了をキャンセル**できる
  - 例: 保存していないデータがある場合にダイアログを表示

#### 4. ライフサイクルの典型的な実装例

```typescript
// src/main/index.ts
import { app, BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

// 1. 起動時
app.on('ready', () => {
  // または app.whenReady().then(() => { ... })

  // BrowserWindow 作成（Preload → Renderer が起動）
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js')
    }
  })

  mainWindow.loadFile('index.html')
})

// 2. 終了時
app.on('window-all-closed', () => {
  // macOS 以外は終了
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', (event) => {
  // 終了前の処理（保存確認など）
  // event.preventDefault() で終了をキャンセル可能
})

// 3. macOS でアプリがアクティブになったとき
app.on('activate', () => {
  // ウィンドウがない場合は再作成
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
```

---

## Electronで作成したアプリケーションバンドルの起動 on macOS

Electronアプリをビルドすると、macOSでは`.app`形式のアプリケーションバンドルが生成されます。このセクションでは、ビルド後のバンドル構造と、どのようにNode.jsが`src/main/index.ts`（ビルド後は`out/main/index.js`）を起動するのかを説明します。

### macOSアプリケーションバンドルの構造

electron-builderでビルドすると、以下のような構造のアプリケーションバンドルが生成されます：

```txt
WaterController.app/
└── Contents/
    ├── Info.plist                    # アプリケーションのメタデータ
    ├── MacOS/
    │   └── WaterController           # メイン実行バイナリ（Mach-O 64-bit executable）
    ├── Frameworks/
    │   └── Electron Framework.framework/  # Electronの本体（Node.js + Chromium）
    └── Resources/
        ├── app.asar                  # アプリケーションコードのアーカイブ
        │   ├── package.json          # "main": "./out/main/index.js"
        │   ├── out/
        │   │   ├── main/
        │   │   │   └── index.js      # メインプロセスのエントリポイント
        │   │   ├── preload/
        │   │   │   └── index.js
        │   │   └── renderer/
        │   │       └── index.html
        │   └── node_modules/
        └── icon.icns                 # アプリケーションアイコン
```

### アプリケーションバンドルの起動フロー

アプリケーションをダブルクリックしてから、`src/main/index.ts`（ビルド後は`out/main/index.js`）が実行されるまでの流れ：

```txt
1. ユーザーがWaterController.appをダブルクリック
   │
   ├─→ macOSがInfo.plistを読み込む
   │   └─→ CFBundleExecutable: "WaterController" を確認
   │
   ├─→ Contents/MacOS/WaterControllerバイナリを実行
   │   └─→ このバイナリはElectronのラッパー
   │
   ├─→ Electron Framework.frameworkを読み込み
   │   ├─→ Node.jsランタイムを初期化
   │   └─→ Chromiumエンジンを初期化
   │
   ├─→ Contents/Resources/app.asarを読み込み
   │   ├─→ app.asar内のpackage.jsonを解析
   │   └─→ "main": "./out/main/index.js" を見つける
   │
   └─→ Node.jsでout/main/index.jsを実行
       └─→ これが開発時のsrc/main/index.tsをビルドしたもの
```

### 各コンポーネントの役割

#### 1. Info.plist

アプリケーションのメタデータを定義します。実行すべきバイナリの名前を指定：

```xml
<key>CFBundleExecutable</key>
<string>WaterController</string>
```

これが`Contents/MacOS/WaterController`バイナリを指定しています。

#### 2. Contents/MacOS/WaterController

- **ファイルタイプ**: Mach-O 64-bit executable（ネイティブバイナリ）
- **役割**: Electronのラッパー。Electronフレームワークを読み込み、アプリケーションを起動する
- **サイズ**: 約34KB（小さい。実体はFrameworks/に入っている）

#### 3. Contents/Frameworks/Electron Framework.framework

- **役割**: Electronの本体。Node.jsとChromiumのランタイムが含まれている
- **内容**:
  - Node.jsのバイナリ
  - Chromiumエンジン
  - V8 JavaScriptエンジン
  - その他のネイティブモジュール

#### 4. Contents/Resources/app.asar

- **ファイル形式**: asar（Archive形式、zipに似ている）
- **役割**: アプリケーションコードを1つのファイルにアーカイブ
- **内容**:
  - ビルド済みのTypeScriptコード（`out/main/index.js`, `out/preload/index.js`, `out/renderer/`）
  - `package.json`（エントリポイントを定義）
  - `node_modules/`（依存パッケージ）

**app.asar内のpackage.json:**

```json
{
  "name": "water-controller-app",
  "version": "0.1.0",
  "main": "./out/main/index.js",  // ← Node.jsが実行するエントリポイント
  "dependencies": {
    "@electron-toolkit/preload": "^3.0.2",
    "@electron-toolkit/utils": "^4.0.0",
    "electron-updater": "^6.3.9"
  }
}
```

Electronは`app.asar`内の`package.json`の`"main"`フィールドを見て、`./out/main/index.js`をNode.jsで実行します。

### 開発時とビルド後の対応関係

| 開発時のファイル | ビルド後（app.asar内） | 役割 |
|--------|----------------------|------|
| `src/main/index.ts` | `out/main/index.js` | メインプロセス（Node.js環境） |
| `src/preload/index.ts` | `out/preload/index.js` | ブリッジスクリプト |
| `src/renderer/` | `out/renderer/` | UI（React、Chromium環境） |
| `package.json` | `package.json` | エントリポイント定義 |

### app.asarの中身を確認する方法

実際にビルドしたアプリケーションの中身を確認するには、以下のコマンドを使います：

```bash
# app.asarの中身をリスト表示
npx asar list dist/mac-arm64/WaterController.app/Contents/Resources/app.asar

# app.asarを展開（/tmp/app-extractedに展開される）
npx asar extract dist/mac-arm64/WaterController.app/Contents/Resources/app.asar /tmp/app-extracted

# メインプロセスのコードを確認
cat /tmp/app-extracted/out/main/index.js

# package.jsonを確認
cat /tmp/app-extracted/package.json
```

### まとめ：起動の流れ

1. **macOSがバイナリを実行**: `Contents/MacOS/WaterController`
2. **Electronフレームワークを読み込み**: Node.jsとChromiumを初期化
3. **app.asarを読み込み**: アプリケーションコードのアーカイブ
4. **package.jsonを解析**: `"main": "./out/main/index.js"`を見つける
5. **Node.jsで実行**: `out/main/index.js`を実行（開発時の`src/main/index.ts`をビルドしたもの）
6. **アプリ起動**: Main プロセス → Preload → Renderer の順に起動

**この仕組みにより、開発時に書いた`src/main/index.ts`が、ビルド後のアプリケーションでも同じように動作します。**

### なぜElectronは`devDependencies`なのか

Electronアプリの`package.json`を見ると、本番環境で使うはずの`electron`が`devDependencies`に入っていて、直感に反すると感じるかもしれません：

```json
{
  "dependencies": {
    "@electron-toolkit/utils": "^4.0.0"  // 本番でも使う
  },
  "devDependencies": {
    "electron": "^38.1.2",        // 本番で使うのに dev!?
    "electron-builder": "^25.1.8" // ビルドツール
  }
}
```

#### 理由：Electronはバイナリとして組み込まれるから

実際には**JavaScriptで提供されるElectron APIは、バイナリとして実装され提供されます**。Electronは、パッケージング時にこれらのバイナリをアプリケーションに組み込むため、production用の依存性としてElectronを含める必要がないのです。

#### 開発時とビルド後の違い

**開発時**：npmパッケージとしての`electron`が必要

```bash
pnpm install  # electron パッケージをインストール
pnpm dev      # electron コマンドでアプリを起動
```

この時点では、`node_modules/electron/`にElectronバイナリが格納されています：

```txt
node_modules/electron/
├── dist/
│   └── Electron.app/        # macOS用Electronバイナリ
│       └── Contents/
│           └── Frameworks/
│               └── Electron Framework.framework
└── cli.js                   # electronコマンド
```

**ビルド時**：`electron-builder`がElectronのバイナリをアプリに組み込む

```bash
pnpm build:mac
# ↓ electron-builder が Electron バイナリを抽出してコピー
```

**ビルド後**：ユーザーのマシンには`node_modules/electron`は不要

```txt
WaterController.app/
├── Contents/
│   ├── MacOS/
│   │   └── WaterController          # ラッパーバイナリ
│   ├── Frameworks/
│   │   └── Electron Framework.framework  # ← ここにElectronバイナリが組み込まれている
│   └── Resources/
│       └── app.asar                 # あなたのコード
│           ├── package.json
│           ├── out/main/index.js
│           └── node_modules/        # electron パッケージは含まれない！
```

**ポイント**：

- `electron-builder`がビルド時に`node_modules/electron`から**バイナリだけを抽出**して、`Frameworks/`にコピーする
- ビルド後のアプリには、npmパッケージとしての`electron`は含まれない
- だから`dependencies`に入れる必要がない

#### 他のパッケージとの比較

| パッケージ | 配置 | 理由 |
|----------|------|------|
| `electron` | `devDependencies` | バイナリなので、ビルド時に`Frameworks/`に組み込まれる。npmパッケージとしては本番不要 |
| `electron-builder` | `devDependencies` | ビルドツールなので開発時のみ必要 |
| `@electron-toolkit/utils` | `dependencies` | JavaScriptコードなので、`app.asar`に含める必要がある |
| `react` | `devDependencies` | Viteでバンドルされるので、ビルド後は不要 |

**まとめ**：Electron APIを実行するのは**Electronのバイナリ**であって、**npmパッケージ**ではありません。そのため、npmパッケージとしての`electron`は開発時のみ必要で、`devDependencies`が正しい配置です。

---

## セキュリティモデルの違い

### Web: ブラウザが自動で保護

- すべてのコードはブラウザの sandbox で実行される
- ファイルシステムへの直接アクセスは不可
- セキュリティはブラウザが担保

### Electron: 開発者が明示的に設定

Electron はローカルファイルにアクセスできる分、**開発者がセキュリティ設定を明示的に行う必要があります**。

#### 必須設定

```typescript
// src/main/index.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,      // Renderer で Node.js を無効化
    contextIsolation: true,      // コンテキスト分離を有効化
    preload: path.join(__dirname, '../preload/index.js')
  }
})
```

- **`nodeIntegration: false`**: Renderer プロセスで Node.js API を直接使えないようにする
- **`contextIsolation: true`**: Renderer と Preload のコンテキストを分離
- **`preload`**: 安全な API のみを公開する Preload スクリプトを指定

**詳細**:

- これらの設定の詳細な説明とセキュリティのベストプラクティスについては、[BrowserWindow の設定とセキュリティ](../notes/electron-BrowserWindow.md) を参照してください
- `contextIsolation` について詳しく知りたい場合は、[contextIsolation（コンテキスト分離）](../notes/electron-context-isolation.md) を参照してください

#### Preload スクリプトの役割

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

// Renderer に公開する API を定義
contextBridge.exposeInMainWorld('api', {
  readConfig: () => ipcRenderer.invoke('read-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config)
})
```

これにより、Renderer では以下のように安全に呼び出せます：

```typescript
// src/renderer/src/App.tsx
const config = await window.api.readConfig()
```

---

## IPC 通信：プロセス間の橋渡し

### Web の HTTP/REST との違い

- **Web**: HTTP リクエスト → サーバ → レスポンス
- **Electron**: IPC メッセージ → Main プロセス → レスポンス

**HTTP サーバを立てずに、アプリ内部のプロセス間で直接メッセージをやり取りします。**

### IPC 通信フロー図

```txt
[React Component]
    │ window.api.readConfig()
    ▼
[Preload Script]
    │ ipcRenderer.invoke('read-config')
    ▼
[Main Process]
    │ ipcMain.handle('read-config', async () => { ... })
    │ fs.readFileSync(...)
    ▼
[React Component]
    │ config データ受信
```

### 具体例：ファイル読み込み

#### 1. Preload で API を公開

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  readConfig: () => ipcRenderer.invoke('read-config')
})
```

#### 2. Main でハンドラーを登録

```typescript
// src/main/index.ts
import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'

ipcMain.handle('read-config', async () => {
  const configPath = path.join(app.getPath('home'), '.water-controller-app', 'config.json')

  try {
    const data = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // デフォルト設定を返す
    return { ws_url: 'ws://127.0.0.1:8080/ws', contents: [], debug_mode: false }
  }
})
```

#### 3. React コンポーネントから呼び出し

```typescript
// src/renderer/src/App.tsx
import { useEffect, useState } from 'react'

function App() {
  const [config, setConfig] = useState(null)

  useEffect(() => {
    window.api.readConfig().then(setConfig)
  }, [])

  return <div>{config?.ws_url}</div>
}
```

### 今回のプロジェクトでの適用例

**設定ファイル（`config.json`）の読み込み**

1. ユーザーが「設定を再読み込み」ボタンをクリック
2. React コンポーネントから `window.api.readConfig()` を呼び出し
3. Preload が `ipcRenderer.invoke('read-config')` を実行
4. Main プロセスが `fs.readFileSync()` でファイルを読み込み
5. JSON データを Renderer に返す
6. React の状態を更新し、UI に反映

---

## ファイルアクセスの違い

### Web: サーバからのダウンロードのみ

- ブラウザの sandbox により、ローカルファイルへの直接アクセスは制限
- ファイルを読むには `<input type="file">` でユーザーに選択してもらう
- ファイルを保存するには `<a download>` でダウンロード

### Electron: Node.js の fs モジュールで自由にアクセス

- `fs.readFileSync()`, `fs.writeFileSync()` でファイルの読み書き
- `app.getPath('home')` で OS のホームディレクトリを取得
- ユーザーの介入なしに自動でファイルを読み書き可能

#### 設定ファイルの読み書き例

```typescript
// src/main/index.ts
import { app } from 'electron'
import fs from 'fs'
import path from 'path'

// 設定ディレクトリのパス
const configDir = path.join(app.getPath('home'), '.water-controller-app')
const configPath = path.join(configDir, 'config.json')

// 初回起動時: ディレクトリとデフォルト設定を作成
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true })
}

if (!fs.existsSync(configPath)) {
  const defaultConfig = {
    ws_url: 'ws://127.0.0.1:8080/ws',
    contents: [],
    debug_mode: false
  }
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2))
}

// 設定ファイルを読み込み
ipcMain.handle('read-config', async () => {
  const data = fs.readFileSync(configPath, 'utf-8')
  return JSON.parse(data)
})
```

---

## Electron-vite プロジェクトのファイル構造

```txt
water-controller-app/
├── src/
│   ├── main/              # Main プロセス（Node.js）
│   │   └── index.ts       # アプリのエントリポイント、ウィンドウ管理、IPC ハンドラー
│   ├── preload/           # Preload スクリプト
│   │   └── index.ts       # IPC のブリッジ、contextBridge
│   └── renderer/          # Renderer プロセス（React）
│       ├── index.html     # HTML エントリポイント
│       └── src/
│           ├── App.tsx    # React のルートコンポーネント
│           ├── main.tsx   # React のエントリポイント
│           ├── components/
│           ├── contents/  # p5.js/three.js コンテンツ
│           └── assets/    # CSS、画像
├── electron.vite.config.ts  # Vite の設定
├── package.json
└── dist/                  # ビルド成果物
```

### 各ファイルの責務

| ファイル                        | 実行環境      | 役割                               |
| :-------------------------- | :-------- | :------------------------------- |
| `src/main/index.ts`         | Node.js   | ウィンドウ管理、IPC ハンドラー、ファイルアクセス      |
| `src/preload/index.ts`      | 特権環境      | contextBridge で安全な API を公開      |
| `src/renderer/src/main.tsx` | Chromium  | React のエントリポイント                  |
| `src/renderer/src/App.tsx`  | Chromium  | React のルートコンポーネント                |
| `electron.vite.config.ts`   | ビルド時      | Vite の設定（Main, Preload, Renderer） |

### どこで何が実行されるか

```txt
┌─────────────────────────────────┐
│  Main Process (Node.js)         │
│  - src/main/index.ts            │
│  - ウィンドウ管理                     │
│  - ファイルアクセス                    │
│  - IPC ハンドラー                   │
└──────────────┬──────────────────┘
               │
               │ IPC
               │
┌──────────────▼──────────────────┐
│  Preload Script                 │
│  - src/preload/index.ts         │
│  - contextBridge               │
└──────────────┬──────────────────┘
               │
               │ window.api
               │
┌──────────────▼──────────────────┐
│  Renderer Process (Chromium)    │
│  - src/renderer/src/main.tsx    │
│  - src/renderer/src/App.tsx     │
│  - React コンポーネント                │
│  - p5.js/three.js コンテンツ          │
└─────────────────────────────────┘
```

---

## 開発時の違い

### デバッグ方法

#### Renderer プロセス（React UI）

- **Chrome DevTools** が使えます（通常の React デバッグと同じ）
- `Cmd + Option + I` で DevTools を開く
- `console.log`, `debugger` も使える
- React DevTools も利用可能

#### Main プロセス（Node.js）

- **VS Code デバッガー** または `console.log`
- Main プロセスのログはターミナルに出力される
- `electron.vite.config.ts` で sourcemap を有効化すれば、ブレークポイントも使える

```json
// .vscode/launch.json（例）
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "args": ["."]
    }
  ]
}
```

### ホットリロード（HMR）の挙動

- **Renderer プロセス**: Vite の HMR が効く（ファイル保存すると即座に反映）
- **Main プロセス**: ファイル変更時にアプリ全体が再起動される
- **Preload スクリプト**: ファイル変更時にアプリ全体が再起動される

### アプリの再起動が必要なケース

以下を変更した場合は、アプリを再起動する必要があります：

- Main プロセスのコード（`src/main/index.ts`）
- Preload スクリプト（`src/preload/index.ts`）
- IPC ハンドラーの追加・変更
- ウィンドウの設定変更

Renderer のコードのみの変更なら HMR で即座に反映されます。

---

## よくある落とし穴

### 1. Renderer で Node.js API を直接使おうとする

**❌ 間違い:**

```typescript
// src/renderer/src/App.tsx
import fs from 'fs'  // エラー！Renderer では使えない

function App() {
  const data = fs.readFileSync('config.json', 'utf-8')  // 動かない
}
```

**✅ 正解:**

```typescript
// src/preload/index.ts
contextBridge.exposeInMainWorld('api', {
  readFile: (path) => ipcRenderer.invoke('read-file', path)
})

// src/main/index.ts
ipcMain.handle('read-file', async (event, path) => {
  return fs.readFileSync(path, 'utf-8')
})

// src/renderer/src/App.tsx
const data = await window.api.readFile('config.json')
```

### 2. Main プロセスで React を import しようとする

**❌ 間違い:**

```typescript
// src/main/index.ts
import React from 'react'  // エラー！Main は Node.js 環境

function createWindow() {
  const element = <div>Hello</div>  // JSX は使えない
}
```

Main プロセスは Node.js 環境なので、React や JSX は使えません。UI は Renderer プロセスで実装します。

### 3. IPC の非同期処理を理解していない

**❌ 間違い:**

```typescript
// src/renderer/src/App.tsx
const config = window.api.readConfig()  // Promise を待たない
console.log(config)  // undefined または Promise オブジェクト
```

**✅ 正解:**

```typescript
// src/renderer/src/App.tsx
const config = await window.api.readConfig()
// または
window.api.readConfig().then(config => {
  console.log(config)
})
```

`ipcRenderer.invoke` は **Promise を返す**ため、必ず `await` または `.then()` で待つ必要があります。

### 4. パスの扱いを間違える

**❌ 間違い:**

```typescript
// src/main/index.ts
const configPath = './config.json'  // 相対パスは危険
```

開発時と本番ビルド後でカレントディレクトリが変わるため、相対パスは使わない方が安全です。

**✅ 正解:**

```typescript
// src/main/index.ts
import { app } from 'electron'
import path from 'path'

const configPath = path.join(app.getPath('home'), '.water-controller-app', 'config.json')
```

`app.getPath()` を使って、OS の標準的なパスを取得します。

### 5. ウィンドウを閉じてもアプリが終了しない（macOS）

macOS では、すべてのウィンドウを閉じてもアプリがバックグラウンドで動き続けます。

**✅ 対処:**

```typescript
// src/main/index.ts
import { app } from 'electron'

app.on('window-all-closed', () => {
  // macOS 以外、またはユーザーが明示的に終了した場合
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

---

## ビルド・配布の違い

### Web: サーバにデプロイ

- `npm run build` で静的ファイルを生成
- S3, Netlify, Vercel などにデプロイ
- ユーザーはブラウザでアクセス

### Electron: OS 別のインストーラー作成

- **electron-builder** を使って OS 別のインストーラーを作成
- macOS: `.dmg`, `.app`
- Windows: `.exe`, `.msi`
- Linux: `.AppImage`, `.deb`, `.rpm`

#### 今回のプロジェクトでのビルドコマンド

```bash
# macOS 向けビルド（署名なし）
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm build:mac

# ビルド成果物
# dist/mac/water-controller-app.app
```

### 署名・公証の必要性

- **macOS**: コード署名と公証（notarization）が必要
  - 署名なしだと「開発元が未確認」の警告が出る
- **Windows**: コード署名が推奨
  - 署名なしだと SmartScreen 警告が出る

開発・展示用途なら署名をスキップできますが、一般配布する場合は署名が必須です。

---

## 今回のプロジェクトでの適用

### WebSocket クライアント → Renderer で実装（Web と同じ）

```typescript
// src/renderer/src/hooks/useWebSocket.ts
import { useEffect, useState } from 'react'

export function useWebSocket(url: string) {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    const socket = new WebSocket(url)

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setMessage(data)
    }

    setWs(socket)

    return () => socket.close()
  }, [url])

  return { ws, message }
}
```

**Web API の `WebSocket` がそのまま使える**ため、Renderer で実装します。IPC は不要です。

### 設定ファイル読み込み → Main で fs 使用、IPC で Renderer に送信

```typescript
// src/main/index.ts
ipcMain.handle('read-config', async () => {
  const configPath = path.join(app.getPath('home'), '.water-controller-app', 'config.json')
  const data = fs.readFileSync(configPath, 'utf-8')
  return JSON.parse(data)
})

// src/renderer/src/components/Settings.tsx
const handleReload = async () => {
  const config = await window.api.readConfig()
  setConfig(config)
}
```

**ファイルアクセスは Main プロセスで行い**、IPC で Renderer に送信します。

### p5.js/three.js → Renderer で実装（Web と同じ）

```typescript
// src/renderer/src/contents/ripple-wave.tsx
import { useEffect, useRef } from 'react'
import p5 from 'p5'

export function RippleWave() {
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sketch = (p: p5) => {
      p.setup = () => {
        p.createCanvas(800, 600)
      }

      p.draw = () => {
        p.background(0)
        // 波紋の描画
      }
    }

    const p5Instance = new p5(sketch, canvasRef.current!)
    return () => p5Instance.remove()
  }, [])

  return <div ref={canvasRef} />
}
```

**Canvas API がそのまま使える**ため、Web の p5.js コードと同じように書けます。

### ショートカット → Main で globalShortcut 使用

```typescript
// src/main/index.ts
import { app, globalShortcut, BrowserWindow } from 'electron'

app.on('ready', () => {
  // Cmd + M で設定画面を開く
  globalShortcut.register('CommandOrControl+M', () => {
    mainWindow.webContents.send('open-settings')
  })

  // Cmd + D でデバッグモードを切り替え
  globalShortcut.register('CommandOrControl+D', () => {
    mainWindow.webContents.send('toggle-debug-mode')
  })
})
```

**グローバルショートカットは OS ネイティブ機能**のため、Main プロセスで実装します。

---

## 参考資料

### 公式ドキュメント

- [Electron 公式ドキュメント](https://www.electronjs.org/docs/latest/)
- [Electron-vite 公式ドキュメント](https://electron-vite.org/)
- [Electron IPC ガイド](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Electron セキュリティガイド](https://www.electronjs.org/docs/latest/tutorial/security)

### プロジェクト内の関連ドキュメント

- [BrowserWindow の設定とセキュリティ](../notes/electron-BrowserWindow.md) - `nodeIntegration`とセキュリティのベストプラクティス
- [contextIsolation（コンテキスト分離）](../notes/electron-context-isolation.md) - `contextIsolation`の詳細な説明

### プロジェクト内の関連ファイル

- `water-controller-app/src/main/index.ts` - Main プロセスの実装
- `water-controller-app/src/preload/index.ts` - Preload スクリプトの実装
- `water-controller-app/src/renderer/src/App.tsx` - React のルートコンポーネント
- `water-controller-app/electron.vite.config.ts` - Vite の設定

### その他

- [Electron Builder 公式ドキュメント](https://www.electron.build/)
- [Awesome Electron](https://github.com/sindresorhus/awesome-electron) - Electron のベストプラクティスとリソース集

---

## まとめ

### React と Electron の違い

| 観点       | Web React        | Electron React     |
| -------- | ---------------- | ------------------ |
| 実行環境     | ブラウザのみ           | Node.js + Chromium |
| セキュリティ   | ブラウザ依存           | 開発者が責任を持って設定       |
| 通信方法     | HTTP / WebSocket | IPC（プロセス間通信）       |
| ファイルアクセス | 制限あり             | Node.js 標準APIで自由   |
| React 自体 | ほぼ同じ             | まったく同じ             |

### Electron で新しく学ぶこと

1. **プロセス構造**: Main, Renderer, Preload の役割分担
2. **IPC 通信**: プロセス間でのメッセージのやり取り
3. **セキュリティ設定**: `nodeIntegration`, `contextIsolation`, `contextBridge`
4. **ファイルアクセス**: `fs` モジュールと `app.getPath()`
5. **デバッグ**: Main と Renderer で異なる方法

### 開発の流れ

1. **UI は React で実装**（Renderer プロセス）
   - Web 開発と同じ感覚で書ける
2. **OS 機能・ファイルアクセスは Main プロセスで実装**
   - Node.js の標準 API を使う
3. **IPC で橋渡し**
   - Preload で安全な API を公開
   - Renderer から呼び出し

**React の知識がそのまま活かせる**ため、Electron 特有の部分（IPC、プロセス構造）を理解すれば、スムーズに開発できます！
