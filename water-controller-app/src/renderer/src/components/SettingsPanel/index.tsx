import { useState, useEffect, useCallback } from 'react'
import type { Config } from '../../../../lib/types/config'
import type { ConnectionStatus } from '../../../../lib/types/websocket'
import { MAX_LOG_TAIL_LINES } from '../constants'
import { SettingsTab } from './SettingsTab'
import { ConnectionStatusTab } from './ConnectionStatusTab'
import { LogsTab } from './LogsTab'
import { HelpTab } from './HelpTab'

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
 * 設定画面コンポーネント (daisyUI 版)
 *
 * 4 タブ構成: 設定、接続状態、ログ、ヘルプ
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

  // 設定の再読み込み
  const handleReloadConfig = async (): Promise<void> => {
    setIsLoading(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const response = await window.api.ipc.loadConfig()
      setConfig(response.config)

      if (response.success) {
        setSuccessMessage('設定を再読み込みしました')
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
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
  // useCallback
  const handleLoadLogs = useCallback(async (): Promise<void> => {
    try {
      const response = await window.api.ipc.loadLog(MAX_LOG_TAIL_LINES)
      setLogPath(response.logPath)
      setLogContent(response.content || 'ログファイルが空です')

      if (!response.success) {
        setErrorMessage(response.error)
      }
    } catch (error) {
      console.error('Failed to load log:', error)
      setErrorMessage('ログファイルの読み込みに失敗しました')
    }
  }, [])

  useEffect(() => {
    console.log('[SettingsPanel] isClosing changed:', isClosing)
  }, [isClosing])

  return (
    <div
      className={`fixed inset-0 bg-base-300 z-10000 overflow-hidden ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
    >
      <div className="w-full h-full flex flex-col">
        {/* ヘッダー */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-base-content/10">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <button className="btn btn-ghost btn-sm btn-circle" onClick={onClose} aria-label="閉じる">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* タブ */}
        <div role="tablist" className="tabs tabs-bordered px-8 pt-2">
          <button
            role="tab"
            className={`tab tab-lg text-lg ${activeTab === 'settings' ? 'tab-active text-primary border-primary' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            設定
          </button>
          <button
            role="tab"
            className={`tab tab-lg text-lg ${activeTab === 'connection' ? 'tab-active text-primary border-primary' : ''}`}
            onClick={() => setActiveTab('connection')}
          >
            接続状態
          </button>
          <button
            role="tab"
            className={`tab tab-lg text-lg ${activeTab === 'logs' ? 'tab-active text-primary border-primary' : ''}`}
            onClick={() => {
              setActiveTab('logs')
            }}
          >
            ログ
          </button>
          <button
            role="tab"
            className={`tab tab-lg text-lg ${activeTab === 'help' ? 'tab-active text-primary border-primary' : ''}`}
            onClick={() => setActiveTab('help')}
          >
            ヘルプ
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {activeTab === 'settings' && (
            <SettingsTab
              config={config}
              isLoading={isLoading}
              debugMode={debugMode}
              onReloadConfig={handleReloadConfig}
              onDebugModeChange={onDebugModeChange}
            />
          )}

          {activeTab === 'connection' && <ConnectionStatusTab wsStatus={wsStatus} wsUrl={wsUrl} />}

          {activeTab === 'logs' && (
            <LogsTab logPath={logPath} logContent={logContent} loadLogFunction={handleLoadLogs} />
          )}

          {activeTab === 'help' && <HelpTab />}
        </div>

        {/* トースト通知 */}
        {successMessage && (
          <div className="toast toast-top toast-center z-50">
            <div className="alert alert-success">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{successMessage}</span>
              <button className="btn btn-sm btn-ghost" onClick={() => setSuccessMessage(null)}>
                ✕
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="toast toast-top toast-center z-50">
            <div className="alert alert-error">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{errorMessage}</span>
              <button className="btn btn-sm btn-ghost" onClick={() => setErrorMessage(null)}>
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
