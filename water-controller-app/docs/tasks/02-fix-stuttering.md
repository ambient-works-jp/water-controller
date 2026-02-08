# タスク 02: 対向入力時のカクつき修正

## ステータス

- **優先度**: 高
- **担当**: 開発側（調査・修正）
- **作成日**: 2026-02-09
- **フェーズ**: 原因調査

## 問題の概要

コントローラーで対向する方向（左右、上下）に頻繁に入力を切り替えたときにカクつき（視覚的な振動）が発生する。

### 発生条件

- ✅ **発生する**: 左右の頻繁な切り替え
- ✅ **発生する**: 上下の頻繁な切り替え
- ❌ **発生しない**: 右上の頻繁な切り替え
- ❌ **発生しない**: 右下の頻繁な切り替え
- ❌ **発生しない**: その他の対面でない十字入力

### 仮説

対向入力時に仮想カーソルが中央に引き戻される復元力と入力による力が競合し、振動が発生している可能性がある。

## 現在の物理シミュレーション実装

### パラメータ定義

```typescript
// src/renderer/src/components/HomeworksContent/LiquidGlassVideoEffect.tsx:32-38
const PHYSICS_PARAMS = {
  BASE_SPEED: 0.01, // 基本移動速度（低いほど遅い）
  FORCE_MULTIPLIER: 0.8, // 入力力の倍率
  RESTORE_FORCE: 0.03, // 中央への復元力 ← 注目
  DAMPING: 0.92, // 減衰係数（0-1、高いほど慣性が残る）
  MAX_VIEWPORT_RATIO: 0.4 // 画面に対する最大移動距離の比率
} as const
```

### 物理シミュレーション状態

```typescript
// src/renderer/src/components/HomeworksContent/LiquidGlassVideoEffect.tsx:57-63
const pointerState = {
  x: 0, // 中央からの相対位置（ビューポート座標系）
  y: 0,
  velocityX: 0,
  velocityY: 0
}
```

### アニメーションループの実装

#### 1. 入力による力の計算

```typescript
// LiquidGlassVideoEffect.tsx:146-154
const leftForce = left * PHYSICS_PARAMS.BASE_SPEED
const rightForce = right * PHYSICS_PARAMS.BASE_SPEED
const upForce = up * PHYSICS_PARAMS.BASE_SPEED
const downForce = down * PHYSICS_PARAMS.BASE_SPEED

// 速度に加算
pointerState.velocityX += (rightForce - leftForce) * PHYSICS_PARAMS.FORCE_MULTIPLIER * timeScale
pointerState.velocityY += (downForce - upForce) * PHYSICS_PARAMS.FORCE_MULTIPLIER * timeScale
```

**問題点**: 対向入力時（例: `left > 0 && right > 0`）、力が打ち消し合う

#### 2. 中央への復元力

```typescript
// LiquidGlassVideoEffect.tsx:156-158
pointerState.velocityX -= pointerState.x * PHYSICS_PARAMS.RESTORE_FORCE * timeScale
pointerState.velocityY -= pointerState.y * PHYSICS_PARAMS.RESTORE_FORCE * timeScale
```

**問題点**: 常に中央に戻ろうとする力が働き、対向入力時に振動を引き起こす可能性

#### 3. 減衰

```typescript
// LiquidGlassVideoEffect.tsx:160-163
const dampingFactor = Math.pow(PHYSICS_PARAMS.DAMPING, timeScale)
pointerState.velocityX *= dampingFactor
pointerState.velocityY *= dampingFactor
```

#### 4. 位置更新

```typescript
// LiquidGlassVideoEffect.tsx:165-167
pointerState.x += pointerState.velocityX * timeScale
pointerState.y += pointerState.velocityY * timeScale
```

## 問題の原因分析

### ケース1: 左右頻繁な切り替え

```
時刻 t0: left=1.0, right=0 → velocityX が負の方向に増加
時刻 t1: left=0, right=1.0 → velocityX が正の方向に増加
```

このとき:

1. 速度が急激に反転
2. 位置も反転しようとする
3. 復元力（`RESTORE_FORCE`）が常に中央に引き戻そうとする
4. 結果: 中央付近で振動が発生

### ケース2: 右上頻繁な切り替え（カクつかない）

```
時刻 t0: right=1.0, up=1.0
時刻 t1: right=0, up=0
```

このとき:

1. 速度は減速するだけ（方向反転なし）
2. 復元力により自然に中央に戻る
3. 結果: 滑らかな動き

## 解決策の検討

### 案1: 復元力を無効化または大幅に弱める

```typescript
const PHYSICS_PARAMS = {
  // ...
  RESTORE_FORCE: 0.0, // 完全に無効化
  // または
  RESTORE_FORCE: 0.005 // 大幅に弱める (0.03 → 0.005)
}
```

