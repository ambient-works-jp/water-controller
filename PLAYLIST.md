# 新しいコンテンツの追加方法

## 手順

### 1. コンテンツファイルを作成

`water-controller-app/src/renderer/src/components/Contents/contents/` に新しいファイルを作成：

```typescript
// content4-example.ts
import type { Content } from '../types'

export const example: Content = {
  metadata: {
    id: 'example',
    name: 'Example Content',
    description: 'サンプルコンテンツ'
  },
  render: (ctx, t, vw, vh) => {
    // 背景を塗りつぶし
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, vw, vh)

    // 描画処理を実装
    // ctx: CanvasRenderingContext2D
    // t: 経過時間（秒）
    // vw: Canvas の幅
    // vh: Canvas の高さ
  }
}
```

### 2. CONTENTS に追加

`water-controller-app/src/lib/constants/contents.ts` を編集：

```typescript
export const CONTENT_IDS = {
  CIRCULAR_PARTICLES: 'circular-particles',
  WAVE_LINES: 'wave-lines',
  RADIAL_SPOKES: 'radial-spokes',
  EXAMPLE: 'example' // 追加
} as const

export const CONTENTS: ContentItem[] = [
  {
    id: CONTENT_IDS.CIRCULAR_PARTICLES,
    name: 'Circular Particles',
    description: '円周上を回転しながら移動するパーティクルのアニメーション'
  },
  {
    id: CONTENT_IDS.WAVE_LINES,
    name: 'Wave Lines',
    description: '複数の波線が重なり合うアニメーション'
  },
  {
    id: CONTENT_IDS.RADIAL_SPOKES,
    name: 'Radial Spokes',
    description: '中心から放射状に伸びるスポークのアニメーション'
  },
  {
    id: CONTENT_IDS.EXAMPLE,
    name: 'Example Content',
    description: 'サンプルコンテンツ'
  } // 追加
]
```

### 3. utils.ts に追加

`water-controller-app/src/renderer/src/components/Contents/utils.ts` を編集：

```typescript
import { example } from './contents/content4-example' // 追加

const allContents: Record<string, Content> = {
  [CONTENT_IDS.CIRCULAR_PARTICLES]: circularParticles,
  [CONTENT_IDS.WAVE_LINES]: waveLines,
  [CONTENT_IDS.RADIAL_SPOKES]: radialSpokes,
  [CONTENT_IDS.EXAMPLE]: example // 追加
}
```

### 4. アプリを起動

アプリを起動すると、自動的に `config.json` の `contents` と `playlist` に追加されます。

### 5. プレイリストを編集（オプション）

`~/.water-controller-app/config.json` で再生順序をカスタマイズ：

```json
{
  "playlist": [
    "example",
    "circular-particles",
    "wave-lines"
  ]
}
```
