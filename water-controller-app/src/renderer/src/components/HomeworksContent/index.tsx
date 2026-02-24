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
  enableDebugMode?: boolean
  showCursor?: boolean
  showMovementArea?: boolean
  enableCenteringCursorMode?: boolean
}

export function HomeworksContent({
  lastMessage,
  controllerState,
  onContentChange,
  enableDebugMode = false,
  showCursor = false,
  showMovementArea = false,
  enableCenteringCursorMode = true
}: HomeworksContentProps): React.JSX.Element {
  return (
    <LiquidGlassScene
      controllerState={controllerState}
      lastMessage={lastMessage}
      onContentChange={onContentChange}
      enableDebugMode={enableDebugMode}
      showCursor={showCursor}
      showMovementArea={showMovementArea}
      enableCenteringCursorMode={enableCenteringCursorMode}
    />
  )
}
