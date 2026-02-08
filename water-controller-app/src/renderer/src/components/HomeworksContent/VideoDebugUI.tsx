/**
 * Video Debug UI - デバッグモード用の動画コントロール
 *
 * シークバー、再生/一時停止、時間表示を提供
 */

import { useState, useEffect } from 'react'
import { DEBUG_UI_BOTTOM_OFFSET } from '../../constants'

interface VideoDebugUIProps {
  videoElement: HTMLVideoElement | null
}

export function VideoDebugUI({ videoElement }: VideoDebugUIProps): React.JSX.Element | null {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)

  // 動画の時間更新を監視
  useEffect(() => {
    if (!videoElement) return

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata)
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)

    // 初期値設定
    if (videoElement.duration) {
      setDuration(videoElement.duration)
    }
    setCurrentTime(videoElement.currentTime)
    setIsPlaying(!videoElement.paused)

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
    }
  }, [videoElement])

  // 再生/一時停止トグル
  const togglePlayPause = () => {
    if (!videoElement) return

    if (videoElement.paused) {
      videoElement.play()
    } else {
      videoElement.pause()
    }
  }

  // シークバー操作
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoElement) return

    const newTime = parseFloat(e.target.value)
    videoElement.currentTime = newTime
    setCurrentTime(newTime)
  }

  // 時間のフォーマット（秒 → MM:SS）
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!videoElement) {
    return null
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: `${DEBUG_UI_BOTTOM_OFFSET}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '15px 20px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '14px',
        zIndex: 1000,
        minWidth: '400px',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* 時間表示 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '10px',
          fontSize: '12px',
          opacity: 0.8
        }}
      >
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* シークバー */}
      <input
        type="range"
        min="0"
        max={duration || 0}
        value={currentTime}
        onChange={handleSeek}
        step="0.1"
        style={{
          width: '100%',
          height: '6px',
          marginBottom: '12px',
          cursor: 'pointer',
          accentColor: '#00a8ff'
        }}
      />

      {/* コントロールボタン */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button
          onClick={togglePlayPause}
          style={{
            padding: '8px 16px',
            backgroundColor: isPlaying ? '#e74c3c' : '#2ecc71',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'background-color 0.2s'
          }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>
    </div>
  )
}
