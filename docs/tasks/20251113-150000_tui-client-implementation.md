# タスク概要

水コントローラの入力を可視化する TUI (Terminal User Interface) クライアントの実装

## ステータス

- 最終更新日時：2025-11-14 XX:XX:XX
- 作成日時：2025-11-13 15:00:00
- ステータス：完了

## 目的

- WebSocket サーバから受信した水コントローラの入力をリアルタイムで可視化する
- 十字キー（上下左右 2 段階）とボタンの状態を視覚的に表示する
- 接続情報やログを確認できる TUI を提供する
- tracing のログをメモリに保持して表示する
- デバッグやデモに使用できるリッチなクライアントを実装する

## ゴール

- [x] タブバー付きの TUI が動作する（Monitor | History | Connection | Log | Help）
- [x] Monitor タブで十字キーとボタンの状態がリアルタイムで可視化される
- [x] History タブで受信メッセージがスクロール可能な形で表示される（最新ログが下）
- [x] Connection タブで接続情報（URL、プロトコル、ホスト、ポート）が表示される
- [x] Log タブで tracing ログがスクロール可能な形で表示される（最新ログが下）
- [x] Help タブで操作方法が表示される
- [x] tracing ログがファイルではなくメモリに保持される
- [x] WebSocket 初回接続失敗時に自動リトライ（10回、3秒間隔）
- [x] Monitor タブに FPS と接続状態を表示
- [x] 接続切断時にコントローラがグレーアウト
- [x] ANSI カラー対応（Log タブ）
- [x] スクロール位置が最下部にデフォルト設定され、自動追従機能付き

## 使い方

### ビルド

```bash
cd water-controller-relay
cargo build --bin tui-client --release
```

### 実行

```bash
# デフォルト（ws://127.0.0.1:8080/ws に接続）
cargo run --bin tui-client --release

# カスタム URL を指定
cargo run --bin tui-client --release -- --url ws://localhost:8080/ws
```

### 操作方法

- **タブ切り替え**:
  - `1-5` キー: 各タブに直接移動
  - `Tab` キー: 次のタブへ
  - `Shift+Tab` キー: 前のタブへ
  - `←` `→` キー: 前後のタブに移動
- **スクロール（History/Log タブのみ）**:
  - `↑` `↓` キー: 上下にスクロール
- **終了**:
  - `Escape` または `q` キー: 即座に終了

### 各タブの機能

1. **Monitor タブ**: 十字キー（上下左右 × 2段階）とボタンの状態を可視化
   - 白: 未入力
   - 赤: 入力あり（LOW または HIGH）
   - 黄: ボタン押下（中央の丸）
   - 接続切断時: 全てのボタンが DarkGray でグレーアウト
   - 左下に FPS と接続状態を表示
     - FPS: 小数点第2位まで表示（接続時: White、切断時: Gray）
     - Connection Status: Connected (LightGreen) / Disconnected (Red)

2. **History タブ**: 受信したメッセージをスクロール可能な形で表示
   - WebSocket メッセージのみ（ButtonInput, ControllerInput）
   - 最新のログが下に表示される（降順）
   - ↑↓ キーでスクロール可能
   - 選択行は反転表示（REVERSED）
   - デフォルトで最下部に自動スクロール（上にスクロールすると自動追従停止）

3. **Connection タブ**: WebSocket 接続情報を表示
   - URL, Protocol, Host, Port, Status
   - Status は色付き表示（Connected: LightGreen、Disconnected: Red）

4. **Log タブ**: tracing ログをスクロール可能な形で表示
   - 内部ログ（INFO, WARN, ERROR など）
   - ANSI カラーコード対応（色付きで表示）
   - 最新のログが下に表示される（降順）
   - ↑↓ キーでスクロール可能
   - 選択行は反転表示（REVERSED）
   - デフォルトで最下部に自動スクロール（上にスクロールすると自動追従停止）

5. **Help タブ**: 操作方法を表示
   - キーバインド一覧

## タスク一覧

### Phase 1: 基本構造とUI状態管理

- [ ] TUI 用のデータ構造定義
  - [ ] `AppState` の実装（現在のタブ、入力状態、接続情報、メッセージログ）
  - [ ] `Tab` enum の実装（Visual, TextLog, Connection, Close）
  - [ ] `InputState` の実装（button: bool, controller: [上下左右の入力状態]）
- [ ] UI 描画の基本フレームワーク
  - [ ] タイトル表示（`{package_name}-{version}`）
  - [ ] タブバー描画関数の実装
  - [ ] タブ切り替えロジック（数字キー 1-4、左右矢印キー）

### Phase 2: 各タブの実装

- [ ] Visual タブ
  - [ ] レイアウト計算（中央ボタン + 十字配置 8 方向）
  - [ ] 中央ボタン描画（丸、未押下: White / 押下: LightYellow）
  - [ ] 方向キー描画（正方形 × 8、未押下: White / 押下: LightRed）
  - [ ] 入力状態の反映（WebSocket メッセージに基づく色変更）
