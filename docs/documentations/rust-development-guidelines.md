# Rust 開発ガイドライン

## ビルド・テスト・開発コマンド

- `cargo fmt` : Rustfmt で全ファイルを整形し、PR 直前に必ず実行します。
- `cargo clippy --all-targets --all-features` : Axum マクロや Tokio の非同期コードを含め lint します。
- `cargo test` : 追加した単体・統合テストを一括実行し、フェイル時は `-- --nocapture` で詳細を追跡します。
- `cargo run --bin server -- --port "/dev/cu.usbmodem1101" --baud-rate 115200`：Arduino と WebSocket の橋渡しをするサーバを実行。
- `cargo run --bin client -- --url "ws://127.0.0.1:8080/ws"`：WebSocket クライアントを実行し、受信したメッセージをログ出力。
- `cargo build --release`：展示用の自己完結バイナリを生成。

実装タスクを行ったとき、必ず `cargo fmt`、`cargo clippy --all-targets --all-features`、`cargo test` を実行してください。これらが通るまでタスクを終了しないでください。

## コーディングスタイルと命名

### Rust

- Rust 2024 edition / 4 スペースインデント / `snake_case` 関数・変数、`PascalCase` 型、`SCREAMING_SNAKE_CASE` 定数。
- 共有モジュールは `mod transport;` のように `src/` 直下へ切り出し、サーバ・クライアントから再利用します。
- ログは `tracing::info!` 系を使い、イベント名（`participant_joined` など）をフィールドとして付与します。
- エラーハンドリングでは `anyhow` を使用せず、ドメインロジックのエラーは `thiserror` を使って各レイヤーの `error.rs` に定義します。各エラー型は明確なビジネスロジックの失敗を表現してください。
- **インポート規約**: ワイルドカードインポート（`use path::*;`）は使用しない。明示的にインポートする項目を列挙する。
  - ✅ 良い例: `use fixtures::{TestServer, TestClient};`
  - ❌ 悪い例: `use fixtures::*;`
  - **例外**: ユニットテスト内での `use super::*;` のみ許可される。

**モジュール命名規約の詳細は [software-architecture.md](./docs/documentations/software-architecture.md) を参照してください。**

### Markdown

- **コードブロック記法**: ドキュメント内でテキストのみのコードブロックを記述する場合は、言語指定に `txt` を使用する。
  - ✅ 良い例: ````txt ...````
  - ❌ 悪い例: ```` ... ````（言語指定なし）
  - 対象: ディレクトリツリー、依存関係図、フロー図など、特定の言語ではないテキスト
- **ドキュメント参照記法**: ドキュメント内で他のファイルを参照する場合は、Markdown リンク形式で相対パスを使用する。
  - ✅ 良い例: `[アーキテクチャ設計](./docs/documentations/software-architecture.md)`
  - ✅ 良い例: `[タスク](./docs/tasks/20251112-032514_introduce-message-pusher.md)`
  - ❌ 悪い例: `` `docs/documentations/software-architecture.md` ``（バッククォートのみ）
  - ❌ 悪い例: `docs/documentations/software-architecture.md`（リンクなし）
  - 理由: リンク形式にすることで、エディタやビューアーでクリック可能になり、ドキュメント間の移動が容易になる

## テスト指針

### テスト階層

プロジェクトは3層のテスト戦略を採用しています：

1. **単体テスト（Unit Tests）**: ドメインロジックの純粋関数をテスト
2. **統合テスト（Integration Tests）**: プロセスベースで実際のサーバー・クライアント間通信をテスト
3. **手動 E2E テスト**: 実際のユーザーシナリオを手動で検証
   - 複数クライアントでのリアルタイムチャット
   - UI/UX の確認（プロンプト表示、カーソル制御など）

### テスト実装ガイドライン

- 非同期テストは `#[tokio::test(flavor = "multi_thread")]` を使用（統合テストでは不要）
- ドメインロジックは可能な限り純粋関数として抽出し、I/O から分離
- 副作用のある処理（時刻取得など）は trait で抽象化し、テスト時は FixedClock などを使用
- 統合テストでは `std::process::Command` を使って実際の cargo プロセスを起動
- テスト実装は twada の TDD ワークフロー（https://t-wada.hatenablog.jp/entry/canon-tdd-by-kent-beck）に従い、Red → Green → Refactor のサイクルで進める

### テストフォーマット

すべてのテストは以下のフォーマットに従って記述します：

```rust
#[test]
fn test_<名前>() {
    // テスト項目: <テストの説明>
    // given (前提条件):
    <前提条件のセットアップ>

    // when (操作):
    <テスト対象の実行>

    // then (期待する結果):
    <アサーション>
}
```

**注意事項**:

- `#[test]` はテストフレームワークに応じて適切な属性を使用します。
  - `#[test]` は同期テストを実行します。
  - `#[test(flavor = "multi_thread")]` はマルチスレッドで非同期テストを実行します。
  - `#[test(flavor = "single_thread")]` は単一スレッドで非同期テストを実行します。
  - `#[tokio::test]` は非同期テストを実行します。
- `// テスト項目:` の `:` の後には必ず半角スペースを入れる
- given/when/then の各セクション間は空行を 1 行入れる
- 各セクションのコメント後は改行してからコードを書く
