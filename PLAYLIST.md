# 新しいコンテンツの追加方法

## 手順

### パターン A: Canvas 2D を使う場合

`water-controller-app/src/renderer/src/components/Contents/contents/` に `.ts` ファイルを作成：

```typescript
// content-example.ts
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

### パターン B: Three.js を使う場合

`water-controller-app/src/renderer/src/components/Contents/contents/` に `.tsx` ファイルを作成：

```tsx
// content-three-example.tsx
import { Canvas } from '@react-three/fiber'
import type { Content, ContentComponentProps } from '../types'

function ThreeScene({ width, height, time }: ContentComponentProps): React.JSX.Element {
  return (
    <Canvas style={{ width, height }}>
      {/* Three.js コンテンツを記述 */}
      <ambientLight intensity={0.5} />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    </Canvas>
  )
}

export const threeExample: Content = {
  metadata: {
    id: 'three-example',
    name: 'Three Example',
    description: 'Three.js サンプル'
  },
  component: ThreeScene
}
```

### パターン C: p5.js を使う場合

`water-controller-app/src/renderer/src/components/Contents/contents/` に `.tsx` ファイルを作成：

```tsx
// content-p5-example.tsx
import { ReactP5Wrapper, type Sketch } from '@p5-wrapper/react'
import type { Content, ContentComponentProps } from '../types'

const sketch: Sketch = (p5) => {
  p5.setup = () => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight)
    // セットアップ処理
  }

  p5.draw = () => {
    p5.background(0)
    // 描画処理
  }

  p5.windowResized = () => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight)
  }
}

function P5Scene({ width, height }: ContentComponentProps): React.JSX.Element {
  return (
    <div style={{ width, height }}>
      <ReactP5Wrapper sketch={sketch} />
    </div>
  )
}

export const p5Example: Content = {
  metadata: {
    id: 'p5-example',
    name: 'P5 Example',
    description: 'p5.js サンプル'
  },
  component: P5Scene
}
```

### 2. contents/index.ts に export を追加

`water-controller-app/src/renderer/src/components/Contents/contents/index.ts` を編集：

```typescript
export { circularParticles } from './content1-circular-particles'
export { waveLines } from './content2-wave-lines'
export { radialSpokes } from './content3-radial-spokes'
export { example } from './content-example' // 追加
// または
export { threeExample } from './content-three-example' // 追加
```

### 3. utils.ts に追加

`water-controller-app/src/renderer/src/components/Contents/utils.ts` を編集：

```typescript
import { circularParticles, waveLines, radialSpokes, example } from './contents'

const allContents: Record<string, Content> = {
  [CONTENT_IDS.CIRCULAR_PARTICLES]: circularParticles,
  [CONTENT_IDS.WAVE_LINES]: waveLines,
  [CONTENT_IDS.RADIAL_SPOKES]: radialSpokes,
  [CONTENT_IDS.EXAMPLE]: example // 追加（CONTENT_IDS.EXAMPLE を使う）
}
```

### 4. lib/constants/contents.ts に追加

`water-controller-app/src/lib/constants/contents.ts` を編集：

```typescript
export const CONTENT_IDS = {
  CIRCULAR_PARTICLES: 'circular-particles',
  WAVE_LINES: 'wave-lines',
  RADIAL_SPOKES: 'radial-spokes',
  EXAMPLE: 'example' // 追加
} as const

export const CONTENTS: ContentItem[] = [
  // ... 既存のコンテンツ
  {
    id: CONTENT_IDS.EXAMPLE,
    name: 'Example Content',
    description: 'サンプルコンテンツ'
  } // 追加
]
```

### 5. アプリを起動

アプリを起動すると、自動的に `config.json` の `contents` と `playlist` に追加されます。

### 6. プレイリストを編集（オプション）

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

## 備考

### プレイリストでの混在
Canvas 2D、Three.js、p5.js のコンテンツを同じプレイリスト内で混在させることができます：

```json
{
  "playlist": [
    "circular-particles",       // Canvas 2D
    "rotating-cube",            // Three.js
    "water-controller-text",    // p5.js
    "wave-lines",               // Canvas 2D
    "radial-spokes"             // Canvas 2D
  ]
}
```

### 既存のサンプルコンテンツ

#### Canvas 2D
- `circular-particles`: 円周上を回転するパーティクル
- `wave-lines`: 重なり合う波線
- `radial-spokes`: 放射状のスポーク

#### Three.js
- `rotating-cube`: 回転する立方体（OrbitControls 付き）

#### p5.js
- `water-controller-text`: "Water Controller" テキストアニメーション
