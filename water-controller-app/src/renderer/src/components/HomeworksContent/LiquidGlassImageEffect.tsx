/**
 * Liquid Glass Effect - Image Version
 *
 * 静的画像を背景とした Liquid Glass エフェクト
 */

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { ControllerState } from '../../features/controller/types'
import type { WsMessage } from '../../../../lib/types/websocket'
import backgroundImageFullHDSrc from '../../assets/background-lorem-ipsum-1920x1080.png'
import backgroundImageHDSrc from '../../assets/background-lorem-ipsum-1280x720.png'

// Constants
import { MOVEMENT_AREA, PHYSICS_PRESETS, EDGE_DETECTION_PARAMS } from '../../constants'

// Shader imports
import vertexShader from './shaders/liquidGlass.vert.glsl?raw'
import fragmentShader from './shaders/liquidGlass.frag.glsl?raw'

enum BackgroundImageSize {
  FULL_HD = 'FULL_HD',
  HD = 'HD'
}
const backgroundImageSize = BackgroundImageSize.HD as BackgroundImageSize
const backgroundImageSrc =
  backgroundImageSize === BackgroundImageSize.FULL_HD ? backgroundImageFullHDSrc : backgroundImageHDSrc

interface LiquidGlassImageEffectProps {
  controllerState: ControllerState
  lastMessage: WsMessage | null
  onContentChange?: (contentName: string, currentIndex: number, totalCount: number) => void
  enableCenteringCursorMode?: boolean
}

// 物理シミュレーション定数は constants.ts の PHYSICS_PRESETS から選択

// 波紋効果の定数
const MAX_TRAIL_POINTS = 24
const RIPPLE_PARAMS = {
  MAX_TRAIL_POINTS: MAX_TRAIL_POINTS, // 記録する軌跡点の最大数
  TRAIL_INTERVAL: 0.03, // 軌跡点を追加する間隔（秒）
  RIPPLE_LIFETIME: 2.0, // 波紋の持続時間（秒）
  RIPPLE_SPEED: 0.8, // 波紋の拡散速度
  MIN_DISTANCE: 0.02 // 軌跡点を追加する最小移動距離
} as const

// 軌跡点の型定義
interface TrailPoint {
  x: number // 正規化座標 [0-1]
  y: number // 正規化座標 [0-1]
  time: number // 生成時刻
}

// 物理シミュレーション状態
const pointerState = {
  x: 0, // 中央からの相対位置（ビューポート座標系）
  y: 0,
  velocityX: 0,
  velocityY: 0
}

// 軌跡配列（コンポーネント外で管理し、複数インスタンス間で共有しない）
const trailPoints: TrailPoint[] = []
let lastTrailTime = 0

