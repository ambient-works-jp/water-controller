# タスク概要

デスクトップアプリ（Electron）の WebSocket クライアント実装と UI 開発

## ステータス

- 最終更新日時：2025-11-16 02:25:41
- 作成日時：2025-11-13 14:00:00
- ステータス：進行中

## 目的

- WebSocket サーバから水コントローラの入力データをリアルタイムで受信する
- 受信したデータに基づいて、ユーザーに対してインタラクティブな UI を提供する
- デバッグ機能と本番コンテンツの両方を実装する

## ゴール

- [ ] WebSocket クライアントが安定して動作し、サーバからのデータを確実に受信できる
- [ ] 設定画面とコンテンツ画面が実装されている
  - 設定画面: 設定タブ、接続状態タブ、ヘルプタブの 3 タブ構成
  - コンテンツ画面: 現在のデフォルト実装（Versions 表示など）をそのまま残す。デバッグモード時にコントローラ入力を可視化するオーバーレイ表示
- [ ] デバッグオーバーレイが実装され、WebSocket データを可視化できる（黒背景の半透明、角が丸い長方形）
- [ ] キーボードショートカットが実装され、設定画面の開閉、デバッグモードの切り替えができる

**注**: 具体的なビジュアルコンテンツの実装（p5.js/three.js）は [20251116-022541_desktop-app-contents-implementation.md](./20251116-022541_desktop-app-contents-implementation.md) に分離しました。

## タスク一覧

### 実装の進め方

**Phase 1: 基盤構築**:

1. TypeScript 型定義
2. WebSocket クライアントの実装（まずはコンソールログで受信確認）

**Phase 2: UI 実装**:

1. コンテンツ画面の骨組み（現在のデフォルト実装を保持）
2. デバッグモードのオーバーレイ表示（WebSocket データの可視化、黒背景の半透明、角が丸い長方形）
3. 設定画面（設定ファイル読み込み機能、3 タブ構成）

**Phase 3: 仕上げ**:

1. ショートカット機能
2. エラーハンドリングの強化
3. 動作確認と調整

**注**: ビジュアルコンテンツの実装（p5.js/three.js、コンテンツ切り替え、新規コンテンツ追加の仕組み）は別タスク [20251116-022541_desktop-app-contents-implementation.md](./20251116-022541_desktop-app-contents-implementation.md) に分離しました。

---

### データ処理の実装

#### TypeScript 型定義

- [ ] TypeScript 型定義
  - 概要: WebSocket メッセージ、設定ファイル、コントローラ入力値などの型を定義する
  - サブタスク:
    - [ ] WebSocket メッセージ型の定義
      - `ButtonInputMessage`: `{ type: "button-input", isPushed: boolean }`
      - `ControllerInputMessage`: `{ type: "controller-input", left: 0|1|2, right: 0|1|2, up: 0|1|2, down: 0|1|2 }`
      - `WsMessage`: `ButtonInputMessage | ControllerInputMessage`
    - [ ] 設定ファイル型の定義
      - `Config`: `{ ws_url: string, contents: ContentItem[], debug_mode: boolean }`
      - `ContentItem`: `{ id: string, enabled: boolean, name: string, order: number }`
    - [ ] コントローラ入力値の Enum 定義
      - `InputLevel`: `Noinput = 0 | Low = 1 | High = 2`

#### WebSocket クライアントの実装

**実装方針**: Renderer プロセスで直接 WebSocket 接続を行う（[ADR 001](../adr/adr-001-websocket-connection-in-renderer.md) を参照）

- 理由:
  - リアルタイム性が重要（IPC のオーバーヘッドを避ける）
  - 実装がシンプル（Web 開発と同じパターン）
  - デバッグのしやすさ（Chrome DevTools で確認可能）
  - 接続の永続性は不要（展示会では問題なし）
- 参考: [Electron での WebSocket 接続パターン](../notes/electron-websocket-patterns.md)

