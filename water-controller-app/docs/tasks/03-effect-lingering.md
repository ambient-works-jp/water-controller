# タスク 03: エフェクトの余韻を残す

## ステータス

- **優先度**: 中
- **担当**: 開発側（パラメータ調整）
- **作成日**: 2026-02-09
- **フェーズ**: 実装

## 問題の概要

現在、コントローラーの操作を止めるとエフェクトがすぐに消えてしまう。軌跡や波紋がもっと長く残り、余韻を感じられるようにしたい。

### 現在の挙動

- 操作を止めると仮想カーソルが素早く中央に戻る
- 波紋エフェクトが 2 秒で消える
- 速度の減衰が速い（毎フレーム 0.92 倍）

### 理想的な挙動

- 操作を止めても軌跡がしばらく残る
- 波紋が長く残って余韻を感じる
- エフェクトがゆっくりと減衰していく

## ビジュアルイメージ

以下の画像は、求めているエフェクトの「にじみ」や「余韻」のイメージを表しています。

![エフェクトの余韻イメージ 1](./assets/image.png)

![エフェクトの余韻イメージ 2](./assets/image2.png)

### イメージの説明

- **現在の実装**: エフェクトがすぐに元に戻る（残像が少ない）
- **理想の実装**: エフェクトの軌跡や波紋が滲むように残る
- **求めている感覚**: インクが水に滲むような、ゆっくりとした減衰

上の画像に描かれているような、カラフルな3Dオブジェクトから白い不規則な形状や暗い線が広がっていくような「にじみ」を表現したいです。操作によって生まれたエフェクトが、すぐには消えずに画面上に留まり、徐々に薄くなっていくイメージです。

**画像のポイント**:

- 右上のカラフルな立体から白い形や黒い線が広がっている
- エフェクトが元の形から「滲んで」広がっている
- 複数の軌跡や残像が重なり合って、豊かな視覚効果を生んでいる

## 現在のパラメータ

### 物理シミュレーション

```typescript
// src/renderer/src/components/HomeworksContent/LiquidGlassVideoEffect.tsx:32-38
const PHYSICS_PARAMS = {
  BASE_SPEED: 0.01, // 基本移動速度
  FORCE_MULTIPLIER: 0.8, // 入力力の倍率
  RESTORE_FORCE: 0.03, // 中央への復元力 ← 速く戻りすぎる原因
  DAMPING: 0.92, // 減衰係数 ← 速度がすぐに減衰する原因
  MAX_VIEWPORT_RATIO: 0.4 // 画面に対する最大移動距離の比率
} as const
```

### 波紋エフェクト

```typescript
// src/renderer/src/components/HomeworksContent/LiquidGlassVideoEffect.tsx:41-48
const RIPPLE_PARAMS = {
  MAX_TRAIL_POINTS: 24, // 記録する軌跡点の最大数
  TRAIL_INTERVAL: 0.03, // 軌跡点を追加する間隔（秒）
  RIPPLE_LIFETIME: 2.0, // 波紋の持続時間（秒） ← 短い
  RIPPLE_SPEED: 0.8, // 波紋の拡散速度
  MIN_DISTANCE: 0.02 // 軌跡点を追加する最小移動距離
} as const
```

## 関連する実装コード

### 1. 速度の減衰

```typescript
// LiquidGlassVideoEffect.tsx:160-163
const dampingFactor = Math.pow(PHYSICS_PARAMS.DAMPING, timeScale)
pointerState.velocityX *= dampingFactor
pointerState.velocityY *= dampingFactor
```

**影響**:

- `DAMPING = 0.92` の場合、約 8 フレーム（60fps時）で速度が半減
- 操作を止めるとすぐに動きが止まる

### 2. 中央への復元力

