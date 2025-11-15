# macOS のウィンドウライフサイクルとアプリケーション終了

## 概要

このドキュメントでは、macOS でウィンドウを閉じてもアプリケーションが終了しない理由と、Electron アプリでの実装方法について説明します。

**関連ドキュメント**：

- [Electron 基礎ガイド for React 開発者](../documentations/electorn-basic.md)
- [BrowserWindow の設定とセキュリティ](./electron-BrowserWindow.md)

---

## macOS の「ウィンドウを閉じる」≠「アプリを終了する」

### Apple の Human Interface Guidelines (HIG)

macOS では、**ウィンドウを閉じることとアプリを終了することは別の操作**として設計されています。

Apple の公式ガイドラインより：

> **Quit and Close Are Different**
>
> People don't quit iOS and iPadOS apps. In macOS, people frequently have multiple windows and apps open at once — they might want to hide, minimize, or close one or more of these windows, but they don't necessarily want to quit the app.

出典：[Apple Human Interface Guidelines - The Menu Bar](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar)

### macOS でのアプリ終了の基本動作

| 操作 | 動作 | ショートカット |
|------|------|--------------|
| **ウィンドウを閉じる** | ウィンドウだけが閉じる。アプリは**終了しない** | `Cmd + W` |
| **アプリを終了する** | すべてのウィンドウが閉じ、アプリが**終了する** | `Cmd + Q` |

### なぜこの設計なのか

#### 1. パフォーマンスの向上

アプリケーションがメモリに残ることで、再度開いたときに高速に起動できます。

```txt
従来の設計（Windows/Linux）:
  ウィンドウを閉じる → プロセス終了 → 再度開く → 起動処理 → ウィンドウ表示
  （時間: 数秒）

macOS の設計:
  ウィンドウを閉じる → プロセス継続 → 再度開く → ウィンドウ表示
  （時間: 0.5秒未満）
```

#### 2. メニューバーの永続性

macOS では、ウィンドウを閉じてもアプリのメニューバーは残り、いつでも操作できます。

```txt
Safari の例:
  1. すべてのウィンドウを閉じる（Cmd + W を何度も押す）
  2. ウィンドウは消えるが、画面上部のメニューバーには「Safari」が残る
  3. メニューバーから「ファイル > 新規ウィンドウ」を選択
  4. 即座に新しいウィンドウが開く（起動処理なし）
```

#### 3. バックグラウンドタスクの継続

アプリがバックグラウンドで動作し続けることで、以下のような処理が可能になります：

- メールアプリ：定期的に新着メールをチェック
- カレンダーアプリ：予定の通知
- 音楽アプリ：音楽の再生を継続

---

## macOS の代表的なアプリの動作

### ウィンドウを閉じてもアプリが終了しないアプリ

| アプリ | 理由 |
|------|------|
| **Safari** | 新しいウィンドウを開く操作が頻繁に行われる |
| **Mail** | バックグラウンドでメール受信を続ける |
| **Calendar** | 予定の通知を継続 |
| **Music** | 音楽の再生を継続 |
| **Finder** | システムのファイルブラウザとして常に利用可能にする |

### ウィンドウを閉じるとアプリが終了するアプリ

| アプリ | 理由 |
|------|------|
| **システム環境設定** | 単一ウィンドウのユーティリティ |
| **電卓** | 単一ウィンドウのツール |
| **アクティビティモニタ** | 監視ツールとして使用されるため |

---

## Electron での実装

### パターン1: macOS の標準動作（ウィンドウを閉じてもアプリは終了しない）

```typescript
// src/main/index.ts
import { app, BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800
  })
  mainWindow.loadURL('http://localhost:5173')
})

// ✅ macOS の標準動作: ウィンドウを閉じてもアプリは終了しない
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()  // Windows/Linux のみ終了
  }
  // macOS では何もしない → アプリは終了しない
})

// ✅ Dock アイコンをクリックしたときに新しいウィンドウを開く
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800
    })
    mainWindow.loadURL('http://localhost:5173')
  }
})
```

**動作**:

```txt
1. アプリを起動 → ウィンドウが開く
2. ウィンドウを閉じる（Cmd + W）→ ウィンドウが消える、プロセスは継続
3. Dock アイコンをクリック → 新しいウィンドウが開く（高速）
4. Cmd + Q でアプリを終了 → プロセスが終了
```

### パターン2: Windows/Linux 風の動作（ウィンドウを閉じるとアプリも終了）

