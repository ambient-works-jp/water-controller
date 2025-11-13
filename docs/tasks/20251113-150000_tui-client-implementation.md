# タスク概要

水コントローラの入力を可視化する TUI (Terminal User Interface) クライアントの実装

## ステータス

- 最終更新日時：2025-11-13 15:00:00
- 作成日時：2025-11-13 15:00:00
- ステータス：未着手

## 目的

- WebSocket サーバから受信した水コントローラの入力をリアルタイムで可視化する
- 十字キー（上下左右 2 段階）とボタンの状態を視覚的に表示する
- 接続情報やログを確認できる TUI を提供する
- デバッグやデモに使用できるリッチなクライアントを実装する

## ゴール

- [ ] タブバー付きの TUI が動作する（Visual | TextLog | Connection | Close）
- [ ] Visual タブで十字キーとボタンの状態がリアルタイムで可視化される
- [ ] TextLog タブで受信メッセージがスクロール可能な形で表示される
- [ ] Connection タブで接続情報（URL、プロトコル、ホスト、ポート）が表示される
- [ ] Close タブで終了確認ができる

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
