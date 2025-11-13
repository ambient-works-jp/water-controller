# タスク一覧

- ファームウェア（Arduino）
  - [x] 仮想水コントローラを作る
  - [x] フォーマット通りにシリアル出力する
  - [x] （ハードウェア）ボタンモジュール、joystick モジュールの入力を取得してシリアル出力する
  - [x] （ソフトウェア）ボタンモジュール、joystick モジュールの入力を取得してシリアル出力する
- サーバ（Rust）
  - ライブラリ
    - [serialport/serialport-rs](https://github.com/serialport/serialport-rs) 4.8.2
  - [x] シリアル通信
    - [x] シリアルを受信する
    - [x] 受信したシリアルをパースして構造体
      - コントローラの入力 `SerialInput`([@water-controller-relay/src/serial/input.rs](water-controller-relay/src/serial/input.rs))
        - ボタンの押下状態: `ButtonInput`
        - 方向キー上下左右それぞれ 3 段階の値: `ControllerInput`
    - [x] ひとまず構造体を標準出力してコントローラの入力値を確認できる
  - [x] WebSocket サーバの作成
    - [x] WebSocket サーバの起動
    - [x] 構造体を WebSocket で JSON 形式で配信する
      - 仕様メモ
        - 水コントローラから常にシリアルを読み取って送信し続ける。ボタンの押下やコントローラの状態に関わらず、操作をしなくても常に送信し続ける。
        - Rust 上は snake_case だが、JavaScript 上は camelCase に変換する。
      - メッセージ一覧
        - [x] ボタンの押下状態: メッセージ名 `button-input`、ペイロード `{ isPushed: boolean }`
        - [x] 方向キー上下左右それぞれ 3 段階の値: メッセージ名 `controller-input`、ペイロード `{ left: ControllerValue, right: ControllerValue, up: ControllerValue, down: ControllerValue }`
          - ControllerValue: `Noinput(i32) | Low(i32) | High(i32)`
            - Noinput: 0
            - Low: 1
            - High: 2
- デスクトップアプリ（Electron）
  - [ ] データ処理
    - [ ] WebSocket サーバへ接続する（再接続、切断、エラーハンドリング含め）
    - [ ] WebSocket サーバから JSON 形式のデータを受信する
    - [ ] 受信した JSON 形式のデータをパースして構造体に変換
  - [ ] UI の実装
    - [ ] 必要な UI 一覧
      - [ ] 設定画面
      - [ ] 方向キーデバッグ画面
        - [ ] 方向キーを描画
      - [ ] コンテンツ画面
        - [ ] p5.js でコンテンツを 3 つ用意する
        - [ ] ボタンモジュールを押したら方向キーを押したらコンテンツを切り替える

## タスク

### water-controller-relay の実装

#### 1. データ構造の拡張（`src/serial/input.rs`）

##### JSON シリアライズの追加

- `SerialInput`、`ButtonInput`、`ControllerInput`、`ControllerValue` に `serde::Serialize` を実装
- snake_case → camelCase 変換を `#[serde(rename_all = "camelCase")]` で対応

##### WebSocket メッセージ DTO の作成

タスクの仕様に従い、2 種類のメッセージ型を定義：

```rust
// button-input メッセージ
{
  "type": "button-input",
  "isPushed": boolean
}

// controller-input メッセージ
{
  "type": "controller-input",
  "left": number,    // 0=Noinput, 1=Low, 2=High
  "right": number,
  "up": number,
  "down": number
}
```

#### 2. WebSocket モジュールの作成（`src/websocket/mod.rs`）

##### ブロードキャストチャネルの管理

- `tokio::sync::broadcast::channel` でシリアルデータを全クライアントに配信
- 接続されたクライアントは自動的にデータを受信

##### WebSocket ハンドラ

- axum の `WebSocketUpgrade` を使用
- クライアント接続時にブロードキャストチャネルを subscribe
- 一方向配信のみ（クライアントからの受信は無視）

#### 3. 非同期リレーの実装（`src/relay.rs` の変更）

##### 非同期化

- `run_loop` を `async fn` に変更
- `SerialReader` を非同期タスクで実行

##### 並行タスクの起動

1. **シリアル読み取りタスク**: シリアルを読み→パース→ブロードキャストチャネルに送信
2. **WebSocket サーバタスク**: axum サーバを起動、クライアント接続を待機

#### 4. メインエントリの変更（`src/main.rs`）

##### Tokio ランタイムの起動

- `#[tokio::main]` マクロで非同期対応
- WebSocket サーバのアドレス/ポート設定を CLI 引数に追加（デフォルト: `127.0.0.1:8080`）

---

#### 変更ファイル一覧

- **変更**: `src/args.rs` - WebSocket ホスト・ポート引数追加
- **変更**: `src/relay.rs` - 非同期化、並行タスク起動
- **変更**: `src/serial/input.rs` - Serialize 実装、DTO 追加
- **新規**: `src/lib.rs` - ライブラリエントリポイント
- **新規**: `src/bin/server.rs` - サーババイナリ（旧 main.rs）
- **新規**: `src/bin/client.rs` - WebSocket クライアントバイナリ
- **新規**: `src/websocket/mod.rs` - モジュールの公開
- **新規**: `src/websocket/server.rs` - WebSocket サーバの実装
- **新規**: `src/websocket/handler.rs` - WebSocket ハンドラ
- **新規**: `src/websocket/message.rs` - メッセージ DTO 定義

---

#### 実装後の動作

```bash
# WebSocket サーバ起動
cargo run --bin server -- --port /dev/cu.usbmodem1101 --baud-rate 115200 --ws-port 8080

# ログ出力例
[INFO] Opening serial port: /dev/cu.usbmodem1101
[INFO] WebSocket server listening on 127.0.0.1:8080
[INFO] Connect to: ws://127.0.0.1:8080/ws

# WebSocket クライアント起動（別ターミナル）
cargo run --bin client -- --url "ws://127.0.0.1:8080/ws"

# クライアント接続時のログ
[INFO] WebSocket client connected
[DEBUG] Broadcasting: button-input {"isPushed": false}
[DEBUG] Broadcasting: controller-input {"left": 0, "right": 0, "up": 1, "down": 0}
```
