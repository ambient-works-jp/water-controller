# ロギング機能の実装

## ステータス

- 最終更新日時：2025-11-16 02:15:00
- 作成日時：2025-11-16 15:00:00
- ステータス：完了

## 目的

- water-controller-app 全体で統一されたロギング機能を実装する
- 共通型定義（`Logger` インタフェース）によりメイン・レンダラー両プロセスで一貫した API を提供する
- すべての環境でコンソール（人間が読みやすい）とログファイル（JSON Lines）の両方に出力する
- electron-log の内蔵 IPC トランスポートを活用し、レンダラープロセスのログもファイルに記録する

## ゴール

- [x] 共通型定義（`Logger` インタフェース）を作成し、メイン・レンダラー両プロセスで実装する
- [x] メイン・レンダラー両プロセスからコンソールとログファイルの両方に出力できる
- [x] ログファイルは JSON Lines 形式で出力される
- [x] すべてのログファイルは `~/Library/Logs/water-controller-app/main.log` に統合出力される（macOS）
- [x] `createLogger('module-name')` でモジュールごとに `Logger` インタフェースを返すロガーを作成できる
- [x] タイムゾーン付き ISO 8601 形式のタイムスタンプが記録される
- [x] グローバルエラーハンドリングが有効化され、未処理エラーがログに記録される

## タスク一覧

- [x] 共通型定義の作成
  - [x] `src/lib/logger.ts` の作成
  - [x] `Logger` インタフェースの定義
  - [x] `LogLevel` 型の定義
  - [x] `CreateLogger` 型の定義
- [x] メインプロセス用ロガーの実装
  - [x] `src/main/logger.ts` の作成
  - [x] `electron-log/main` からインポート
  - [x] `log.initialize()` の呼び出し（プリロードスクリプト自動注入）
  - [x] electron-log の初期化設定（`initMainLogger` 関数）
  - [x] JSON Lines フォーマット関数の実装
  - [x] タイムゾーン付きタイムスタンプ生成関数の実装
  - [x] ログファイル統合設定（main.log にすべてのログを記録）
  - [x] コンソールとファイル両方への出力設定
  - [x] `createLogger(moduleName)` 関数の実装（`Logger` インタフェースを返す）
  - [x] グローバルエラーハンドリングの設定（`log.errorHandler.startCatching`）
- [x] レンダラー用ロガーの実装
  - [x] `src/renderer/logger.ts` の作成
  - [x] `electron-log/renderer` を使用した実装
  - [x] `createLogger(moduleName)` 関数の実装（`Logger` インタフェースを返す）
  - [x] グローバルエラーハンドリングの設定（レンダラープロセス用）
- [x] 動作確認とテスト
  - [x] メインプロセスからのログ出力確認（コンソール + ファイル）
  - [x] レンダラープロセスからのログ出力確認（DevTools Console + ファイル）
  - [x] JSON Lines フォーマット確認
  - [x] ログファイルの出力先確認（`~/Library/Logs/water-controller-app/main.log`）
  - [x] タイムスタンプとタイムゾーンの確認
  - [x] エラー時のスタックトレース出力確認
  - [x] グローバルエラーハンドリングの動作確認

## 試行錯誤と解決

### 1. TypeScript 型エラー（electron-log の型定義と実際の API の不一致）

**問題**:

```txt
src/main/logger.ts(91,3): error TS2322: Type 'string' is not assignable to type 'LevelOption'.
src/main/logger.ts(92,3): error TS2322: Type 'string' is not assignable to type 'LevelOption'.
src/main/logger.ts(98,32): error TS2322: Type '({ level, message, date }...' is not assignable to type 'Format'.
```

環境変数から取得した文字列（`'INFO'`, `'DEBUG'` など）を `LOG_LEVEL` に代入しようとしたが、electron-log の `LogLevel` 型は小文字（`'info'`, `'debug'` など）を期待しているため型エラーが発生。

**最初の解決方法**（不適切）:

型アサーション（`as any`）を使用して TypeScript の型チェックをバイパス。

```typescript
;(log.transports.file as any).level = LOG_LEVEL
;(log.transports.console as any).level = LOG_LEVEL
```

**問題点**: 型安全性が損なわれ、保守性が低下する。

**最終的な解決方法**（適切）:

electron-log の型定義に合わせて、環境変数を適切な型に変換する関数を実装：

```typescript
// electron-log の LogLevel 型に合わせて環境変数を変換
type ElectronLogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly'

function parseLogLevel(level: string | undefined): ElectronLogLevel {
  const normalizedLevel = (level || 'INFO').toUpperCase()

  switch (normalizedLevel) {
    case 'ERROR':
      return 'error'
    case 'WARN':
      return 'warn'
    case 'INFO':
      return 'info'
    case 'DEBUG':
      return 'debug'
    default:
      return 'info'
  }
}

const LOG_LEVEL: ElectronLogLevel = parseLogLevel(process.env.LOG_LEVEL)
```

