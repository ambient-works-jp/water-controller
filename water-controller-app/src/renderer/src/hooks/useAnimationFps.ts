import { useEffect, useState } from 'react'

/**
 * アニメーションフレームレートを計測する Hook
 *
 * requestAnimationFrame を使って、Electron の描画 FPS を計測する
 *
 * @returns 現在の FPS（1秒間のフレーム数、小数点以下第2位まで）
 */
export function useAnimationFps(): number {
  const [fps, setFps] = useState(0)

  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()

    const measureFps = (): void => {
      frameCount++
      const currentTime = performance.now()
      const elapsed = currentTime - lastTime

      // 1秒ごとに FPS を計算（小数点以下第2位まで）
      if (elapsed >= 1000) {
        const calculatedFps = (frameCount * 1000) / elapsed
        setFps(Math.round(calculatedFps * 100) / 100)
        frameCount = 0
        lastTime = currentTime
      }

      requestAnimationFrame(measureFps)
    }

    const rafId = requestAnimationFrame(measureFps)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return fps
}
