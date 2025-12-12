/**
 * コンテンツ関連のユーティリティ関数
 */

import type { Content } from './types'
import { CONTENT_IDS } from '../../../../lib/constants/contents'
import { circularParticles, waveLines, radialSpokes, rotatingCube } from './contents'

/**
 * Content（描画関数付き）のマッピング
 */
const allContents: Record<string, Content> = {
  [CONTENT_IDS.CIRCULAR_PARTICLES]: circularParticles,
  [CONTENT_IDS.WAVE_LINES]: waveLines,
  [CONTENT_IDS.RADIAL_SPOKES]: radialSpokes,
  [CONTENT_IDS.ROTATING_CUBE]: rotatingCube
}

/**
 * ID からコンテンツを取得
 */
export function getContentById(id: string): Content | undefined {
  return allContents[id]
}
