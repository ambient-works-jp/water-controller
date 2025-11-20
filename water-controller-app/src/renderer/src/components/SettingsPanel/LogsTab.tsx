import { useRef, useEffect, useState, useCallback } from 'react'
import ShikiHighlighter from 'react-shiki/web'
import { MAX_LOG_TAIL_LINES } from '../constants'

// loadLogFunction の完了後に最下部にスクロールするための遅延時間
// ログを取得してから描画されるまでにラグがあるため、少し待ってからスクロールする
// 取得するログの行数が多いほどラグが大きくなる。ローカル環境で動作確認しながら最適な値を設定する。
const SCROLL_TO_BOTTOM_DELAY_MS = 500

interface LogsTabProps {
  /** ログファイルのパス */
  logPath: string
  /** ログの内容 */
  logContent: string
  /** ログを再読み込み */
  loadLogFunction: () => Promise<void>
}

/**
 * ログタブコンポーネント
 *
 * アプリケーションログの表示
 */
export function LogsTab({ logPath, logContent, loadLogFunction }: LogsTabProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const logViewerRef = useRef<HTMLDivElement>(null)

  // ログを取得する関数を定義
  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    await loadLogFunction().then(() => {
      setIsLoading(false)
      setTimeout(() => {
        if (logViewerRef.current?.scrollHeight) {
          logViewerRef.current?.scrollTo({
            top: logViewerRef.current?.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, SCROLL_TO_BOTTOM_DELAY_MS)
    })
  }, [loadLogFunction])

  // ログコンテンツが更新されたら最下部にスクロール
  useEffect(() => {
    console.log('scroll to bottom', logViewerRef.current?.scrollHeight)
    loadLogs()

    return () => {
      setIsLoading(false)
    }
  }, [])

  return (
    <div className="w-full">
      <p className="text-lg opacity-70 pb-2">
        最新のログ {MAX_LOG_TAIL_LINES} 件を表示しています。
      </p>
      <p className="text-lg opacity-70 pb-2">
        ログファイルのパス:{' '}
        <code className="bg-base-300 px-2 py-0.5 rounded text-base">{logPath}</code>
      </p>

      <div className="pb-4">
        <button
          className="btn btn-primary"
          disabled={isLoading}
          onClick={() => {
            loadLogs()
          }}
        >
          {isLoading ? '読み込み中...' : 'ログを再読み込み'}
        </button>
      </div>

      {/* 初期位置を最下部にする */}
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div
          ref={logViewerRef}
          className="text-wrap overflow-y-auto max-h-[70vh] [&_code]:!block! [&_code]:pl-0! rounded-lg animate-fadeIn"
        >
          <ShikiHighlighter
            language="json"
            theme="nord"
            showLineNumbers={true}
            startingLineNumber={1}
            className="rounded-lg"
          >
            {logContent.trim()}
          </ShikiHighlighter>
        </div>
      )}
    </div>
  )
}
