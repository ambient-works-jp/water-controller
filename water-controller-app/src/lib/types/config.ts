/**
 * 設定ファイル関連の型定義
 */

type ContentId = string

/**
 * コンテンツアイテム
 */
export type ContentItem = {
  /** コンテンツの一意の ID */
  id: ContentId
  /** コンテンツの名前（人間が識別しやすくする） */
  name: string
  /** コンテンツの説明 */
  description: string
}

/**
 * アプリケーション設定
 */
export type Config = {
  /** WebSocket サーバの接続先 URL */
  wsUrl: string
  /** デバッグモードのオン・オフ */
  debugMode: boolean
  /** コンテンツ一覧 */
  contents: ContentItem[]
  /** コンテンツのプレイリスト */
  playlist: ContentId[]
}
