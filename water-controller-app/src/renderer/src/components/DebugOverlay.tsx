import { useEffect } from 'react'
import type { WsMessage, ConnectionStatus } from '../../../lib/types/websocket'
import { InputLevel } from '../../../lib/types/websocket'
import type { ControllerState } from '../features/controller/types'
import { useAnimationFps } from '../hooks/useAnimationFps'
import { useControllerFps } from '../hooks/useControllerFps'
import { DEBUG_UI_BOTTOM_OFFSET } from '../constants'

interface DebugOverlayProps {
  /** WebSocket 接続状態 */
  status: ConnectionStatus
  /** 最後に受信したメッセージ */
  lastMessage: WsMessage | null
  /** コントローラ状態（WebSocket + キーボード統合） */
  controllerState: ControllerState
  /** デバッグモードのオン・オフ */
  debugMode: boolean
  /** 現在再生中のコンテンツ情報 */
  currentContent: {
    name: string
    index: number
    total: number
  } | null
}

/**
 * デバッグオーバーレイコンポーネント
 *
 * WebSocket の接続状態とメッセージを可視化する
 */
export function DebugOverlay({
  status,
  lastMessage,
  controllerState,
  debugMode,
  currentContent
}: DebugOverlayProps): React.JSX.Element | null {
  const animationFps = useAnimationFps()
  const controllerFps = useControllerFps(lastMessage)

  // currentContent の変更をログ出力
  useEffect(() => {
    console.log('[DebugOverlay] currentContent updated:', currentContent)
  }, [currentContent])

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
        return '-'
      case 1:
        return 'LOW'
      case 2:
        return 'MIDDLE'
      case 3:
        return 'HIGH'
      default:
        return '?'
    }
  }

  const getInputLevelClass = (level: InputLevel): string => {
    switch (level) {
      case 0:
        return ''
      case 1:
        return 'active-low'
      case 2:
        return 'active-middle'
      case 3:
        return 'active-high'
      default:
        return ''
    }
  }

  return (
    <div
      className="debug-overlay"
      style={{ '--debug-ui-bottom-offset': `${DEBUG_UI_BOTTOM_OFFSET}px` } as React.CSSProperties}
    >
      {/* 左下: 全体コンテナ */}
      <div className="debug-info-container">
        {/* 接続情報と FPS */}
        <div className="debug-info">
          {/* 現在再生中のコンテンツ */}
          <div className="content-info">
            <span className="content-label">Content:</span>
            <span className="content-value">
              {currentContent
                ? `${currentContent.name} (${currentContent.index + 1}/${currentContent.total})`
                : 'Loading...'}
            </span>
          </div>

          <div className="connection-status">
            <span className="status-label">WebSocket:</span>
            <span className="status-value" style={{ color: getStatusColor() }}>
              {status.toUpperCase()}
            </span>
          </div>

          {/* コントローラの FPS: */}
          <div className="fps-display">
            <span className="fps-label">Controller FPS:</span>
            <span className="fps-value">{status === 'disconnected' ? '-' : controllerFps}</span>
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
            <div className={`action-button ${controllerState.button ? 'active' : ''}`}>
              <span className="button-label">Button</span>
              <span className="button-state">{controllerState.button ? 'PUSHED' : 'RELEASED'}</span>
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
            <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> コントローラ入力
          </div>
          <div className="shortcut-item">
            <kbd>Enter</kbd> ボタン入力（コンテンツ切り替え）
          </div>
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
