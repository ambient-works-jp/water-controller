# 水コントローラー

HOMEWORKS 2026 出展作品「水コントローラー」のリポジトリ

## コンセプト

```md
# 水コントローラー

## 作品概要
水位計を利用して、水面の波を利用したコントローラーを作成し、そのコントローラーを使用したインタラクションコンテンツを展開する。
インタラクションの内容によってコントローラーとして触れる水の感じ方の変化を探る作品

## 展示方法

100×100×40の程度のトレイ型コントローラーとディスプレイを設置し、実際に触れて体験を行う形態で展示を行います。

## ステートメント

水は古代ギリシャの時代アルケー(万物の根源)として考えられていた。水は様々なモノを時に混ぜ、流し、運ぶ。如何様にも形態を変えてそこにある存在でもある。この水をコントロールする媒体としたとき、水そのものがもつ性質に触れることができるだろうか？コントローラーという支配、操作を行うための形態として水に触れるときその関係性は普遍的なものであるのだろうか？
```

## 環境

- Auduino 2.3.6（おそらく 2 系なら OK）
- Rust 1.90.x
- Node.js 22.21.x (おそらく 22 系なら OK)
- (Optional) [Task](https://taskfile.dev/docs/installation) 3.45.5

## システム構成

ref: [2025.10.28 HOMEWORKS 2026 - 水コントローラー システム構成](https://miro.com/app/board/uXjVKH3yhHE=/?moveToWidget=3458764646019356328&cot=14)

![システム構成 v20251028](./docs/images/system-architecture-v20251028.png)

## プロジェクト構造

- `water-controller-firmware`
  - 概要
    - 水コントローラのファームウェア
    - 静電容量センサー（[Adafruit MPR121](https://www.switch-science.com/products/1867?srsltid=AfmBOopVHqa4pcuXX1mcOF-6RVSKLl7RrhzxnQegAAV37uN7NLxMTKxW)）の値（0 / 1）を取得し、シリアルポートに出力するファームウェア
  - 技術スタック
    - Arduino
    - ハードウェア
      - Adafruit MPR121 1.2.0
- `water-controller-relay`
  - 概要
    - 水コントローラのシリアルポートからデータを読み取り、WebSocket でクライアントに配信する中継サーバ（リレーサーバ）
  - 技術スタック
    - Rust
- `water-controller-app`
  - 役割
    - 水コントローラー用のユーザコンテンツを提供するデスクトップアプリ
    - WebSocket で relay サーバと通信する
  - 技術スタック
    - TypeScript
    - Electron
    - p5.js
    - Three.js
    - ビルドツール
      - pnpm
      - [electron-vite](https://evite.netlify.app/guide/introduction)

## セットアップ

### Auduino のインストール

以下を参照：

https://support.arduino.cc/hc/en-us/articles/360019833020-Download-and-install-Arduino-IDE

### Rust のインストール

以下のリンクの手順に従って rustup をインストール：

https://rust-lang.org/ja/learn/get-started/

バージョンを確認：

```sh
cargo --version
# こんな感じで出力されれば OK
# cargo 1.90.0 (840b83a10 2025-07-30)
```

### Node.js のインストール

nvm（Node.js バージョンマネージャ）をインストールした後、Node.js v22.21.1 をインストールする：

ref: https://nodejs.org/en/download

```sh
# nvm をインストール
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# シェルを再起動する前に以下を実行
\. "$HOME/.nvm/nvm.sh"

# Node.js v22.21.1 をインストール
nvm install v22.21.1

# インストールされている Node.js の一覧
nvm ls

# Node.js v22.21.1 を使用する
nvm use v22.21.1

# Node.js v22.21.1 の確認
node -v # "v22.21.1" と出力されれば OK

# npm の確認
npm -v # "10.9.4" と出力されれば OK
```

pnpm をインストール：

```sh
# pnpm をインストール
npm install -g pnpm@latest-10

# pnpm のバージョン確認
pnpm -v # "10.x.x" と出力されれば OK
```

## 実行

### ファームウェア `water-controller-firmware`

1. マイコン（Arduino UNO R3）を PC に接続
2. Arduino IDE 経由でスケッチ `water-controller-firmware/WaterControllerFirmwareProto/WaterControllerFirmwareProto.ino` をコンパイルし、マイコンに書き込む
3. マイコンを起動する

### センサー中継サーバ `water-controller-relay`

作業ディレクトリへ移動：

```sh
cd water-controller-relay
```

以降、`water-controller-relay` ディレクトリで作業することを前提とする。

#### 開発コマンド

- 使用可能なシリアルデバイスの一覧

```sh
cargo run --bin server -- device-list
```

<details>
<summary>出力例：使用可能なシリアルデバイスの一覧</summary>

```txt
Listing available serial ports:
name: /dev/cu.SoundcoreLibertyAir2Pro, type=PciPort
name: /dev/tty.SoundcoreLibertyAir2Pro, type=PciPort
name: /dev/cu.HUAWEIFreeClip, type=PciPort
name: /dev/tty.HUAWEIFreeClip, type=PciPort
name: /dev/cu.Bluetooth-Incoming-Port, type=PciPort
name: /dev/tty.Bluetooth-Incoming-Port, type=PciPort
name: /dev/cu.usbmodem1101, type=UsbPort(UsbPortInfo { vid: 0x2341, pid: 0x0043, serial_number: Some("0353534333535160C0A3"), manufacturer: Some("Arduino (www.arduino.cc)"), product: None })
name: /dev/tty.usbmodem1101, type=UsbPort(UsbPortInfo { vid: 0x2341, pid: 0x0043, serial_number: Some("0353534333535160C0A3"), manufacturer: Some("Arduino (www.arduino.cc)"), product: None })
```

</details>

- サーバ実行（シリアル読み取り & WebSocket 配信）

```sh
cargo run --bin server -- --port "/dev/cu.usbmodem1101" --baud-rate 115200 --ws-port 8080

# 省略形
cargo run --bin server -- -p "/dev/cu.usbmodem1101" -b 115200
```

- WebSocket サーバのテスト用クライアント実行（別ターミナル）

```sh
cargo run --bin client -- --url "ws://127.0.0.1:8080/ws"

# 省略形
cargo run --bin client -- -u "ws://127.0.0.1:8080/ws"
```

- TUI クライアント実行（別ターミナル）

```sh
cargo run --bin tui-client -- --url "ws://127.0.0.1:8080/ws"
```

- ヘルプ

```sh
cargo run --bin server -- help
cargo run --bin client -- help
cargo run --bin tui-client -- help
```

- ビルド

```sh
# debug ビルド
cargo build

# release ビルド
cargo build --release
```

- [本番環境] サーバ実行

```sh
# server
./target/release/server -p "/dev/cu.usbmodem1101" -b 115200

# client
./target/release/client -u "ws://127.0.0.1:8080/ws"

# tui-client
./target/release/tui-client -u "ws://127.0.0.1:8080/ws"
```

#### 開発コマンド with Task

- ヘルプ
  - コマンドを何も入力せずに実行すると、実行できるタスク一覧が表示される。

```sh
task
```

- format / lint / check / test

```sh
task fmt
task lint
task check
task test

# 全部実行
task ci
```

- サーバ実行
  - シリアルポート、ボーレート、WebSocket ポートを指定
  - 省略時は `SERIAL_PORT=/dev/cu.usbmodem1101`, `BAUD_RATE=115200`, `WS_PORT=8080`

```sh
task run-server

# option 設定
# 下記はデフォルト値。指定しない場合はデフォルト値が適用される。
task run-server SERIAL_PORT=/dev/cu.usbmodem2101 BAUD_RATE=115200 WS_PORT=8080
```

- WebSocket サーバのテスト用クライアント実行

```sh
task run-cli

# option 設定
# 下記はデフォルト値。指定しない場合はデフォルト値が適用される。
task run-cli URL=ws://127.0.0.1:8080/ws
```

- TUI クライアント実行

```sh
task run-tui

# option 設定
# 下記はデフォルト値。指定しない場合はデフォルト値が適用される。
task run-tui URL=ws://127.0.0.1:8080/ws
```

- ビルド

```sh
# debug ビルド
task build

# release ビルド
task build-release
```

#### tips: トラブルシューティング

- **古いサーバープロセスが残っている場合**

WebSocket サーバーの起動に失敗する場合や、クライアント接続時にエラーが発生する場合、古いサーバープロセスが残っている可能性があります。

```sh
# 実行中のサーバープロセスを確認
ps aux | grep -E "target/debug|target/release|cargo run" | grep -v grep

# ポート番号で検索
lsof -i:8080

# プロセスを停止（PID は上記コマンドで確認）
kill <PID>

# 例：PID が 12345 の場合
kill 12345
```

複数のプロセスが見つかった場合は、すべて停止してから新しいサーバーを起動してください。

### デスクトップアプリ `water-controller-app`

作業ディレクトリへ移動：

```sh
cd water-controller-app
```

以降、`water-controller-app` ディレクトリで作業することを前提とする。

#### 開発環境

- 初回セットアップ：依存関係のインストール（初回のみ実行）

```sh
pnpm install
```

- 開発サーバの実行
  - デスクトップアプリが起動する

```sh
pnpm dev
```

#### 本番環境（macOS 前提）

- デスクトップアプリのビルド
  - 本番環境を立ち上げるときだけアプリケーションバンドルを作る。開発環境では `pnpm dev` で十分。
  - 環境によるが 30 秒 ~ 1 分程度かかる。
  - 配布しないのでコード署名を無効化してビルドする。

```sh
CSC_IDENTITY_AUTO_DISCOVERY=false pnpm build:mac
```

- デスクトップアプリの起動

```sh
open dist/mac-arm64/WaterController.app
# デスクトップアプリが起動すれば OK!
```

#### ログの確認方法

アプリケーションのログは JSON Lines 形式で以下の場所に出力されます：

```bash
# macOS
~/Library/Logs/water-controller-app/main.log
```

ログファイルをリアルタイムで監視：

```bash
# macOS/Linux
tail -f ~/Library/Logs/water-controller-app/main.log
```

[docs/notes/logging-strategy.md](./docs/notes/logging-strategy.md) を参照してください。