```typescript
// LiquidGlassVideoEffect.tsx:156-158
pointerState.velocityX -= pointerState.x * PHYSICS_PARAMS.RESTORE_FORCE * timeScale
pointerState.velocityY -= pointerState.y * PHYSICS_PARAMS.RESTORE_FORCE * timeScale
```

**影響**:

- 常に中央に引き戻される
- 仮想カーソルが中央に留まりやすい

### 3. 波紋の時間減衰（シェーダー側）

```glsl
// src/renderer/src/components/HomeworksContent/shaders/liquidGlass.frag.glsl:108-112
// 時間経過による減衰
float decay = 1.0 - (elapsed / uRippleLifetime);
decay = decay * decay; // 2乗で急激に減衰

waveInfluence *= decay;
```

**影響**:

- 波紋が 2 秒（`RIPPLE_LIFETIME`）で完全に消える
- 2乗の減衰により後半は急激に薄くなる

### 4. 古い軌跡点の削除

```typescript
// LiquidGlassVideoEffect.tsx:217-222
while (
  trailPoints.length > 0 &&
  currentTime - trailPoints[0].time > RIPPLE_PARAMS.RIPPLE_LIFETIME
) {
  trailPoints.shift()
}
```

## 提案する調整

### パターンA: 穏やかな減衰（推奨）

余韻を残しつつ、最終的には中央に戻る自然な挙動。

```typescript
const PHYSICS_PARAMS = {
  BASE_SPEED: 0.01,
  FORCE_MULTIPLIER: 0.8,
  RESTORE_FORCE: 0.015, // 0.03 → 0.015 (半分に弱める)
  DAMPING: 0.96, // 0.92 → 0.96 (減衰を緩やかに)
  MAX_VIEWPORT_RATIO: 0.4
} as const

const RIPPLE_PARAMS = {
  MAX_TRAIL_POINTS: 32, // 24 → 32 (軌跡点を増やす)
  TRAIL_INTERVAL: 0.03,
  RIPPLE_LIFETIME: 3.5, // 2.0 → 3.5 (波紋を長く残す)
  RIPPLE_SPEED: 0.8,
  MIN_DISTANCE: 0.02
} as const
```

**効果**:

- 操作を止めてから中央に戻るまでの時間が約2倍に
- 波紋が 3.5 秒残る（現在の 1.75 倍）
- より長い軌跡が描かれる

### パターンB: より長い余韻（劇的な変更）

より強い余韻を求める場合。

```typescript
const PHYSICS_PARAMS = {
  BASE_SPEED: 0.01,
  FORCE_MULTIPLIER: 0.8,
  RESTORE_FORCE: 0.01, // 0.03 → 0.01 (1/3に弱める)
  DAMPING: 0.98, // 0.92 → 0.98 (ほとんど減衰しない)
  MAX_VIEWPORT_RATIO: 0.4
} as const

const RIPPLE_PARAMS = {
  MAX_TRAIL_POINTS: 48, // 24 → 48 (軌跡点を2倍に)
  TRAIL_INTERVAL: 0.03,
  RIPPLE_LIFETIME: 5.0, // 2.0 → 5.0 (波紋を2.5倍長く)
  RIPPLE_SPEED: 0.7, // 0.8 → 0.7 (拡散を少し遅く)
  MIN_DISTANCE: 0.02
} as const
```

**効果**:

- 操作を止めてもしばらく動き続ける
- 波紋が 5 秒残る
- より複雑な軌跡パターンが生成される

**注意点**:

- 復元力が弱すぎると画面端に偏ったままになる可能性
- 軌跡点が多すぎるとGPU負荷が増加する可能性

### パターンC: 復元力なし（実験的）

タスク02の「カクつき修正」と連動する場合。

```typescript
const PHYSICS_PARAMS = {
  BASE_SPEED: 0.01,
  FORCE_MULTIPLIER: 0.8,
  RESTORE_FORCE: 0.0, // 完全に無効化
  DAMPING: 0.98, // 減衰のみで自然に止まる
  MAX_VIEWPORT_RATIO: 0.4
} as const
```

