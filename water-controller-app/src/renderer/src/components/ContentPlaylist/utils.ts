/**
 * コンテンツ関連のユーティリティ関数
 */

import type { Content } from './types'
import { CONTENT_IDS } from '../../../../lib/constants/contents'
import { interactivePointer } from './contents'

/**
 * Content（描画関数付き）のマッピング
 */
const allContents: Record<string, Content> = {
  [CONTENT_IDS.INTERACTIVE_POINTER]: interactivePointer,
}

/**
 * ID からコンテンツを取得
 */
export function getContentById(id: string): Content | undefined {
  return allContents[id]
}
