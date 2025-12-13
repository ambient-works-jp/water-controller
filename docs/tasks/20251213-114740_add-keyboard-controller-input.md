# キーボードでコントローラ入力を可能にする

## ステータス

- 最終更新日時：2025-12-13 11:47:40
- 作成日時：2025-12-13 11:47:40
- ステータス：進行中

## 目的

- 矢印キー（↑↓←→）と Enter キーでコントローラ操作を可能にする
- WebSocket サーバからの入力とキーボード入力を統合する抽象化レイヤーを実装
- 既存コードとの混在を避け、保守性の高いアーキテクチャを実現

## ゴール

- 矢印キー（↑↓←→）で4方向のコントローラ入力が可能
- Enter キーでボタン押下が可能
- WebSocket 入力とキーボード入力が統一されたインターフェースで扱える
- 入力ソースの優先順位を設定可能（WebSocket 優先）
- 既存の `Cmd+キー` ショートカットと競合しない
- DebugOverlay で入力ソースが可視化される

## アーキテクチャ設計

```
┌─────────────────────────────────────────────┐
│         Input Sources (入力ソース)           │
├─────────────────────────────────────────────┤
│  useWebSocketInput    useKeyboardInput      │
│  (Server からの入力)   (キーボード入力)        │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│   Abstraction Layer (抽象化レイヤー)         │
├─────────────────────────────────────────────┤
│  useControllerInput()                       │
│  - 複数のソースを統合                         │
│  - 優先順位の管理                            │
│  - 統一された型で提供                         │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│      Consumers (コンテンツ)                  │
├─────────────────────────────────────────────┤
│  Contents/index.tsx                         │
│  DebugOverlay.tsx                           │
└─────────────────────────────────────────────┘
```

## タスク一覧

### Phase 1: 型定義と基本構造

- [ ] `features/controller/` ディレクトリを作成
- [ ] `types.ts` を作成
  - [ ] `ControllerState` 型を定義
  - [ ] `InputSource` enum を定義
  - [ ] `ControllerInputEvent` 型を定義
  - [ ] `ControllerInputConfig` 型を定義

### Phase 2: ユーティリティ実装

- [ ] `utils/inputPriority.ts` を作成
  - [ ] `mergeInputs()` 関数を実装
  - [ ] 優先順位ロジックのテストケース作成（オプション）

### Phase 3: WebSocket 入力プロバイダー

- [ ] `hooks/useWebSocketInput.ts` を作成
  - [ ] lastMessage を監視
  - [ ] ControllerInputEvent 形式に変換
  - [ ] controller-input と button-input の両方に対応

### Phase 4: キーボード入力プロバイダー

- [ ] `hooks/useKeyboardInput.ts` を作成
  - [ ] keydown/keyup イベントハンドラ
  - [ ] 矢印キー（↑↓←→）のハンドリング
  - [ ] Enter キーのハンドリング
  - [ ] Meta キー競合回避
  - [ ] preventDefault() で既定動作防止
  - [ ] ControllerInputEvent 形式で出力

### Phase 5: 抽象化レイヤー

- [ ] `hooks/useControllerInput.ts` を作成
  - [ ] useWebSocketInput と useKeyboardInput を統合
  - [ ] mergeInputs() で入力をマージ
  - [ ] 優先順位に従った統合処理
  - [ ] リセット関数の実装

### Phase 6: App.tsx での統合

- [ ] App.tsx を更新
  - [ ] useControllerInput() フックを呼び出し
  - [ ] 設定オブジェクトを渡す
  - [ ] Contents に controllerState を渡す
  - [ ] 既存の lastMessage との互換性確保

### Phase 7: Contents コンポーネントの更新

- [ ] Contents/index.tsx を更新
  - [ ] controllerState props を受け取る
  - [ ] Canvas render 関数に渡す形式を調整
  - [ ] 既存の lastMessage との互換性確保

### Phase 8: 動作確認

- [ ] TypeScript の型チェック
  - [ ] `pnpm typecheck`
