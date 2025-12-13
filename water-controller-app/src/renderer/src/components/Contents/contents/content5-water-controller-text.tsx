/**
 * コンテンツ 5: Water Controller Text（p5.js）
 *
 * p5.js を使った "Water Controller" 3D テキストアニメーション
 * 参考: https://p5js.org/sketches/2689119/ (Boiling Point by Dave Pagurek)
 */

import { ReactP5Wrapper, type Sketch } from '@p5-wrapper/react'
import type { Content, ContentComponentProps } from '../types'
import type p5 from 'p5'

/**
 * p5.js スケッチ: "Water Controller" 3D テキストアニメーション
 */
const sketch: Sketch = (p5) => {
  let font: p5.Font | null = null
  let letters: string[]
  let fontLoaded = false

  p5.setup = () => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight, p5.WEBGL)

    // "Water Controller" を文字ごとに分割
    letters = 'WATER CONTROLLER'.split('')

    // フォントを非同期で読み込み
    p5.loadFont(
      'https://fonts.gstatic.com/s/tiltwarp/v17/AlZc_zVDs5XpmO7yn3w7flUoytXJp3z29uEwmEMLEJljLXvT8UJSZTBxAVfMGOPb.ttf',
      (f) => {
        font = f
        fontLoaded = true
        p5.textFont(font)
        p5.textSize(120)
        p5.textAlign(p5.CENTER, p5.CENTER)
      }
    )
  }

  p5.draw = () => {
    p5.background(20)

    // フォントが読み込まれるまで待つ
    if (!fontLoaded || !font) {
      p5.fill(255)
      p5.textSize(32)
      p5.textAlign(p5.CENTER, p5.CENTER)
      p5.text('Loading...', 0, 0)
      return
    }

    // カメラの設定
    const s = Math.min(p5.width, p5.height) / 1000
    p5.camera(-250 * s, -400 * s, 650 * s, 0, -50, 0, 0, 1, 0)

    // ライティング
    p5.ambientLight(80)
    p5.directionalLight(180, 180, 200, 0, 0.7, -1)
    p5.directionalLight(120, 120, 140, -0.5, 0.8, 0.3)

    const t = p5.millis()

    // 波打つ水面を先に描画（背景）
    p5.push()
    p5.noStroke()
    p5.rotateX(p5.PI / 2)

    // より細かいグリッドで滑らかな水面を描画
    const gridSize = 15
    const gridCount = 50

    for (let i = 0; i < gridCount - 1; i++) {
      for (let j = 0; j < gridCount - 1; j++) {
        const x1 = (i - gridCount / 2) * gridSize
        const z1 = (j - gridCount / 2) * gridSize
        const x2 = x1 + gridSize
        const z2 = z1 + gridSize

        const h1 = getWaterHeight(x1, z1, t)
        const h2 = getWaterHeight(x2, z1, t)
        const h3 = getWaterHeight(x2, z2, t)
        const h4 = getWaterHeight(x1, z2, t)

        // 各頂点の明暗を計算（高さに基づく）
        const avgHeight = (h1 + h2 + h3 + h4) / 4
        const brightness = p5.map(avgHeight, -30, 30, 50, 120)

        p5.fill(brightness * 0.5, brightness * 0.7, brightness)

        p5.beginShape()
        p5.vertex(x1, h1, z1)
        p5.vertex(x2, h2, z1)
        p5.vertex(x2, h3, z2)
        p5.vertex(x1, h4, z2)
        p5.endShape(p5.CLOSE)
      }
    }
    p5.pop()

    // 文字を描画（前面）
    p5.push()
    p5.noStroke()
    p5.fill(240)
    p5.specularMaterial(250)
    p5.shininess(20)
    p5.rotateX(p5.PI / 2)

    const totalWidth = p5.textWidth(letters.join(''))
    let x = -totalWidth / 2

    for (let i = 0; i < letters.length; i++) {
      const letter = letters[i]
      const letterW = p5.textWidth(letter)
      x += letterW / 2

      p5.push()
      p5.translate(
        p5.map(p5.noise(t * 0.0005, x * 0.01, 0), 0, 1, -15, 15) + x,
        p5.map(p5.noise(t * 0.0001, x * 0.01, 100), 0, 1, -50, 50),
        p5.map(p5.noise(t * 0.0005, x * 0.01, 200), 0, 1, -15, 15) +
          p5.sin(t * 0.0005 + 10 * p5.noise(x * 0.01)) * 15 -
          30
      )
      p5.rotateX(p5.sin(t * 0.00025 + 10 * p5.noise(x * 0.01)) * p5.TWO_PI * 0.03)
      p5.rotateZ(p5.sin(t * 0.0005 + 10 * p5.noise(x * 0.01)) * p5.TWO_PI * 0.03)
      p5.rotateY(p5.sin(t * 0.00005 + 10 * p5.noise(x * 0.01)) * p5.TWO_PI * 0.01)

      // 3D テキストを描画
      p5.text(letter, 0, 0)

      p5.pop()
      x += letterW / 2
    }
    p5.pop()
  }

  /**
   * 水面の高さを計算（フラクタルノイズ）
   */
  function getWaterHeight(x: number, z: number, t: number): number {
    const s = 0.35
    return (
      30 *
      (p5.noise(x * 0.01, z * 0.01, t * 0.00001) +
        s * p5.noise(x * 0.02, z * 0.02, t * 0.00002) +
        s * s * s * p5.noise(x * 0.04, z * 0.04, t * 0.00004))
    )
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
    description: 'p5.js で "Water Controller" を 3D 表示'
  },
  component: WaterControllerText
}
