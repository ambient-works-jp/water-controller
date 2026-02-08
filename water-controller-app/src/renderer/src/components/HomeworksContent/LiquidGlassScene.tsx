/**
 * Liquid Glass Scene - Three.js/WebGL Implementation
 *
 * ビジュアル作品品質の Liquid Glass エフェクト
 * - 本物の屈折（UV 変形）
 * - Simplex Noise による液体アニメーション
 * - Chromatic Aberration（色収差）
 * - 高品質レンダリング
 */

import { Canvas } from '@react-three/fiber'
import { LiquidGlassImageEffect } from './LiquidGlassImageEffect'
import { LiquidGlassVideoEffect } from './LiquidGlassVideoEffect'
import type { ControllerState } from '../../features/controller/types'
import type { WsMessage } from '../../../../lib/types/websocket'

// 背景タイプの設定
type BackgroundType = 'image' | 'video'
const BACKGROUND_TYPE: BackgroundType = 'video' // 'image' または 'video'

interface LiquidGlassSceneProps {
  controllerState: ControllerState
  lastMessage: WsMessage | null
  onContentChange?: (contentName: string, currentIndex: number, totalCount: number) => void
}

export function LiquidGlassScene({
  controllerState,
  lastMessage,
  onContentChange
}: LiquidGlassSceneProps): React.JSX.Element {
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Canvas
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: false
        }}
        camera={{ position: [0, 0, 1], fov: 75, near: 0.1, far: 1000 }}
        dpr={Math.min(window.devicePixelRatio, 2)} // パフォーマンス最適化
        style={{ width: '100%', height: '100%' }}
      >
        {BACKGROUND_TYPE === 'image' ? (
          <LiquidGlassImageEffect
            controllerState={controllerState}
            lastMessage={lastMessage}
            onContentChange={onContentChange}
          />
        ) : (
          <LiquidGlassVideoEffect
            controllerState={controllerState}
            lastMessage={lastMessage}
            onContentChange={onContentChange}
          />
        )}
      </Canvas>
    </div>
  )
}
