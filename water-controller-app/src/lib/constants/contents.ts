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
  CIRCULAR_PARTICLES: 'circular-particles',
  WAVE_LINES: 'wave-lines',
  RADIAL_SPOKES: 'radial-spokes',
  ROTATING_CUBE: 'rotating-cube',
  WATER_CONTROLLER_TEXT: 'water-controller-text',
  INTERACTIVE_POINTER: 'interactive-pointer'
} as const

/**
 * 利用可能なすべてのコンテンツ（ContentItem として定義）
 */
export const CONTENTS: ContentItem[] = [
  {
    id: CONTENT_IDS.CIRCULAR_PARTICLES,
    name: 'Circular Particles',
    description: '円周上を回転しながら移動するパーティクルのアニメーション'
  },
  {
    id: CONTENT_IDS.WAVE_LINES,
    name: 'Wave Lines',
    description: '複数の波線が重なり合うアニメーション'
  },
  {
    id: CONTENT_IDS.RADIAL_SPOKES,
    name: 'Radial Spokes',
    description: '中心から放射状に伸びるスポークのアニメーション'
  },
  {
    id: CONTENT_IDS.ROTATING_CUBE,
    name: 'Rotating Cube',
    description: 'Three.js を使った回転する立方体'
  },
  {
    id: CONTENT_IDS.WATER_CONTROLLER_TEXT,
    name: 'Water Controller Text',
    description: 'p5.js で "Water Controller" を表示'
  },
  {
    id: CONTENT_IDS.INTERACTIVE_POINTER,
    name: 'Interactive Pointer',
    description: 'コントローラ入力に反応するぽわぽわポインタ'
  }
]

/**
 * コンテンツの総数
 */
export const CONTENT_COUNT = CONTENTS.length

/**
 * デフォルトのプレイリスト（config.playlist が空の場合に使用）
 */
export const DEFAULT_PLAYLIST_IDS: string[] = CONTENTS.map((c) => c.id)
