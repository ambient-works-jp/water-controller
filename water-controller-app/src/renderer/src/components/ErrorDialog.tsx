import { errorDialogId } from './constants'

interface KeyboardShortcut {
  key1: string
  key2: string
  description: string
}

const keyboardShortcuts: KeyboardShortcut[] = [
  {
    key1: 'Cmd',
    key2: 'R',
    description: 'リロード'
  },
  {
    key1: 'Cmd',
    key2: 'M',
    description: '設定画面を開く'
  }
]

interface ErrorDialogProps {
  /** エラーメッセージ */
  message: string
  /** 詳細情報（オプション） */
  details?: string
}

/**
 * エラーダイアログコンポーネント (daisyUI Modal 版)
 *
 * 設定ファイル読み込みエラーなど、重要なエラーを表示する
 */
export function ErrorDialog({ message, details }: ErrorDialogProps): React.JSX.Element {
  return (
    <>
      {/* エラーダイアログ */}
      <dialog id={errorDialogId} className="modal">
        <div className="modal-box">
          {/* ヘッダー */}
          <h3 className="font-bold text-2xl text-error pb-2">エラー</h3>

          {/* エラーメッセージ */}
          <div className="flex flex-col gap-3">
            {/* メッセージ */}
            <p className="text-lg">{message}</p>

            {/* 詳細情報 */}
            {details && (
              <div className="flex flex-col gap-2">
                <p className="font-semibold text-base">エラー詳細：</p>
                <pre className="bg-base-200 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap wrap-break-word">
                  {details}
                </pre>
              </div>
            )}

            {/* 操作ヒント */}
            <p className="font-semibold text-base">以下の操作が可能です：</p>
            <div className="bg-base-200 p-4 rounded-lg mb-6">
              <ul className="flex flex-col gap-1">
                {keyboardShortcuts.map((shortcut) => (
                  <li className="flex items-center gap-2" key={`${shortcut.key1}-${shortcut.key2}`}>
                    <span>{shortcut.description}：</span>
                    <kbd className="kbd kbd-sm">{shortcut.key1}</kbd>
                    <span>+</span>
                    <kbd className="kbd kbd-sm">{shortcut.key2}</kbd>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 閉じるボタン */}
          <form method="dialog">
            <button className="btn btn-sm btn-circle absolute right-5 top-5" aria-label="閉じる">
              <svg
                className="fill-current"
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 512 512"
              >
                <polygon points="400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49" />
              </svg>
            </button>
          </form>
        </div>

        {/* モーダルの領域外をクリックしたときにモーダルを閉じる。表示されない */}
        <form method="dialog" className="modal-backdrop">
          <button aria-label="閉じる">Close</button>
        </form>
      </dialog>
    </>
  )
}
