# タスク概要

デスクトップアプリ（Electron）のビジュアルコンテンツ実装

## ステータス

- 最終更新日時：2025-11-16 02:25:41
- 作成日時：2025-11-16 02:25:41
- ステータス：未着手

## 目的

- p5.js と three.js を使用したビジュアルコンテンツを実装する
- コンテンツの切り替え機能を実装する
- 新規コンテンツを追加しやすい仕組みを構築する

## 前提条件

このタスクは [20251113-140000_desktop-app-websocket-and-ui.md](./20251113-140000_desktop-app-websocket-and-ui.md) が完了していることを前提とします：

- WebSocket クライアントが実装済み
- 設定画面が実装済み
- デバッグオーバーレイが実装済み

## ゴール

- [ ] p5.js と three.js がReact アプリに統合されている
- [ ] 3 つのビジュアルコンテンツ（波紋、パーティクル、3D 水）が実装されている
- [ ] ボタン入力によってコンテンツの切り替えができる
- [ ] 新規コンテンツを追加するための仕組みが整っている

## タスク一覧

### ライブラリのセットアップ

- [ ] ライブラリのセットアップ
  - 概要: p5.js と three.js を React アプリに統合する
  - サブタスク:
    - [ ] p5.js のセットアップ
      - インストール: `pnpm add p5 @types/p5`
      - React コンポーネントへの統合
    - [ ] three.js のセットアップ
      - インストール: `pnpm add three @types/three`
      - React コンポーネントへの統合

### コンテンツの実装

- [ ] コンテンツの実装
  - 参考情報: [p5.js の example](https://beta.p5.js.org/examples/)
  - サブタスク:
    - [ ] コンテンツ 1: 波紋エフェクト
      - 概要: 方向キーで波紋の源を動かし、そこから水の波紋が広がるイメージ
      - 使用ライブラリ: p5.js
    - [ ] コンテンツ 2: パーティクルエフェクト
      - 概要: 方向キーでパーティクルの源を動かし、そこからパーティクルが飛び散るイメージ
      - 使用ライブラリ: p5.js
    - [ ] コンテンツ 3: 3D 水表現
      - 概要: three.js を使った 3D 空間での水の表現、方向キーでカメラまたは水のオブジェクトを動かす
      - 使用ライブラリ: three.js
    - [ ] デフォルトのコンテンツ
      - 概要: コンテンツのリストがゼロ、または全てのコンテンツが無効化されている場合に表示される。1 つでも有効化されていれば表示しない
      - デザイン: [水が波打っているかのような表示](https://openprocessing.org/sketch/2689119/#code)
      - カスタマイズ: `letters` を `Water Controller` に変更

### コンテンツ切り替え機能

- [ ] コンテンツの切り替え機能
  - サブタスク:
    - [ ] ButtonInput メッセージが 1 のとき、次のコンテンツに切り替わる
    - [ ] 選択したコンテンツに切り替わる

### 新規コンテンツ追加の仕組み

- [ ] 新規コンテンツを追加しやすい仕組み
  - 概要: コンテンツのテンプレートを用意し、追加時に自動で `config.json` に登録される
  - サブタスク:
    - [ ] コンテンツファイルの配置ルール策定
      - 配置先: `water-controller-app/src/renderer/src/contents/`
      - ファイル名規則: `<id>.ts` または `<id>.tsx`
      - 例: `contents/ripple-wave.tsx`, `contents/particle-explosion.tsx`
    - [ ] 自動検出の仕組み実装
      - アプリ起動時に `contents/` ディレクトリをスキャン
      - 検出したファイルと `config.json` の `contents` を比較
      - 新規ファイルがあれば `config.json` に追加（`enabled: false`, `order` は末尾）
      - 削除されたファイルは `config.json` から削除
    - [ ] テンプレートファイル作成
      - `contents/template.tsx.example` を用意
      - コピーしてリネームすれば使える
      - コンテンツの基本構造（p5.js のセットアップ、入力処理、描画ループ）を含む
    - [ ] 動作確認
      - コンテンツファイルを追加後、アプリを再起動またはページリロード（`Cmd + R`）
      - 自動的に `config.json` の `contents` に追加される（`enabled: false`）
      - 設定タブで確認し、必要に応じて `config.json` を編集して有効化
      - 「設定を再読み込み」で反映

## 参考資料

- [p5.js 公式サイト](https://p5js.org/)
- [p5.js の example](https://beta.p5.js.org/examples/)
- [three.js 公式サイト](https://threejs.org/)
- [three.js examples](https://threejs.org/examples/)
- [OpenProcessing - 水が波打っているかのような表示](https://openprocessing.org/sketch/2689119/#code)
- [20251113-140000_desktop-app-websocket-and-ui.md](./20251113-140000_desktop-app-websocket-and-ui.md) - 前提タスク