```typescript
// src/main/index.ts
import { app, BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800
  })
  mainWindow.loadURL('http://localhost:5173')
})

// ✅ すべてのプラットフォームで、ウィンドウを閉じるとアプリも終了
app.on('window-all-closed', () => {
  app.quit()  // macOS でも終了する
})

// activate イベントは不要（ウィンドウが閉じた時点でプロセスが終了するため）
```

**動作**:

```txt
1. アプリを起動 → ウィンドウが開く
2. ウィンドウを閉じる（Cmd + W）→ ウィンドウが消え、プロセスも終了
3. 再度アプリを起動 → 起動処理が実行される
```

---

## どちらのパターンを選ぶべきか

### パターン1（macOS 標準）を選ぶべき場合

以下のいずれかに当てはまる場合、**パターン1**（macOS 標準動作）を推奨します：

- ✅ **複数ウィンドウを開くアプリ**（例: ブラウザ、エディタ）
- ✅ **頻繁にウィンドウを開閉するアプリ**（例: メモアプリ、タスク管理）
- ✅ **バックグラウンドタスクを実行するアプリ**（例: メール、音楽再生）
- ✅ **メニューバーからの操作を提供するアプリ**（例: カレンダー、通知）
- ✅ **macOS ネイティブアプリの体験を提供したい**

### パターン2（Windows/Linux 風）を選ぶべき場合

以下のいずれかに当てはまる場合、**パターン2**（ウィンドウを閉じると終了）を推奨します：

- ✅ **単一ウィンドウのツールアプリ**（例: 電卓、システム設定）
- ✅ **展示会など特定の用途で使用するアプリ**（例: デモアプリ、プレゼンテーション）
- ✅ **バックグラウンドタスクが不要なアプリ**
- ✅ **クロスプラットフォームで統一した動作を提供したい**

---

## water-controller-app での推奨設定

### 結論: **パターン2（ウィンドウを閉じるとアプリも終了）を推奨**

#### 理由

1. **単一ウィンドウアプリ**
   - water-controller-app は単一ウィンドウで動作するため、ウィンドウを閉じた後にアプリを継続する理由がない

2. **展示会での運用を想定**
   - 展示会では、アプリを終了して再起動する操作が明確な方が管理しやすい
   - バックグラウンドでプロセスが残り続けると、リソースの無駄遣いになる

3. **バックグラウンドタスクが不要**
   - WebSocket 接続はウィンドウがアクティブなときだけ必要
   - ウィンドウを閉じた後も接続を維持する必要がない

4. **シンプルな動作**
   - 「ウィンドウを閉じる = アプリを終了」という直感的な動作

#### 推奨コード

```typescript
// water-controller-app/src/main/index.ts
import { app, BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js')
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
})

// ✅ すべてのプラットフォームで、ウィンドウを閉じるとアプリも終了
app.on('window-all-closed', () => {
  app.quit()
})

// ⚠️ activate イベントは不要
// （ウィンドウを閉じた時点でプロセスが終了するため、
//  Dock アイコンをクリックしても何も起こらない）
```

---

## 動作の比較

### パターン1（macOS 標準）の動作フロー

```txt
1. アプリを起動
   ├─ Main プロセス起動
   ├─ ウィンドウ作成
   └─ WebSocket 接続

2. ウィンドウを閉じる（Cmd + W）
   ├─ ウィンドウが閉じる
   ├─ WebSocket 接続が切れる
   └─ Main プロセスは継続（メモリに残る）

3. Dock アイコンをクリック
   ├─ activate イベント発火
   ├─ 新しいウィンドウ作成（高速、約 0.5秒）
   └─ WebSocket 再接続

4. アプリを終了（Cmd + Q）
   └─ Main プロセス終了
```

### パターン2（Windows/Linux 風）の動作フロー

```txt
1. アプリを起動
   ├─ Main プロセス起動
   ├─ ウィンドウ作成
   └─ WebSocket 接続

2. ウィンドウを閉じる（Cmd + W）
   ├─ ウィンドウが閉じる
   ├─ WebSocket 接続が切れる
   └─ Main プロセス終了（リソース解放）

3. 再度アプリを起動
   ├─ Main プロセス起動（起動処理、約 1-2秒）
   ├─ ウィンドウ作成
   └─ WebSocket 接続
```

---

## よくある質問

### Q1: macOS でパターン2を使うと、ユーザーに違和感を与えないか？

**A**: 用途によります。

