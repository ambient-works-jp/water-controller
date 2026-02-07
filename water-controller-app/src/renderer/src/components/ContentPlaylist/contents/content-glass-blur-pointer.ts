/**
 * Glass Blur Pointer Content
 *
 * Apple Glass UI 風のブラーエフェクトを持つインタラクティブポインタ
 * - 背景画像の上をポインタが移動
 * - ポインタの軌跡にガラスのようなブラーエフェクトを適用
 * - コントローラ入力に反応する物理シミュレーション
 */

import type { Content } from '../types'
import backgroundImageSrc from '../../../assets/background-lorem-ipsum-1080p.png'

// トレイル点の型定義
interface TrailPoint {
  x: number
  y: number
  timestamp: number
}

// 状態管理（クロージャ内で保持）
let pointerX = 0 // 中央からの相対位置 X
let pointerY = 0 // 中央からの相対位置 Y
let velocityX = 0 // 速度 X
let velocityY = 0 // 速度 Y
let trail: TrailPoint[] = [] // ポインタの軌跡

// キャッシュ
let backgroundImage: HTMLImageElement | null = null
let backgroundImageLoaded = false
let offscreenCanvas: OffscreenCanvas | null = null
let blurCanvas: OffscreenCanvas | null = null

// 初期化フラグ
let initialized = false

// 設定
const TRAIL_MAX_POINTS = 80 // トレイル最大点数
const TRAIL_MAX_AGE_MS = 2000 // トレイル点の最大寿命（ミリ秒）
const BLUR_RADIUS = 40 // ブラー円の半径（ピクセル）
const BLUR_FILTER = 'blur(20px) saturate(160%) brightness(108%) contrast(95%)' // Apple Liquid Glass 風ブラーフィルタ

/**
 * 背景画像を読み込む
 */
function loadBackgroundImage(): void {
  if (!backgroundImage) {
    backgroundImage = new Image()
    backgroundImage.src = backgroundImageSrc
    backgroundImage.onload = () => {
      backgroundImageLoaded = true
      console.log('[GlassBlurPointer] Background image loaded')
    }
    backgroundImage.onerror = () => {
      console.error('[GlassBlurPointer] Failed to load background image')
    }
  }
}

/**
 * 現在のカーソル位置を取得（中央からの相対位置）
 */
export function getCursorPosition(): { x: number; y: number } {
  return { x: pointerX, y: pointerY }
}

/**
 * トレイルに新しい点を追加
 */
function addTrailPoint(x: number, y: number): void {
  const now = performance.now()
  trail.push({ x, y, timestamp: now })

  // 古い点を削除（最大点数を超えた場合）
  if (trail.length > TRAIL_MAX_POINTS) {
    trail.shift()
  }

  // 寿命を超えた点を削除
  const cutoff = now - TRAIL_MAX_AGE_MS
  trail = trail.filter((p) => p.timestamp > cutoff)
}

/**
 * Glass Blur Pointer の描画関数
 */
