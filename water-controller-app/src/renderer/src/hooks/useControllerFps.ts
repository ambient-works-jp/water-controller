import { useEffect, useState, useRef } from 'react'
import type { WsMessage } from '../../../lib/types/websocket'

const CALCULATE_INTERVAL_MS = 1000 // 1 秒

/**
 * コントローラーのフレームレートを計測する Hook
 *
 * WebSocket で受信する controller-input メッセージの頻度から、センサーの FPS を計測する
 *
 * 注意: button-input と controller-input は 1 回のシリアル読み取りから2つのメッセージとして送信されるため、
 * controller-input のみをカウントすることで、実際のセンサーのサンプリングレートを正確に計測する
 *
 * @param lastMessage - 最後に受信した WebSocket メッセージ
 * @returns 現在の FPS（1秒間の controller-input メッセージ受信数、小数点以下第2位まで）
 */
export function useControllerFps(lastMessage: WsMessage | null): number {
  const [fps, setFps] = useState(0)
  const messageCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  useEffect(() => {
    if (!lastMessage) return

    // controller-input メッセージのみをカウント
    // button-input と controller-input は 1 回のシリアル読み取りから送信されるため、
    // controller-input のみをカウントすることで正確なサンプリングレートを計測
    if (lastMessage.type !== 'controller-input') return

    messageCountRef.current++

    const currentTime = performance.now()
    const elapsed = currentTime - lastTimeRef.current

    // 1 秒ごとに FPS を計算（小数点以下第 2 位まで）
    if (elapsed >= CALCULATE_INTERVAL_MS) {
      const calculatedFps = (messageCountRef.current * 1000) / elapsed
      setFps(Math.round(calculatedFps * 100) / 100)
      messageCountRef.current = 0
      lastTimeRef.current = currentTime
    }
  }, [lastMessage])

  return fps
}
