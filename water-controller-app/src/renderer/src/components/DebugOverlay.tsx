import { useEffect, useState } from 'react'
import type { WsMessage, ConnectionStatus } from '../../../lib/types/websocket'
import { InputLevel } from '../../../lib/types/websocket'
import './DebugOverlay.css'

interface DebugOverlayProps {
  /** WebSocket 接続状態 */
  status: ConnectionStatus
  /** 最後に受信したメッセージ */
  lastMessage: WsMessage | null
  /** デバッグモードのオン・オフ */
  debugMode: boolean
}

/**
 * デバッグオーバーレイコンポーネント
 *
 * WebSocket の接続状態とメッセージを可視化する
 */
export function DebugOverlay({
  status,
  lastMessage,
  debugMode
}: DebugOverlayProps): React.JSX.Element | null {
  const [fps, setFps] = useState(0)
  const [buttonState, setButtonState] = useState(false)
  const [controllerState, setControllerState] = useState({
    left: 0 as InputLevel,
    right: 0 as InputLevel,
    up: 0 as InputLevel,
    down: 0 as InputLevel
  })

  // FPS 計測
  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()

    const measureFps = (): void => {
      frameCount++
      const currentTime = performance.now()
      const elapsed = currentTime - lastTime

      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed))
        frameCount = 0
        lastTime = currentTime
      }

      requestAnimationFrame(measureFps)
    }

    const rafId = requestAnimationFrame(measureFps)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // メッセージの状態を更新
  useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'button-input') {
      setButtonState(lastMessage.isPushed)
    } else if (lastMessage.type === 'controller-input') {
      setControllerState({
        left: lastMessage.left,
        right: lastMessage.right,
        up: lastMessage.up,
        down: lastMessage.down
      })
    }
  }, [lastMessage])

  // デバッグモードがオフの場合は非表示
  if (!debugMode) {
    return null
  }

  const getStatusColor = (): string => {
    switch (status) {
      case 'connected':
        return '#4ade80' // 淡い緑
      case 'connecting':
        return '#facc15' // 黄色
      case 'disconnected':
        return '#f87171' // 赤
      case 'error':
        return '#f87171' // 赤
      default:
        return '#9ca3af' // グレー
    }
  }

  const getInputLevelLabel = (level: InputLevel): string => {
    switch (level) {
      case 0:
        return 'NoInput'
      case 1:
        return 'Low'
      case 2:
        return 'High'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className="debug-overlay">
      {/* 左下: 全体コンテナ */}
      <div className="debug-info-container">
        {/* 接続情報と FPS */}
        <div className="debug-info">
          <div className="connection-status">
            <span className="status-label">WebSocket:</span>
            <span className="status-value" style={{ color: getStatusColor() }}>
              {status.toUpperCase()}
            </span>
          </div>
          <div className="fps-display">
            <span className="fps-label">FPS:</span>
            <span className="fps-value">{fps}</span>
          </div>
        </div>

        {/* コントローラビジュアライゼーション */}
        <div className="controller-visualization">
          {/* 十字キー（十字配置） + 中央にボタン */}
          <div className="controller-dpad">
            <div className="dpad-spacer" />
            <div className={`dpad-button ${controllerState.up > 0 ? 'active' : ''}`}>
              ↑<span className="input-level">{getInputLevelLabel(controllerState.up)}</span>
            </div>
            <div className="dpad-spacer" />

            <div className={`dpad-button ${controllerState.left > 0 ? 'active' : ''}`}>
              ←<span className="input-level">{getInputLevelLabel(controllerState.left)}</span>
            </div>
            {/* 中央にボタン */}
            <div className={`action-button ${buttonState ? 'active' : ''}`}>
              <span className="button-label">Button</span>
              <span className="button-state">{buttonState ? 'PUSHED' : 'RELEASED'}</span>
            </div>
            <div className={`dpad-button ${controllerState.right > 0 ? 'active' : ''}`}>
              →<span className="input-level">{getInputLevelLabel(controllerState.right)}</span>
            </div>

            <div className="dpad-spacer" />
            <div className={`dpad-button ${controllerState.down > 0 ? 'active' : ''}`}>
              ↓<span className="input-level">{getInputLevelLabel(controllerState.down)}</span>
            </div>
            <div className="dpad-spacer" />
          </div>
        </div>
      </div>

      {/* エラーメッセージ（接続が切れている場合） */}
      {status === 'disconnected' && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span className="error-text">WebSocket connection lost. Reconnecting...</span>
        </div>
      )}
    </div>
  )
}
