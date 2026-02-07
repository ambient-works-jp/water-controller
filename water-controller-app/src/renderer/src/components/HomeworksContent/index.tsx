/**
 * HomeworksContent - Three.js Liquid Glass 版
 *
 * ビジュアル作品品質の実装
 */

import { LiquidGlassScene } from './LiquidGlassScene'
import type { WsMessage } from '../../../../lib/types/websocket'
import type { ControllerState } from '../../features/controller/types'

interface HomeworksContentProps {
  lastMessage: WsMessage | null
  controllerState: ControllerState
  onContentChange?: (contentName: string, currentIndex: number, totalCount: number) => void
}

export function HomeworksContent({
  lastMessage,
  controllerState,
  onContentChange
}: HomeworksContentProps): React.JSX.Element {
  return (
    <LiquidGlassScene
      controllerState={controllerState}
      lastMessage={lastMessage}
      onContentChange={onContentChange}
    />
  )
}