- [ ] TextLog タブ
  - [ ] `Vec<String>` でログ保持
  - [ ] スクロール機能（ratatui の `List` widget + 上下キー）
  - [ ] WebSocket メッセージの整形表示
- [ ] Connection タブ
  - [ ] URL 解析（プロトコル、ホスト、ポート）
  - [ ] 接続状態表示（Connected / Disconnected）
  - [ ] 統計情報表示（受信メッセージ数、接続時間など）
- [ ] Close タブ
  - [ ] 終了確認 UI（"Press Y to quit, N to cancel"）
  - [ ] Y/N 入力処理

### Phase 3: WebSocket 統合

- [ ] 非同期処理の統合
  - [ ] tokio::spawn で WebSocket 受信と TUI 描画を並行実行
  - [ ] tokio::sync::mpsc でメッセージを受け渡し
  - [ ] JSON デシリアライズ（ButtonInputMessage, ControllerInputMessage）
- [ ] 入力ハンドリング
  - [ ] crossterm::event でキーボード入力処理
  - [ ] タブ切り替え（1-4、左右矢印）
  - [ ] TextLog スクロール（上下矢印）
  - [ ] 終了処理（Close タブで Y/N、または q キーで即座終了）

### Phase 4: エラー処理と仕上げ

- [ ] エラーハンドリング
  - [ ] WebSocket 切断時の挙動
  - [ ] JSON パースエラー表示
  - [ ] 再接続ロジック（オプション）
- [ ] リファクタリングと最適化
  - [ ] モジュール分割の検討（必要に応じて）
  - [ ] パフォーマンス調整（描画頻度の最適化）
  - [ ] コメント・ドキュメント整備

## 仕様の詳細

### WebSocket メッセージフォーマット

2 種類のメッセージを受信：

- **button-input**

```json
{
  "type": "button-input",
  "isPushed": true/false
}
```

- **controller-input**

```json
{
  "type": "controller-input",
  "left": 0/1/2,
  "right": 0/1/2,
  "up": 0/1/2,
  "down": 0/1/2
}
```

値の意味：

- 0: NOINPUT（未入力）
- 1: LOW（弱い入力）
- 2: HIGH（強い入力）

### Visual タブのレイアウト

```txt
       [up_high]
       [up_low]
[left_high] [left_low] [button] [right_low] [right_high]
       [down_low]
       [down_high]
```

- 中央: ボタン（丸）
- 各方向: 2 段階の正方形（LOW と HIGH）
- 計 9 個の UI 要素

### カラーマッピング

- **ボタン**:
  - 未押下: `Color::White`
  - 押下: `Color::LightYellow`

- **方向キー（各方向 2 つずつ）**:
  - NOINPUT (0): `Color::White`
  - LOW (1) または HIGH (2): `Color::LightRed`

## 参考資料

### 実装参考

