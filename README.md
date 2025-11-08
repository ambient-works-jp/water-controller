# 水コントローラー

## 環境

- Auduino 2.3.6（おそらく 2 系なら OK）
- Rust 1.90.x
- TODO: Electron 関係の依存

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
