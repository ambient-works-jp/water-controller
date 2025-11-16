import type { Content } from './types'

/**
 * コンテンツ 3: 放射状スポーク
 *
 * 中心から放射状に伸びるスポークのアニメーション
 */
export const radialSpokes: Content = {
  metadata: {
    id: 'radial-spokes',
    name: 'Radial Spokes',
    enabled: true,
    order: 2
  },
  render: (ctx, t, vw, vh) => {
    // 背景
    ctx.fillStyle = 'rgb(15,8,18)'
    ctx.fillRect(0, 0, vw, vh)

    // 中心に移動
    ctx.save()
    ctx.translate(vw / 2, vh / 2)

    const spokes = 120
    const maxR = Math.hypot(vw, vh) * 0.55

    // 各スポークを描画
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2 + t * 0.4
      const r = maxR * (0.5 + 0.5 * Math.sin(t * 0.8 + i * 0.2))

      ctx.strokeStyle = `rgba(255,${200 - (i % 10) * 20},200,0.63)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20)
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      ctx.stroke()
    }

    ctx.restore()
  }
}