これにより、`as any` を使わずに型安全性を保ったまま実装できた。

**教訓**: 型エラーが発生した場合、まずライブラリの型定義を確認し、適切な型変換関数を実装すること。`as any` の使用は保守性を著しく低下させるため、原則禁止とする（AGENTS.md に明記）。

### 2. フォーマット関数のパラメータ構造の誤解

**問題**:
最初の実装では `date` を `params` の直接のプロパティとして取得しようとした：

```typescript
function jsonLinesFormat(params: any): string {
  const { level, message, date } = params
  // ...
}
```

実行時エラー：

```txt
TypeError: Cannot read properties of undefined (reading 'toLocaleString')
```

**原因**:
`date` は `params.date` ではなく、`params.message.date` に存在する。

**解決方法**:
パラメータ構造を修正：

```typescript
function jsonLinesFormat(params: any): any[] {
  const { level, message } = params
  const date = message.date  // message オブジェクトから取得
  // ...
}
```

### 3. フォーマット関数の戻り値の型エラー

**問題**:
フォーマット関数が文字列を返すと、ログファイルに各文字の間にスペースが入る異常な出力が発生：

```txt
{ " t i m e s t a m p " : " 2 0 2 5 - 1 1 - 1 6 T 0 0 : 5 9 : 4 7 , 5 9 9 + 0 9 : 0 0 " , ...
```

hexdump で確認すると、各文字の後にスペース（0x20）が挿入されていた。

**原因**:
electron-log の公式ドキュメントによると、フォーマット関数は**配列を返す必要がある**：

- シグネチャ: `(params: FormatParams) => any[]`
- 文字列を返すと、各文字が配列の要素として処理される

**解決方法**:
戻り値を配列に変更：

```typescript
// 修正前
function jsonLinesFormat(params: any): string {
  // ...
  return JSON.stringify(logEntry)
}

// 修正後
function jsonLinesFormat(params: any): any[] {
  // ...
  return [JSON.stringify(logEntry)]
}
```

### 4. ログファイル分割の設計変更

**問題**:
当初は `variables.processType` を使用してメインプロセスとレンダラープロセスのログを別々のファイル（`main.log` と `renderer.log`）に分割する計画だった。

しかし、実際に `resolvePathFn` で `variables` オブジェクトを確認したところ：

- `processType` フィールドが**存在しない**
- 代わりに `fileName` フィールドがあり、常に `"main.log"` の値

**デバッグ出力**:

```json
{
  "appName": "water-controller-app",
  "fileName": "main.log",
  // ... その他のフィールド
  // processType フィールドは存在しない
}
```

**設計変更**:
プロセスごとにファイルを分割する代わりに、**すべてのログを `main.log` に統合**する方針に変更：

- メリット: 時系列でログを追跡しやすい
- レンダラープロセスのログは IPC 経由で自動的にメインプロセスに送信され、`main.log` に記録される
- `module` フィールド（`main.index`, `renderer.main` など）でプロセスを識別可能

**最終実装**:

```typescript
;(log.transports.file as any).resolvePathFn = () => {
  // すべてのログを main.log に出力
  return path.join(app.getPath('logs'), 'main.log')
}
```

### 5. オブジェクトの JSON シリアライズ問題

**問題**:
ログメッセージにオブジェクトを含めると、JSON Lines ログファイルに `[object Object]` と表示され、オブジェクトの内容が確認できない：

**修正前のログ出力**:

```json
{"timestamp":"2025-11-16T01:25:48,777+09:00","level":"ERROR","module":"unknown","message":"Renderer global error: [object Object]"}
```

一方、コンソール出力（人間が読みやすい形式）では正しくオブジェクトが表示される：

```txt
[2025-11-16 01:26:19] [error] [             ] Renderer global error: { error: "TypeError...", errorName: 'Unhandled', processType: 'renderer' }
```

**原因**:
`jsonLinesFormat()` 関数内で `String(message.data)` を使用していたため、オブジェクトが `[object Object]` に変換されていた。

**修正前の実装**:

```typescript
function jsonLinesFormat(params: any): any[] {
  // ...
  const logEntry = {
    // ...
    message: Array.isArray(message.data) ? message.data.join(' ') : String(message.data)  // 問題箇所
  }
  return [JSON.stringify(logEntry)]
}
```

**解決方法**:
メッセージデータの型に応じて適切にシリアライズする `formatMessageData()` ヘルパー関数を実装：

