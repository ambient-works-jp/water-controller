# タスク 01: 動画の完全なループ接続

## ステータス

- **優先度**: 低
- **担当**: ユーザー側（動画編集作業）
- **作成日**: 2026-02-09

## 概要

現在、動画のループ再生時にフェードアウト・フェードイン（暗転）を使って滑らかに繋いでいるが、これを完全に視覚的にシームレスなループにしたい。

### 現在の動画内容

- 立方体が回転する
- パーティクルに分解される
- 最後に立方体に戻る（水の三態変化のような演出）

## 現状の実装

### フェード効果

- **フェードイン**: 動画開始から 1.5 秒間（`VIDEO_FADE_PARAMS.FADE_DURATION`）
- **フェードアウト**: 終端 2.0 秒前から開始（`VIDEO_FADE_PARAMS.FADE_START_BEFORE_END`）
- **実装場所**: `src/renderer/src/components/HomeworksContent/LiquidGlassVideoEffect.tsx:243-271`
- **パラメータ定義**: `src/renderer/src/constants.ts:13-16`

### フェード実装コード

```typescript
// フェード効果の計算（smoothstep でイージング）
if (videoElement && videoElement.duration > 0) {
  const videoDuration = videoElement.duration
  const videoCurrentTime = videoElement.currentTime

  let opacity = 1.0

  // smoothstep関数（より自然な曲線）
  const smoothstep = (edge0: number, edge1: number, x: number): number => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  }

  // フェードアウト（終端の2.0秒前から）
  const timeUntilEnd = videoDuration - videoCurrentTime
  if (timeUntilEnd <= VIDEO_FADE_PARAMS.FADE_START_BEFORE_END) {
    const fadeProgress = timeUntilEnd / VIDEO_FADE_PARAMS.FADE_START_BEFORE_END
    opacity = smoothstep(0, 1, fadeProgress)
  }
  // フェードイン（最初の1.5秒）
  else if (videoCurrentTime <= VIDEO_FADE_PARAMS.FADE_DURATION) {
    const fadeProgress = videoCurrentTime / VIDEO_FADE_PARAMS.FADE_DURATION
    opacity = smoothstep(0, 1, fadeProgress)
  }

  material.uniforms.uOpacity.value = opacity
}
```

## 目標

### 理想的な動作

- 常に動画が再生されている状態（暗転なし）
- 動画の最初と最後が視覚的に完全に繋がる
- 立体の角度が一致するフレームでループポイントを作る

### 実現方法

1. **動画編集側の作業**:
   - 最後のフレームと最初のフレームで立体の角度・位置が一致するように編集
   - 可能であれば、途中の適切なフレームでループポイントを設定

2. **コード側の対応**:
   - フェード効果を完全に削除
   - または、フェードパラメータを 0 に設定

## フェード削除の方法

### 方法 1: パラメータを 0 に設定（推奨）

```typescript
// src/renderer/src/constants.ts
export const VIDEO_FADE_PARAMS = {
  FADE_DURATION: 0, // 0 に設定
  FADE_START_BEFORE_END: 0 // 0 に設定
} as const
```

### 方法 2: フェードロジックをコメントアウト

```typescript
// LiquidGlassVideoEffect.tsx の useFrame 内
// フェード計算部分（243-271行目）を全てコメントアウト
```

### 方法 3: 透明度を無効化

```typescript
// material 定義時
return new THREE.ShaderMaterial({
  // ...
  transparent: false, // false に変更
  uniforms: {
    // ...
    uOpacity: { value: 1.0 } // 常に 1.0 のまま
  }
})
```

## 関連ファイル

- `src/renderer/src/constants.ts:13-16` - フェードパラメータ定義
- `src/renderer/src/components/HomeworksContent/LiquidGlassVideoEffect.tsx:243-271` - フェードロジック実装
- `src/renderer/src/components/HomeworksContent/shaders/liquidGlass.frag.glsl:18,155` - シェーダー側の opacity 適用
- `src/renderer/src/assets/background-movie-1080p.mp4` - 現在の背景動画

## 次のステップ

1. 動画編集ソフトで最初と最後のフレームを確認
2. ループポイントとなる適切なフレームを見つける
3. 必要に応じて動画を再編集
4. コード側でフェード効果を削除
5. 実機でループの滑らかさを確認