- [ ] WebSocket クライアントの実装
  - [ ] WebSocket サーバへの接続機能
  - [ ] 再接続機能の実装（自動再接続、指数バックオフ）
  - [ ] 切断処理の実装
  - [ ] エラーハンドリングの実装

#### データ受信と変換

- [ ] データ受信と変換
  - [ ] WebSocket サーバから JSON 形式のデータを受信する
  - [ ] 受信した JSON データをパースして TypeScript の型に変換する（通信仕様は [@spec.md](../../spec.md) を参照）
  - [ ] `button-input` メッセージの処理
  - [ ] `controller-input` メッセージの処理

### UI の実装

起動時のデフォルトの画面はコンテンツ画面。ダークテーマで作る。

#### 設定画面の実装

- [ ] 設定画面の実装
  - 概要: タブで分かれた設定画面。右上に閉じるボタンがあり、閉じるとコンテンツ画面に切り替わる
  - サブタスク:
    - [ ] 「設定」タブの実装
      - 概要: JSON ファイルの設定を読み取り専用で表示し、再読み込みボタンで設定を反映する画面
      - 永続化先: `$HOME/.water-controller-app/config.json`（ないときは初回起動時に作成）
      - デフォルト設定: `water-controller-app/config/config.default.json` を作成
      - 設定の編集フロー:
        1. `$HOME/.water-controller-app/config.json` をテキストエディタで編集
        2. アプリの設定タブで「設定を再読み込み」ボタンを押す
        3. アプリケーションに設定が反映され、設定タブにも最新の設定が表示される
      - 設定項目 (`config.json`) - すべて読み取り専用で表示:
        - [ ] WebSocket サーバの接続先設定
          - UI: 読み取り専用テキスト表示
          - フィールド名: `ws_url`
          - デフォルト値: `ws://127.0.0.1:8080/ws`
        - [ ] コンテンツ一覧、順序設定
          - UI: 読み取り専用リスト表示（`name`, `enabled`, `order` を表示、順序は 0-origin）
          - フィールド名: `contents`
          - デフォルト値: `[]`
          - 型: `{ id: string, enabled: boolean, name: string, order: number }[]`
          - 説明: コンテンツのプレイリスト。`id` はコンテンツの一意の ID。`name` はコンテンツの名前、人間が識別しやすくする。`enabled` はコンテンツの有効/無効。`order` はコンテンツの表示順序
          - 動作:
            - `enabled` が true のコンテンツのみコンテンツ画面で回る
            - `order` が小さいものから順に回る
            - コンテンツリストの末尾まで行ったら先頭に戻る
            - 設定再読み込み後はコンテンツ画面は順序 0 のコンテンツに切り替わる
            - コンテンツが全てゼロの場合、デフォルトコンテンツが表示される（`config.json` では管理しない、フォールバック）
            - コンテンツの削除は、config.json からエントリを削除し、ファイル自体も削除する
        - [ ] デバッグモードのオン・オフ
          - UI: 読み取り専用テキスト表示（ON/OFF）
          - フィールド名: `debug_mode`
          - 説明: デバッグモードがオンの場合はコンテンツ画面に表示される情報が増える
      - 設定を再読み込みボタン:
        - 押下すると `config.json` を再読み込みし、アプリケーションに反映
        - 読み込み中はボタンを無効化する
        - 読み込み成功後はボタンを有効化し、成功メッセージをポップアップで下からスライドインして表示する。バツボタンでポップアップを閉じる
        - エラー時の処理:
          - **FileNotFound**: config.json が存在しない場合
            - エラーメッセージ: 「設定ファイルが見つかりません。デフォルト設定を使用します。」
            - デフォルト設定を適用
          - **InvalidFormat**: JSON のパースに失敗した場合（構文エラー、不正な形式など）
            - エラーメッセージ: 「設定ファイルの形式が不正です。デフォルト設定を使用します。」
            - エラー詳細（行番号など）も表示
            - デフォルト設定を適用
          - **PermissionError**: ファイルの読み込み権限がない場合
            - エラーメッセージ: 「設定ファイルの読み込み権限がありません。」
      - [ ] 設定ファイル読み込み機能の実装
        - 概要: アプリ起動時と「設定を再読み込み」ボタン押下時に config.json を読み込む
        - 実装方法:
          - Electron メインプロセスで fs モジュールを使用して読み込み
          - IPC 通信でレンダラープロセスに送信
        - 初回起動時の処理:
          - `$HOME/.water-controller-app/` ディレクトリがなければ作成
          - `config.default.json` を `config.json` としてコピー
        - エラーハンドリング:
          - **FileNotFound**: デフォルト設定を使用
          - **InvalidFormat**: エラーメッセージ表示（詳細含む）、デフォルト設定を使用
          - **PermissionError**: エラーメッセージ表示
    - [ ] 接続状態タブの実装
      - 概要: WebSocket の接続情報を表示する
      - 表示項目:
        - URL
        - プロトコル
        - ホスト
        - ポート
        - 接続状態: Connected (淡い緑の文字) / Disconnected (赤の文字)
    - [ ] ヘルプタブの実装
      - 概要: キーボードショートカットの一覧を表示する
      - キーボードショートカット:
        - 設定画面を開く: `Cmd + M`
        - ページをリロード（描画がおかしい、接続が切れた）: `Cmd + R`
        - デバッグモードをオン・オフ: `Cmd + D`
        - Inspector を開く: `Cmd + I`（Electron の Inspector を開くデフォルトのショートカットは `F12`）

