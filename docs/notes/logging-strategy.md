# Logging Strategy

water-controller-app のロギング戦略とカスタムロガーの実装仕様。

## 要件

### ログ形式

- **フォーマット**: JSON Lines (NDJSON)
- **出力項目**:
  - `timestamp`: タイムゾーン付き ISO 8601 タイムスタンプ（デフォルト: `Asia/Tokyo`）
  - `level`: ログレベル（`DEBUG`, `INFO`, `WARN`, `ERROR`）
  - `module`: モジュール名（例: `main.index`, `renderer.App`）
  - `message`: ログメッセージ（文字列）
  - `stacktrace`: エラーの場合のスタックトレース（オプショナル）

### 出力先

すべての環境で **コンソール（標準出力/DevTools）とログファイルの両方** に出力します。

| プロセス | コンソール出力 | ログファイル出力 |
|---------|--------------|----------------|
| **メインプロセス** | 標準出力（人間が読みやすい形式） | `~/Library/Logs/water-controller-app/main.log` (macOS, JSON Lines) |
| **レンダラープロセス** | DevTools Console（人間が読みやすい形式） | IPC 経由 → `~/Library/Logs/water-controller-app/main.log` (macOS, JSON Lines) |
| **プリロードスクリプト** | DevTools Console（人間が読みやすい形式） | IPC 経由 → `~/Library/Logs/water-controller-app/main.log` (macOS, JSON Lines) |

**注**: すべてのログ（メインプロセス、レンダラープロセス、プリロードスクリプト）は `main.log` に統合して出力されます。レンダラープロセスとプリロードスクリプトのログは electron-log の IPC トランスポートにより自動的にメインプロセスに送信され、時系列で記録されます。

**ログファイルのパス**（`app.getPath('logs')` が返す値）:

- macOS: `~/Library/Logs/{app name}/main.log`
- Windows: `%USERPROFILE%\AppData\Roaming\{app name}\logs\main.log`
- Linux: `~/.config/{app name}/logs/main.log`

## アーキテクチャ

### プロセス間の通信フロー

```txt
┌─────────────────┐
│ Renderer Process│
│  electron-log   │
│   /renderer     │
└────────┬────────┘
         │ IPC (自動)
         ▼
┌─────────────────┐      ┌──────────────────────────────────────┐
│  Main Process   │─────▶│~/Library/Logs/water-controller-app/  │
│   electron-log  │      │  main.log (すべてのログを統合)       │
│     /main       │      └──────────────────────────────────────┘
└─────────────────┘
```

**注**:

- パスは macOS の場合。他プラットフォームでは `app.getPath('logs')` が返すパスに従います。
- IPC 通信は electron-log が自動的に処理するため、手動実装は不要です。

### 設計のポイント

1. **レンダラープロセスとプリロードスクリプトはファイルシステムに直接アクセスできない**
   - Context Isolation により Node.js API が利用不可
   - electron-log の内蔵 IPC トランスポートで自動的にメインプロセスにログを送信
   - プリロードスクリプトのログも `main.log` に出力される

2. **メインプロセスが一元管理**
   - すべてのログをメインプロセスで受信
   - すべてのログを `main.log` に時系列で統合して記録

3. **複数の出力先設定**
   - すべての環境でコンソール（標準出力/DevTools）とログファイルの両方に出力
   - コンソールは人間が読みやすい形式、ログファイルは JSON Lines 形式
   - 各トランスポートのログレベルを個別に設定可能

4. **グローバルエラーのキャッチ**
   - `log.errorHandler.startCatching()` でアプリケーション全体の未処理エラーをキャッチ
   - メイン・レンダラー両プロセスで初期化が必要
   - エラーダイアログはデフォルトで有効（メインプロセスのみ表示）

## 実装方針

### 使用ライブラリ

**electron-log** を採用：

- ✅ メイン・レンダラー両プロセス対応
- ✅ カスタムフォーマット関数サポート
- ✅ トランスポート設定でファイル分割可能
- ✅ IPC トランスポート内蔵

### 共通型定義

メイン・レンダラー両プロセスで共通の `Logger` インタフェースを定義し、それぞれで実装します。

```typescript
// src/lib/logger.ts

/**
 * ログレベル
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * ロガーインタフェース
 * メイン・レンダラー両プロセスで共通の API を提供
 */
export interface Logger {
  /**
   * デバッグレベルのログ出力
   */
  debug(message: string, ...args: any[]): void

  /**
   * 情報レベルのログ出力
   */
  info(message: string, ...args: any[]): void

  /**
   * 警告レベルのログ出力
   */
  warn(message: string, ...args: any[]): void

  /**
   * エラーレベルのログ出力
   */
  error(message: string, ...args: any[]): void
}

/**
 * ロガーを作成する関数の型
 */
export type CreateLogger = (moduleName: string) => Logger
```

