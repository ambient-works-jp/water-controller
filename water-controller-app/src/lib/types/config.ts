/**
 * 設定ファイル関連の型定義
 */

/**
 * コンテンツアイテム
 */
export type ContentItem = {
  /** コンテンツの一意の ID */
  id: string
  /** コンテンツの有効/無効 */
  enabled: boolean
  /** コンテンツの名前（人間が識別しやすくする） */
  name: string
  /** コンテンツの表示順序（0-origin） */
  order: number
}

/**
 * アプリケーション設定
 */
export type Config = {
  /** WebSocket サーバの接続先 URL */
  wsUrl: string
  /** コンテンツのプレイリスト */
  contents: ContentItem[]
  /** デバッグモードのオン・オフ */
  debugMode: boolean
}
