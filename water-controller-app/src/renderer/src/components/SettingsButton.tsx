import { useEffect, useState } from 'react'

const BUTTON_HIDE_DELAY_MS = 2000

interface SettingsButtonProps {
  /** 設定画面を開く */
  onSettingsOpen: () => void
  /** 設定画面が開いているかどうか */
  isSettingsOpen: boolean
}

/**
 * 設定ボタンコンポーネント
 *
 * 画面右上に表示される歯車ボタン
 * マウス移動時にフェードインで表示され、1秒間動かさないとフェードアウトで消える
 * 設定画面が開いているときは非表示
 */
export function SettingsButton({
  onSettingsOpen,
  isSettingsOpen
}: SettingsButtonProps): React.JSX.Element | null {
  const [showButton, setShowButton] = useState(true)
  const [isHovering, setIsHovering] = useState(false)

  // マウス移動検知（2秒間動かなければボタンを非表示、ホバー中は除く）
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleMouseMove = (): void => {
      setShowButton(true)
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        if (!isHovering) {
          setShowButton(false)
        }
      }, BUTTON_HIDE_DELAY_MS)
    }

    window.addEventListener('mousemove', handleMouseMove)

    // 初回3秒後に非表示
    timeoutId = setTimeout(() => {
      if (!isHovering) {
        setShowButton(false)
      }
    }, 3000)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(timeoutId)
    }
  }, [isHovering])

  // 設定画面が開いている場合は非表示
  if (isSettingsOpen) {
    return null
  }

  return (
    <button
      className={`
        fixed top-6 right-6 z-10001
        btn btn-circle btn-lg
        bg-black/50 border-none
        hover:bg-black/70 hover:shadow-xl
        transition-all duration-300 ease-in-out
        ${showButton ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
        group
      `}
      onClick={onSettingsOpen}
      onMouseEnter={() => {
        setShowButton(true)
        setIsHovering(true)
      }}
      onMouseLeave={() => setIsHovering(false)}
      aria-label="設定を開く"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="w-7 h-7 text-white/90 transition-transform duration-300 ease-in-out group-hover:rotate-90"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
      </svg>
    </button>
  )
}
