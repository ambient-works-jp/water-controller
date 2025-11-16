import type { ConnectionStatus } from '../../../../lib/types/websocket'

interface ConnectionStatusTabProps {
  /** WebSocket 接続状態 */
  wsStatus: ConnectionStatus
  /** WebSocket URL */
  wsUrl: string
  /** 接続テストの結果 */
  connectionTestResult: string
  /** 接続テスト実行中フラグ */
  isTestingConnection: boolean
  /** フェードアウト中フラグ */
  isResultFadingOut: boolean
  /** 接続テスト実行 */
  onTestConnection: () => Promise<void>
}

/**
 * 接続状態タブコンポーネント
 *
 * WebSocket 接続の情報とテスト機能
 */
export function ConnectionStatusTab({
  wsStatus,
  wsUrl,
  connectionTestResult,
  isTestingConnection,
  isResultFadingOut,
  onTestConnection
}: ConnectionStatusTabProps): React.JSX.Element {
  return (
    <div className="max-w-xl">
      <div className="flex gap-3 pb-4">
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          再接続
        </button>
        <button
          className={`btn btn-secondary ${isTestingConnection ? 'loading' : ''}`}
          onClick={onTestConnection}
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
        </div>
      )}

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
    </div>
  )
}
