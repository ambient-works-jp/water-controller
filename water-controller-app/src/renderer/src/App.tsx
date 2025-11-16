import { useEffect, useState, useCallback, useRef } from 'react'
import { Contents } from './components/Contents'
import { DebugOverlay } from './components/DebugOverlay'
import { SettingsButton } from './components/SettingsButton'
import { SettingsPanel } from './components/SettingsPanel'
import { ErrorDialog } from './components/ErrorDialog'
import { useWebSocket } from './hooks/useWebSocket'
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut'
import { messageHandler } from './features/network/websocket'
import type { Config } from '../../lib/types/config'

const FADE_ANIMATION_DURATION_MS = 300

function App(): React.JSX.Element {
  const [debugMode, setDebugMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isClosingSettings, setIsClosingSettings] = useState(false)
  const [config, setConfig] = useState<Config | null>(null)
  const [configLoadError, setConfigLoadError] = useState<{
    message: string
    details?: string
  } | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const handleSendPing = async (): Promise<void> => {
    const response = await window.api.ipc.sendPing()
    console.log('IPC Response from main process: ', response)
  }

  // 起動時に設定を読み込む
  useEffect(() => {
    const loadConfig = async (): Promise<void> => {
      console.log('[Config] Loading initial config...')
      try {
        const response = await window.api.ipc.loadConfig()

        if (!response.success) {
          console.error('[Config] Failed to load config:', response.error)
          if (response.details) {
            console.error('[Config] Details:', response.details)
          }

          // エラー情報を保存（ErrorDialog で表示し続ける）
          setConfigLoadError({
            message: response.error,
            details: response.details
          })
          return
        }

        // 成功時のみ設定を反映
        setConfig(response.config)
        setDebugMode(response.config.debugMode)
        setIsInitialLoad(false)
        console.log('[Config] Config loaded successfully:', response.config)
      } catch (error) {
        console.error('[Config] Failed to load config:', error)
        setConfigLoadError({
          message: '設定ファイルの読み込みに失敗しました',
          details: error instanceof Error ? error.message : String(error)
        })
      }
    }

    loadConfig()
  }, [])

  // WebSocket クライアントの初期化（設定から URL を取得、未ロード時はデフォルト URL）
  const wsUrl = config?.wsUrl || 'ws://127.0.0.1:8080/ws'
  const { status, lastMessage } = useWebSocket(wsUrl, messageHandler)

  // 接続状態の変化をログ出力
  useEffect(() => {
    console.log('[WebSocket] Connection status:', status)
  }, [status])

  // debugMode 変更時に設定を保存
  const configRef = useRef<Config | null>(config)

  // config が変更されたら ref を更新
  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    // 初回ロード時はスキップ
    if (isInitialLoad) {
      return
    }

    const saveDebugMode = async (): Promise<void> => {
      const currentConfig = configRef.current
      if (!currentConfig) return

      const updatedConfig: Config = {
        ...currentConfig,
        debugMode
      }

      try {
        const response = await window.api.ipc.saveConfig(updatedConfig)
        if (response.success) {
          console.log('[Config] Debug mode saved:', debugMode)
        } else {
          console.error('[Config] Failed to save debug mode:', response.error)
        }
      } catch (error) {
        console.error('[Config] Failed to save debug mode:', error)
      }
    }

    void saveDebugMode()
  }, [debugMode, isInitialLoad])

  // 設定画面を閉じる（アニメーション付き）
  const handleCloseSettings = useCallback((): void => {
    console.log('[Settings] Starting close animation')
    setIsClosingSettings(true)
    setTimeout(() => {
      console.log('[Settings] Close animation complete, hiding panel')
      setShowSettings(false)
      setIsClosingSettings(false)
    }, FADE_ANIMATION_DURATION_MS)
  }, [])

  // 設定画面をトグル
  const handleToggleSettings = useCallback((): void => {
    setShowSettings((prev) => {
      console.log('[Settings] Toggle called, current showSettings:', prev)
      if (prev) {
        // 閉じる処理
        console.log('[Settings] Starting close animation')
        setIsClosingSettings(true)
        setTimeout(() => {
          console.log('[Settings] Close animation complete, hiding panel')
          setShowSettings(false)
          setIsClosingSettings(false)
        }, FADE_ANIMATION_DURATION_MS)
        return prev // すぐには変更しない（アニメーション後に変更）
      } else {
        // 開く処理
        return true
      }
    })
  }, [])

  // キーボードショートカット
  useKeyboardShortcut(
    [
      {
        key: 'm',
        handler: handleToggleSettings,
        description: '設定画面を開く'
      },
      {
        key: 'd',
        handler: () => setDebugMode((prev) => !prev),
        description: 'デバッグモードをオン・オフ'
      },
      {
        key: 'i',
        handler: async () => {
          await window.api.ipc.toggleDevTools()
        },
        description: 'DevTools を開く/閉じる'
      },
      {
        key: 'q',
        handler: async () => {
          await window.api.ipc.quitApp()
        },
        description: 'アプリケーションを終了'
      }
      // Cmd + R: ページをリロード (Electron の optimizer.watchWindowShortcuts が処理)
      // F12: DevTools を開く (Electron の optimizer.watchWindowShortcuts が処理)
    ],
    [handleToggleSettings]
  )

  return (
    <>
      {/* エラーダイアログ */}
      {configLoadError && (
        <ErrorDialog message={configLoadError.message} details={configLoadError.details} />
      )}

      {/* コンテンツ画面 */}
      <Contents onSendPing={handleSendPing} />

      {/* 設定ボタン（設定画面が閉じているときのみ表示） */}
      <SettingsButton onSettingsOpen={() => setShowSettings(true)} isSettingsOpen={showSettings} />

      {/* デバッグオーバーレイ */}
      <DebugOverlay status={status} lastMessage={lastMessage} debugMode={debugMode} />

      {/* 設定画面 */}
      {showSettings && (
        <SettingsPanel
          wsStatus={status}
          wsUrl={wsUrl}
          debugMode={debugMode}
          onDebugModeChange={setDebugMode}
          initialConfig={config}
          onClose={handleCloseSettings}
          isClosing={isClosingSettings}
        />
      )}
    </>
  )
}

export default App