#### コンテンツ画面の実装

- [ ] コンテンツ画面の骨組み
  - 概要: 現在のデフォルト実装（Versions 表示など）をコンテンツ画面としてそのまま保持する
  - 入力: ControllerInput メッセージのみ
  - サブタスク:
    - [ ] 現在の実装を保持し、コンテンツ画面として配置
    - [ ] デバッグモード時の表示
      - 概要: コンテンツの上にオーバーレイする。黒背景の半透明、角が丸い長方形
      - デザイン仕様:
        - 背景色: `rgba(0, 0, 0, 0.7)` (黒、70% 不透明度)
        - 角の丸み: `border-radius: 12px`
      - 表示項目:
        - 左下に接続情報、FPS を表示
        - コントローラの入力（ボタン、コントローラの各軸の値）をコントローラっぽく可視化
        - 接続が Disconnected の場合は、自動でデバッグモードをオンにして、エラーメッセージを表示

**注**: ビジュアルコンテンツの実装（p5.js/three.js、コンテンツ切り替え、新規追加の仕組み）は別タスク [20251116-022541_desktop-app-contents-implementation.md](./20251116-022541_desktop-app-contents-implementation.md) に分離しました

#### ショートカットの実装

- [ ] ショートカットの実装
  - 概要: キーボードショートカットでアプリを操作できるようにする
  - サブタスク:
    - [ ] 設定画面を開く: `Cmd + M`
    - [ ] ページをリロード（描画がおかしい、接続が切れた）: `Cmd + R`
    - [ ] デバッグモードをオン・オフ: `Cmd + D`
    - [ ] Inspector を開く: `Cmd + I`（Electron の Inspector を開くデフォルトのショートカットは `F12`）

## 参考資料

- [Electron 基礎ガイド for React 開発者](../documentations/electorn-basic.md) - React と Electron の違い、プロセス構造、IPC 通信
- [シリアル通信と WebSocket サーバの実装タスク](./20251109233530_serial-communication-and-websocket-server.md)
- プロジェクトルートの `spec.md` - 通信仕様
- `water-controller-app/` - Electron アプリのコードベース
  - `src/renderer/` - UI ロジック
  - `src/main/` - メインプロセス
  - `src/preload/` - ブリッジ
