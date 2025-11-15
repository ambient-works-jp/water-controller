import { useEffect, useRef, useState, useCallback } from 'react'
import { createLogger } from '../lib/logger'
import type { WsMessage, ConnectionStatus } from '../../../lib/types/websocket'

const logger = createLogger('renderer.useWebSocket')

/**
 * WebSocket 接続管理 Hook
 *
 * @param url - WebSocket サーバの URL
 * @param onMessage - メッセージ受信時のコールバック
 * @returns WebSocket 接続状態と制御関数
 */
export function useWebSocket(
  url: string,
  onMessage?: (message: WsMessage) => void
): {
  status: ConnectionStatus
  lastMessage: WsMessage | null
  connect: () => void
  disconnect: () => void
  sendMessage: (message: unknown) => void
} {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 10
  const initialReconnectDelay = 3000 // 3秒
  const maxReconnectDelay = 30000 // 30秒

  /**
   * 指数バックオフで再接続遅延時間を計算
   */
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      initialReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
      maxReconnectDelay
    )
    return delay
  }, [])

  /**
   * WebSocket 接続を確立
   */
  const connect = useCallback(() => {
    // 既存の接続があれば閉じる
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // 再接続タイムアウトをクリア
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    try {
      logger.info(`Connecting to WebSocket server: ${url}`)
      setStatus('connecting')

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        logger.info('WebSocket connected')
        setStatus('connected')
        reconnectAttemptsRef.current = 0 // 接続成功したら再接続カウンタをリセット
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WsMessage
          logger.debug('WebSocket message received:', data)
          setLastMessage(data)

          if (onMessage) {
            onMessage(data)
          }
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        logger.error('WebSocket error:', error)
        setStatus('error')
      }

      ws.onclose = (event) => {
        logger.warn(`WebSocket closed: code=${event.code}, reason=${event.reason}`)
        setStatus('disconnected')
        wsRef.current = null

        // 自動再接続（最大試行回数まで）
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = getReconnectDelay()
          logger.info(
            `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        } else {
          logger.error('Max reconnection attempts reached')
        }
      }
    } catch (error) {
      logger.error('Failed to create WebSocket connection:', error)
      setStatus('error')
    }
  }, [url, onMessage, getReconnectDelay])

  /**
   * WebSocket 接続を切断
   */
  const disconnect = useCallback(() => {
    logger.info('Disconnecting WebSocket')

    // 再接続タイムアウトをクリア
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // WebSocket 接続を閉じる
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    reconnectAttemptsRef.current = 0
    setStatus('disconnected')
  }, [])

  /**
   * メッセージを送信
   */
  const sendMessage = useCallback((message: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
        logger.debug('WebSocket message sent:', message)
      } catch (error) {
        logger.error('Failed to send WebSocket message:', error)
      }
    } else {
      logger.warn('WebSocket is not connected. Message not sent:', message)
    }
  }, [])

  // マウント時に自動接続、アンマウント時に切断
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    status,
    lastMessage,
    connect,
    disconnect,
    sendMessage
  }
}
