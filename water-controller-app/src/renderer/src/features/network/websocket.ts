import type { WsMessage } from '../../../../lib/types/websocket'

export const messageHandler = (message: WsMessage) => {
  // console.log('[WebSocket] Message received:', message)
  if (message.type === 'button-input') {
    console.log(`[WebSocket] Button: ${message.isPushed ? 'PUSHED' : 'RELEASED'}`)
  } else if (message.type === 'controller-input') {
    console.log(
      `[WebSocket] Controller: left=${message.left}, right=${message.right}, up=${message.up}, down=${message.down}`
    )
  }
}
