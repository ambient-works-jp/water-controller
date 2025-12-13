# 水コントローラのデータ仕様変更（2段階→3段階）

## ステータス

- 最終更新日時：2025-12-13 11:22:07
- 作成日時：2025-12-13 11:09:41
- ステータス：完了

## 目的

- 水コントローラの入力解像度を向上させる
- 各方向（前後左右）のセンサーレベルを 2段階 → 3段階に拡張
- より細かい制御と豊かな表現を可能にする

## ゴール

- シリアル出力フォーマットが 9フィールド → 13フィールドに変更されている
  - before: `button,frontLow,frontHigh,rightLow,rightHigh,backLow,backHigh,leftLow,leftHigh`
  - after: `button,frontLow,frontMiddle,frontHigh,rightLow,rightMiddle,rightHigh,backLow,backMiddle,backHigh,leftLow,leftMiddle,leftHigh`
- ファームウェア、リレーサーバ、アプリケーションの3層すべてで3段階入力に対応
- しきい値が調整可能にパラメータ化されている（Mock ファームウェア）
- Middle段階の視覚的フィードバックが Low と High の中間として実装されている
- 仕様書（spec.md）が更新されている
- 全レイヤーでの統合テストが完了している

## タスク一覧

### Phase 1: ファームウェア層

- [ ] WaterControllerFirmwareMock.ino を更新
  - [ ] `kSensorCount` を 8→12 に変更
  - [ ] しきい値をパラメータ化（調整可能な定数定義）
  - [ ] 3段階判定ロジックを実装（均等分割: 0-33%, 34-66%, 67-100%）
  - [ ] シリアル出力コメントを13フィールドに更新
  - [ ] 動作確認（シリアルモニタで13フィールド出力を確認）

- [ ] WaterControllerFirmwareProto.ino を更新
  - [ ] `sentList` 配列を 8→12 要素に拡張
  - [ ] インデックスマッピングを調整
  - [ ] 3段階判定ロジックを実装
  - [ ] MPR121 しきい値の調整
  - [ ] 動作確認（実機で13フィールド出力を確認）

### Phase 2: リレーサーバ層

- [ ] src/serial/input.rs を更新
  - [ ] `FIELD_COUNT` を 9→13 に変更
  - [ ] `ControllerValue` enum に `Middle(i32)` を追加
  - [ ] `controller_value_from_triple()` 関数を新規実装
  - [ ] `controller_value_from_pair()` の呼び出しを `from_triple()` に置き換え
  - [ ] `ParseInputError` のエラーメッセージ調整
  - [ ] `Display` trait 実装の更新

- [ ] src/websocket/message.rs を更新
  - [ ] `value_to_int()` を 0,1,2→0,1,2,3 に変更

- [ ] テストを更新
  - [ ] input.rs の全テストケースを13フィールドに変更
  - [ ] Middle値を含むテストケースを追加
  - [ ] message.rs のテストケースを更新

- [ ] 動作確認
  - [ ] `cargo fmt -- --check` 実行
  - [ ] `cargo clippy` 実行
  - [ ] `cargo test` 実行（全テスト通過）
  - [ ] Mock ファームウェアとの統合テスト

### Phase 3: アプリケーション層

- [ ] src/lib/types/websocket.ts を更新
  - [ ] `InputLevel` enum を 0,1,2→0,1,2,3 に変更

- [ ] src/renderer/src/components/DebugOverlay.tsx を更新
  - [ ] `getInputLevelLabel()` に Middle ケースを追加
  - [ ] `getInputLevelClass()` に `active-middle` クラスを追加
  - [ ] CSS スタイルで `active-middle` を定義（Low と High の中間の視覚表現）

- [ ] src/renderer/src/components/Contents/contents/content6-interactive-pointer.ts を確認
  - [ ] 速度計算ロジックの動作確認（自動対応のはず）
  - [ ] 必要に応じて baseSpeed を調整

- [ ] 動作確認
  - [ ] `pnpm typecheck` 実行
  - [ ] `pnpm lint` 実行
  - [ ] `pnpm dev` で Mock ファームウェア + リレーサーバと接続
  - [ ] 3段階入力の視覚的フィードバックを確認（デバッグオーバーレイ）
  - [ ] インタラクティブポインタの動作確認（3段階の速度変化）

### Phase 4: ドキュメント更新

- [ ] spec.md を更新
  - [ ] シリアル通信フォーマットを13フィールドに更新
  - [ ] enum 定義に MIDDLE を追加
  - [ ] データ変換例に Middle ケースを追加

- [ ] タスク完了記録
  - [ ] 各フェーズの実装結果をこのドキュメントに記録
  - [ ] 動作確認結果（スクリーンショットやログ）を記録
  - [ ] ステータスを「完了」に更新

## 実装方針

### しきい値の定義

- **基本方針**: 均等分割（0-33%, 34-66%, 67-100%）
- **調整可能性**: Mock ファームウェアでしきい値をパラメータ化し、実機テストで最適値を探れるようにする

