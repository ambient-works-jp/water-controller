import { useEffect, useRef, useState } from 'react'
import { glassBlurPointer, getCursorPosition } from '../ContentPlaylist/contents/content-glass-blur-pointer'
import type { WsMessage } from '../../../../lib/types/websocket'
import type { ControllerState } from '../../features/controller/types'

interface HomeworksContentProps {
  lastMessage: WsMessage | null
  controllerState: ControllerState
  onContentChange?: (contentName: string, currentIndex: number, totalCount: number) => void
}

const CURSOR_RADIUS = 30 // カーソルの半径

export function HomeworksContent({
  lastMessage,
  controllerState,
  onContentChange
}: HomeworksContentProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // 最新の props を ref に保存（アニメーションループで使用）
  const controllerStateRef = useRef<ControllerState>(controllerState)
  const lastMessageRef = useRef<WsMessage | null>(lastMessage)

  useEffect(() => {
    controllerStateRef.current = controllerState
  }, [controllerState])

  useEffect(() => {
    lastMessageRef.current = lastMessage
  }, [lastMessage])

  // マウント時にコンテンツ情報を報告
  useEffect(() => {
    if (onContentChange) {
      onContentChange(glassBlurPointer.metadata.name, 0, 1)
    }
  }, [onContentChange])

  // Canvas のリサイズ処理
  const resizeCanvas = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
  }

  // アニメーションループ
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 初期リサイズ
    resizeCanvas()

    // リサイズイベントリスナー
    const handleResize = (): void => {
      resizeCanvas()
    }
    window.addEventListener('resize', handleResize)

    // アニメーションループ
    const animate = (): void => {
      const rect = canvas.getBoundingClientRect()
      const vw = rect.width
      const vh = rect.height
      const t = (Date.now() - startTimeRef.current) / 1000

      // glassBlurPointer をレンダリング
      if (glassBlurPointer.render) {
        glassBlurPointer.render(
          ctx,
          t,
          vw,
          vh,
          controllerStateRef.current,
          lastMessageRef.current
        )
      }

      // カーソル位置を取得して DOM 要素を更新
      const centerX = vw / 2
      const centerY = vh / 2
      const relativePos = getCursorPosition()
      const absoluteX = centerX + relativePos.x
      const absoluteY = centerY + relativePos.y

      // state 更新（React の最適化により、値が変わった場合のみ再レンダリング）
      setCursorPosition({ x: absoluteX, y: absoluteY })

      animationIdRef.current = requestAnimationFrame(animate)
    }

    // アニメーション開始
    animationIdRef.current = requestAnimationFrame(animate)

    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [])

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#000000'
      }}
    >
      {/* SVG Filter for Liquid Glass Effect */}
      <svg style={{ display: 'none' }}>
        <defs>
          <filter
            id="glass-distortion"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            filterUnits="objectBoundingBox"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.001 0.005"
              numOctaves="1"
              seed="17"
              result="turbulence"
            />
            <feComponentTransfer in="turbulence" result="mapped">
              <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
              <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
              <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
            </feComponentTransfer>
            <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
            <feSpecularLighting
              in="softMap"
              surfaceScale="5"
              specularConstant="1"
              specularExponent="100"
              lightingColor="white"
              result="specLight"
            >
              <fePointLight x="-200" y="-200" z="300" />
            </feSpecularLighting>
            <feComposite
              in="specLight"
              operator="arithmetic"
              k1="0"
              k2="1"
              k3="1"
              k4="0"
              result="litImage"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="softMap"
              scale="200"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      />

      {/* Liquid Glass Cursor (DOM Element) */}
      <div
        className="liquidGlass-cursor"
        style={{
          position: 'absolute',
          left: `${cursorPosition.x - CURSOR_RADIUS}px`,
          top: `${cursorPosition.y - CURSOR_RADIUS}px`,
          width: `${CURSOR_RADIUS * 2}px`,
          height: `${CURSOR_RADIUS * 2}px`,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 10,
          // Liquid Glass Effect
          backdropFilter: 'blur(3px)',
          filter: 'url(#glass-distortion)',
          background: 'rgba(255, 255, 255, 0.25)',
          boxShadow: `
            inset 2px 2px 1px 0 rgba(255, 255, 255, 0.5),
            inset -1px -1px 1px 1px rgba(255, 255, 255, 0.5),
            0 6px 6px rgba(0, 0, 0, 0.2),
            0 0 20px rgba(0, 0, 0, 0.1)
          `,
          transition: 'all 0.05s ease-out'
        }}
      />
    </div>
  )
}
