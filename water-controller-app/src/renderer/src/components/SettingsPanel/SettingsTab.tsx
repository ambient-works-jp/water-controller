import type { Config } from '../../../../lib/types/config'
import { ErrorDialog } from '../ErrorDialog'
import { errorDialogId } from '../constants'

interface SettingsTabProps {
  /** 設定データ */
  config: Config | null
  /** 読み込み中フラグ */
  isLoading: boolean
  /** デバッグモードの状態 */
  debugMode: boolean
  /** 設定を再読み込み */
  onReloadConfig: () => Promise<void>
  /** デバッグモードの切り替え */
  onDebugModeChange: (enabled: boolean) => void
}

/**
 * 設定タブコンポーネント
 *
 * 設定ファイルの情報表示と開発用オプション
 */
export function SettingsTab({
  config,
  isLoading,
  debugMode,
  onReloadConfig,
  onDebugModeChange
}: SettingsTabProps): React.JSX.Element {
  return (
    <>
      <div className="space-y-6 max-w-4xl">
        {/* 設定ファイルセクション */}
        <h2 className="text-xl font-bold pb-3">アプリ設定</h2>
        <p className="text-base opacity-70 pb-3">
          設定ファイルは{' '}
          <code className="bg-base-300 px-2 py-0.5 rounded text-base">
            $HOME/.water-controller-app/config.json
          </code>{' '}
          に保存されています。
          <br />
          変更したい場合、テキストエディタで編集後、「設定を再読み込み」ボタンを押してください。
        </p>
        <div className="card bg-base-200">
          <div className="card-body p-5">
            <div className="mb-3">
              <button
                className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                onClick={onReloadConfig}
                disabled={isLoading}
              >
                {isLoading ? '読み込み中...' : '設定を再読み込み'}
              </button>
            </div>

            {config && (
              // flex で gap を使いたい
              <div className="flex flex-col gap-2">
                <div>
                  <h4 className="text-lg font-bold pb-1">WebSocket 接続先</h4>
                  <div className="text-base">
                    <code className="block bg-base-300 px-3 py-2 rounded font-mono">
                      {config.wsUrl}
                    </code>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-bold pb-1">コンテンツ一覧</h4>
                  <div>
                    {config.contents.length === 0 ? (
                      <p className="text-base opacity-60 italic">コンテンツが登録されていません</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {config.contents.map((item) => (
                          <li
                            key={item.id}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg ${
                              item.enabled ? 'bg-base-300' : 'bg-base-300/50 opacity-50'
                            }`}
                          >
                            <span className="badge badge-neutral">#{item.order}</span>
                            <span className="flex-1 text-lg">{item.name}</span>
                            <span
                              className={`badge ${item.enabled ? 'badge-success' : 'badge-error'}`}
                            >
                              {item.enabled ? '有効' : '無効'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 開発用セクション */}
        <h2 className="text-xl font-bold py-3">開発用オプション</h2>
        <div className="card bg-base-200">
          <div className="card-body p-5 space-y-4">
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3 py-2">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => onDebugModeChange(e.target.checked)}
                  className="checkbox checkbox-primary"
                />
                <div className="flex-1">
                  <span className="label-text font-medium text-lg">デバッグモード</span>
                  <p className="text-base opacity-60 mt-0.5">
                    デバッグオーバーレイ（接続状態、FPS、コントローラ入力）を表示します
                    <br />
                    ショートカット: <kbd className="kbd">Cmd</kbd> + <kbd className="kbd">D</kbd>
                  </p>
                </div>
              </label>
            </div>

            <div className="divider my-2"></div>

            <div>
              <h4 className="text-lg font-bold pb-2">テスト機能</h4>
              <button
                className="btn btn-warning"
                onClick={() =>
                  (document.getElementById(errorDialogId) as HTMLDialogElement).showModal()
                }
              >
                エラーダイアログのテスト
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* テスト用エラーダイアログ */}
      <ErrorDialog
        message="これはテスト用のエラーダイアログです"
        details="詳細情報をここに表示できます。\n複数行のテキストも表示可能です。"
      />
    </>
  )
}
