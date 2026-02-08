/**
 * Liquid Glass Scene - Three.js/WebGL Implementation
 *
 * ビジュアル作品品質の Liquid Glass エフェクト
 * - 本物の屈折（UV 変形）
 * - Simplex Noise による液体アニメーション
 * - Chromatic Aberration（色収差）
 * - 高品質レンダリング
 */

import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { LiquidGlassImageEffect } from './LiquidGlassImageEffect'
import { LiquidGlassVideoEffect } from './LiquidGlassVideoEffect'
import { VideoDebugUI } from './VideoDebugUI'
import type { ControllerState } from '../../features/controller/types'
import type { WsMessage } from '../../../../lib/types/websocket'

// 背景タイプの設定
type BackgroundType = 'image' | 'video'
const BACKGROUND_TYPE: BackgroundType = 'video' // 'image' または 'video'

interface LiquidGlassSceneProps {
  controllerState: ControllerState
  lastMessage: WsMessage | null
  onContentChange?: (contentName: string, currentIndex: number, totalCount: number) => void
  debugMode?: boolean
  showCursor?: boolean
}

export function LiquidGlassScene({
  controllerState,
  lastMessage,
  onContentChange,
  debugMode = false,
  showCursor = false
}: LiquidGlassSceneProps): React.JSX.Element {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 })

  const handleCursorPositionUpdate = (x: number, y: number) => {
    setCursorPosition({ x, y })
  }

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
            onVideoElementReady={setVideoElement}
            onCursorPositionUpdate={handleCursorPositionUpdate}
          />
        )}
      </Canvas>

      {/* デバッグUI（動画モード＆デバッグモード時のみ表示） */}
      {debugMode && BACKGROUND_TYPE === 'video' && <VideoDebugUI videoElement={videoElement} />}

      {/* カーソル位置インジケーター（showCursor が true の時のみ表示） */}
      {showCursor && (
        <div
          style={{
            position: 'absolute',
            left: `${cursorPosition.x * 100}%`,
            top: `${cursorPosition.y * 100}%`,
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            border: '3px solid rgba(0, 0, 0, 0.7)',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 99999,
            boxShadow: '0 0 20px rgba(255, 255, 255, 1), inset 0 0 10px rgba(255, 255, 255, 0.5)'
          }}
        >
          {/* デバッグ: 座標テキスト */}
          <div
            style={{
              position: 'absolute',
              top: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap'
            }}
          >
            ({cursorPosition.x.toFixed(2)}, {cursorPosition.y.toFixed(2)})
          </div>
        </div>
      )}
    </div>
  )
}
