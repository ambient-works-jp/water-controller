import { useEffect, useState } from 'react'
import type { WsMessage, ConnectionStatus } from '../../../lib/types/websocket'
import { InputLevel } from '../../../lib/types/websocket'
import { useAnimationFps } from '../hooks/useAnimationFps'
import { useControllerFps } from '../hooks/useControllerFps'
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
  const animationFps = useAnimationFps()
  const controllerFps = useControllerFps(lastMessage)
  const [buttonState, setButtonState] = useState(false)
  const [controllerState, setControllerState] = useState({
    left: 0 as InputLevel,
    right: 0 as InputLevel,
    up: 0 as InputLevel,
    down: 0 as InputLevel
  })

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

  const getInputLevelClass = (level: InputLevel): string => {
    switch (level) {
      case 0:
        return ''
      case 1:
        return 'active-low'
      case 2:
        return 'active-high'
      default:
        return ''
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

          {/* コントローラの FPS: */}
          <div className="fps-display">
            <span className="fps-label">Controller FPS:</span>
            <span className="fps-value">{controllerFps}</span>
          </div>

          {/* アニメーションの FPS: */}
          <div className="fps-display">
            <span className="fps-label">Animation FPS:</span>
            <span className="fps-value">{animationFps}</span>
          </div>
        </div>

        {/* コントローラビジュアライゼーション */}
        <div className="controller-visualization">
          {/* 十字キー（十字配置） + 中央にボタン */}
          <div className="controller-dpad">
            <div className="dpad-spacer" />
            <div className={`dpad-button ${getInputLevelClass(controllerState.up)}`}>
              ↑<span className="input-level">{getInputLevelLabel(controllerState.up)}</span>
            </div>
            <div className="dpad-spacer" />

            <div className={`dpad-button ${getInputLevelClass(controllerState.left)}`}>
              ←<span className="input-level">{getInputLevelLabel(controllerState.left)}</span>
            </div>
            {/* 中央にボタン */}
            <div className={`action-button ${buttonState ? 'active' : ''}`}>
              <span className="button-label">Button</span>
              <span className="button-state">{buttonState ? 'PUSHED' : 'RELEASED'}</span>
            </div>
            <div className={`dpad-button ${getInputLevelClass(controllerState.right)}`}>
              →<span className="input-level">{getInputLevelLabel(controllerState.right)}</span>
            </div>

            <div className="dpad-spacer" />
            <div className={`dpad-button ${getInputLevelClass(controllerState.down)}`}>
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

      {/* キーボードショートカット一覧 */}
      <div className="keyboard-shortcuts">
        <div className="shortcuts-title">Keyboard Shortcuts</div>
        <div className="shortcuts-list">
          <div className="shortcut-item">
            <kbd>⌘</kbd>+<kbd>M</kbd> 設定画面を開く
          </div>
          <div className="shortcut-item">
            <kbd>⌘</kbd>+<kbd>R</kbd> ページをリロード
          </div>
          <div className="shortcut-item">
            <kbd>⌘</kbd>+<kbd>D</kbd> デバッグモードをオン・オフ
          </div>
          <div className="shortcut-item">
            <kbd>⌘</kbd>+<kbd>I</kbd> DevTools を開く
          </div>
          <div className="shortcut-item">
            <kbd>⌘</kbd>+<kbd>Q</kbd> アプリケーションを終了
          </div>
        </div>
      </div>
    </div>
  )
}