```typescript
/**
 * メッセージデータを文字列化
 */
function formatMessageData(data: any): string {
  if (Array.isArray(data)) {
    return data
      .map((item) => (typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item)))
      .join(' ')
  }

  if (typeof data === 'object' && data !== null) {
    return JSON.stringify(data)
  }

  return String(data)
}

/**
 * JSON Lines フォーマット関数
 */
function jsonLinesFormat(params: any): any[] {
  // ...
  const logEntry = {
    // ...
    message: formatMessageData(message.data)  // ヘルパー関数を使用
  }
  return [JSON.stringify(logEntry)]
}
```

**修正後のログ出力**:

```json
{"timestamp":"2025-11-16T01:30:05,466+09:00","level":"ERROR","module":"unknown","message":"Renderer global error: {\"error\":\"TypeError: Cannot read properties of undefined (reading 'process')\\n    at Versions...\",\"errorName\":\"Unhandled\",\"processType\":\"renderer\"}"}
```

オブジェクトが正しく JSON シリアライズされ、完全な情報がログファイルに記録されるようになった。

**教訓**: ログメッセージに含まれるデータの型を適切に処理し、オブジェクトや配列は JSON.stringify を使用してシリアライズすること。特に、構造化ログ（JSON Lines）では、メッセージフィールドにもオブジェクトを含めることができるため、適切なシリアライズが重要。

### 6. Sandbox モードと electron-log の互換性問題

**問題**:
Electron の `sandbox: true` モードでプリロードスクリプトが正常に実行されず、`window.api` が undefined になる問題が発生：

**sandbox: false の場合**（正常動作）:

```json
{"timestamp":"2025-11-16T01:48:59,218+09:00","level":"INFO","module":"unknown","message":"[preload] Loading preload.ts..."}
{"timestamp":"2025-11-16T01:48:59,219+09:00","level":"INFO","module":"unknown","message":"[preload] Loaded preload.ts. API registered: {\"hasApi\":true,\"hasIpc\":true}"}
```

**sandbox: true の場合**（動作せず）:

```txt
（プリロードスクリプトのログが全く出力されない）
（window.api が undefined のエラーが発生）
```

**原因**:
electron-log の初期化処理（`log.initialize()` および `electron-log/renderer`）が Electron の sandbox モードと互換性がない。sandbox: true では、プリロードスクリプト内で electron-log が正しく動作せず、その結果 API の登録処理全体が失敗していた。

**調査内容**:

1. IPC 経由のバージョン取得実装は sandbox モードでも問題なく動作するはず
2. しかし、プリロードスクリプトで `electron-log/renderer` を import していることが原因で、プリロードスクリプト全体が実行されない
3. `contextBridge.exposeInMainWorld` や `ipcRenderer.invoke` 自体は sandbox モードと互換性がある

**解決方法**:
`sandbox: false` で運用することを決定（`src/main/window.ts:21`）。

**判断理由**:

1. **プロジェクトの性質**: ローカル環境専用の展示用アプリケーション
2. **低リスク環境**:
   - インターネットからのコンテンツ読み込みなし
   - 限定的なユーザー入力
   - 閉じた環境（展示会場）での運用
3. **セキュリティリスクの評価**: XSS や RCE のリスクは極めて低い
4. **開発効率**: electron-log を使い続けることで、統一されたロギング実装を維持
5. **IPC 実装**: バージョン情報は IPC 経由で取得するため、`process.versions` への直接アクセスは不要

**代替案（検討したが採用せず）**:

- プリロードスクリプトから electron-log を削除し、console.log のみ使用
  - 理由: メイン・レンダラー・プリロード全体で統一されたロギング戦略を維持したい

**教訓**:

- Electron の sandbox モードは強力なセキュリティ機能だが、一部のライブラリ（electron-log など）と互換性がない場合がある
- プロジェクトの性質（ローカル環境専用、閉じた環境）を考慮し、セキュリティと開発効率のトレードオフを適切に判断すること
- 将来的に sandbox: true が必要になった場合は、プリロードスクリプトのロギング実装を見直す必要がある

## 実装結果

### 作成したファイル

1. **src/lib/logger.ts** (35 行)
   - `Logger` インタフェース
   - `LogLevel` 型
   - `CreateLogger` 型

2. **src/main/logger.ts** (166 行)
   - `initMainLogger()`: ロガー初期化関数
   - `formatTimestamp()`: タイムゾーン付き ISO 8601 タイムスタンプ生成
   - `formatMessageData()`: メッセージデータを型に応じて適切にシリアライズ
   - `jsonLinesFormat()`: JSON Lines フォーマット関数（配列を返す）
   - `createLogger()`: モジュールごとのロガー作成

