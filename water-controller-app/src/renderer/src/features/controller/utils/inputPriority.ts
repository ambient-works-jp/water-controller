/**
 * 入力ソースの優先順位ロジック
 */

import type { ControllerState, ControllerInputEvent, InputSource } from '../types'
import { InputLevel } from '../../../../../lib/types/websocket'

/**
 * 複数の入力イベントを優先順位に従ってマージする
 *
 * 優先順位が高いソースの入力を優先的に採用する
 * 同じ優先順位の場合は、より高い InputLevel を採用する
 *
 * @param events - 入力イベントの配列
 * @param priority - 入力ソースの優先順位（先頭が最優先）
 * @returns マージされたコントローラ状態
 */
export function mergeInputs(
  events: ControllerInputEvent[],
  priority: InputSource[]
): ControllerState {
  if (events.length === 0) {
    return {
      left: InputLevel.NoInput,
      right: InputLevel.NoInput,
      up: InputLevel.NoInput,
      down: InputLevel.NoInput,
      button: false
    }
  }

  if (events.length === 1) {
    return events[0].state
  }

  // 優先順位でソート
  const sortedEvents = [...events].sort((a, b) => {
    const priorityA = priority.indexOf(a.source)
    const priorityB = priority.indexOf(b.source)
    // 優先順位が見つからない場合は最低優先度とする
    const finalPriorityA = priorityA === -1 ? Number.MAX_SAFE_INTEGER : priorityA
    const finalPriorityB = priorityB === -1 ? Number.MAX_SAFE_INTEGER : priorityB
    return finalPriorityA - finalPriorityB
  })

  // 最優先のイベントをベースに、各方向で最大値を取る
  const result: ControllerState = { ...sortedEvents[0].state }

  for (const event of sortedEvents.slice(1)) {
    result.left = Math.max(result.left, event.state.left) as InputLevel
    result.right = Math.max(result.right, event.state.right) as InputLevel
    result.up = Math.max(result.up, event.state.up) as InputLevel
    result.down = Math.max(result.down, event.state.down) as InputLevel
    result.button = result.button || event.state.button
  }

  return result
}
