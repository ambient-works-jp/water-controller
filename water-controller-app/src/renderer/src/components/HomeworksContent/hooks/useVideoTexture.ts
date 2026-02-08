/**
 * useVideoTexture - 動画をThree.jsのVideoTextureとして読み込むカスタムフック
 */

import { useState, useEffect } from 'react'
import * as THREE from 'three'

export function useVideoTexture(videoSrc: string): THREE.VideoTexture | null {
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null)

  useEffect(() => {
    // HTML5 video要素を作成
    const video = document.createElement('video')
    video.src = videoSrc
    video.loop = true // ループ再生
    video.muted = true // ミュート（自動再生ポリシー対策）
    video.playsInline = true // iOS対応
    video.crossOrigin = 'anonymous' // CORS対応
    video.setAttribute('playsinline', 'true') // iOS対応（属性形式）

    // 動画の読み込みを待つ
    const handleCanPlay = () => {
      // VideoTextureを作成
      const videoTexture = new THREE.VideoTexture(video)
      videoTexture.minFilter = THREE.LinearFilter
      videoTexture.magFilter = THREE.LinearFilter
      videoTexture.format = THREE.RGBAFormat
      videoTexture.colorSpace = THREE.SRGBColorSpace

      setTexture(videoTexture)

      // 再生開始
      video
        .play()
        .catch((error) => {
          console.error('[useVideoTexture] Video playback failed:', error)
        })
    }

    video.addEventListener('canplay', handleCanPlay)

    // クリーンアップ
    return () => {
      video.removeEventListener('canplay', handleCanPlay)
      video.pause()
      video.src = ''
      video.load() // リソース解放
      texture?.dispose()
    }
  }, [videoSrc])

  return texture
}