**メリット**:

- カクつき問題の解決にも寄与
- 操作した場所にエフェクトが残る

**デメリット**:

- 中央に戻らないため、画面全体に散らばる可能性
- 長時間操作しないと画面端に偏る

## シェーダー側の調整（オプション）

波紋の減衰カーブを変更して、より長く見えるようにする。

### 現在の減衰（急激）

```glsl
float decay = 1.0 - (elapsed / uRippleLifetime);
decay = decay * decay; // 2乗
```

### 提案: 線形減衰（穏やか）

```glsl
float decay = 1.0 - (elapsed / uRippleLifetime);
// 2乗を削除
```

### 提案: より穏やかな減衰

```glsl
float decay = 1.0 - (elapsed / uRippleLifetime);
decay = sqrt(decay); // 平方根（減衰が遅くなる）
```

## パラメータ調整の影響比較

| パラメータ         | 現在値      | パターンA    | パターンB    | 影響               |
| ------------------ | ----------- | ------------ | ------------ | ------------------ |
| `RESTORE_FORCE`    | 0.03        | 0.015        | 0.01         | 中央への戻りやすさ |
| `DAMPING`          | 0.92        | 0.96         | 0.98         | 速度の減衰速度     |
| `RIPPLE_LIFETIME`  | 2.0秒       | 3.5秒        | 5.0秒        | 波紋の持続時間     |
| `MAX_TRAIL_POINTS` | 24          | 32           | 48           | 軌跡の長さ         |
| 半減期（速度）     | 約8フレーム | 約17フレーム | 約34フレーム | 動きの持続         |

※ 半減期 = 速度が半分になるまでのフレーム数（60fps時）

## 実装手順

### ステップ1: パラメータの段階的調整

1. まず `DAMPING` のみを 0.96 に変更してテスト
2. 次に `RESTORE_FORCE` を 0.015 に変更してテスト
3. 最後に `RIPPLE_LIFETIME` を 3.5 に変更してテスト

### ステップ2: 総合的な調整

- パターンA or パターンB を選択して一括適用
- 実機での動作確認
- 必要に応じて微調整

### ステップ3: シェーダー側の調整（オプション）

- 波紋の減衰カーブを変更
- 視覚的な持続時間を延ばす

## 関連ファイル

### TypeScript側

- `src/renderer/src/components/HomeworksContent/LiquidGlassVideoEffect.tsx:32-48` - パラメータ定義
- `src/renderer/src/components/HomeworksContent/LiquidGlassVideoEffect.tsx:156-163` - 物理シミュレーション実装
- `src/renderer/src/components/HomeworksContent/LiquidGlassImageEffect.tsx:35-51` - 画像版も同じパラメータ

### シェーダー側

- `src/renderer/src/components/HomeworksContent/shaders/liquidGlass.frag.glsl:108-112` - 波紋の時間減衰

## パフォーマンスへの影響

### GPU負荷

- `MAX_TRAIL_POINTS` 増加: シェーダーのループ回数が増えるが、24→48程度なら問題ない
- `RIPPLE_LIFETIME` 増加: 計算量は変わらない（寿命が切れた点は自動削除される）

### CPU負荷

- 物理シミュレーションの計算量は変わらない
- 軌跡点の配列操作が少し増える程度

**結論**: Raspberry Pi 5 でも十分に動作すると予想される

## 次のステップ

1. パターンA でテスト実装
2. 実機での動作確認
3. ユーザーフィードバックに基づいて微調整
4. 必要に応じてシェーダー側の減衰カーブも調整

## 注意事項

- タスク02（カクつき修正）と `RESTORE_FORCE` の調整が重複する
- 両タスクを同時に進める場合は、パラメータ調整を統合すること
- 余韻を残しすぎるとエフェクトが複雑になりすぎる可能性があるため、段階的に調整すること
