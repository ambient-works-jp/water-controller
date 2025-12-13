/**
 * コンテンツ 6: インタラクティブポインタ
 *
 * コントローラ入力に反応する「ぽわぽわするポインタ」
 * - 4方向入力で移動
 * - 入力がないと中央に戻る
 * - タッチ強度で移動速度が変化
 */

import type { Content } from '../types'

// パーティクルの型定義
interface Particle {
  angle: number
  distance: number
  speed: number
}

// ポインタの状態（クロージャ内で保持）
let pointerX = 0 // 中央からの相対位置 X
let pointerY = 0 // 中央からの相対位置 Y
let velocityX = 0 // 速度 X
let velocityY = 0 // 速度 Y
let particles: Particle[] = []
let pulsePhase = 0

// 初期化フラグ
let initialized = false

/**
 * パーティクルを初期化
 */
function initParticles(): void {
  particles = []
  const count = 12
  for (let i = 0; i < count; i++) {
    particles.push({
      angle: (Math.PI * 2 * i) / count,
      distance: 30,
      speed: 0.5 + Math.random() * 0.5
    })
  }
}

/**
 * インタラクティブポインタの描画関数
 */
export const interactivePointer: Content = {
  metadata: {
    id: 'interactive-pointer',
    name: 'Interactive Pointer',
    description: 'コントローラ入力に反応するぽわぽわポインタ'
  },
  render: (ctx, t, vw, vh, lastMessage) => {
    // 初回のみパーティクルを初期化
    if (!initialized) {
      initParticles()
      initialized = true
    }

    // 背景（トレイル効果のため少し透明に）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
    ctx.fillRect(0, 0, vw, vh)

    // 画面中央
    const centerX = vw / 2
    const centerY = vh / 2

    // コントローラ入力から加速度を計算
    if (lastMessage?.type === 'controller-input') {
      const { left, right, up, down } = lastMessage

      // 入力レベルに応じた速度（0: NoInput, 1: Low, 2: High）
      const baseSpeed = 5
      const leftForce = left * baseSpeed
      const rightForce = right * baseSpeed
      const upForce = up * baseSpeed
      const downForce = down * baseSpeed

      // 速度に加算
      velocityX += (rightForce - leftForce) * 0.8
      velocityY += (downForce - upForce) * 0.8
    }

    // 中央への復元力（操作しないと戻る）
    const restoreForce = 0.03
    velocityX -= pointerX * restoreForce
    velocityY -= pointerY * restoreForce

    // 減衰（イージング）
    velocityX *= 0.92
    velocityY *= 0.92

    // 位置更新
    pointerX += velocityX
    pointerY += velocityY

    // 画面外に行きすぎないように制限
    const maxDistance = Math.min(vw, vh) * 0.4
    const distance = Math.sqrt(pointerX * pointerX + pointerY * pointerY)
    if (distance > maxDistance) {
      const scale = maxDistance / distance
      pointerX *= scale
      pointerY *= scale
      velocityX *= 0.5
      velocityY *= 0.5
    }

    // ポインタの実際の位置
    const posX = centerX + pointerX
    const posY = centerY + pointerY

    // パーティクルを更新・描画（ぽわぽわ感）
    pulsePhase += 0.05
    particles.forEach((p, i) => {
      p.angle += p.speed * 0.02

      // パーティクルの位置（ポインタ中心から放射状）
      const pulse = Math.sin(pulsePhase + i * 0.5) * 5 + p.distance
      const px = posX + Math.cos(p.angle) * pulse
      const py = posY + Math.sin(p.angle) * pulse

      // パーティクルを描画
      const particleSize = 3 + Math.sin(pulsePhase + i) * 2

      // グラデーション
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, particleSize * 2)
      gradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)')
      gradient.addColorStop(1, 'rgba(100, 200, 255, 0)')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(px, py, particleSize * 2, 0, Math.PI * 2)
      ctx.fill()
    })

    // ポインタ本体（脈動する円）
    const baseSize = 20
    const pulse = Math.sin(t * 2) * 0.3 + 1
    const size = baseSize * pulse

    // 速度に応じた色変化
    const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY)
    const speedFactor = Math.min(speed / 10, 1)

    // グラデーション（中心が明るい）
    const gradient = ctx.createRadialGradient(posX, posY, 0, posX, posY, size * 1.5)

    // 速度が速いと赤系、遅いと青系
    const r = Math.floor(100 + speedFactor * 155)
    const g = Math.floor(150 - speedFactor * 100)
    const b = Math.floor(255 - speedFactor * 100)

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`)
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.6)`)
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(posX, posY, size * 1.5, 0, Math.PI * 2)
    ctx.fill()

    // 中心の白い点
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.arc(posX, posY, size * 0.3, 0, Math.PI * 2)
    ctx.fill()

    // 速度ベクトルの表示（デバッグ用、控えめ）
    if (speed > 0.5) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(speedFactor * 0.5, 0.3)})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(posX, posY)
      ctx.lineTo(posX + velocityX * 3, posY + velocityY * 3)
      ctx.stroke()
    }
  }
}
