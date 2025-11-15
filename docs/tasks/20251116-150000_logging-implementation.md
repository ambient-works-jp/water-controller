# ロギング機能の実装

## ステータス

- 最終更新日時：2025-11-16 00:41:36
- 作成日時：2025-11-16 15:00:00
- ステータス：未着手

## 目的

- water-controller-app 全体で統一されたロギング機能を実装する
- 共通型定義（`Logger` インタフェース）によりメイン・レンダラー両プロセスで一貫した API を提供する
- すべての環境でコンソール（人間が読みやすい）とログファイル（JSON Lines）の両方に出力する
- electron-log の内蔵 IPC トランスポートを活用し、レンダラープロセスのログもファイルに記録する

## ゴール

- [ ] 共通型定義（`Logger` インタフェース）を作成し、メイン・レンダラー両プロセスで実装する
- [ ] メイン・レンダラー両プロセスからコンソールとログファイルの両方に出力できる
- [ ] ログファイルは JSON Lines 形式で出力される
- [ ] ログファイルは `~/Library/Logs/WaterController/main.log`, `renderer.log` に出力される（macOS）
- [ ] `createLogger('module-name')` でモジュールごとに `Logger` インタフェースを返すロガーを作成できる
- [ ] タイムゾーン付き ISO 8601 形式のタイムスタンプが記録される
- [ ] グローバルエラーハンドリングが有効化され、未処理エラーがログに記録される

## タスク一覧

- [ ] 共通型定義の作成
  - [ ] `src/lib/logger.ts` の作成
  - [ ] `Logger` インタフェースの定義
  - [ ] `LogLevel` 型の定義
  - [ ] `CreateLogger` 型の定義
- [ ] メインプロセス用ロガーの実装
  - [ ] `src/main/logger.ts` の作成
  - [ ] `electron-log/main` からインポート
  - [ ] `log.initialize()` の呼び出し（プリロードスクリプト自動注入）
  - [ ] electron-log の初期化設定（`initMainLogger` 関数）
  - [ ] JSON Lines フォーマット関数の実装
  - [ ] タイムゾーン付きタイムスタンプ生成関数の実装
  - [ ] ログファイル分割設定（main.log, renderer.log）
  - [ ] コンソールとファイル両方への出力設定
  - [ ] `createLogger(moduleName)` 関数の実装（`Logger` インタフェースを返す）
  - [ ] グローバルエラーハンドリングの設定（`log.errorHandler.startCatching`）
- [ ] レンダラー用ロガーの実装
  - [ ] `src/renderer/logger.ts` の作成
  - [ ] `electron-log/renderer` を使用した実装
  - [ ] `createLogger(moduleName)` 関数の実装（`Logger` インタフェースを返す）
  - [ ] グローバルエラーハンドリングの設定（レンダラープロセス用）
- [ ] 動作確認とテスト
  - [ ] メインプロセスからのログ出力確認（コンソール + ファイル）
  - [ ] レンダラープロセスからのログ出力確認（DevTools Console + ファイル）
  - [ ] JSON Lines フォーマット確認
  - [ ] ログファイルの出力先確認（`~/Library/Logs/WaterController/main.log`, `renderer.log`）
  - [ ] タイムスタンプとタイムゾーンの確認
  - [ ] エラー時のスタックトレース出力確認
  - [ ] グローバルエラーハンドリングの動作確認

## 参考資料

- [docs/notes/logging-strategy.md](../notes/logging-strategy.md) - ロギング戦略ドキュメント
- [electron-log - GitHub](https://github.com/megahertz/electron-log)
- [electron-log Initialize Documentation](https://github.com/megahertz/electron-log/blob/master/docs/initialize.md)
- [electron-log Format Documentation](https://github.com/megahertz/electron-log/blob/master/docs/transports/format.md)
- [electron-log Error Handling Documentation](https://github.com/megahertz/electron-log/blob/master/docs/errors.md)
- [JSON Lines (NDJSON) Specification](https://jsonlines.org/)
- [docs/electron-development-guidelines.md](../electron-development-guidelines.md) - Electron 開発ガイドライン
