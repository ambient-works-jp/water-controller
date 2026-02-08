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
  debugMode?: boolean
  showCursor?: boolean
  showMovementArea?: boolean
}

export function HomeworksContent({
  lastMessage,
  controllerState,
  onContentChange,
  debugMode = false,
  showCursor = false,
  showMovementArea = false
}: HomeworksContentProps): React.JSX.Element {
  return (
    <LiquidGlassScene
      controllerState={controllerState}
      lastMessage={lastMessage}
      onContentChange={onContentChange}
      debugMode={debugMode}
      showCursor={showCursor}
      showMovementArea={showMovementArea}
    />
  )
}