- [ ] ESLint チェック
  - [ ] `pnpm lint`
- [ ] 動作確認
  - [ ] `pnpm dev` で起動
  - [ ] キーボード入力のみで動作確認
  - [ ] リレーサーバ起動して WebSocket 入力確認
  - [ ] 両方の入力が統合されることを確認
  - [ ] DebugOverlay で入力ソース可視化確認
  - [ ] content6 (インタラクティブポインタ) で動作確認

### Phase 9: ドキュメント更新

- [ ] README.md を更新
  - [ ] キーボード操作方法を追記
  - [ ] 矢印キー + Enter の説明
- [ ] DebugOverlay のヘルプを更新
  - [ ] キーボードショートカット一覧に追加
- [ ] タスクドキュメントを更新
  - [ ] 実装ログを記録
  - [ ] ステータスを「完了」に更新

## ディレクトリ構造

```
src/renderer/src/
├── features/
│   └── controller/                     # 新規
│       ├── types.ts                    # 型定義
│       ├── hooks/
│       │   ├── useControllerInput.ts   # 抽象化レイヤー
│       │   ├── useWebSocketInput.ts    # WebSocket プロバイダー
│       │   └── useKeyboardInput.ts     # キーボードプロバイダー
│       └── utils/
│           └── inputPriority.ts        # 優先順位ロジック
├── hooks/
│   └── useWebSocket.ts                 # 既存：変更なし
└── App.tsx                             # 既存：useControllerInput() を追加
```

## 実装方針

### 分離された責任

- **WebSocket 入力**: `useWebSocketInput.ts` が担当
- **キーボード入力**: `useKeyboardInput.ts` が担当
- **統合ロジック**: `useControllerInput.ts` が担当
- **優先順位**: `inputPriority.ts` が担当

### 既存コードへの影響最小化

- `useWebSocket.ts` は変更不要
- 既存の `lastMessage` をそのまま利用
- Contents コンポーネントは props を追加するのみ

### 拡張性

- 新しい入力ソース（ゲームパッド等）を簡単に追加可能
- 優先順位を設定で変更可能
- 各プロバイダーを独立してテスト可能

## キーバインディング

| キー | 動作 |
|------|------|
| ↑ (ArrowUp) | 上方向入力（High） |
| ↓ (ArrowDown) | 下方向入力（High） |
| ← (ArrowLeft) | 左方向入力（High） |
| → (ArrowRight) | 右方向入力（High） |
| Enter | ボタン押下 |

## 優先順位ルール

1. **WebSocket 入力が最優先**
   - リレーサーバからの入力を優先
   - 本番環境での動作を保証

2. **キーボード入力は補助**
   - WebSocket 未接続時に有効
   - デモやテスト時に便利

3. **同時入力時の挙動**
   - 各方向で最大値を採用
   - 例：WebSocket で Low、キーボードで High → High を採用

## 参考資料

- 既存の WebSocket 実装: `src/renderer/src/hooks/useWebSocket.ts`
- 既存のキーボードショートカット: `src/renderer/src/hooks/useKeyboardShortcut.ts`
- コントローラ入力の型定義: `src/lib/types/websocket.ts`
- DebugOverlay コンポーネント: `src/renderer/src/components/DebugOverlay.tsx`

## 注意事項

### Meta キーとの競合回避

既存のショートカット（Cmd+M, Cmd+D など）と競合しないよう、Meta キーまたは Ctrl キーが押されている場合はキーボード入力を無効化する。

### preventDefault() の使用

矢印キーと Enter キーはブラウザのデフォルト動作（スクロール、フォーム送信など）を持つため、`e.preventDefault()` で既定動作を防止する。

### 入力状態の管理

キーボード入力は keydown/keyup の両方を監視し、キーが押されている間は入力状態を保持する。ref を使用して不要な再レンダリングを避ける。

## 実装ログ

### 2025-12-13 11:47:40 - タスクドキュメント作成

- タスクの整理と計画を完了
- アーキテクチャ設計を確定
- ディレクトリ構造を決定
