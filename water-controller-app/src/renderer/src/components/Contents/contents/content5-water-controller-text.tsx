/**
 * コンテンツ 5: Water Controller Text（p5.js）
 *
 * p5.js を使った "Water Controller" テキストアニメーション
 */

import { ReactP5Wrapper, type Sketch } from '@p5-wrapper/react'
import type { Content, ContentComponentProps } from '../types'

/**
 * p5.js スケッチ: "Water Controller" テキストアニメーション
 */
const sketch: Sketch = (p5) => {
  let angle = 0

  p5.setup = () => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight)
    p5.textAlign(p5.CENTER, p5.CENTER)
    p5.textSize(64)
  }

  p5.draw = () => {
    // 背景（少し透明にして軌跡を残す）
    p5.background(0, 0, 0, 25)

    // テキストの色をアニメーション
    const hue = (angle * 2) % 360
    p5.colorMode(p5.HSB, 360, 100, 100)
    p5.fill(hue, 80, 100)

    // テキストを表示
    p5.push()
    p5.translate(p5.width / 2, p5.height / 2)

    // 回転アニメーション
    p5.rotate(p5.sin(angle * 0.5) * 0.1)

    // スケールアニメーション
    const scale = 1 + p5.sin(angle) * 0.1
    p5.scale(scale)

    p5.text('Water Controller', 0, 0)
    p5.pop()

    // 角度を更新
    angle += 0.02
  }

  p5.windowResized = () => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight)
  }
}

/**
 * p5.js コンテンツコンポーネント
 */
function WaterControllerText({ width, height }: ContentComponentProps): React.JSX.Element {
  return (
    <div style={{ width, height }}>
      <ReactP5Wrapper sketch={sketch} />
    </div>
  )
}

/**
 * コンテンツ定義
 */
export const waterControllerText: Content = {
  metadata: {
    id: 'water-controller-text',
    name: 'Water Controller Text',
    description: 'p5.js で "Water Controller" を表示'
  },
  component: WaterControllerText
}
