import './ErrorDialog.css'

interface ErrorDialogProps {
  /** エラーメッセージ */
  message: string
  /** 詳細情報（オプション） */
  details?: string
  /** 閉じるボタンのコールバック（オプション） */
  onClose?: () => void
}

/**
 * エラーダイアログコンポーネント
 *
 * 設定ファイル読み込みエラーなど、重要なエラーを表示する
 */
export function ErrorDialog({ message, details, onClose }: ErrorDialogProps): React.JSX.Element {
  return (
    <div className="error-dialog-overlay">
      <div className="error-dialog">
        <div className="error-dialog-header">
          <h2 className="error-title">エラー</h2>
        </div>

        <div className="error-dialog-content">
          <p className="error-message">{message}</p>
          {details && (
            <div className="error-details">
              <h3>詳細:</h3>
              <pre className="error-details-content">{details}</pre>
            </div>
          )}

          <div className="error-actions">
            <p className="action-hint">以下の操作が可能です:</p>
            <ul className="action-list">
              <li>
                リロード: <kbd>Cmd</kbd> + <kbd>R</kbd>
              </li>
              <li>
                設定画面を開く: <kbd>Cmd</kbd> + <kbd>M</kbd>
              </li>
            </ul>
          </div>
        </div>

        {onClose && (
          <div className="error-dialog-footer">
            <button className="error-close-button" onClick={onClose}>
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
