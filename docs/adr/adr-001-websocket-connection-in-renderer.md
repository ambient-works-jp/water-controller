# ADR 001: Renderer プロセスで WebSocket 接続を行う

## ステータス

**Accepted** - 2025-11-15

## コンテキスト

water-controller-app では、Rust 製の WebSocket リレーサーバ（`water-controller-relay`）から水コントローラーの入力データをリアルタイムで受信し、p5.js/three.js で実装したビジュアルコンテンツに反映する必要がある。

Electron アプリで WebSocket サーバに接続する方法として、以下の2つのアプローチが考えられる：

1. **Main プロセスで接続し、IPC で Renderer に転送**
   - Main プロセスで WebSocket クライアントを実装
   - 受信したメッセージを IPC（`webContents.send`）で Renderer に転送
   - Renderer は IPC でメッセージを受信

2. **Renderer プロセスで直接接続**
   - Renderer プロセスで WebSocket クライアントを実装
   - ブラウザの WebSocket API を使用（Web 開発と同じ）

### プロジェクトの要件と制約

- **単一ウィンドウアプリ**：複数ウィンドウで接続を共有する必要がない
- **リアルタイム性が重要**：水コントローラーの入力を即座にビジュアルに反映したい
- **接続の永続性は不要**：展示会での運用を想定しており、リロード時の再接続で問題ない
- **デバッグのしやすさ**：開発中に WebSocket の通信状態を確認しやすくしたい
- **チームの技術スタック**：Web 開発での WebSocket の利用経験がある

### 検討した選択肢

詳細な比較は [Electron での WebSocket 接続パターン](../notes/electron-websocket-patterns.md) を参照。

#### パターン1: Main プロセスで接続

**概要**:

```txt
WebSocket サーバ --WebSocket--> Main プロセス --IPC--> Renderer プロセス
(Rust relay)                    (Node.js)              (React)
```

**アーキテクチャ図**:

```txt
┌─────────────────────────────────────────┐
│  water-controller-relay                 │
│  (Rust WebSocket server)                │
└──────────────┬──────────────────────────┘
               │ WebSocket
               │
┌──────────────▼──────────────────────────┐
│  Main プロセス (Node.js)                  │
│  - WebSocket クライアント                  │
│  - 再接続ロジック                          │
│  - メッセージバッファリング                  │
└──────────────┬──────────────────────────┘
               │ IPC (webContents.send)
               │
┌──────────────▼──────────────────────────┐
│  Renderer プロセス (Chromium)             │
│  - IPC でメッセージを受信                   │
│  - React State に反映                     │
│  - UI 更新                               │
└─────────────────────────────────────────┘
```

#### パターン2: Renderer プロセスで接続（採用）

**概要**:

```txt
WebSocket サーバ --WebSocket--> Renderer プロセス
(Rust relay)                    (React + WebSocket API)
```

**アーキテクチャ図**:

```txt
┌─────────────────────────────────────────┐
│  water-controller-relay                 │
│  (Rust WebSocket server)                │
│  - シリアル通信でコントローラから入力を受信     │
│  - JSON 形式で WebSocket 配信             │
└──────────────┬──────────────────────────┘
               │ WebSocket
               │ ws://127.0.0.1:8080/ws
               │
┌──────────────▼──────────────────────────┐
│  Renderer プロセス (Chromium)             │
│                                         │
│  useWebSocket Hook                      │
│  ├─ WebSocket API                       │
│  ├─ 自動再接続ロジック                     │
│  └─ TypeScript 型定義                    │
│      ↓                                  │
│  React State                            │
│  ├─ controllerInput                     │
│  └─ connectionStatus                    │
│      ↓                                  │
│  UI Components                          │
│  ├─ p5.js/three.js コンテンツ             │
│  └─ デバッグオーバーレイ                    │
└─────────────────────────────────────────┘

データフロー:
コントローラ入力
  → Rust relay (シリアル → WebSocket)
  → Renderer (WebSocket → React State)
  → UI 更新 (p5.js/three.js)
```

#### 比較表

