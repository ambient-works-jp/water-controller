import type { Content } from './types'

/**
 * コンテンツ 2: 波線
 *
 * 複数の波線が重なり合うアニメーション
 */
export const waveLines: Content = {
  metadata: {
    id: 'wave-lines',
    name: 'Wave Lines',
    enabled: true,
    order: 1
  },
  render: (ctx, t, vw, vh) => {
    // 背景
    ctx.fillStyle = 'rgb(10,12,18)'
    ctx.fillRect(0, 0, vw, vh)

    // 波線の数
    const lines = 8

    // 各波線を描画
    for (let l = 0; l < lines; l++) {
      ctx.beginPath()
      for (let x = 0; x <= vw; x += 12) {
        const y =
          vh / 2 +
          (Math.sin(x * 0.02 + t * 0.8 + l) + Math.sin(x * 0.007 + t * 0.5 + l * 1.7)) *
            (vh * 0.09) +
          (l - lines / 2) * 16

        if (x === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }

      ctx.strokeStyle = `rgba(${80 + l * 20},180,255,0.6)`
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }
}
