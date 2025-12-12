import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import type { WsMessage } from '../../../../lib/types/websocket'
import type { Config } from '../../../../lib/types/config'

/**
 * コンテンツの統括
 *
 * すべてのコンテンツをエクスポートし、コンテンツリストを提供します
 */

import { generatePlaylist } from './playlist'

// 型をエクスポート
export type { Content, ContentRenderer } from './types'

const FADE_DURATION_SEC = 0.6

interface ContentsProps {
  /** Ping 送信ハンドラ（デバッグ用） */
  onSendPing: () => void
  /** 最新の WebSocket メッセージ */
  lastMessage: WsMessage | null
  /** 設定（プレイリスト情報を含む） */
  config: Config | null
  /** コンテンツ変更時のコールバック */
  onContentChange?: (contentName: string, currentIndex: number, totalCount: number) => void
}

/**
 * コンテンツ表示コンポーネント
 *
 * Canvas を使用してアニメーションコンテンツを表示し、
 * ButtonInput メッセージで無限ループ切り替えを行います
 */
export function Contents({
  lastMessage,
  config,
  onContentChange
}: ContentsProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // config.playlist からプレイリストを生成
  const playlist = useMemo(() => {
    if (!config || !config.playlist) {
      return generatePlaylist([])
    }
    return generatePlaylist(config.playlist)
  }, [config])

  // プレイリストの長さ
  const playlistLength = playlist.length

  // React コンポーネントコンテンツ用の状態
  const [componentTime, setComponentTime] = useState(0)
  const [componentDimensions, setComponentDimensions] = useState({ width: 0, height: 0 })
  const [currentIndex, setCurrentIndex] = useState(0) // コンテンツインデックス（React state で管理）

  // アニメーション状態を ref で管理（再レンダリングを避ける）
  const currentIndexRef = useRef(0)
  const nextIndexRef = useRef(0)
  const isTransitioningRef = useRef(false)
  const phaseRef = useRef<'idle' | 'out' | 'in'>('idle')
  const fadeRef = useRef(0)
  const playlistRef = useRef(playlist)
  const onContentChangeRef = useRef(onContentChange)
  const setCurrentIndexRef = useRef(setCurrentIndex) // state 更新関数を ref で保持

  // 現在のコンテンツタイプを判定（state を使用）
  const currentContent = playlist.length > 0 ? playlist[currentIndex % playlist.length] : null
  const isCanvasContent = currentContent?.render !== undefined
  const isComponentContent = currentContent?.component !== undefined

  // playlist が変更されたら ref を更新
  useEffect(() => {
    playlistRef.current = playlist
  }, [playlist])

  // onContentChange が変更されたら ref を更新
  useEffect(() => {
    onContentChangeRef.current = onContentChange
  }, [onContentChange])

  // setCurrentIndex を ref に保持
  useEffect(() => {
    setCurrentIndexRef.current = setCurrentIndex
  }, [setCurrentIndex])

  // 初期コンテンツ情報を通知
  useEffect(() => {
    if (playlist.length > 0 && onContentChange) {
      console.log('[Contents] Initial content:', playlist[0].metadata.name, 0, playlist.length)
      onContentChange(playlist[0].metadata.name, 0, playlist.length)
    }
  }, [playlist, onContentChange])

  // ButtonInput メッセージを検知してコンテンツを切り替え
  useEffect(() => {
    if (!lastMessage || lastMessage.type !== 'button-input') {
      return
    }

    // isPushed が true のときのみ切り替え
    if (lastMessage.isPushed && !isTransitioningRef.current) {
      console.log('[Contents] Switching to next content')
      isTransitioningRef.current = true
      nextIndexRef.current = (currentIndexRef.current + 1) % playlistLength
      phaseRef.current = 'out'
      fadeRef.current = 0
    }
  }, [lastMessage, playlistLength])

  // Canvas のリサイズ処理
  const resize = useCallback(() => {
    const canvas = canvasRef.current
    const parent = containerRef.current
    if (!parent) return

    const w = parent.clientWidth
    const h = parent.clientHeight

    // コンポーネント用のサイズを更新
    setComponentDimensions({ width: w, height: h })

    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

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
      const currentPlaylist = playlistRef.current

      // プレイリストから現在のコンテンツを取得
      if (currentPlaylist.length === 0) {
        // プレイリストが空の場合はスキップ
        raf = requestAnimationFrame(loop)
        return
      }

      const normalizedIndex =
        ((currentIndex % currentPlaylist.length) + currentPlaylist.length) % currentPlaylist.length
      const content = currentPlaylist[normalizedIndex]

      // Canvas 2D コンテンツの場合のみ描画（component の場合はスキップ）
      if (content.render) {
        content.render(ctx, t, vw, vh)
      }

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

            // React の状態を更新（コンポーネントの再レンダリングをトリガー）
            setCurrentIndexRef.current(nextIndex)

            // コンテンツ変更コールバックを呼び出し
            const newContent =
              currentPlaylist[
                ((nextIndex % currentPlaylist.length) + currentPlaylist.length) %
                  currentPlaylist.length
              ]
            if (onContentChangeRef.current && newContent) {
              console.log(
                '[Contents] Content changed:',
                newContent.metadata.name,
                nextIndex,
                currentPlaylist.length
              )
              onContentChangeRef.current(
                newContent.metadata.name,
                nextIndex,
                currentPlaylist.length
              )
            }
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
        `${content.metadata.name} (${currentIndexRef.current + 1}/${currentPlaylist.length})`,
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

  // React コンポーネント用の時間更新
  useEffect(() => {
    if (!isComponentContent) return

    let raf = 0
    let lastTime = performance.now()

    const tick = (now: number): void => {
      const dt = (now - lastTime) / 1000
      lastTime = now
      setComponentTime((t) => t + dt)
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
    }
  }, [isComponentContent, currentIndexRef.current])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100vh',
        background: 'black',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Canvas 2D コンテンツ（常に存在、表示/非表示を切り替え） */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: isCanvasContent ? 'block' : 'none',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />

      {/* React コンポーネントコンテンツ */}
      {isComponentContent && currentContent?.component && (
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          <currentContent.component
            width={componentDimensions.width}
            height={componentDimensions.height}
            time={componentTime}
          />
        </div>
      )}
    </div>
  )
}
