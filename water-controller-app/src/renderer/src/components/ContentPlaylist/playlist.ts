import type { Content } from './types'
import { getContentById } from './utils'
import { CONTENTS } from '../../../../lib/constants/contents'

/**
 * config.playlist から Content[] を生成する
 *
 * @param playlistIds - ContentId の配列
 * @returns Content の配列
 */
export function generatePlaylist(playlistIds: string[]): Content[] {
  const playlist: Content[] = []

  for (const id of playlistIds) {
    const content = getContentById(id)
    if (content) {
      playlist.push(content)
    } else {
      console.warn(`[playlist] Content not found for id: ${id}`)
    }
  }

  // プレイリストが空の場合、デフォルトとして全コンテンツを返す
  if (playlist.length === 0) {
    console.warn('[playlist] Playlist is empty, using all contents as default')
    return CONTENTS.map((item) => {
      const content = getContentById(item.id)
      if (!content) {
        throw new Error(`Content not found for id: ${item.id}`)
      }
      return content
    })
  }

  return playlist
}