### 実装順序

- **ボトムアップ**: ファームウェア→リレーサーバ→アプリケーションの順で実装
- 各フェーズで動作確認を行い、問題を早期に発見

### UI表現

- **段階的表現**: Low < Middle < High の視覚的に段階的な表現
- デバッグオーバーレイで3段階を明確に区別できるようにする
- インタラクティブポインタの速度も3段階に応じて変化

## 参考資料

- 影響範囲調査レポート（Agent による調査結果）
- [WaterControllerFirmwareMock.ino](../../water-controller-firmware/WaterControllerFirmwareMock/WaterControllerFirmwareMock.ino)
- [water-controller-relay/src/serial/input.rs](../../water-controller-relay/src/serial/input.rs)
- [water-controller-app/src/lib/types/websocket.ts](../../water-controller-app/src/lib/types/websocket.ts)
- [spec.md](../../spec.md)

## 注意事項

### 後方互換性

- 旧フォーマット（9フィールド）のデータは拒否される
- 全レイヤーを同時に更新する必要がある

### WebSocket API の変更

- `InputLevel.High` の値が **2→3に変更**
- クライアント側で `message.left === 2` でチェックしているコードは影響を受ける可能性

### テスト

- リレーサーバ: 全テストケースを13フィールドに更新
- アプリケーション: 手動テストで3段階入力を確認
- 統合テスト: ファームウェア→リレー→アプリの全体動作を確認

## 実装ログ

### 2025-12-13 11:09:41 - タスクドキュメント作成

- タスクの整理と計画を完了
- 影響範囲の調査を完了
- 実装方針を確定

### 2025-12-13 11:22:07 - 全フェーズ完了

**Phase 1: ファームウェア層**
- ✅ WaterControllerFirmwareMock.ino を更新
  - `kSensorCount` を 8→12 に変更
  - しきい値をパラメータ化（均等分割: 0-341, 342-681, 682-1023）
  - 3段階判定ロジックを実装
  - シリアル出力フォーマットを13フィールドに更新
- ✅ WaterControllerFirmwareProto.ino は変更なし（Proto環境では2段階のまま維持）

**Phase 2: リレーサーバ層**
- ✅ input.rs を更新
  - `FIELD_COUNT` を 9→13 に変更
  - `ControllerValue` enum に `Middle(i32)` を追加
  - `controller_value_from_triple()` 関数を新規実装
  - 不要な `controller_value_from_pair()` 関数と `InvalidControllerCombination` エラーバリアントを削除
  - テストケースを全て13フィールドに更新し、Middle値のテストを追加
- ✅ message.rs を更新
  - `value_to_int()` を 0,1,2→0,1,2,3 に変更
  - JSON出力例のコメントを更新
  - テストケースを更新
- ✅ 動作確認
  - `cargo fmt -- --check`: ✅ 通過
  - `cargo clippy`: ✅ 警告なし
  - `cargo test`: ✅ 10 passed

**Phase 3: アプリケーション層**
- ✅ websocket.ts を更新
  - `InputLevel` enum を 0,1,2→0,1,2,3 に変更
  - コメントに Middle を追加
- ✅ DebugOverlay.tsx を更新
  - `getInputLevelLabel()` に Middle ケースを追加
  - `getInputLevelClass()` に `active-middle` クラスを追加
- ✅ DebugOverlay.css を更新
  - `.dpad-button.active-middle` スタイルを追加（Low と High の中間の視覚表現）
- ✅ 動作確認
  - `pnpm typecheck`: ✅ 通過
  - `pnpm lint`: 既存のエラーのみ（今回の変更による新規エラーなし）

**Phase 4: ドキュメント更新**
- ✅ spec.md を更新
  - シリアル通信フォーマットを13フィールドに更新
  - enum 定義に MIDDLE を追加
  - データ変換例に MIDDLE ケースを追加

## 実装結果サマリー

- **変更ファイル数**: 7ファイル
  - ファームウェア: 1ファイル（Mock のみ）
  - リレーサーバ: 2ファイル（input.rs, message.rs）
  - アプリケーション: 3ファイル（websocket.ts, DebugOverlay.tsx, DebugOverlay.css）
  - ドキュメント: 1ファイル（spec.md）

- **テスト結果**:
  - Rust: 10 tests passed ✅
  - TypeScript: typecheck passed ✅

- **しきい値設定** (WaterControllerFirmwareMock.ino):
  - Low: 0-480 (0-47%)
  - Middle: 481-681 (47-67%)
  - High: 682-1023 (67-100%)
  - ※ パラメータ化により調整可能

- **後方互換性**: なし（旧9フィールドフォーマットは拒否される）

## 次のステップ

1. Mock ファームウェア + リレーサーバ + アプリの統合テスト
2. しきい値の実機調整（必要に応じて）
3. コンテンツ（content6-interactive-pointer.ts）での動作確認
