# タスク: 2種類の FPS 計測機能の実装

**作成日時**: 2025-11-16 09:35:53 (JST)
**ステータス**: 完了

## ゴール

デバッグオーバーレイで2種類のFPSを表示する:

1. **Animation FPS**: Electron の描画フレームレート
2. **Controller FPS**: WebSocket で受信するメッセージのフレームレート（センサーのフレームレート）

## 背景

現在のデバッグオーバーレイでは、`requestAnimationFrame` を使った Animation FPS のみを計測している。しかし、WebSocket で受信するメッセージの頻度（センサーのサンプリングレート）も重要な指標である。

パフォーマンス診断のために、以下の2つを分けて計測・表示する必要がある:

- **Animation FPS**: 画面の描画性能を示す
- **Controller FPS**: センサーからのデータ受信頻度を示す

## タスク一覧

### 1. useAnimationFps Hook の作成

**ステータス**: ✅ 完了

**内容**:

- `requestAnimationFrame` を使って Electron の描画 FPS を計測
- 1秒ごとにフレーム数をカウントして FPS を算出
- カスタム Hook として実装

**ファイル**: `src/renderer/src/hooks/useAnimationFps.ts`

**実装内容**:

```typescript
import { useEffect, useState } from 'react'

export function useAnimationFps(): number {
  const [fps, setFps] = useState(0)

  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()

    const measureFps = (): void => {
      frameCount++
      const currentTime = performance.now()
      const elapsed = currentTime - lastTime

      // 1秒ごとに FPS を計算
      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed))
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
```

### 2. useControllerFps Hook の作成

**ステータス**: ✅ 完了

**内容**:

- WebSocket メッセージの受信頻度からセンサーの FPS を計測
- `lastMessage` が更新されるたびにカウント
- 1秒ごとにメッセージ受信数をカウントして FPS を算出
- useRef でカウンターと時刻を保持

**ファイル**: `src/renderer/src/hooks/useControllerFps.ts`

**実装内容**:

```typescript
import { useEffect, useState, useRef } from 'react'
import type { WsMessage } from '../../../lib/types/websocket'

export function useControllerFps(lastMessage: WsMessage | null): number {
  const [fps, setFps] = useState(0)
  const messageCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  useEffect(() => {
    if (!lastMessage) return

    // メッセージを受信するたびにカウント
    messageCountRef.current++

    const currentTime = performance.now()
    const elapsed = currentTime - lastTimeRef.current

    // 1秒ごとに FPS を計算
    if (elapsed >= 1000) {
      setFps(Math.round((messageCountRef.current * 1000) / elapsed))
      messageCountRef.current = 0
      lastTimeRef.current = currentTime
    }
  }, [lastMessage])

  return fps
}
```

### 3. DebugOverlay コンポーネントの更新

**ステータス**: ✅ 完了

**内容**:

- 作成した2つの Hook をインポート
- 既存の FPS 計測ロジックを useAnimationFps に置き換え
- useControllerFps を追加
- 2種類の FPS を表示

**ファイル**: `src/renderer/src/components/DebugOverlay.tsx`

**変更内容**:

```typescript
// インポート追加
import { useAnimationFps } from '../hooks/useAnimationFps'
import { useControllerFps } from '../hooks/useControllerFps'

// Hook 使用
const animationFps = useAnimationFps()
const controllerFps = useControllerFps(lastMessage)

// 既存の FPS 計測ロジック（useEffect）を削除

// JSX 更新
<div className="fps-display">
  <span className="fps-label">Animation FPS:</span>
  <span className="fps-value">{animationFps}</span>
</div>
<div className="fps-display">
  <span className="fps-label">Controller FPS:</span>
  <span className="fps-value">{controllerFps}</span>
</div>
```

## 成果物

### 新規作成されたファイル

1. `src/renderer/src/hooks/useAnimationFps.ts`
   - Electron の描画 FPS を計測する Hook

2. `src/renderer/src/hooks/useControllerFps.ts`
   - WebSocket メッセージの受信頻度を計測する Hook

### 変更されたファイル

1. `src/renderer/src/components/DebugOverlay.tsx`
   - 2つの Hook をインポート
   - 既存の FPS 計測ロジックを削除
   - 2種類の FPS を表示

## 技術的な詳細

### Animation FPS の計測方法

- `requestAnimationFrame` を使用
- ブラウザの描画サイクルに同期してフレームをカウント
- 1秒間のフレーム数を FPS として算出
- 通常は 60 FPS が理想的（ディスプレイのリフレッシュレートに依存）

### Controller FPS の計測方法

- `useEffect` の依存配列に `lastMessage` を指定
- メッセージを受信するたびにカウンターをインクリメント
- 1秒間のメッセージ受信数を FPS として算出
- センサーのサンプリングレートを反映

### useRef を使う理由

- `useControllerFps` では `messageCountRef` と `lastTimeRef` を useRef で管理
- これにより、値を更新しても再レンダリングが発生しない
- パフォーマンスの最適化とカウンターの正確性を両立

## 確認項目

- [x] useAnimationFps Hook が作成され、正しく動作する
- [x] useControllerFps Hook が作成され、正しく動作する
- [x] DebugOverlay に2種類の FPS が表示される
- [x] Animation FPS が約 60 FPS で表示される（正常な描画時）
- [x] Controller FPS が WebSocket メッセージの受信頻度を正しく反映する
- [x] 既存の FPS 計測ロジックが削除されている

## 期待される動作

### 正常時

- **Animation FPS**: 約 60 FPS（ディスプレイのリフレッシュレートに依存）
- **Controller FPS**: センサーのサンプリングレート（例: 30〜60 FPS）

### 異常時の診断

1. **Animation FPS が低い（30 FPS 以下）**
   - Electron の描画パフォーマンスに問題がある
   - CPU/GPU の負荷が高い

2. **Controller FPS が低い（期待値より低い）**
   - WebSocket の接続が不安定
   - サーバー側のパフォーマンスに問題がある
   - ネットワークの遅延が大きい

3. **Controller FPS が 0**
   - WebSocket が接続されていない
   - メッセージを受信していない

## 備考

- 2種類の FPS を分けて計測することで、パフォーマンスのボトルネックを特定しやすくなる
- Animation FPS が高くても Controller FPS が低い場合、センサーやサーバー側に問題がある
- 両方の FPS が低い場合、Electron 全体のパフォーマンスに問題がある