### カスタマイズが必要な箇所

1. **複数の出力先設定**
   - electron-log は複数のトランスポート（console、file）を同時に有効化可能
   - 開発環境・本番環境ともに **コンソール + ログファイルの両方** に出力する
   - `log.transports.console.level` と `log.transports.file.level` を個別に設定
   - コンソールは人間が読みやすい形式、ファイルは JSON Lines 形式で出力

2. **JSON Lines フォーマット**
   - `log.transports.file.format` に関数を設定
   - `JSON.stringify()` で1行ずつ出力

3. **モジュール名の指定**
   - `createLogger(moduleName)` 関数で各ファイルごとにロガーを作成。`.` 区切りでモジュール名を指定。
   - モジュール名は明示的に指定（例: `createLogger('main.index')`）

4. **タイムゾーン付きタイムスタンプ**
   - `message.date.toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' })` で生成
   - ISO 8601 形式に変換

5. **ログファイルの統合**
   - `log.transports.file.resolvePathFn` で出力先を `main.log` に統一
   - すべてのプロセス（メイン、レンダラー、プリロード）のログを時系列で記録
   - 出力先は electron-log のデフォルトパス（`app.getPath('logs')`）を使用

6. **グローバルエラーハンドリング**
   - `log.errorHandler.startCatching()` でエラーキャッチを初期化
   - メインプロセスとレンダラープロセス両方で呼び出す
   - オプション設定:
     - `showDialog`: エラーダイアログの表示（デフォルト: `true`、メインプロセスのみ）
     - `onError`: カスタムエラー処理コールバック
   - キャッチ対象:
     - メインプロセスでスローされたエラー
     - レンダラープロセスのエラー
     - 未処理の Promise rejection
   - **注意**: レンダラープロセスでは `onError` コールバックで `error` プロパティのみ利用可能

### IPC を利用したクライアントロギング（レンダラーのロギング）

レンダラープロセスは Context Isolation によりファイルシステムへの直接アクセスができないため、IPC 経由でメインプロセスにログを送信し、メインプロセスでファイルに書き込みます。

**electron-log v5 の自動プリロード注入機能を使用**:

- メインプロセスで `log.initialize()` を呼び出すだけで、プリロードスクリプトが自動的にセッションに注入される
- レンダラープロセスで `electron-log/renderer` をインポートすれば即座に使用可能
- メインプロセスで設定したフォーマット・出力先が自動的に適用される
- 手動でプリロードスクリプトや IPC ハンドラーを実装する必要なし

**最小限の実装例**:

```typescript
// src/main/logger.ts
import log from 'electron-log/main'
import { app } from 'electron'
import path from 'path'

const LOG_TIMEZONE = process.env.LOG_TIMEZONE || 'Asia/Tokyo'

// JSON Lines フォーマット関数
function jsonLinesFormat({ level, message, date }): string {
  const logEntry = {
    timestamp: formatTimestamp(date, LOG_TIMEZONE),
    level: level.toUpperCase(),
    module: message.scope || 'unknown', // scope がモジュール名
    message: Array.isArray(message.data) ? message.data.join(' ') : String(message.data)
  }
  return JSON.stringify(logEntry)
}

export function initMainLogger(): void {
  // プリロードスクリプトを自動的にセッションに注入
  log.initialize()

  // コンソール設定（人間が読みやすい形式）
  log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] [{scope}] {text}'

  // ファイル設定（JSON Lines 形式）
  log.transports.file.format = jsonLinesFormat
  log.transports.file.resolvePathFn = () => {
    // すべてのログを main.log に出力
    // レンダラープロセスのログも IPC 経由で main.log に記録される
    return path.join(app.getPath('logs'), 'main.log')
  }

  // グローバルエラーハンドリング
  log.errorHandler.startCatching({ showDialog: true })
}
```

```typescript
// src/renderer/logger.ts
import log from 'electron-log/renderer'
import type { Logger, CreateLogger } from '../lib/logger'

// モジュールごとのロガーを作成
export const createLogger: CreateLogger = (moduleName: string): Logger => {
  return log.scope(moduleName)
}
```

```typescript
// src/renderer/App.tsx での使用例
import { createLogger } from './logger'

const logger = createLogger('renderer.App')

logger.info('Component mounted')
logger.warn('WebSocket connection unstable')
```

### プリロードスクリプトでのログ出力

プリロードスクリプトでログを出力する場合は、`electron-log/renderer` を使用します。ログは `renderer.log` に記録されます。

