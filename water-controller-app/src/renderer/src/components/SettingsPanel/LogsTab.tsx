import { useRef, useEffect, useState } from 'react'
import ShikiHighlighter from 'react-shiki/web'

interface LogsTabProps {
  /** ログファイルのパス */
  logPath: string
  /** ログの内容 */
  logContent: string
  /** ログを再読み込み */
  onLoadLogs: () => Promise<void>
}

/**
 * ログタブコンポーネント
 *
 * アプリケーションログの表示
 */
export function LogsTab({ logPath, logContent, onLoadLogs }: LogsTabProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const logViewerRef = useRef<HTMLDivElement>(null)

  // ログコンテンツが更新されたら最下部にスクロール
  useEffect(() => {
    console.log("scroll to bottom", logViewerRef.current?.scrollHeight);
    setIsLoading(true)
    const timeoutRef = setTimeout(() => {
      logViewerRef.current?.scrollTo({ top: logViewerRef.current?.scrollHeight, behavior: 'smooth' })
      setIsLoading(false)
    }, 3000)

    return () => {
      setIsLoading(false)
      clearTimeout(timeoutRef)
    }
  }, [logContent])

  return (
    <div className="w-full">
      <p className="text-lg opacity-70 pb-2">
        ログファイルのパス: <code className="bg-base-300 px-2 py-0.5 rounded text-base">{logPath}</code>
      </p>

      <div className="pb-4">
        <button className="btn btn-primary" disabled={isLoading} onClick={() => {
          setIsLoading(true)
          onLoadLogs()
        }}>
          {isLoading ? '読み込み中...' : 'ログを再読み込み'}
        </button>
      </div>

      {/* 初期位置を最下部にする */}
      {isLoading ? (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div ref={logViewerRef} className="text-wrap overflow-y-auto max-h-[70vh] [&_code]:!block! [&_code]:pl-0! rounded-lg">
          <ShikiHighlighter language="json" theme="nord" showLineNumbers={true} startingLineNumber={1} className="rounded-lg">
            {logContent.trim()}
          </ShikiHighlighter>
        </div>
      )}
    </div>
  )
}
