/**
 * コントローラ入力の抽象化レイヤー
 */

import { useState, useEffect, useCallback } from 'react'
import { useWebSocketInput } from './useWebSocketInput'
import { useKeyboardInput } from './useKeyboardInput'
import { mergeInputs } from '../utils/inputPriority'
import type { ControllerState, ControllerInputConfig, ControllerInputEvent } from '../types'
import { InputSource } from '../types'
import { InputLevel } from '../../../../../lib/types/websocket'
import type { WsMessage } from '../../../../../lib/types/websocket'

const DEFAULT_STATE: ControllerState = {
  left: InputLevel.NoInput,
  right: InputLevel.NoInput,
  up: InputLevel.NoInput,
  down: InputLevel.NoInput,
  button: false
}

/**
 * コントローラ入力の抽象化レイヤー
 *
 * 複数の入力ソース（WebSocket, キーボード）を統合し、
 * 統一されたインターフェースでコントローラ入力を提供する
 *
 * @param config - コントローラ入力設定
 * @param lastMessage - WebSocket から受信した最新のメッセージ
 * @returns コントローラ入力の状態と制御関数
 */
export function useControllerInput(
  config: ControllerInputConfig,
  lastMessage?: WsMessage | null
): {
  /** 現在のコントローラ状態 */
  state: ControllerState
  /** 最後の入力イベント */
  lastEvent: ControllerInputEvent | null
  /** 入力ソース */
  source: InputSource | null
  /** リセット関数 */
  reset: () => void
} {
  const [currentState, setCurrentState] = useState<ControllerState>(DEFAULT_STATE)
  const [lastEvent, setLastEvent] = useState<ControllerInputEvent | null>(null)

  // 各入力ソースからのイベント
  const webSocketEvent = useWebSocketInput(config.enableWebSocket, lastMessage)
  const keyboardEvent = useKeyboardInput(config.enableKeyboard)

  // 入力の統合
  useEffect(() => {
    const events = [webSocketEvent, keyboardEvent].filter(Boolean) as ControllerInputEvent[]

    if (events.length === 0) {
      setCurrentState(DEFAULT_STATE)
      setLastEvent(null)
      return
    }

    // 優先順位に従って入力をマージ
    const mergedState = mergeInputs(events, config.priority)
    const latestEvent = events.reduce((latest, event) =>
      event.timestamp > latest.timestamp ? event : latest
    )

    setCurrentState(mergedState)
    setLastEvent(latestEvent)
  }, [webSocketEvent, keyboardEvent, config.priority])

  // リセット関数
  const reset = useCallback(() => {
    setCurrentState(DEFAULT_STATE)
    setLastEvent(null)
  }, [])

  return {
    state: currentState,
    lastEvent,
    source: lastEvent?.source ?? null,
    reset
  }
}
