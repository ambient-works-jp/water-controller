/**
 * コンテンツの型定義
 */

import type { WsMessage } from '../../../../lib/types/websocket'
import type { ControllerState } from '../../features/controller/types'

/**
 * コンテンツのメタデータ
 */
export interface ContentMetadata {
  /** コンテンツの一意な ID */
  id: string
  /** コンテンツの表示名 */
  name: string
  /** コンテンツの説明 */
  description: string
}

/**
 * Canvas 2D コンテキストを使用するコンテンツの描画関数
 *
 * @param ctx - Canvas 2D レンダリングコンテキスト
 * @param t - 経過時間（秒）
 * @param vw - ビューポート幅
 * @param vh - ビューポート高さ
 * @param controllerState - コントローラ状態（WebSocket + キーボード統合）
 * @param lastMessage - 最新の WebSocket メッセージ（オプション、互換性のため残す）
 */
export type ContentRenderer = (
  ctx: CanvasRenderingContext2D,
  t: number,
  vw: number,
  vh: number,
  controllerState: ControllerState,
  lastMessage?: WsMessage | null
) => void

/**
 * React コンポーネントとして実装されるコンテンツのプロパティ
 */
export interface ContentComponentProps {
  /** ビューポート幅 */
  width: number
  /** ビューポート高さ */
  height: number
  /** 経過時間（秒） */
  time: number
  /** コントローラ状態（WebSocket + キーボード統合） */
  controllerState: ControllerState
  /** 最新の WebSocket メッセージ（オプション、互換性のため残す） */
  lastMessage?: WsMessage | null
}

/**
 * コンテンツの定義
 *
 * Canvas 2D を使う場合は `render` を、
 * React コンポーネント（Three.js など）を使う場合は `component` を指定する
 */
export interface Content {
  /** メタデータ */
  metadata: ContentMetadata
  /** Canvas 2D 描画関数（オプション） */
  render?: ContentRenderer
  /** React コンポーネント（オプション） */
  component?: React.ComponentType<ContentComponentProps>
}
