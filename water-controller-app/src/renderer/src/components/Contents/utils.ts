/**
 * コンテンツ関連のユーティリティ関数
 */

import type { Content } from './types'
import { CONTENT_IDS } from '../../../../lib/constants/contents'
import { circularParticles } from './contents/content1-circular-particles'
import { waveLines } from './contents/content2-wave-lines'
import { radialSpokes } from './contents/content3-radial-spokes'

/**
 * Content（描画関数付き）のマッピング
 */
const allContents: Record<string, Content> = {
  [CONTENT_IDS.CIRCULAR_PARTICLES]: circularParticles,
  [CONTENT_IDS.WAVE_LINES]: waveLines,
  [CONTENT_IDS.RADIAL_SPOKES]: radialSpokes
}

/**
 * ID からコンテンツを取得
 */
export function getContentById(id: string): Content | undefined {
  return allContents[id]
}
