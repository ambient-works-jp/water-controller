import { useState } from 'react'
import type { ConnectionStatus } from '../../../../lib/types/websocket'

// 接続テストの結果が表示されてからフェードアウトするまでの遅延時間
const CONNECTION_TEST_RESULT_FADE_OUT_DELAY_MS = 10000

interface ConnectionStatusTabProps {
  /** WebSocket 接続状態 */
  wsStatus: ConnectionStatus
  /** WebSocket URL */
  wsUrl: string
}

/**
 * 接続状態タブコンポーネント
 *
 * WebSocket 接続の情報とテスト機能
 */
export function ConnectionStatusTab({
  wsStatus,
  wsUrl
}: ConnectionStatusTabProps): React.JSX.Element {
  const [connectionTestResult, setConnectionTestResult] = useState<string>('')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isResultFadingOut, setIsResultFadingOut] = useState(false)

  // 接続テスト結果をクリア
  const handleClearTestResult = (): void => {
    setIsResultFadingOut(true)
    setTimeout(() => {
      setConnectionTestResult('')
      setIsResultFadingOut(false)
    }, 300)
  }

  // WebSocket 接続テスト
  const handleTestConnection = async (): Promise<void> => {
    setIsTestingConnection(true)
    setConnectionTestResult('')
    setIsResultFadingOut(false)

    const fadeOutAndClear = () => {
      setIsResultFadingOut(true)
      setTimeout(() => {
        setConnectionTestResult('')
        setIsResultFadingOut(false)
      }, 300)
    }

    try {
      const testWs = new WebSocket(wsUrl)
      let isSuccess = false

      const timeout = setTimeout(() => {
        if (!isSuccess) {
          testWs.close(1000, 'Test timeout')
          setConnectionTestResult('❌ 接続テスト失敗: タイムアウト（10秒）')
          setIsTestingConnection(false)
          setTimeout(fadeOutAndClear, CONNECTION_TEST_RESULT_FADE_OUT_DELAY_MS)
        }
      }, 10000)

      testWs.onopen = () => {
        clearTimeout(timeout)
        isSuccess = true
        setConnectionTestResult('✅ 接続テスト成功: 101 Switching Protocols')
        setIsTestingConnection(false)
        setTimeout(fadeOutAndClear, CONNECTION_TEST_RESULT_FADE_OUT_DELAY_MS)
        setTimeout(() => {
          testWs.close(1000, 'Connection test successful')
        }, 100)
      }

      testWs.onerror = (error) => {
        if (!isSuccess) {
          clearTimeout(timeout)
          console.error('WebSocket test error:', error)
          setConnectionTestResult('❌ 接続テスト失敗: エラーが発生しました')
          setIsTestingConnection(false)
          setTimeout(fadeOutAndClear, CONNECTION_TEST_RESULT_FADE_OUT_DELAY_MS)
        }
      }

      testWs.onclose = (event) => {
        if (!isSuccess) {
          clearTimeout(timeout)
          setConnectionTestResult(
            `❌ 接続テスト失敗: 接続が閉じられました (code: ${event.code}, reason: ${event.reason || '不明'})`
          )
          setIsTestingConnection(false)
          setTimeout(fadeOutAndClear, CONNECTION_TEST_RESULT_FADE_OUT_DELAY_MS)
        }
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      setConnectionTestResult('❌ 接続テスト失敗: 例外が発生しました')
      setIsTestingConnection(false)
      setTimeout(fadeOutAndClear, CONNECTION_TEST_RESULT_FADE_OUT_DELAY_MS)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="card bg-base-200">
        <div className="card-body">
          <div className="flex justify-between text-lg">
            <span className="opacity-70">URL:</span>
            <code className="font-mono text-base">{wsUrl}</code>
          </div>
          <div className="flex justify-between text-lg">
            <span className="opacity-70">プロトコル:</span>
            <span>WebSocket</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="opacity-70">ホスト:</span>
            <code className="font-mono text-base">{new URL(wsUrl).hostname}</code>
          </div>
          <div className="flex justify-between text-lg">
            <span className="opacity-70">ポート:</span>
            <code className="font-mono text-base">{new URL(wsUrl).port}</code>
          </div>
          <div className="flex justify-between items-center text-lg">
            <span className="opacity-70">接続状態:</span>
            <span
              className="badge"
              style={{
                backgroundColor:
                  wsStatus === 'connected' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                borderColor: wsStatus === 'connected' ? '#4ade80' : '#f87171',
                color: wsStatus === 'connected' ? '#4ade80' : '#f87171',
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              {wsStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 py-4">
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          再接続
        </button>
        <button
          className={`btn btn-secondary ${isTestingConnection ? 'loading' : ''}`}
          onClick={handleTestConnection}
          disabled={isTestingConnection}
        >
          {isTestingConnection ? '接続テスト中...' : '接続テスト'}
        </button>
      </div>

      {connectionTestResult && (
        <div
          className={`alert ${connectionTestResult.startsWith('✅') ? 'alert-success' : 'alert-error'} text-lg py-4 ${isResultFadingOut ? 'alert-fade-out' : 'alert-fade-in'}`}
        >
          <span>{connectionTestResult}</span>
          <button
            className="btn btn-sm btn-ghost"
            onClick={handleClearTestResult}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