**メリット**:

- 対向入力時の振動が減少
- 仮想カーソルが現在位置に留まる

**デメリット**:

- 操作を止めても中央に戻らない
- エフェクトが画面の端に偏ったままになる可能性

### 案2: 対向入力の検出とスムージング

```typescript
// 対向入力を検出
const isOpposingX = left > 0 && right > 0
const isOpposingY = up > 0 && down > 0

// 対向入力時は復元力を弱める or 速度変化を緩やかにする
const restoreMultiplier = isOpposingX || isOpposingY ? 0.1 : 1.0
pointerState.velocityX -=
  pointerState.x * PHYSICS_PARAMS.RESTORE_FORCE * timeScale * restoreMultiplier
pointerState.velocityY -=
  pointerState.y * PHYSICS_PARAMS.RESTORE_FORCE * timeScale * restoreMultiplier
```

### 案3: 速度の変化にリミッターを設ける

```typescript
// 1フレームあたりの速度変化量を制限
const MAX_VELOCITY_CHANGE = 0.01

const targetVelocityX =
  pointerState.velocityX + (rightForce - leftForce) * PHYSICS_PARAMS.FORCE_MULTIPLIER * timeScale
const deltaVX = targetVelocityX - pointerState.velocityX
pointerState.velocityX += Math.sign(deltaVX) * Math.min(Math.abs(deltaVX), MAX_VELOCITY_CHANGE)
```

### 案4: デッドゾーンの実装

```typescript
// 中央付近では復元力を働かせない
const DEAD_ZONE = 0.05 // ビューポート座標系

const distanceFromCenter = Math.sqrt(
  pointerState.x * pointerState.x + pointerState.y * pointerState.y
)
if (distanceFromCenter > DEAD_ZONE) {
  pointerState.velocityX -= pointerState.x * PHYSICS_PARAMS.RESTORE_FORCE * timeScale
  pointerState.velocityY -= pointerState.y * PHYSICS_PARAMS.RESTORE_FORCE * timeScale
}
```

## 調査タスク

### フェーズ1: データ収集

- [ ] デバッグログを強化して以下を記録:
  - 入力値（left, right, up, down）
  - pointerState（x, y, velocityX, velocityY）
  - 対向入力フラグ
  - フレームごとの速度変化量
- [ ] 対向入力時と非対向入力時のログを比較

### フェーズ2: 原因の特定

- [ ] 復元力を完全に無効化してテスト
- [ ] 減衰係数を変更してテスト（0.92 → 0.98）
- [ ] 入力力の倍率を変更してテスト（0.8 → 0.4）

### フェーズ3: 解決策の実装

- [ ] 最も効果的な解決策を選択
- [ ] パラメータ調整
- [ ] 実機での動作確認

## 関連ファイル

### メインロジック

- `src/renderer/src/components/HomeworksContent/LiquidGlassVideoEffect.tsx:32-38` - PHYSICS_PARAMS 定義
- `src/renderer/src/components/HomeworksContent/LiquidGlassVideoEffect.tsx:57-63` - pointerState 定義
- `src/renderer/src/components/HomeworksContent/LiquidGlassVideoEffect.tsx:135-182` - 物理シミュレーションループ

### 同様の実装

- `src/renderer/src/components/HomeworksContent/LiquidGlassImageEffect.tsx` - 画像版も同じ物理パラメータを使用

## デバッグ方法

### 現在のデバッグログ

```typescript
// LiquidGlassVideoEffect.tsx:274-283
if (Math.random() < 0.01) {
  // 1%の確率でログ出力
  console.log('[LiquidGlass]', {
    pointerX: pointerState.x.toFixed(2),
    pointerY: pointerState.y.toFixed(2),
    normalizedX: normalizedX.toFixed(3),
    normalizedY: normalizedY.toFixed(3),
    velocityX: pointerState.velocityX.toFixed(2),
    velocityY: pointerState.velocityY.toFixed(2)
  })
}
```

### 強化版デバッグログ（提案）

```typescript
// 対向入力時に常にログを出力
const isOpposingX = left > 0 && right > 0
const isOpposingY = up > 0 && down > 0
const isOpposing = isOpposingX || isOpposingY

if (isOpposing) {
  console.log('[LiquidGlass] OPPOSING INPUT', {
    input: { left, right, up, down },
    position: { x: pointerState.x.toFixed(3), y: pointerState.y.toFixed(3) },
    velocity: { vx: pointerState.velocityX.toFixed(3), vy: pointerState.velocityY.toFixed(3) },
    opposing: { x: isOpposingX, y: isOpposingY }
  })
}
```

## 次のステップ

1. デバッグログの強化
2. 対向入力時の挙動を詳細に観察
3. 復元力の無効化テスト
4. 解決策の実装と検証
