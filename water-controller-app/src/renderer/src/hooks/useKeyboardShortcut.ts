import { useEffect } from 'react'

export type KeyboardShortcut = {
  /** ショートカットキー（Meta キー + このキー） */
  key: string
  /** ショートカットが押されたときのハンドラ */
  handler: () => void
  /** ショートカットの説明（デバッグ用） */
  description?: string
}

/**
 * キーボードショートカットを登録するカスタムフック
 * 全てのショートカットは Meta キー（Mac: Cmd, Windows/Linux: Ctrl）+ キーの組み合わせ
 *
 * @param shortcuts - 登録するショートカットの配列
 * @param deps - useEffect の依存配列（ハンドラ内で使用する state など）
 *
 * @example
 * ```tsx
 * useKeyboardShortcut([
 *   {
 *     key: 'm',
 *     handler: () => setShowSettings(prev => !prev),
 *     description: '設定画面を開く'
 *   },
 *   {
 *     key: 'd',
 *     handler: () => setDebugMode(prev => !prev),
 *     description: 'デバッグモードをオン・オフ'
 *   }
 * ], [])
 * ```
 */
export function useKeyboardShortcut(
  shortcuts: KeyboardShortcut[],
  deps: React.DependencyList
): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Meta キー（Cmd/Ctrl）が押されていない場合は何もしない
      if (!e.metaKey && !e.ctrlKey) {
        return
      }

      for (const shortcut of shortcuts) {
        if (e.key === shortcut.key) {
          e.preventDefault()
          shortcut.handler()

          if (shortcut.description) {
            console.log(`[Keyboard Shortcut] ${shortcut.description}`)
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
