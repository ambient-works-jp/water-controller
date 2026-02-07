/**
 * コンテンツの定数定義
 *
 * renderer と main プロセスで共有するため、lib に配置
 */

import type { ContentItem } from '../types/config'

/**
 * ContentId の定数定義（typo 防止）
 */
export const CONTENT_IDS = {
  INTERACTIVE_POINTER: 'interactive-pointer',
} as const

/**
 * 利用可能なすべてのコンテンツ（ContentItem として定義）
 */
export const CONTENTS: ContentItem[] = [
  {
    id: CONTENT_IDS.INTERACTIVE_POINTER,
    name: 'Interactive Pointer',
    description: 'コントローラ入力に反応するぽわぽわポインタ'
  },
]

/**
 * コンテンツの総数
 */
export const CONTENT_COUNT = CONTENTS.length

/**
 * デフォルトのプレイリスト（config.playlist が空の場合に使用）
 */
export const DEFAULT_PLAYLIST_IDS: string[] = CONTENTS.map((c) => c.id)
