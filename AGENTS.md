# Repository Guidelines

## プロジェクト構造とモジュール配置

- `water-controller-app/` は Electron + React + p5.js のコンテンツ本体。UI ロジックは `src/renderer/`、メインプロセスは `src/main/`、ブリッジは `src/preload/`、配布物は `dist/`、静的アセットは `resources/` にあります。
- `water-controller-relay/` は Rust 版リレーサーバで、`src/` に CLI エントリ、`Cargo.toml` に依存定義、`target/` 以下に成果物が生成されます。
- `water-controller-firmware/WaterControllerFirmwareProto/` は Arduino UNO 用本番スケッチ、`WaterControllerFirmwareMock/` はセンサー無しでの挙動確認用です。
- 展示資料や通信仕様は `docs/` と `spec.md` にまとまっているため、動作変更前に必ず参照してください。

## ビルド・テスト・開発コマンド

### water-controller-app (pnpm)

- `pnpm install`：初回依存解決。Node 22.21 系を想定。
- `pnpm dev`：Electron + Vite の開発モードを起動し WebSocket 受信まで確認できます。
- `CSC_IDENTITY_AUTO_DISCOVERY=false pnpm build:mac`：macOS 向けアプリバンドル生成。署名を省略し 30〜60 秒で完了します。
- `pnpm format`：コードフォーマットを適用します。
- `pnpm lint`：ESLint の静的検証。CI 代わりにローカルで必須です。
- `pnpm typecheck`：TypeScript の静的検証。CI 代わりにローカルで必須です。

### water-controller-relay (Rust)

[Rust 開発ガイドライン](./docs/documentations/rust-development-guidelines.md)
を参照してください。

### water-controller-firmware (Arduino IDE)

- ボードを `Arduino UNO R3` に設定し、`WaterControllerFirmwareProto.ino` を書き込み。
- シリアルモニタで 115200bps、`0/1` のタッチ結果が揺れないことを確認します。

## コーディングスタイルと命名

### water-controller-app (TypeScript)

- TypeScript/React は Prettier（2 スペース）と eslint.config.mjs のルールに従い、コンポーネントは PascalCase、hooks/ユーティリティは camelCase。`src/renderer/components/SamplePanel.tsx` のように用途を示すサフィックスを付けます。

#### 型安全性の指針

- **`as any` 型キャストは原則禁止**: 型安全性を損なうため、不用意な使用は避けること。保守性が著しく低下します。
- **外部ライブラリの型定義との整合性**: 型エラーが発生した場合、まずライブラリの型定義を確認し、適切な型変換関数を実装すること。
  - 例: `electron-log` の `LogLevel` 型（`'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly'`）に合わせて環境変数を変換する関数を実装
- **型変換は明示的に**: 環境変数などの文字列を特定の型に変換する場合、switch 文や型ガード関数を使用して明示的に変換すること。
- **型アサーションの代替手段**:
  - インターフェースの拡張（declaration merging）
  - 型ガード関数の実装
  - ユーティリティ型（`Partial<T>`, `Pick<T, K>` など）の活用
- **やむを得ず型キャストが必要な場合**: コメントで理由を明記し、将来の改善点として TODO コメントを残すこと。

### water-controller-relay (Rust)

[Rust 開発ガイドライン](./docs/documentations/rust-development-guidelines.md)を参照してください。

### water-controller-firmware (Arduino IDE)

- Arduino スケッチは 2 スペースで揃え、ピン定義や I2C アドレスは `k` から始まる定数名でまとめると差分が追いやすくなります。

## テスト指針

### water-controller-app (TypeScript)

- デスクトップアプリは自動テスト未整備のため、`pnpm dev` 実行中に WebSocket 受信、描画、サウンドなど主要シーンを手動確認し、再現手順を PR に記録します。
- テスト駆動開発（TDD）については、[t_wada による Kent Beck の TDD 本の解説](https://t-wada.hatenablog.jp/entry/canon-tdd-by-kent-beck) を参考にしてください。

### water-controller-relay (Rust)

- リレーは `cargo test` でロジックを、`cargo fmt -- --check` と `cargo clippy` を静的ゲートにするのが最低ラインです。

### water-controller-firmware (Arduino IDE)

- ファームウェアは自動テスト不能なので、MPR121 を水槽に接続した状態で 5 分以上触って誤検出率をメモし、ログを `docs/testing/<date>.md` 等に保存してください。

## タスクの進め方

以下の流れでタスクを進めてください。

1. plan モードで、ユーザとインタラクティブにタスクを整理する
2. 整理したタスクを [タスクドキュメントのフォーマット](./docs/tasks/yyyymmdd-hhmmss_task-summary.md) に従ってドキュメント化する。
   - タスクドキュメントの保存場所：`docs/tasks/`
   - タスクドキュメントのファイル名：`yyyymmdd-hhmmss_<task-summary>.md`
     - `yyyymmdd-hhmmss` は作成日時（JST）を表します。
     - `<task-summary>` はタスクの概要を簡潔に表すキーワード（ケバブケース）を使用します。
3. タスクを進める。現在のタスクの進捗状況とタスクドキュメントの状態が必ず同期するようにタスクを進める。タスクを進めたら必ずドキュメントに反映させること。
4. タスクドキュメントの「タスク一覧」の全てのタスクを完了させ、「ゴール」の条件を満たしていることを確認する。
5. ユーザがレビューする。レビュー結果に応じて 2 ~ 5 を繰り返す。
6. ユーザが承認する。承認されたら、タスクドキュメントのステータスを更新し、タスクを終了する

## コミットとプルリクエスト

- Git 履歴は「README の更新」「実装タスクの更新」のように日本語で対象を明記しています。`<範囲>: <変更概要>` 形式を踏襲し、1 コミット 1 トピックを意識してください。
- PR には概要、動機、実行コマンド、確認結果（スクリーンショットやシリアルログ）を必ず添付し、関連 Issue や Miro ボードを紐付けます。UI 変更や配布物更新時は `dist/` 差分を説明し、レビュワーが再現できるようハードウェア条件も書き残してください。

## セキュリティと設定メモ

- `electron-builder.yml` や `dev-app-update.yml` には配布チャネル設定が入るため、アクセストークンを平文で置かないでください。必要な場合は環境変数か秘密管理ツールを利用します。
- `water-controller-relay` の CLI 変数（ポート、ボーレート）は引数で注入し、ソースに固定値を残さないこと。展示会場での配線変更時に最小差分で対応できます。
