/**
 * コンテンツの型定義
 */

import type { ContentItem } from '../../../../lib/types/config'

/**
 * Canvas 2D コンテキストを使用するコンテンツの描画関数
 *
 * @param ctx - Canvas 2D レンダリングコンテキスト
 * @param t - 経過時間（秒）
 * @param vw - ビューポート幅
 * @param vh - ビューポート高さ
 */
export type ContentRenderer = (
  ctx: CanvasRenderingContext2D,
  t: number,
  vw: number,
  vh: number
) => void

/**
 * コンテンツの定義
 */
export interface Content {
  /** メタデータ (Config の ContentItem と互換) */
  metadata: ContentItem
  /** 描画関数 */
  render: ContentRenderer
}