- **一般的な生産性アプリ**（ブラウザ、エディタなど）の場合は、macOS 標準動作（パターン1）が自然です
- **ツールアプリや展示用アプリ**の場合は、パターン2の方がシンプルで分かりやすいです

water-controller-app は展示用なので、パターン2が適しています。

### Q2: パターン2でも Cmd + Q で終了できる？

**A**: はい、できます。

- `Cmd + W`：ウィンドウを閉じる → アプリも終了
- `Cmd + Q`：アプリを終了 → アプリが終了

どちらの操作でも同じ結果（アプリ終了）になります。

### Q3: パターン1で activate イベントを実装しないとどうなる？

**A**: ウィンドウを閉じた後、Dock アイコンをクリックしても何も起こりません。

```txt
パターン1 + activate イベントなし:
  1. ウィンドウを閉じる（Cmd + W）
  2. Dock アイコンをクリック
  3. 何も起こらない（ウィンドウが開かない）
  4. Cmd + Q でアプリを終了するしかない
```

これはユーザーにとって混乱を招くため、**パターン1を使う場合は activate イベントの実装が必須**です。

---

## まとめ

| 項目 | パターン1（macOS 標準） | パターン2（Windows/Linux 風） |
|------|----------------------|---------------------------|
| **ウィンドウを閉じる** | アプリは継続 | アプリも終了 |
| **Dock アイコンをクリック** | 新しいウィンドウが開く | 何も起こらない |
| **起動速度** | 高速（0.5秒未満） | やや遅い（1-2秒） |
| **リソース使用** | メモリに残る | 解放される |
| **適したアプリ** | 複数ウィンドウ、バックグラウンドタスク | 単一ウィンドウ、ツールアプリ |
| **macOS らしさ** | ✅ ネイティブアプリと同じ | ⚠️ やや違和感 |
| **water-controller-app での推奨** | ❌ 不要 | ✅ **推奨** |

### water-controller-app での結論

```typescript
// ✅ 推奨設定（パターン2）
app.on('window-all-closed', () => {
  app.quit()  // すべてのプラットフォームで終了
})

// ❌ activate イベントは不要
```

**理由**：

- 単一ウィンドウアプリ
- 展示会での運用を想定
- バックグラウンドタスクが不要
- シンプルで分かりやすい動作

---

## 参考資料

### Apple 公式ドキュメント

- **[Human Interface Guidelines - The Menu Bar](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar)**
  - macOS のメニューバーのデザイン原則と「Quit and Close Are Different」の説明
  - 引用元："People don't quit iOS and iPadOS apps. In macOS, people frequently have multiple windows..."
- **[Human Interface Guidelines - App menus](https://developer.apple.com/design/human-interface-guidelines/menus#App-menus)**
  - アプリメニューの標準的な構成と、Quit（Cmd + Q）の役割
- **[App Programming Guide for macOS - The App Life Cycle](https://developer.apple.com/library/archive/documentation/General/Conceptual/MOSXAppProgrammingGuide/CoreAppDesign/CoreAppDesign.html)**
  - macOS アプリのライフサイクルとイベント処理の詳細

### Electron 公式ドキュメント

- **[app.on('window-all-closed')](https://www.electronjs.org/docs/latest/api/app#event-window-all-closed)**
  - すべてのウィンドウが閉じられたときに発火するイベント
  - macOS でのデフォルト動作（アプリを終了しない）の実装例
- **[app.on('activate')](https://www.electronjs.org/docs/latest/api/app#event-activate-macos)**
  - macOS で Dock アイコンがクリックされたときに発火するイベント
  - 新しいウィンドウを開く実装例
- **[app.quit()](https://www.electronjs.org/docs/latest/api/app#appquit)**
  - アプリケーションを終了するメソッド
- **[Quick Start Guide - Manage your window's lifecycle](https://www.electronjs.org/docs/latest/tutorial/quick-start#manage-your-windows-lifecycle)**
  - Electron の公式チュートリアル
  - `window-all-closed` と `activate` の基本的な実装パターン
- **[BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)**
  - ウィンドウの作成と管理

### プロジェクト内の関連ドキュメント

- [Electron 基礎ガイド for React 開発者](../documentations/electorn-basic.md)
- [BrowserWindow の設定とセキュリティ](./electron-BrowserWindow.md)
- [Electron での WebSocket 接続パターン](./electron-websocket-patterns.md)

### プロジェクト内の関連ファイル

- `water-controller-app/src/main/index.ts` - Main プロセスの実装
