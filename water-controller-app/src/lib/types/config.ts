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
 * デバッグモードの設定オプション
 */
export type DebugModeOptions = {
  /** デバッグモードの有効・無効 */
  enableDebugMode: boolean
  /** カーソル位置を表示するかどうか */
  showCursor: boolean
  /** 移動範囲を表示するかどうか */
  showMovementArea: boolean
}

/**
 * アプリケーション設定
 */
export type Config = {
  /** WebSocket サーバの接続先 URL */
  wsUrl: string
  /** 中央に戻るカーソルモード（ふよふよモード） */
  enableCenteringCursorMode: boolean
  /** デバッグモードの設定 */
  debugModeOptions: DebugModeOptions
  /** コンテンツ一覧 */
  contents: ContentItem[]
  /** コンテンツのプレイリスト */
  playlist: ContentId[]
}
