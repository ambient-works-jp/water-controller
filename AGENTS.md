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

- `cargo run -- --port "/dev/cu.usbmodem1101" --baud-rate 115200`：Arduino と WebSocket の橋渡しをするサーバを実行。
- `cargo build --release`：展示用の自己完結バイナリを生成。
- `cargo fmt -- --check` と `cargo clippy -- -D warnings`：スタイル維持と未定義挙動の検出をコミット前に行います。

### water-controller-firmware (Arduino IDE)

- ボードを `Arduino UNO R3` に設定し、`WaterControllerFirmwareProto.ino` を書き込み。
- シリアルモニタで 115200bps、`0/1` のタッチ結果が揺れないことを確認します。

## コーディングスタイルと命名

- TypeScript/React は Prettier（2 スペース）と eslint.config.mjs のルールに従い、コンポーネントは PascalCase、hooks/ユーティリティは camelCase。`src/renderer/components/SamplePanel.tsx` のように用途を示すサフィックスを付けます。
- Rust は `rustfmt` 既定（4 スペース）で snake_case を守り、CLI オプション名は `--port` のように実体をそのまま表す英語小文字を使用。
- Arduino スケッチは 2 スペースで揃え、ピン定義や I2C アドレスは `k` から始まる定数名でまとめると差分が追いやすくなります。

## テスト指針

- リレーは `cargo test` でロジックを、`cargo fmt -- --check` と `cargo clippy` を静的ゲートにするのが最低ラインです。
- デスクトップアプリは自動テスト未整備のため、`pnpm dev` 実行中に WebSocket 受信、描画、サウンドなど主要シーンを手動確認し、再現手順を PR に記録します。
- ファームウェアは自動テスト不能なので、MPR121 を水槽に接続した状態で 5 分以上触って誤検出率をメモし、ログを `docs/testing/<date>.md` 等に保存してください。

## コミットとプルリクエスト

- Git 履歴は「README の更新」「実装タスクの更新」のように日本語で対象を明記しています。`<範囲>: <変更概要>` 形式を踏襲し、1 コミット 1 トピックを意識してください。
- PR には概要、動機、実行コマンド、確認結果（スクリーンショットやシリアルログ）を必ず添付し、関連 Issue や Miro ボードを紐付けます。UI 変更や配布物更新時は `dist/` 差分を説明し、レビュワーが再現できるようハードウェア条件も書き残してください。

## セキュリティと設定メモ

- `electron-builder.yml` や `dev-app-update.yml` には配布チャネル設定が入るため、アクセストークンを平文で置かないでください。必要な場合は環境変数か秘密管理ツールを利用します。
- `water-controller-relay` の CLI 変数（ポート、ボーレート）は引数で注入し、ソースに固定値を残さないこと。展示会場での配線変更時に最小差分で対応できます。
