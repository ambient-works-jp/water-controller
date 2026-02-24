import { useState } from 'react'
import type { Config } from '../../../../lib/types/config'
import { ErrorDialog } from '../ErrorDialog'
import { errorDialogId } from '../constants'

interface SettingsTabProps {
  /** 設定データ */
  config: Config | null
  /** 読み込み中フラグ */
  isLoading: boolean
  /** デバッグモードの状態 */
  enableDebugMode: boolean
  /** 設定を再読み込み */
  onReloadConfig: () => Promise<void>
  /** デバッグモードの切り替え */
  onEnableDebugModeChange: (enabled: boolean) => void
}

/**
 * 設定タブコンポーネント
 *
 * 設定ファイルの情報表示と開発用オプション
 */
export function SettingsTab({
  config,
  isLoading,
  enableDebugMode,
  onReloadConfig,
  onEnableDebugModeChange
}: SettingsTabProps): React.JSX.Element {
  const [contentTab, setContentTab] = useState<'playlist' | 'all'>('playlist')

  return (
    <>
      <div className="flex gap-6 w-full">
        {/* 左カラム: アプリ設定 & 開発用機能 */}
        <div className="flex flex-col gap-6" style={{ width: '40%' }}>
          {/* アプリ設定 */}
          <div>
            <h2 className="text-xl font-bold pb-2">アプリ設定</h2>
            {/* 設定ファイルの説明 */}
            <div className="flex flex-col gap-2 text-sm pb-3">
              <div className="opacity-60">
                <p>
                  設定ファイルは{' '}
                  <code className="bg-base-300 px-1.5 py-0.5 rounded">
                    $HOME/.water-controller-app/config.json
                  </code>{' '}
                  に保存されています。
                </p>
                <p>
                  接続先 URL、コンテンツを更新したい場合、テキストエディタで設定ファイルを編集し、
                  <br />
                  「設定を再読み込み」ボタンを押してください。
                </p>
              </div>
            </div>

            <div className="card bg-base-200">
              <div className="card-body p-5">
                {config && (
                  <div className="space-y-4">
                    {/* WebSocket 接続先 URL */}
                    <div>
                      <h4 className="text-base font-bold pb-1">WebSocket 接続先 URL</h4>
                      <div className="text-sm">
                        <code className="block bg-base-300 px-3 py-2 rounded font-mono text-sm">
                          {config.wsUrl}
                        </code>
                      </div>
                    </div>

                    {/* デバッグモード */}
                    <div>
                      <h4 className="text-base font-bold pb-1">デバッグモード</h4>
                      <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-3 py-1">
                          <input
                            type="checkbox"
                            checked={enableDebugMode}
                            onChange={(e) => onEnableDebugModeChange(e.target.checked)}
                            className="checkbox checkbox-primary checkbox-sm"
                          />
                          <div className="flex-1">
                            <span className="label-text text-sm">デバッグオーバーレイを表示</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 設定を再読み込みボタン */}
            <div className="pt-3">
              <button
                className={`btn btn-primary btn-sm ${isLoading ? 'loading' : ''}`}
                onClick={onReloadConfig}
                disabled={isLoading}
              >
                {isLoading ? '読み込み中...' : '設定を再読み込み'}
              </button>
            </div>
          </div>

          {/* 開発用機能 */}
          <div>
            <h2 className="text-xl font-bold pb-3">開発用機能</h2>
            <div className="card bg-base-200">
              <div className="card-body p-5">
                <div>
                  <h4 className="text-base font-bold pb-2">エラーダイアログのテスト</h4>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() =>
                      (document.getElementById(errorDialogId) as HTMLDialogElement).showModal()
                    }
                  >
                    エラーダイアログを表示
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右カラム: コンテンツ */}
        <div className="flex flex-col gap-6" style={{ width: '40%' }}>
          <div>
            <h2 className="text-xl font-bold pb-2">コンテンツ</h2>
            {/* 設定ファイルの説明 */}
            <div className="text-sm opacity-60 pb-2">
              <p>
                「プレイリスト」を設定することでどのコンテンツを順番に再生するかを指定できます。
              </p>
            </div>

            <div className="card bg-base-200">
              <div className="card-body p-5">
                {/* タブ */}
                <div role="tablist" className="tabs tabs-boxed mb-4">
                  <button
                    role="tab"
                    className={`tab ${contentTab === 'playlist' ? 'tab-active' : ''}`}
                    onClick={() => setContentTab('playlist')}
                  >
                    プレイリスト
                  </button>
                  <button
                    role="tab"
                    className={`tab ${contentTab === 'all' ? 'tab-active' : ''}`}
                    onClick={() => setContentTab('all')}
                  >
                    コンテンツ一覧
                  </button>
                </div>

                {/* タブコンテンツ */}
                {config ? (
                  contentTab === 'playlist' ? (
                    // プレイリストタブ
                    !config.playlist || config.playlist.length === 0 ? (
                      <p className="text-sm opacity-60 italic">プレイリストが登録されていません</p>
                    ) : (
                      <div className="space-y-3">
                        {config.playlist.map((contentId, idx) => {
                          // contentId から ContentItem を取得
                          const contentItem = config.contents.find((item) => item.id === contentId)
                          if (!contentItem) {
                            return (
                              <div
                                key={contentId}
                                className="p-3 rounded-lg bg-error/10 border border-error space-y-1.5"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="badge badge-error badge-sm">#{idx + 1}</span>
                                  <span className="font-bold text-base text-error">
                                    コンテンツが見つかりません
                                  </span>
                                </div>
                                <div className="text-xs opacity-70 font-mono">{contentId}</div>
                              </div>
                            )
                          }
                          return (
                            <div
                              key={contentItem.id}
                              className="p-3 rounded-lg bg-base-300 space-y-1.5"
                            >
                              <div className="flex items-center gap-2">
                                <span className="badge badge-neutral badge-sm">#{idx + 1}</span>
                                <span className="font-bold text-base">{contentItem.name}</span>
                              </div>
                              <div className="text-xs opacity-70 font-mono">{contentItem.id}</div>
                              <div className="text-sm opacity-80">{contentItem.description}</div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  ) : // コンテンツ一覧タブ
                  !config.contents || config.contents.length === 0 ? (
                    <p className="text-sm opacity-60 italic">コンテンツが登録されていません</p>
                  ) : (
                    <div className="space-y-3">
                      {config.contents.map((contentItem) => (
                        <div
                          key={contentItem.id}
                          className="p-3 rounded-lg bg-base-300 space-y-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base">{contentItem.name}</span>
                          </div>
                          <div className="text-xs opacity-70 font-mono">{contentItem.id}</div>
                          <div className="text-sm opacity-80">{contentItem.description}</div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-sm opacity-60 italic">設定を読み込んでいません</p>
                )}
              </div>
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
