import type { Content } from './types'
import { circularParticles } from './contents/content1-circular-particles'
import { waveLines } from './contents/content2-wave-lines'
import { radialSpokes } from './contents/content3-radial-spokes'

/**
 * コンテンツのプレイリスト
 *
 * ここで定義された順序でコンテンツが再生されます
 */
export const PLAYLIST: Content[] = [circularParticles, waveLines, radialSpokes]
