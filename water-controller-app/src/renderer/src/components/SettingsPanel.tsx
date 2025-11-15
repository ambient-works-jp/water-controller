import { useState, useRef, useEffect } from 'react'
import type { Config } from '../../../lib/types/config'
import type { ConnectionStatus } from '../../../lib/types/websocket'
import './SettingsPanel.css'

interface SettingsPanelProps {
  /** WebSocket 接続状態 */
  wsStatus: ConnectionStatus
  /** WebSocket URL */
  wsUrl: string
  /** デバッグモードの状態 */
  debugMode: boolean
  /** デバッグモードの切り替え */
  onDebugModeChange: (enabled: boolean) => void
  /** 初期設定 */
  initialConfig: Config | null
  /** 設定画面を閉じる */
  onClose: () => void
  /** 閉じるアニメーション中かどうか */
  isClosing: boolean
}

type TabType = 'settings' | 'connection' | 'logs' | 'help'

/**
 * 設定画面コンポーネント
 *
 * 3 タブ構成: 設定、接続状態、ヘルプ
 */
export function SettingsPanel({
  wsStatus,
  wsUrl,
  debugMode,
  onDebugModeChange,
  initialConfig,
  onClose,
  isClosing
}: SettingsPanelProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('settings')
  const [config, setConfig] = useState<Config | null>(initialConfig)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [logPath, setLogPath] = useState<string>('')
  const [logContent, setLogContent] = useState<string>('')
  const [connectionTestResult, setConnectionTestResult] = useState<string>('')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const logViewerRef = useRef<HTMLDivElement>(null)

  // 設定の再読み込み
  const handleReloadConfig = async (): Promise<void> => {
    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      // IPC 経由で設定ファイルを読み込む
      const response = await window.api.ipc.loadConfig()

      // 設定を更新（成功時もエラー時もデフォルト設定が含まれる）
      setConfig(response.config)

      if (response.success) {
        setSuccessMessage('設定を再読み込みしました')
        // 成功メッセージを 3 秒後に消す
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        // エラー時はエラーメッセージを表示
        const errorMsg = response.details
          ? `${response.error}\n詳細: ${response.details}`
          : response.error
        setErrorMessage(errorMsg)
      }
    } catch (error) {
      console.error('Failed to load config:', error)
      setErrorMessage('設定ファイルの読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // ログファイルの読み込み
  const handleLoadLogs = async (): Promise<void> => {
    try {
      const response = await window.api.ipc.loadLog()
      setLogPath(response.logPath)
      setLogContent(response.content || 'ログファイルが空です')

      if (!response.success) {
        setErrorMessage(response.error)
      }
    } catch (error) {
      console.error('Failed to load log:', error)
      setErrorMessage('ログファイルの読み込みに失敗しました')
    }
  }

  // WebSocket 接続テスト
  const handleTestConnection = async (): Promise<void> => {
    setIsTestingConnection(true)
    setConnectionTestResult('')
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const testWs = new WebSocket(wsUrl)
      let isSuccess = false

      // タイムアウト設定（10秒）
      const timeout = setTimeout(() => {
        if (!isSuccess) {
          testWs.close(1000, 'Test timeout')
          setConnectionTestResult('❌ 接続テスト失敗: タイムアウト（10秒）')
          setIsTestingConnection(false)
        }
      }, 10000)

      testWs.onopen = () => {
        clearTimeout(timeout)
        isSuccess = true
        setConnectionTestResult('✅ 接続テスト成功: 101 Switching Protocols')
        setSuccessMessage('WebSocket サーバへの接続に成功しました')
        setIsTestingConnection(false)
        // 少し待ってから正常終了コード (1000) で閉じる
        setTimeout(() => {
          testWs.close(1000, 'Connection test successful')
        }, 100)
      }

      testWs.onerror = (error) => {
        if (!isSuccess) {
          clearTimeout(timeout)
          console.error('WebSocket test error:', error)
          setConnectionTestResult('❌ 接続テスト失敗: エラーが発生しました')
          setErrorMessage('WebSocket サーバへの接続に失敗しました')
          setIsTestingConnection(false)
        }
      }

      testWs.onclose = (event) => {
        if (!isSuccess) {
          clearTimeout(timeout)
          setConnectionTestResult(
            `❌ 接続テスト失敗: 接続が閉じられました (code: ${event.code}, reason: ${event.reason || '不明'})`
          )
          setErrorMessage('WebSocket 接続が予期せず閉じられました')
          setIsTestingConnection(false)
        }
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      setConnectionTestResult('❌ 接続テスト失敗: 例外が発生しました')
      setErrorMessage('接続テストに失敗しました')
      setIsTestingConnection(false)
    }
  }

  // ログコンテンツが更新されたら最下部にスクロール
  useEffect(() => {
    if (logViewerRef.current && logContent) {
      logViewerRef.current.scrollTop = logViewerRef.current.scrollHeight
    }
  }, [logContent])

  // デバッグ: isClosing の変化を監視
  useEffect(() => {
    console.log('[SettingsPanel] isClosing changed:', isClosing)
  }, [isClosing])

  return (
    <div className={`settings-panel-overlay ${isClosing ? 'closing' : ''}`}>
      <div className={`settings-panel ${isClosing ? 'closing' : ''}`}>
        {/* ヘッダー */}
        <div className="settings-header">
          <h1 className="settings-title">Settings</h1>
          <button className="close-button" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>

        {/* タブ */}
        <div className="settings-tabs">
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            設定
          </button>
          <button
            className={`tab ${activeTab === 'connection' ? 'active' : ''}`}
            onClick={() => setActiveTab('connection')}
          >
            接続状態
          </button>
          <button
            className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('logs')
              handleLoadLogs()
            }}
          >
            ログ
          </button>
          <button
            className={`tab ${activeTab === 'help' ? 'active' : ''}`}
            onClick={() => setActiveTab('help')}
          >
            ヘルプ
          </button>
        </div>

        {/* コンテンツ */}
        <div className="settings-content">
          {activeTab === 'settings' && (
            <div className="tab-content">
              <h2>設定</h2>

              {/* セクション1: 設定ファイル */}
              <div className="settings-section">
                <h3>設定ファイル</h3>
                <p className="description">
                  設定ファイルは <code>$HOME/.water-controller-app/config.json</code>{' '}
                  に保存されています。
                  <br />
                  テキストエディタで編集後、「設定を再読み込み」ボタンを押してください。
                </p>

                <button className="reload-button" onClick={handleReloadConfig} disabled={isLoading}>
                  {isLoading ? '読み込み中...' : '設定を再読み込み'}
                </button>

                {config && (
                  <div className="config-display">
                    <h4>WebSocket サーバの接続先</h4>
                    <p className="config-value">{config.wsUrl}</p>

                    <h4>コンテンツ一覧</h4>
                    {config.contents.length === 0 ? (
                      <p className="config-empty">コンテンツが登録されていません</p>
                    ) : (
                      <ul className="content-list">
                        {config.contents.map((item) => (
                          <li key={item.id} className={item.enabled ? 'enabled' : 'disabled'}>
                            <span className="content-order">#{item.order}</span>
                            <span className="content-name">{item.name}</span>
                            <span className="content-status">{item.enabled ? '有効' : '無効'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {/* セクション2: 開発用 */}
              <div className="settings-section">
                <h3>開発用</h3>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={debugMode}
                      onChange={(e) => onDebugModeChange(e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">デバッグモード</span>
                  </label>
                  <p className="checkbox-description">
                    デバッグオーバーレイ（接続状態、FPS、コントローラ入力）を表示します
                    <br />
                    ショートカット: <kbd>Cmd</kbd> + <kbd>D</kbd>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="tab-content">
              <h2>接続状態</h2>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button
                  className="reload-button"
                  onClick={() => window.location.reload()}
                >
                  再接続
                </button>
                <button
                  className="reload-button"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                >
                  {isTestingConnection ? '接続テスト中...' : '接続テスト'}
                </button>
              </div>

              {connectionTestResult && (
                <div className="connection-test-result" style={{ marginBottom: '24px' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}>{connectionTestResult}</p>
                </div>
              )}

              <div className="connection-info">
                <div className="info-row">
                  <span className="info-label">URL:</span>
                  <span className="info-value">{wsUrl}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">プロトコル:</span>
                  <span className="info-value">WebSocket</span>
                </div>
                <div className="info-row">
                  <span className="info-label">ホスト:</span>
                  <span className="info-value">
                    {new URL(wsUrl).hostname}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">ポート:</span>
                  <span className="info-value">
                    {new URL(wsUrl).port}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">接続状態:</span>
                  <span
                    className={`info-value ${
                      wsStatus === 'connected' ? 'status-connected' : 'status-disconnected'
                    }`}
                  >
                    {wsStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="tab-content">
              <h2>ログ</h2>
              <p className="description">
                ログファイルのパス: <code>{logPath}</code>
              </p>

              <button
                className="reload-button"
                onClick={handleLoadLogs}
                style={{ marginBottom: '24px' }}
              >
                ログを再読み込み
              </button>

              <div className="log-viewer" ref={logViewerRef}>
                <pre className="log-content">{logContent}</pre>
              </div>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="tab-content">
              <h2>ヘルプ</h2>
              <h3>キーボードショートカット</h3>
              <ul className="shortcut-list">
                <li>
                  <kbd>Cmd</kbd> + <kbd>M</kbd>
                  <span className="shortcut-description">設定画面を開く</span>
                </li>
                <li>
                  <kbd>Cmd</kbd> + <kbd>R</kbd>
                  <span className="shortcut-description">ページをリロード</span>
                </li>
                <li>
                  <kbd>Cmd</kbd> + <kbd>D</kbd>
                  <span className="shortcut-description">デバッグモードをオン・オフ</span>
                </li>
                <li>
                  <kbd>Cmd</kbd> + <kbd>I</kbd> or <kbd>F12</kbd>
                  <span className="shortcut-description">DevTools を開く</span>
                </li>
                <li>
                  <kbd>Cmd</kbd> + <kbd>Q</kbd>
                  <span className="shortcut-description">アプリケーションを終了</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* 成功メッセージ */}
        {successMessage && (
          <div className="success-toast">
            <span className="success-icon">✓</span>
            <span className="success-text">{successMessage}</span>
            <button className="toast-close" onClick={() => setSuccessMessage(null)}>
              ✕
            </button>
          </div>
        )}

        {/* エラーメッセージ */}
        {errorMessage && (
          <div className="error-toast">
            <span className="error-icon">⚠</span>
            <span className="error-text">{errorMessage}</span>
            <button className="toast-close" onClick={() => setErrorMessage(null)}>
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