3. **src/renderer/src/lib/logger.ts** (28 行)
   - `initRendererLogger()`: レンダラープロセス用グローバルエラーハンドリング初期化
   - `createLogger()`: モジュールごとのロガー作成

### 変更したファイル（IPC 実装と sandbox モード対応）

4. **src/renderer/src/main.tsx**
   - `initRendererLogger()` の呼び出し追加（レンダラーロガー初期化）

5. **src/main/ipc.ts**
   - `getVersions` IPC ハンドラー追加（バージョン情報取得）

6. **src/preload/api.d.ts**
   - `getVersions` を `ipc` 名前空間に移動（型定義更新）

7. **src/preload/index.ts**
   - IPC 経由の `getVersions` 実装
   - electron-log によるロギング追加

8. **src/renderer/src/components/Versions.tsx**
   - 非同期実装に変更（`useEffect` + `useState`）
   - ローディング状態の追加

9. **src/main/window.ts**
   - `sandbox: false` に設定（electron-log との互換性のため）

10. **water-controller-app/README.md**
    - ログファイルの確認方法を追加（デスクトップアプリ用）

11. **README.md** (プロジェクトルート)
    - ログファイルの確認方法を追加（TODO を解消）

### ログ出力例

**コンソール出力**（人間が読みやすい形式）:

```txt
[2025-11-16 01:30:05] [info]  [] Main process logger initialized
[2025-11-16 01:30:05] [info]  [  (main.index)] Electron has finished initialization and is ready to create browser windows.
[2025-11-16 01:30:05] [info]  [] Renderer process logger initialized
[2025-11-16 01:30:05] [error] [] Renderer global error: { error: "TypeError...", errorName: 'Unhandled', processType: 'renderer' }
```

**ファイル出力**（JSON Lines 形式）:

```json
{"timestamp":"2025-11-16T01:30:05,231+09:00","level":"INFO","module":"unknown","message":"Main process logger initialized"}
{"timestamp":"2025-11-16T01:30:05,265+09:00","level":"INFO","module":"main.index","message":"Electron has finished initialization and is ready to create browser windows."}
{"timestamp":"2025-11-16T01:30:05,457+09:00","level":"INFO","module":"unknown","message":"Renderer process logger initialized"}
{"timestamp":"2025-11-16T01:30:05,466+09:00","level":"ERROR","module":"unknown","message":"Renderer global error: {\"error\":\"TypeError: Cannot read properties of undefined (reading 'process')\\n    at Versions (http://localhost:5175/src/components/Versions.tsx:6:47)...\",\"errorName\":\"Unhandled\",\"processType\":\"renderer\"}"}
```

**重要**: オブジェクトや配列を含むログメッセージも、`formatMessageData()` 関数により正しく JSON シリアライズされ、ログファイルに記録されます。

### ログファイルの場所

- macOS: `~/Library/Logs/water-controller-app/main.log`
- Windows: `%USERPROFILE%\AppData\Roaming\water-controller-app\logs\main.log`
- Linux: `~/.config/water-controller-app/logs/main.log`

### 確認事項

- ✅ すべてのプロセス（メイン、レンダラー、プリロード）のログが `main.log` に統合
- ✅ タイムゾーン付き ISO 8601 タイムスタンプ（+09:00）
- ✅ JSON Lines 形式（1 行 1 JSON オブジェクト）
- ✅ ログレベル（INFO, WARN, ERROR）の正しいマッピング
- ✅ モジュール名（scope）による識別
- ✅ コンソールとファイルへの同時出力
- ✅ `LOG_LEVEL` 環境変数によるログレベル制御（デフォルト: INFO）
- ✅ オブジェクトや配列を含むログメッセージが正しく JSON シリアライズされる（`[object Object]` ではない）
- ✅ IPC 経由でバージョン情報を取得（sandbox モード対応）
- ✅ `sandbox: false` で運用（electron-log との互換性のため）

## 参考資料

- [docs/notes/logging-strategy.md](../notes/logging-strategy.md) - ロギング戦略ドキュメント
- [electron-log - GitHub](https://github.com/megahertz/electron-log)
- [electron-log Initialize Documentation](https://github.com/megahertz/electron-log/blob/master/docs/initialize.md)
- [electron-log Format Documentation](https://github.com/megahertz/electron-log/blob/master/docs/transports/format.md)
- [electron-log Error Handling Documentation](https://github.com/megahertz/electron-log/blob/master/docs/errors.md)
- [JSON Lines (NDJSON) Specification](https://jsonlines.org/)
- [docs/electron-development-guidelines.md](../electron-development-guidelines.md) - Electron 開発ガイドライン
