/**
 * Liquid Glass Effect - Video Version
 *
 * 動画を背景とした Liquid Glass エフェクト
 */

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ControllerState } from '../../features/controller/types'
import type { WsMessage } from '../../../../lib/types/websocket'
import videoSrc from '../../assets/background-movie-1080p.mp4'

// Custom hooks
import { useVideoTexture } from './hooks/useVideoTexture'

// Constants
import { VIDEO_FADE_PARAMS } from '../../constants'

// Shader imports
import vertexShader from './shaders/liquidGlass.vert.glsl?raw'
import fragmentShader from './shaders/liquidGlass.frag.glsl?raw'

interface LiquidGlassVideoEffectProps {
  controllerState: ControllerState
  lastMessage: WsMessage | null
  onContentChange?: (contentName: string, currentIndex: number, totalCount: number) => void
  onVideoElementReady?: (videoElement: HTMLVideoElement | null) => void
}

// 物理シミュレーション定数
const PHYSICS_PARAMS = {
  BASE_SPEED: 0.01, // 基本移動速度（低いほど遅い）
  FORCE_MULTIPLIER: 0.8, // 入力力の倍率
  RESTORE_FORCE: 0.03, // 中央への復元力
  DAMPING: 0.92, // 減衰係数（0-1、高いほど慣性が残る）
  MAX_VIEWPORT_RATIO: 0.4 // 画面に対する最大移動距離の比率
} as const

// 波紋効果の定数
const MAX_TRAIL_POINTS = 24;
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