export const glassBlurPointer: Content = {
  metadata: {
    id: 'glass-blur-pointer',
    name: 'Glass Blur Pointer',
    description: 'Apple Glass UI 風のブラーエフェクトを持つインタラクティブポインタ'
  },
  render: (ctx, t, vw, vh, controllerState) => {
    // 初回のみ初期化
    if (!initialized) {
      loadBackgroundImage()
      initialized = true
    }

    // ===================================
    // 1. 背景画像を描画
    // ===================================
    if (backgroundImageLoaded && backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, vw, vh)
    } else {
      // 背景画像が未ロードの場合は黒背景
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, vw, vh)
    }

    // 画面中央
    const centerX = vw / 2
    const centerY = vh / 2

    // ===================================
    // 2. ポインタ位置を更新（既存ロジック）
    // ===================================
    const { left, right, up, down } = controllerState

    // 入力レベルに応じた速度
    const baseSpeed = 5
    const leftForce = left * baseSpeed
    const rightForce = right * baseSpeed
    const upForce = up * baseSpeed
    const downForce = down * baseSpeed

    // 速度に加算
    velocityX += (rightForce - leftForce) * 0.8
    velocityY += (downForce - upForce) * 0.8

    // 中央への復元力
    const restoreForce = 0.03
    velocityX -= pointerX * restoreForce
    velocityY -= pointerY * restoreForce

    // 減衰
    velocityX *= 0.92
    velocityY *= 0.92

    // 位置更新
    pointerX += velocityX
    pointerY += velocityY

    // 画面外に行きすぎないように制限（楕円形の境界）
    const maxDistanceX = vw * 0.4
    const maxDistanceY = vh * 0.4
    const ellipseRatio =
      (pointerX / maxDistanceX) * (pointerX / maxDistanceX) +
      (pointerY / maxDistanceY) * (pointerY / maxDistanceY)

    if (ellipseRatio > 1) {
      // 楕円の境界にスケール
      const scale = 1 / Math.sqrt(ellipseRatio)
      pointerX *= scale
      pointerY *= scale
      velocityX *= 0.5
      velocityY *= 0.5
    }

    // ポインタの実際の位置
    const posX = centerX + pointerX
    const posY = centerY + pointerY

    // トレイルに点を追加（速度が一定以上の場合のみ）
    const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY)
    if (speed > 0.3) {
      addTrailPoint(posX, posY)
    }

    // ===================================
    // 3. ブラーエフェクトを適用
    // ===================================
    if (backgroundImageLoaded && backgroundImage && trail.length > 0) {
      // オフスクリーン Canvas の準備
      if (!blurCanvas || blurCanvas.width !== vw || blurCanvas.height !== vh) {
        blurCanvas = new OffscreenCanvas(vw, vh)
      }
      if (!offscreenCanvas || offscreenCanvas.width !== vw || offscreenCanvas.height !== vh) {
        offscreenCanvas = new OffscreenCanvas(vw, vh)
      }

      const blurCtx = blurCanvas.getContext('2d')
      const offCtx = offscreenCanvas.getContext('2d')

      if (blurCtx && offCtx) {
        // ブラーマスクを作成（3層構造で深度感を表現）
        blurCtx.clearRect(0, 0, vw, vh)
        const now = performance.now()

        trail.forEach((point) => {
          const age = now - point.timestamp
          const alpha = 1 - age / TRAIL_MAX_AGE_MS // 古い点ほど透明

          // Layer 1: 拡張レイヤー（広く、薄く）
          blurCtx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.4})`
          blurCtx.beginPath()
          blurCtx.arc(point.x, point.y, BLUR_RADIUS * 1.5, 0, Math.PI * 2)
          blurCtx.fill()

          // Layer 2: ベースレイヤー（標準サイズ）
          blurCtx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`
          blurCtx.beginPath()
          blurCtx.arc(point.x, point.y, BLUR_RADIUS, 0, Math.PI * 2)
          blurCtx.fill()

          // Layer 3: コアレイヤー（小さく、強く）
          blurCtx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9})`
          blurCtx.beginPath()
          blurCtx.arc(point.x, point.y, BLUR_RADIUS * 0.5, 0, Math.PI * 2)
          blurCtx.fill()
        })

        // オフスクリーン Canvas にブラーをかけた背景を描画
        offCtx.clearRect(0, 0, vw, vh)
        offCtx.filter = BLUR_FILTER
        offCtx.drawImage(backgroundImage, 0, 0, vw, vh)
        offCtx.filter = 'none'

        // マスクを適用してメイン Canvas に合成
        ctx.save()
        ctx.globalCompositeOperation = 'source-over'

        // ブラーマスクの形状でクリッピング
        const maskImageData = blurCtx.getImageData(0, 0, vw, vh)
        const tempCanvas = new OffscreenCanvas(vw, vh)
        const tempCtx = tempCanvas.getContext('2d')

        if (tempCtx) {
          // ブラーされた背景をマスクで切り抜き
          tempCtx.drawImage(offscreenCanvas, 0, 0)
          tempCtx.globalCompositeOperation = 'destination-in'
          tempCtx.putImageData(maskImageData, 0, 0)

          // メイン Canvas に合成
          ctx.drawImage(tempCanvas, 0, 0)
        }

        ctx.restore()
      }
    }

    // ===================================
    // 4. カーソルは DOM 要素として描画（Canvas からは削除）
    // ===================================
    // カーソル位置は getCursorPosition() 関数で取得可能
  }
}