```typescript
// src/preload/index.ts
import log from 'electron-log/renderer'

log.info('[preload] Loading preload.ts...')

// ... プリロードスクリプトの処理 ...

log.info('[preload] Loaded preload.ts.')
```

**注意**:

- プリロードスクリプトは Node.js コンテキストで実行されるため、`electron-log/main` も使用可能ですが、論理的には `electron-log/renderer` を使用する方が適切です
- `console.log` を使用した場合も、ログは自動的に `main.log` に記録されます（electron-log の自動プリロード注入により）

## 使用例

### グローバルエラーハンドリングの初期化

```typescript
// src/main/logger.ts
import log from 'electron-log/main'

export function initMainLogger(): void {
  // プリロードスクリプトを自動的にセッションに注入
  log.initialize()

  // ... ロガーの初期化設定 ...

  // グローバルエラーハンドリングを有効化
  log.errorHandler.startCatching({
    showDialog: true, // デフォルト値（メインプロセスのエラーでダイアログ表示）
    onError(error, versions, submitIssue) {
      // カスタムエラー処理
      log.error('Global error caught:', error)
      log.error('App versions:', versions)
    }
  })
}
```

```typescript
// src/renderer/logger.ts
import log from 'electron-log/renderer'

export function initRendererLogger(): void {
  // ... ロガーの初期化設定 ...

  // レンダラープロセスでもグローバルエラーハンドリングを有効化
  log.errorHandler.startCatching({
    onError(error) {
      // レンダラープロセスでは error プロパティのみ利用可能
      log.error('Renderer global error:', error)
    }
  })
}
```

## JSON Lines 出力例

```json
{"timestamp":"2025-01-16T10:30:45.123+09:00","level":"INFO","module":"main.index","message":"Application started"}
{"timestamp":"2025-01-16T10:30:46.456+09:00","level":"DEBUG","module":"renderer.App","message":"WebSocket connected"}
{"timestamp":"2025-01-16T10:30:47.789+09:00","level":"ERROR","module":"main.websocket","message":"Connection failed","stacktrace":"Error: ECONNREFUSED\n    at Socket.connect ..."}
```

## ファイル構成

```txt
water-controller-app/
└── src/
    ├── lib/
    │   └── logger.ts          # 共通型定義（Logger インタフェース）
    ├── main/
    │   ├── logger.ts          # メインプロセス用ロガー実装
    │   └── index.ts           # アプリケーションエントリポイント
    └── renderer/
        └── logger.ts          # レンダラープロセス用ロガー実装

# ログファイルは electron-log のデフォルトパスに出力（app.getPath('logs')）
# macOS の場合: ~/Library/Logs/water-controller-app/main.log
```

## 環境変数

| 変数名 | 説明 | デフォルト値 |
|-------|------|-----------|
| `LOG_LEVEL` | ログレベル（`DEBUG`, `INFO`, `WARN`, `ERROR`） | `INFO` |
| `LOG_TIMEZONE` | タイムゾーン | `Asia/Tokyo` |

**注**: ログ出力先は electron-log のデフォルト（`app.getPath('logs')`）を使用し、環境変数での変更は不可とします。

## ログファイルの動作

### ファイルへの書き込み方法

electron-log のデフォルト動作では、ログファイルは**末尾に追記（append）**されます：

- **通常時**: アプリを起動するたびに、既存のログファイルの末尾に追記される
- **リセット不要**: 過去のログを確認できるため、通常は追記される方が便利

### ログローテーション

ファイルサイズが一定サイズ（デフォルトで **1 MB**）を超えると、古いログファイルが自動的にローテーションされます：

1. `main.log` → `main.old.log` にリネーム
2. 新しい `main.log` が作成される
3. 次回起動時から新しい `main.log` に追記される

### 開発時のログリセット

開発中にログをリセットしたい場合は、手動で削除してから起動します：

```bash
# macOS/Linux
rm -rf ~/Library/Logs/water-controller-app/ && pnpm dev

# Windows (PowerShell)
Remove-Item -Recurse -Force $env:USERPROFILE\AppData\Roaming\water-controller-app\logs\
pnpm dev
```

**注**: 現在の実装では、ファイルサイズやローテーションの設定を明示的にしていないため、electron-log のデフォルト動作（1 MB でローテーション）が適用されます。

## 参考リンク

- [electron-log - GitHub](https://github.com/megahertz/electron-log)
- [electron-log Initialize Documentation](https://github.com/megahertz/electron-log/blob/master/docs/initialize.md)
- [electron-log Format Documentation](https://github.com/megahertz/electron-log/blob/master/docs/transports/format.md)
- [electron-log Error Handling Documentation](https://github.com/megahertz/electron-log/blob/master/docs/errors.md)
- [JSON Lines (NDJSON) Specification](https://jsonlines.org/)
