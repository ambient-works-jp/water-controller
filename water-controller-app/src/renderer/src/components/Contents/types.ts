/**
 * コンテンツの型定義
 */

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
  /** メタデータ */
  metadata: ContentMetadata
  /** 描画関数 */
  render: ContentRenderer
}