export function LiquidGlassImageEffect({
  controllerState,
  onContentChange,
  enableCenteringCursorMode = true
}: LiquidGlassImageEffectProps): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null)
  const { size, viewport } = useThree()

  // 背景画像をテクスチャとして読み込み
  const backgroundTexture = useTexture(backgroundImageSrc)

  // コンテンツ情報を報告（初回のみ）
  useEffect(() => {
    if (onContentChange) {
      onContentChange('Liquid Glass (Three.js/WebGL) + Image', 0, 1)
    }
  }, [onContentChange])

  // Liquid Glass シェーダーマテリアル
  const material = useMemo(() => {
    // 軌跡点データを格納する配列（vec4: xy=位置, z=時刻, w=未使用）
    const trailData = new Float32Array(RIPPLE_PARAMS.MAX_TRAIL_POINTS * 4)

    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: backgroundTexture },
        uCursorPosition: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: { value: new THREE.Vector2(size.width, size.height) },
        uTime: { value: 0 },
        uRefractionStrength: { value: 0.05 },
        uChromaticAberration: { value: 0.002 },
        // 波紋効果用のuniforms
        uTrailPoints: { value: trailData },
        uTrailCount: { value: 0 },
        uRippleLifetime: { value: RIPPLE_PARAMS.RIPPLE_LIFETIME },
        uRippleSpeed: { value: RIPPLE_PARAMS.RIPPLE_SPEED },
        // フェード効果用のuniform（画像版は常に1.0）
        uOpacity: { value: 1.0 }
      },
      side: THREE.DoubleSide
    })
  }, [backgroundTexture, size.width, size.height])

  // ウィンドウリサイズ時の解像度更新
  useEffect(() => {
    material.uniforms.uResolution.value.set(size.width, size.height)
  }, [material, size.width, size.height])

  // アニメーションループ
  useFrame((state, delta) => {
    const { left, right, up, down } = controllerState

    // 物理パラメータの選択
    const PHYSICS_PARAMS = enableCenteringCursorMode ? PHYSICS_PRESETS.FUYOFUYO : PHYSICS_PRESETS.SIMPLE

    // フレームレート非依存の時間係数（60 FPS 基準）
    const timeScale = Math.min(delta * 60, 2) // 最大2倍に制限

    // 入力レベルに応じた速度
    const leftForce = left * PHYSICS_PARAMS.BASE_SPEED
    const rightForce = right * PHYSICS_PARAMS.BASE_SPEED
    const upForce = up * PHYSICS_PARAMS.BASE_SPEED
    const downForce = down * PHYSICS_PARAMS.BASE_SPEED

    if (enableCenteringCursorMode) {
      // ふよふよモード：物理シミュレーション方式（慣性あり、復元力あり）
      // 速度に加算（timeScale を適用）
      pointerState.velocityX += (rightForce - leftForce) * PHYSICS_PARAMS.FORCE_MULTIPLIER * timeScale
      pointerState.velocityY += (upForce - downForce) * PHYSICS_PARAMS.FORCE_MULTIPLIER * timeScale

      // 中央への復元力（ふよふよ戻る仕組み）
      pointerState.velocityX -= pointerState.x * PHYSICS_PARAMS.RESTORE_FORCE * timeScale
      pointerState.velocityY -= pointerState.y * PHYSICS_PARAMS.RESTORE_FORCE * timeScale

      // 減衰（慣性を保ちながら徐々に減速）
      const dampingFactor = Math.pow(PHYSICS_PARAMS.DAMPING, timeScale)
      pointerState.velocityX *= dampingFactor
      pointerState.velocityY *= dampingFactor
    } else {
      // シンプルモード：入力方向に直接速度を設定（慣性なし）
      if (left > 0 || right > 0) {
        // X軸に入力がある場合は速度を直接設定
        pointerState.velocityX = (rightForce - leftForce) * PHYSICS_PARAMS.FORCE_MULTIPLIER
      } else {
        // X軸に入力がない場合は速度をゼロに
        pointerState.velocityX = 0
      }

      if (up > 0 || down > 0) {
        // Y軸に入力がある場合は速度を直接設定
        pointerState.velocityY = (upForce - downForce) * PHYSICS_PARAMS.FORCE_MULTIPLIER
      } else {
        // Y軸に入力がない場合は速度をゼロに
        pointerState.velocityY = 0
      }
    }

    // 位置更新
    pointerState.x += pointerState.velocityX * timeScale
    pointerState.y += pointerState.velocityY * timeScale

    // 境界制限（正方形）
    let maxDistanceX, maxDistanceY
    if (MOVEMENT_AREA.USE_SQUARE_CONSTRAINT) {
      // 正方形制約：画面高さを基準にする
      maxDistanceX = viewport.height * MOVEMENT_AREA.WIDTH_RATIO
      maxDistanceY = viewport.height * MOVEMENT_AREA.HEIGHT_RATIO
    } else {
      // 楕円制約：画面幅と高さそれぞれを基準にする
      maxDistanceX = viewport.width * PHYSICS_PARAMS.MAX_VIEWPORT_RATIO
      maxDistanceY = viewport.height * PHYSICS_PARAMS.MAX_VIEWPORT_RATIO
    }

    // 正方形の境界制限（X軸とY軸を独立してクランプ）
    if (pointerState.x > maxDistanceX) {
      pointerState.x = maxDistanceX
      pointerState.velocityX = 0
    } else if (pointerState.x < -maxDistanceX) {
      pointerState.x = -maxDistanceX
      pointerState.velocityX = 0
    }

    if (pointerState.y > maxDistanceY) {
      pointerState.y = maxDistanceY
      pointerState.velocityY = 0
    } else if (pointerState.y < -maxDistanceY) {
      pointerState.y = -maxDistanceY
      pointerState.velocityY = 0
    }

    // シェーダーの uniforms を更新
    // カーソル位置を正規化座標 [0-1] に変換（中央が0.5, 0.5）
    const normalizedX = 0.5 + pointerState.x / viewport.width
    const normalizedY = 0.5 - pointerState.y / viewport.height // Y軸反転
    const currentTime = state.clock.elapsedTime

    material.uniforms.uCursorPosition.value.set(normalizedX, normalizedY)
    material.uniforms.uTime.value = currentTime

    // コントローラー入力がある時だけ軌跡点を記録（静止時のプルプルを防止）
    const hasInput = left > 0 || right > 0 || up > 0 || down > 0

    // ふよふよモードの場合、カーソルが端にいるかチェック
    const isAtEdge =
      Math.abs(pointerState.x) > maxDistanceX * EDGE_DETECTION_PARAMS.EDGE_THRESHOLD ||
      Math.abs(pointerState.y) > maxDistanceY * EDGE_DETECTION_PARAMS.EDGE_THRESHOLD

    const shouldAddTrail =
      hasInput &&
      (!enableCenteringCursorMode || isAtEdge) && // ふよふよモードのときは端にいる場合のみ
      (trailPoints.length === 0 ||
        currentTime - lastTrailTime >= RIPPLE_PARAMS.TRAIL_INTERVAL ||
        (trailPoints.length > 0 &&
          Math.hypot(
            normalizedX - trailPoints[trailPoints.length - 1].x,
            normalizedY - trailPoints[trailPoints.length - 1].y
          ) >= RIPPLE_PARAMS.MIN_DISTANCE))

    if (shouldAddTrail) {
      trailPoints.push({ x: normalizedX, y: normalizedY, time: currentTime })
      lastTrailTime = currentTime

      // 最大数を超えたら古いものを削除
      if (trailPoints.length > RIPPLE_PARAMS.MAX_TRAIL_POINTS) {
        trailPoints.shift()
      }
    }

    // 古い軌跡点を削除（寿命切れ）
    while (
      trailPoints.length > 0 &&
      currentTime - trailPoints[0].time > RIPPLE_PARAMS.RIPPLE_LIFETIME
    ) {
      trailPoints.shift()
    }

    // 軌跡点データをuniformに転送
    const trailData = material.uniforms.uTrailPoints.value as Float32Array
    for (let i = 0; i < RIPPLE_PARAMS.MAX_TRAIL_POINTS; i++) {
      if (i < trailPoints.length) {
        const point = trailPoints[i]
        trailData[i * 4 + 0] = point.x
        trailData[i * 4 + 1] = point.y
        trailData[i * 4 + 2] = point.time
        trailData[i * 4 + 3] = 0 // 未使用
      } else {
        // データがない場合は無効な値を設定
        trailData[i * 4 + 0] = -1
        trailData[i * 4 + 1] = -1
        trailData[i * 4 + 2] = -1
        trailData[i * 4 + 3] = 0
      }
    }
    material.uniforms.uTrailCount.value = trailPoints.length
  })

  return (
    <>
      {/* フルスクリーンクワッド（Liquid Glass エフェクト） */}
      <mesh ref={meshRef} scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry args={[1, 1]} />
        <primitive object={material} attach="material" />
      </mesh>
    </>
  )
}
