/**
 * WebSocket 入力プロバイダー
 */

import { useState, useEffect } from 'react'
import type { WsMessage } from '../../../../../lib/types/websocket'
import type { ControllerInputEvent } from '../types'
import { InputSource } from '../types'
import { InputLevel } from '../../../../../lib/types/websocket'

/**
 * WebSocket からのコントローラ入力を提供
 *
 * 既存の WebSocket メッセージを監視し、
 * ControllerInputEvent 形式に変換して返す
 *
 * @param enabled - WebSocket 入力を有効にするか
 * @param lastMessage - WebSocket から受信した最新のメッセージ
 * @returns ControllerInputEvent または null
 */
export function useWebSocketInput(
  enabled: boolean,
  lastMessage?: WsMessage | null
): ControllerInputEvent | null {
  const [event, setEvent] = useState<ControllerInputEvent | null>(null)

  useEffect(() => {
    if (!enabled || !lastMessage) {
      setEvent(null)
      return
    }

    if (lastMessage.type === 'controller-input') {
      setEvent({
        state: {
          left: lastMessage.left,
          right: lastMessage.right,
          up: lastMessage.up,
          down: lastMessage.down,
          button: false // controller-input にはボタン情報がない
        },
        source: InputSource.WebSocket,
        timestamp: Date.now()
      })
    } else if (lastMessage.type === 'button-input') {
      // ボタン入力のみ更新（方向は保持）
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              state: {
                ...prev.state,
                button: lastMessage.isPushed
              },
              timestamp: Date.now()
            }
          : {
              state: {
                left: InputLevel.NoInput,
                right: InputLevel.NoInput,
                up: InputLevel.NoInput,
                down: InputLevel.NoInput,
                button: lastMessage.isPushed
              },
              source: InputSource.WebSocket,
              timestamp: Date.now()
            }
      )
    }
  }, [enabled, lastMessage])

  return event
}