| 項目 | Main で接続 | Renderer で接続 |
|------|------------|----------------|
| 実装の複雑さ | ❌ やや複雑（IPC必要） | ✅ シンプル（Web と同じ） |
| リアルタイム性 | ⚠️ IPC のオーバーヘッドあり | ✅ 直接通信（最速） |
| 接続の永続性 | ✅ リロードでも維持 | ❌ リロードで切断 |
| デバッグ | ⚠️ ターミナルで確認 | ✅ Chrome DevTools で確認 |
| Web 版への移植 | ❌ コード書き直し必要 | ✅ そのまま使える |

## 決定

**パターン2（Renderer プロセスで直接 WebSocket 接続）を採用する。**

具体的には：

1. Renderer プロセスでブラウザの WebSocket API を使用
2. カスタム Hook（`useWebSocket`）で接続管理と自動再接続を実装
3. TypeScript で型安全なメッセージのパース
4. React のステート管理と直接統合

実装の詳細は [Electron での WebSocket 接続パターン](../notes/electron-websocket-patterns.md#実装ガイドrenderer-で接続推奨パターン) を参照。

## 理由

### 1. リアルタイム性の確保

水コントローラーの入力からビジュアルへの反映までの遅延を最小化するため、IPC のオーバーヘッドを避ける必要がある。Renderer プロセスでの直接接続により、WebSocket → React のステート → UI への反映という最短経路を実現できる。

### 2. 実装のシンプルさ

チームは Web 開発での WebSocket の利用経験があるため、Renderer プロセスでの実装は既存の知識をそのまま活用できる。IPC の実装や Main プロセスでのコード管理が不要になり、開発効率が向上する。

### 3. デバッグのしやすさ

Chrome DevTools のネットワークタブで WebSocket の通信状態、メッセージの内容、接続・切断のタイミングをリアルタイムで確認できる。これにより、開発中のデバッグが大幅に効率化される。

### 4. 接続の永続性は不要

展示会での運用を想定しており、以下の理由から接続の永続性は必要ない：

- 展示中はリロードを行わない
- 開発中のリロードは、自動再接続（1秒程度）で十分
- バックグラウンドでのデータ受信は不要

### 5. React との統合

WebSocket のメッセージを React のステートとして直接管理でき、コンポーネントの再レンダリングと自然に連携する。IPC を経由しないため、コードの見通しが良くなる。

## 結果

### ポジティブな影響

- ✅ **実装がシンプル**：Web 開発と同じパターンで実装可能
- ✅ **リアルタイム性が高い**：IPC のオーバーヘッドがない
- ✅ **デバッグが簡単**：Chrome DevTools で完結
- ✅ **React と自然に統合**：ステート管理が直感的
- ✅ **Web 版への移植が容易**：将来的に PWA 化する場合もコードを流用可能
- ✅ **開発効率の向上**：既存の知識を活用できる

### ネガティブな影響

- ⚠️ **リロードで再接続が必要**：
  - 影響：開発中のリロード時に約1秒の再接続時間が発生
  - 対策：自動再接続を実装済み
  - 評価：展示会では問題なし

- ⚠️ **バックグラウンド動作不可**：
  - 影響：ウィンドウを閉じると接続が切れる
  - 評価：本プロジェクトでは必要性なし

- ⚠️ **複数ウィンドウ対応の制約**：
  - 影響：各ウィンドウで個別に接続が必要
  - 評価：単一ウィンドウアプリなので問題なし

### 実装時の注意点

1. **自動再接続の実装**：接続が切れた際に自動で再接続する仕組みを実装する
2. **エラーハンドリング**：接続エラーをユーザーに適切に表示する
3. **型安全性の確保**：TypeScript でメッセージの型を定義し、安全にパースする
4. **デバッグモードでの可視化**：接続状態と受信メッセージをオーバーレイ表示する

## 参考資料

- [Electron での WebSocket 接続パターン](../notes/electron-websocket-patterns.md)
- [Electron 基礎ガイド for React 開発者](../documentations/electorn-basic.md)
- [タスクドキュメント：デスクトップアプリの WebSocket と UI 開発](../tasks/20251113-140000_desktop-app-websocket-and-ui.md)
- [WebSocket API (MDN)](https://developer.mozilla.org/ja/docs/Web/API/WebSocket)

## 関連する ADR

なし（初回の ADR）

## 変更履歴

- 2025-11-15: 初版作成、Accepted
