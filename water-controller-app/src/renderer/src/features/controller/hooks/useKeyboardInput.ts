/**
 * キーボード入力プロバイダー
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ControllerInputEvent } from '../types'
import { InputSource } from '../types'
import { InputLevel } from '../../../../../lib/types/websocket'

interface KeyState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  button: boolean
}

/**
 * キーボードからのコントローラ入力を提供
 *
 * 矢印キーと Enter キーを監視し、
 * ControllerInputEvent 形式に変換して返す
 *
 * @param enabled - キーボード入力を有効にするか
 * @returns ControllerInputEvent または null
 */
export function useKeyboardInput(enabled: boolean): ControllerInputEvent | null {
  const [event, setEvent] = useState<ControllerInputEvent | null>(null)
  const keyStateRef = useRef<KeyState>({
    up: false,
    down: false,
    left: false,
    right: false,
    button: false
  })

  const updateEvent = useCallback(() => {
    const state = keyStateRef.current
    setEvent({
      state: {
        left: state.left ? InputLevel.High : InputLevel.NoInput,
        right: state.right ? InputLevel.High : InputLevel.NoInput,
        up: state.up ? InputLevel.High : InputLevel.NoInput,
        down: state.down ? InputLevel.High : InputLevel.NoInput,
        button: state.button
      },
      source: InputSource.Keyboard,
      timestamp: Date.now()
    })
  }, [])

  useEffect(() => {
    if (!enabled) {
      setEvent(null)
      return
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      // Meta キーまたは Ctrl キーが押されている場合は既存ショートカットを優先
      if (e.metaKey || e.ctrlKey) return

      let changed = false
      switch (e.key) {
        case 'ArrowUp':
          if (!keyStateRef.current.up) {
            keyStateRef.current.up = true
            changed = true
          }
          e.preventDefault()
          break
        case 'ArrowDown':
          if (!keyStateRef.current.down) {
            keyStateRef.current.down = true
            changed = true
          }
          e.preventDefault()
          break
        case 'ArrowLeft':
          if (!keyStateRef.current.left) {
            keyStateRef.current.left = true
            changed = true
          }
          e.preventDefault()
          break
        case 'ArrowRight':
          if (!keyStateRef.current.right) {
            keyStateRef.current.right = true
            changed = true
          }
          e.preventDefault()
          break
        case 'Enter':
          if (!keyStateRef.current.button) {
            keyStateRef.current.button = true
            changed = true
          }
          e.preventDefault()
          break
      }

      if (changed) {
        updateEvent()
      }
    }

    const handleKeyUp = (e: KeyboardEvent): void => {
      let changed = false
      switch (e.key) {
        case 'ArrowUp':
          keyStateRef.current.up = false
          changed = true
          break
        case 'ArrowDown':
          keyStateRef.current.down = false
          changed = true
          break
        case 'ArrowLeft':
          keyStateRef.current.left = false
          changed = true
          break
        case 'ArrowRight':
          keyStateRef.current.right = false
          changed = true
          break
        case 'Enter':
          keyStateRef.current.button = false
          changed = true
          break
      }

      if (changed) {
        updateEvent()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [enabled, updateEvent])

  return event
}
