/**
 * コントローラ入力機能の型定義
 */

import { InputLevel } from '../../../../lib/types/websocket'

/**
 * コントローラ入力の状態
 */
export interface ControllerState {
  left: InputLevel
  right: InputLevel
  up: InputLevel
  down: InputLevel
  button: boolean
}

/**
 * 入力ソースの種類
 */
export enum InputSource {
  WebSocket = 'websocket',
  Keyboard = 'keyboard'
}

/**
 * 入力ソース付きコントローラ状態
 */
export interface ControllerInputEvent {
  state: ControllerState
  source: InputSource
  timestamp: number
}

/**
 * コントローラ入力設定
 */
export interface ControllerInputConfig {
  /** キーボード入力を有効にするか */
  enableKeyboard: boolean
  /** WebSocket 入力を有効にするか */
  enableWebSocket: boolean
  /** 入力ソースの優先順位（先頭が最優先） */
  priority: InputSource[]
}