export function LiquidGlassVideoEffect({
  controllerState,
  onContentChange,
  onVideoElementReady
}: LiquidGlassVideoEffectProps): React.JSX.Element {
  const meshRef = useRef<THREE.Mesh>(null)
  const { size, viewport } = useThree()

  // 背景動画をVideoTextureとして読み込み
  const { texture: backgroundTexture, videoElement } = useVideoTexture(videoSrc)

  // コンテンツ情報を報告（初回のみ）
  useEffect(() => {
    if (onContentChange) {
      onContentChange('Liquid Glass (Three.js/WebGL) + Video', 0, 1)
    }
  }, [onContentChange])

  // ビデオ要素が準備できたら親コンポーネントに通知
  useEffect(() => {
    if (onVideoElementReady) {
      onVideoElementReady(videoElement)
    }
  }, [videoElement, onVideoElementReady])

  // Liquid Glass シェーダーマテリアル
  const material = useMemo(() => {
    // 動画が読み込まれていない場合は null を返す
    if (!backgroundTexture) {
      return null
    }

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
        uRefractionStrength: { value: 0.015 },
        uChromaticAberration: { value: 0.001 },
        // 波紋効果用のuniforms
        uTrailPoints: { value: trailData },
        uTrailCount: { value: 0 },
        uRippleLifetime: { value: RIPPLE_PARAMS.RIPPLE_LIFETIME },
        uRippleSpeed: { value: RIPPLE_PARAMS.RIPPLE_SPEED },
        // フェード効果用のuniform
        uOpacity: { value: 1.0 }
      },
      side: THREE.DoubleSide,
      transparent: true
    })
  }, [backgroundTexture, size.width, size.height])

  // ウィンドウリサイズ時の解像度更新
  useEffect(() => {
    if (material) {
      material.uniforms.uResolution.value.set(size.width, size.height)
    }
  }, [material, size.width, size.height])

  // アニメーションループ
  useFrame((state, delta) => {
    // 動画が読み込まれていない場合はスキップ
    if (!material) {
      return
    }

    const { left, right, up, down } = controllerState

    // フレームレート非依存の時間係数（60 FPS 基準）
    const timeScale = Math.min(delta * 60, 2) // 最大2倍に制限

    // 入力レベルに応じた速度
    const leftForce = left * PHYSICS_PARAMS.BASE_SPEED
    const rightForce = right * PHYSICS_PARAMS.BASE_SPEED
    const upForce = up * PHYSICS_PARAMS.BASE_SPEED
    const downForce = down * PHYSICS_PARAMS.BASE_SPEED

    // 速度に加算（timeScale を適用）
    pointerState.velocityX += (rightForce - leftForce) * PHYSICS_PARAMS.FORCE_MULTIPLIER * timeScale
    pointerState.velocityY += (downForce - upForce) * PHYSICS_PARAMS.FORCE_MULTIPLIER * timeScale

    // 中央への復元力
    pointerState.velocityX -= pointerState.x * PHYSICS_PARAMS.RESTORE_FORCE * timeScale
    pointerState.velocityY -= pointerState.y * PHYSICS_PARAMS.RESTORE_FORCE * timeScale

    // 減衰
    const dampingFactor = Math.pow(PHYSICS_PARAMS.DAMPING, timeScale)
    pointerState.velocityX *= dampingFactor
    pointerState.velocityY *= dampingFactor

    // 位置更新
    pointerState.x += pointerState.velocityX * timeScale
    pointerState.y += pointerState.velocityY * timeScale

    // 楕円形の境界制限
    const maxDistanceX = viewport.width * PHYSICS_PARAMS.MAX_VIEWPORT_RATIO
    const maxDistanceY = viewport.height * PHYSICS_PARAMS.MAX_VIEWPORT_RATIO
    const ellipseRatio =
      (pointerState.x / maxDistanceX) * (pointerState.x / maxDistanceX) +
      (pointerState.y / maxDistanceY) * (pointerState.y / maxDistanceY)

    if (ellipseRatio > 1) {
      const scale = 1 / Math.sqrt(ellipseRatio)
      pointerState.x *= scale
      pointerState.y *= scale
      pointerState.velocityX *= 0.5
      pointerState.velocityY *= 0.5
    }

    // シェーダーの uniforms を更新
    // カーソル位置を正規化座標 [0-1] に変換（中央が0.5, 0.5）
    const normalizedX = 0.5 + (pointerState.x / viewport.width)
    const normalizedY = 0.5 - (pointerState.y / viewport.height) // Y軸反転
    const currentTime = state.clock.elapsedTime

    material.uniforms.uCursorPosition.value.set(normalizedX, normalizedY)
    material.uniforms.uTime.value = currentTime

    // コントローラー入力がある時だけ軌跡点を記録（静止時のプルプルを防止）
    const hasInput = left > 0 || right > 0 || up > 0 || down > 0

    const shouldAddTrail =
      hasInput &&
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

    // フェード効果の計算（smoothstep でイージング）
    if (videoElement && videoElement.duration > 0) {
      const videoDuration = videoElement.duration
      const videoCurrentTime = videoElement.currentTime

      let opacity = 1.0

      // smoothstep関数（より自然な曲線）
      const smoothstep = (edge0: number, edge1: number, x: number): number => {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
        return t * t * (3 - 2 * t)
      }

      // フェードアウト（終端の2.0秒前から）
      const timeUntilEnd = videoDuration - videoCurrentTime
      if (timeUntilEnd <= VIDEO_FADE_PARAMS.FADE_START_BEFORE_END) {
        // 2.0秒前から0秒まで、1.0 → 0.0 にスムーズにフェード
        const fadeProgress = timeUntilEnd / VIDEO_FADE_PARAMS.FADE_START_BEFORE_END
        opacity = smoothstep(0, 1, fadeProgress)
      }
      // フェードイン（最初の1.5秒）
      else if (videoCurrentTime <= VIDEO_FADE_PARAMS.FADE_DURATION) {
        // 0秒から1.5秒まで、0.0 → 1.0 にスムーズにフェード
        const fadeProgress = videoCurrentTime / VIDEO_FADE_PARAMS.FADE_DURATION
        opacity = smoothstep(0, 1, fadeProgress)
      }

      material.uniforms.uOpacity.value = opacity
    }

    // デバッグログ（開発時）
    if (Math.random() < 0.01) { // 1%の確率でログ出力
      console.log('[LiquidGlass]', {
        pointerX: pointerState.x.toFixed(2),
        pointerY: pointerState.y.toFixed(2),
        normalizedX: normalizedX.toFixed(3),
        normalizedY: normalizedY.toFixed(3),
        velocityX: pointerState.velocityX.toFixed(2),
        velocityY: pointerState.velocityY.toFixed(2)
      })
    }
  })

  // 動画が読み込まれていない場合は何も表示しない
  if (!material) {
    return <></>
  }

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
