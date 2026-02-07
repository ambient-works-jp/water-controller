import { useEffect, useRef } from 'react'
import { interactivePointer } from '../ContentPlaylist/contents/content1-interactive-pointer'
import type { WsMessage } from '../../../../lib/types/websocket'
import type { ControllerState } from '../../features/controller/types'
import backgroundImage from '../../assets/background-lorem-ipsum-1080p.png'

interface HomeworksContentProps {
  lastMessage: WsMessage | null
  controllerState: ControllerState
  onContentChange?: (contentName: string, currentIndex: number, totalCount: number) => void
}

export function HomeworksContent({
  lastMessage,
  controllerState,
  onContentChange
}: HomeworksContentProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(Date.now())

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
      onContentChange(interactivePointer.metadata.name, 0, 1)
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

      // interactivePointer をレンダリング
      if (interactivePointer.render) {
        interactivePointer.render(
          ctx,
          t,
          vw,
          vh,
          controllerStateRef.current,
          lastMessageRef.current
        )
      }

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
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
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
    </div>
  )
}
