interface Keybinding {
  description: string
  key1: string
  key2: string
}

const keybindings: Keybinding[] = [
  {
    description: '設定画面を開く',
    key1: 'Cmd',
    key2: 'M',
  },
  {
    description: 'ページをリロード',
    key1: 'Cmd',
    key2: 'R',
  },
  {
    description: 'デバッグモードをオン・オフ',
    key1: 'Cmd',
    key2: 'D',
  },
  {
    description: 'DevTools を開く',
    key1: 'Cmd',
    key2: 'I',
  },
  {
    description: 'アプリケーションを終了',
    key1: 'Cmd',
    key2: 'Q',
  },
]

/**
 * ヘルプタブコンポーネント
 *
 * キーボードショートカットの一覧表示
 */
export function HelpTab(): React.JSX.Element {
  return (
    <div className="space-y-6 max-w-xl">
      <div className="card bg-base-200">
        <div className="card-body p-5">
          <ul className="flex flex-col gap-2">
            {keybindings.map((keybinding) => (
              <li className="flex items-center gap-3">
                <div className="flex gap-1 items-center">
                  <kbd className="kbd">{keybinding.key1}</kbd>
                  <span className="text-sm opacity-60">+</span>
                  <kbd className="kbd">{keybinding.key2}</kbd>
                </div>
                <span className="flex-1 text-lg opacity-80">{keybinding.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
