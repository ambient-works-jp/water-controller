import { useEffect, useRef, useState, useCallback } from 'react'
import type { WsMessage } from '../../../../lib/types/websocket'

/**
 * コンテンツの統括
 *
 * すべてのコンテンツをエクスポートし、コンテンツリストを提供します
 */

import type { Content } from './types'
import { circularParticles } from './content1-circular-particles'
import { waveLines } from './content2-wave-lines'
import { radialSpokes } from './content3-radial-spokes'

/**
 * 利用可能なすべてのコンテンツ
 */
export const CONTENTS: Content[] = [circularParticles, waveLines, radialSpokes]

/**
 * コンテンツの総数
 */
export const CONTENT_COUNT = CONTENTS.length

/**
 * ID からコンテンツを取得
 */
export function getContentById(id: string): Content | undefined {
  return CONTENTS.find((content) => content.metadata.id === id)
}

/**
 * インデックスからコンテンツを取得（循環）
 */
export function getContentByIndex(index: number): Content {
  const normalizedIndex = ((index % CONTENT_COUNT) + CONTENT_COUNT) % CONTENT_COUNT
  return CONTENTS[normalizedIndex]
}

// 型をエクスポート
export type { Content, ContentRenderer } from './types'

const FADE_DURATION_SEC = 0.6

interface ContentsProps {
  /** Ping 送信ハンドラ（デバッグ用） */
  onSendPing: () => void
  /** 最新の WebSocket メッセージ */
  lastMessage: WsMessage | null
}

/**
 * コンテンツ表示コンポーネント
 *
 * Canvas を使用してアニメーションコンテンツを表示し、
 * ButtonInput メッセージで無限ループ切り替えを行います
 */
export function Contents({ lastMessage }: ContentsProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // アニメーション状態を ref で管理（再レンダリングを避ける）
  const currentIndexRef = useRef(0)
  const nextIndexRef = useRef(0)
  const isTransitioningRef = useRef(false)
  const phaseRef = useRef<'idle' | 'out' | 'in'>('idle')
  const fadeRef = useRef(0)

  // ButtonInput メッセージを検知してコンテンツを切り替え
  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'button-input') {
      return
    }

    // isPushed が true のときのみ切り替え
    if (lastMessage.isPushed && !isTransitioningRef.current) {
      console.log('[Contents] Switching to next content')
      isTransitioningRef.current = true
      nextIndexRef.current = (currentIndexRef.current + 1) % CONTENT_COUNT
      phaseRef.current = 'out'
      fadeRef.current = 0
    }
  }, [lastMessage])

  // Canvas のリサイズ処理
  const resize = useCallback(() => {
    const canvas = canvasRef.current
    const parent = containerRef.current
    if (!canvas || !parent) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = parent.clientWidth
    const h = parent.clientHeight
    const dpr = Math.min(2, window.devicePixelRatio || 1)

    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    return { ctx, vw: w, vh: h }
  }, [])

  // Canvas アニメーションループ（一度だけ起動、依存配列なし）
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let t = 0
    let lastTime = performance.now()

    const dims = resize()
    if (!dims) return
    let { vw, vh } = dims

    const handleResize = (): void => {
      const newDims = resize()
      if (newDims) {
        vw = newDims.vw
        vh = newDims.vh
      }
    }

    window.addEventListener('resize', handleResize)

    const loop = (now: number): void => {
      const dt = Math.max(0, (now - lastTime) / 1000)
      lastTime = now
      t += dt

      // ref から最新の値を取得
      const currentIndex = currentIndexRef.current
      const nextIndex = nextIndexRef.current
      const phase = phaseRef.current
      const isTransitioning = isTransitioningRef.current

      // 現在のコンテンツを描画
      const content = getContentByIndex(currentIndex)
      content.render(ctx, t, vw, vh)

      // トランジション処理
      if (isTransitioning) {
        if (phase === 'out') {
          // フェードアウト
          fadeRef.current = Math.min(1, fadeRef.current + dt / FADE_DURATION_SEC)
          ctx.fillStyle = `rgba(0,0,0,${fadeRef.current})`
          ctx.fillRect(0, 0, vw, vh)

          if (fadeRef.current >= 1) {
            // フェードアウト完了 → 次のコンテンツへ切り替え
            currentIndexRef.current = nextIndex
            phaseRef.current = 'in'
          }
        } else if (phase === 'in') {
          // フェードイン
          fadeRef.current = Math.max(0, fadeRef.current - dt / FADE_DURATION_SEC)
          ctx.fillStyle = `rgba(0,0,0,${fadeRef.current})`
          ctx.fillRect(0, 0, vw, vh)

          if (fadeRef.current <= 0) {
            // フェードイン完了
            isTransitioningRef.current = false
            phaseRef.current = 'idle'
            fadeRef.current = 0
          }
        }
      }

      // コンテンツ名を表示
      ctx.fillStyle = 'rgba(255,255,255,0.86)'
      ctx.font = '14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.fillText(
        `${content.metadata.name} (${currentIndexRef.current + 1}/${CONTENT_COUNT})`,
        vw - 12,
        vh - 10
      )

      raf = requestAnimationFrame(loop)
    }

    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', handleResize)
    }
  }, [resize])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100vh',
        background: 'black',
        overflow: 'hidden'
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}