- [binsider](https://github.com/orhun/binsider) - タブバー実装の参考
- [crossword/crosstui](https://github.com/MatrixFrog/crossword/blob/main/crosstui/src/main.rs) - UI 実装とカラースタイルの参考
- [Ratatui 入門 - Zenn](https://zenn.dev/helloyuki/articles/e9f25dc546b280) - ratatui の基本

### プロジェクト内資料

- `water-controller-relay/src/bin/client.rs` - ベースとなる WebSocket クライアント実装
- `water-controller-relay/src/message.rs` - メッセージ型定義
- `docs/notes/20251113_serial-broadcast-strategy.md` - ブロードキャスト戦略

## 実装詳細（2025-11-13 追加）

### タブ構成の変更

- **削除**: Close タブ（終了確認UI）
- **追加**:
  - Log タブ: tracing ログの表示（スクロール可能）
  - Help タブ: 操作方法の表示
- **変更**: Visual → Monitor, TextLog → History にタブ名変更

### tracing ログのメモリ保持

#### 実装方針

ファイル出力は負債になるため、完全にメモリ内で管理する方式を採用。

#### 実装内容

1. **カスタム Logger の実装** (`src/tui/logger.rs`)
   - `ChannelWriter`: `Write` trait を実装し、ログを mpsc チャネルに送信
   - `logger_init_tui()`: TUI 用のロガー初期化関数
   - ANSI カラーコードを無効化して、ターミナルに影響を与えない

2. **メインループでのログ受信** (`src/tui/mod.rs`)
   - `run()` 関数に `log_rx: mpsc::UnboundedReceiver<String>` を追加
   - メインループで `log_rx.try_recv()` でログを受信
   - `app_state.add_log_message()` でログを VecDeque に追加

3. **AppState の拡張** (`src/tui/app.rs`)
   - `log_messages: VecDeque<String>`: tracing ログを保持
   - `history_scroll_state: ListState`: History タブのスクロール状態
   - `log_scroll_state: ListState`: Log タブのスクロール状態
   - `add_log_message()`: ログ追加メソッド（上限 100 件）

### スクロール機能の実装

#### History タブ

- `List` widget + `ListState` を使用
- `render_stateful_widget()` で描画
- ↑↓ キーでスクロール可能
- 最新のログが下に表示される（降順）

#### Log タブ

- History タブと同様の実装
- tracing ログ専用

#### キーバインド

- `↑`: 上にスクロール
- `↓`: 下にスクロール
- History または Log タブでのみ有効

### Help タブの実装

- キーバインド一覧を静的に表示
- タブナビゲーション、スクロール、終了方法を記載

### その他の改善

- フッターに "Press <Escape> to close." を表示（左寄せ）
- ボタンのパディング: "PUSHED" を 8 文字幅に揃えて "RELEASED" とレイアウトを統一
- Escape キーでどこからでも即座に終了可能
- Tab/Shift+Tab でタブ切り替え可能

## 実装詳細（2025-11-14 追加）

### WebSocket 再接続ロジック

#### 実装方針

初回接続失敗時に自動リトライすることで、サーバ起動を待つことができるように改善。

#### 実装内容 (`src/tui/websocket.rs`)

- 定数の追加:
  - `MAX_RETRY_COUNT = 10`: 最大リトライ回数
  - `RETRY_INTERVAL_SECS = 3`: リトライ間隔（秒）
- 接続処理の変更:
  - 初回接続失敗時に最大 10 回まで自動リトライ
  - 各リトライの間に 3 秒待機
  - リトライごとにログ出力（warn レベル）
  - 10 回失敗した場合はエラーを返して終了

### ANSI カラー対応

#### 実装方針

tracing ログの色付き表示を実現するため、ANSI エスケープコードを解析して表示。

#### 実装内容

1. **依存関係の追加** (`Cargo.toml`)
   - `ansi-to-tui = "7.0.0"` を追加

2. **ロガーの変更** (`src/tui/logger.rs`)
   - `.with_ansi(true)` に変更（ANSI カラーコードを有効化）

3. **Log タブの描画** (`src/tui/ui.rs`)
   - `ansi_to_tui::IntoText` を使用して ANSI エスケープコードを解析
   - パース失敗時はプレーンテキストにフォールバック

### Connection Status の色付け

#### 実装内容 (`src/tui/ui.rs`)

- Connection タブの Status 表示:
  - Connected: `Color::LightGreen`
  - Disconnected: `Color::Red`

### Monitor タブの改善

#### FPS 表示と接続状態表示 (`src/tui/ui.rs`, `src/tui/app.rs`)

1. **FPS 計算の実装**:
   - `AppState` に FPS 計算用フィールドを追加:
     - `last_frame_time: Option<Instant>`: 最後のフレーム時刻
     - `fps: f64`: FPS（指数移動平均）
   - EMA（指数移動平均、alpha=0.1）で滑らかな FPS 値を計算
   - メインループで毎フレーム `update_fps()` を呼び出し

2. **Monitor タブ左下への表示**:
   - FPS: 小数点第2位まで表示
     - 接続時: White
     - 切断時: Gray（"N/A" と表示）
   - Connection Status:
     - ラベル: 接続時 White、切断時 Gray
     - ステータス: Connected (LightGreen) / Disconnected (Red)

#### 接続切断時のグレーアウト (`src/tui/ui.rs`)

- `app_state.is_connected` をチェック
- 接続が切れている場合、十字キー8方向 + 中央ボタン全てを `Color::DarkGray` で表示

#### レイアウト調整 (`src/tui/ui.rs`)

- ボタンと上下 LOW 正方形の間隔を拡大:
  - 新しい定数 `vertical_gap_to_button = 3` を追加
  - 以前は `gap = 1` だけで管理していた隙間を、ボタン専用の変数で調整

### スクロール機能の改善

#### デフォルト位置を最下部に設定 (`src/tui/app.rs`)

- `add_log()` と `add_log_message()` メソッドを改善:
  - ログ追加前に現在のスクロール位置が最下部にあるかチェック
  - 最下部にいる場合のみ、新しいログ追加後も自動的に最下部にスクロール
  - 上にスクロールしている場合は現在の位置を維持（自動追従停止）
- これにより、デフォルトで最新ログが表示されつつ、過去ログを見る際は自動スクロールされない

### UI スタイルの改善

#### History/Log タブのハイライトスタイル (`src/tui/ui.rs`)

- `Color::Yellow` から `Modifier::REVERSED` に変更
- 選択行が反転表示されるようになり、視認性が向上

#### タブバーのハイライトスタイル (`src/tui/ui.rs`)

- 選択タブの色を `Color::Yellow` から `Color::LightCyan` に変更
- 太字表示は維持（`Modifier::BOLD`）
