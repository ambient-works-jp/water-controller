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
- TODO: Electron 関係の依存

## システム構成

ref: [2025.10.28 HOMEWORKS 2026 - 水コントローラー システム構成](https://miro.com/app/board/uXjVKH3yhHE=/?moveToWidget=3458764646019356328&cot=14)

![システム構成 v20251028](./docs/images/system-architecture-v20251028.png)

## プロジェクト構造

- `water-controller-firmware`
  - 概要
    - 静電容量センサー（[Adafruit MPR121](https://www.switch-science.com/products/1867?srsltid=AfmBOopVHqa4pcuXX1mcOF-6RVSKLl7RrhzxnQegAAV37uN7NLxMTKxW)）のアナログ値を取得し、シリアルポートに出力するファームウェア
  - 技術スタック
    - Arduino
      - Adafruit MPR121 1.2.0
      - j
- `water-controller-relay`
  - 概要
    - Arduino のシリアル通信を受信して、WebSocket でクライアントに配信する中継サーバ（リレーサーバ）
  - 技術スタック
    - Rust
- `water-controller-app`
  - 役割
    - ユーザコンテンツを提供するデスクトップアプリ
    - WebSocket で relay サーバと通信する
  - 技術スタック
    - TypeScript
    - Electron
    - p5.js
    - Three.js

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

### TODO: Electron 関係の依存

TODO

## 実行

### ファームウェア

1. マイコン（Arduino UNO R3）を PC に接続
2. Arduino IDE 経由でスケッチ `water-controller-firmware/WaterControllerFirmwareProto/WaterControllerFirmwareProto.ino` をコンパイルし、マイコンに書き込む
3. マイコンを起動する

### `water-controller-relay`

- ビルド

```sh
cd water-controller-relay
cargo build
```

（以降、ビルド済み、かつ `water-controller-relay` ディレクトリにいる前提）

- 使用可能なシリアルデバイスの一覧

```sh
./target/debug/water-controller-relay device-list
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

- 実行

```sh
./target/debug/water-controller-relay --port "/dev/cu.usbmodem1101" --baud-rate 115200

# 省略形
./target/debug/water-controller-relay -p "/dev/cu.usbmodem1101" -b 115200
```

- ヘルプ

```sh
./target/debug/water-controller-relay help
```
