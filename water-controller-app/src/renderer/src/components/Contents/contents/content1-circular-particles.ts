import type { Content } from '../types'

/**
 * コンテンツ 1: 円形パーティクル
 *
 * 円周上を回転しながら移動するパーティクルのアニメーション
 */
export const circularParticles: Content = {
  metadata: {
    id: 'circular-particles',
    name: 'Circular Particles',
    enabled: true,
    order: 0
  },
  render: (ctx, t, vw, vh) => {
    // 背景
    ctx.fillStyle = 'rgb(16,18,25)'
    ctx.fillRect(0, 0, vw, vh)

    // 中心座標
    const cx = vw / 2
    const cy = vh / 2

    // パーティクルを描画
    for (let i = 0; i < 60; i++) {
      const a = t * 0.9 + i * 0.21
      const r = Math.min(vw, vh) * 0.28 + Math.sin(t * 0.7 + i) * 20
      const x = cx + Math.cos(a) * r
      const y = cy + Math.sin(a) * r
      const s = 18 + 12 * Math.sin(t * 1.7 + i)

      ctx.fillStyle = `rgba(${150 + 80 * Math.sin(i * 0.3 + t * 1.3)},140,240,0.63)`
      ctx.beginPath()
      ctx.arc(x, y, s / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
