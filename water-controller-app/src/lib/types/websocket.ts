/**
 * WebSocket 関連の型定義
 */

/**
 * ボタン入力メッセージ
 */
export type ButtonInputMessage = {
  type: 'button-input'
  isPushed: boolean
}

/**
 * コントローラ入力値の Enum
 * - NoInput: 入力なし
 * - Low: 低レベル入力
 * - Middle: 中レベル入力
 * - High: 高レベル入力
 */
export enum InputLevel {
  NoInput = 0,
  Low = 1,
  Middle = 2,
  High = 3
}

/**
 * コントローラ入力メッセージ
 */
export type ControllerInputMessage = {
  type: 'controller-input'
  left: InputLevel
  right: InputLevel
  up: InputLevel
  down: InputLevel
}

/**
 * WebSocket メッセージ（Union 型）
 */
export type WsMessage = ButtonInputMessage | ControllerInputMessage

/**
 * WebSocket 接続状態
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
