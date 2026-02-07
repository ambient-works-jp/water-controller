# HomeworksContent - Liquid Glass Effect 技術解説

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [ファイル構成](#ファイル構成)
3. [シェーダーの基礎知識（初心者向け）](#シェーダーの基礎知識初心者向け)
4. [Three.js と WebGL の基礎知識](#threejs-と-webgl-の基礎知識)
5. [実装の詳細解説](#実装の詳細解説)
6. [波紋効果の仕組み](#波紋効果の仕組み)
7. [パラメータ調整ガイド](#パラメータ調整ガイド)
8. [トラブルシューティング](#トラブルシューティング)

---

## プロジェクト概要

このプロジェクトは、**Apple の Liquid Glass UI** にインスパイアされた、WebGL ベースの視覚効果を実装したものです。

### 主な機能

- **波紋エフェクト**: カーソルが通った軌跡から波紋が広がり、時間経過で減衰
- **リアルな屈折**: 水面や液体ガラス越しに見ているような歪み効果
- **色収差 (Chromatic Aberration)**: レンズを通した光のような RGB 分離効果
- **物理シミュレーション**: 慣性・減衰・復元力を持つ滑らかなカーソル移動

---

## ファイル構成

```
HomeworksContent/
├── index.tsx                    # エントリーポイント
├── LiquidGlassScene.tsx         # Three.js Canvas のセットアップ
├── LiquidGlassEffect.tsx        # メインロジック（物理演算 + シェーダー制御）
└── shaders/
    ├── liquidGlass.vert.glsl    # 頂点シェーダー
    └── liquidGlass.frag.glsl    # フラグメントシェーダー（波紋効果の本体）
```

### 各ファイルの役割

| ファイル                | 役割                                                             |
| ----------------------- | ---------------------------------------------------------------- |
| `index.tsx`             | 単純なラッパー。コンポーネントを外部に公開                       |
| `LiquidGlassScene.tsx`  | React Three Fiber の Canvas を設定（カメラ、レンダラー設定など） |
| `LiquidGlassEffect.tsx` | 物理演算、カーソル軌跡の記録、シェーダーへのデータ送信           |
| `liquidGlass.vert.glsl` | 頂点シェーダー（UV 座標を渡すだけのシンプルなもの）              |
| `liquidGlass.frag.glsl` | フラグメントシェーダー（波紋計算、歪み、色収差を実装）           |

---

## シェーダーの基礎知識（初心者向け）

### GPU と CPU の違い

**CPU (Central Processing Unit)**

- パソコンの「司令塔」
- 複雑な計算を順番に処理するのが得意
- 例：文書作成、プログラム実行

**GPU (Graphics Processing Unit)**

- グラフィックス専用の高速プロセッサ
- **大量の単純な計算を同時に並列処理**するのが得意
- 例：画面の100万ピクセルを一度に計算

### シェーダーとは何か？

**シェーダー (Shader)** は、**GPU 上で実行される小さなプログラム**です。

#### なぜシェーダーが必要？

例えば、フルHD (1920×1080) の画面には **207万ピクセル**があります。

```
通常のJavaScript（CPU）で処理する場合:
for (let y = 0; y < 1080; y++) {
  for (let x = 0; x < 1920; x++) {
    calculatePixelColor(x, y)  // 207万回ループ！遅い！
  }
}

シェーダー（GPU）で処理する場合:
全ピクセルを同時に並列計算 → 超高速！
```

#### シェーダーの魔法：並列処理

```
CPU: ■ → ■ → ■ → ■ → ... (順番に処理)

GPU: ■■■■■■■■■■■■■■■ (全部同時に処理)
     ■■■■■■■■■■■■■■■
     ■■■■■■■■■■■■■■■
```

### シェーダーの2つの種類

#### 1. 頂点シェーダー (Vertex Shader)

**役割**: 3D オブジェクトの「頂点（角）」の位置を計算

```
    頂点        頂点
     ●----------●
     |          |
     |  四角形  |
     |          |
     ●----------●
    頂点        頂点
```

**今回の実装では**: 単純にフルスクリーンの四角形（Quad）を描画するだけ

```glsl
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  // → 「この頂点は画面のこの位置に表示してね」と GPU に伝える
}
```

#### 2. フラグメントシェーダー (Fragment Shader / Pixel Shader)

**役割**: 画面上の**各ピクセル**の色を計算

```
画面全体
┌─────────────┐
│ ● ● ● ● ● ●│  ← 各ピクセルで
│ ● ● ● ● ● ●│     フラグメントシェーダーが
│ ● ● ● ● ● ●│     同時に実行される
│ ● ● ● ● ● ●│
└─────────────┘
```

**今回の実装では**: 波紋効果、歪み、色収差を計算

```glsl
void main() {
  vec2 uv = vUv;  // このピクセルの座標
  vec3 color = calculateRippleEffect(uv);  // 波紋を計算
  gl_FragColor = vec4(color, 1.0);  // 最終的な色を出力
}
```

### GLSL の基本構文

**GLSL (OpenGL Shading Language)** は、シェーダーを書くための言語です。C 言語に似ています。

#### データ型

```glsl
float a = 1.0;           // 浮動小数点数（実数）
int b = 5;               // 整数
bool c = true;           // 真偽値

vec2 pos = vec2(0.5, 0.5);         // 2D ベクトル（x, y）
vec3 color = vec3(1.0, 0.0, 0.0);  // 3D ベクトル（r, g, b）
vec4 rgba = vec4(1.0, 0.0, 0.0, 1.0);  // 4D ベクトル（r, g, b, a）
```

#### ベクトルのアクセス方法

```glsl
vec3 color = vec3(1.0, 0.5, 0.0);

// 色成分としてアクセス
float red = color.r;    // 1.0
float green = color.g;  // 0.5
float blue = color.b;   // 0.0

// 座標成分としてアクセス（同じデータ）
float x = color.x;  // 1.0
float y = color.y;  // 0.5
float z = color.z;  // 0.0

// Swizzling（要素の組み合わせ）
vec2 rg = color.rg;      // vec2(1.0, 0.5)
vec3 bgr = color.bgr;    // vec3(0.0, 0.5, 1.0) ← 逆順！
```

#### 組み込み関数

```glsl
// 数学関数
float a = sin(1.0);           // サイン
float b = cos(1.0);           // コサイン
float c = sqrt(4.0);          // 平方根 → 2.0
float d = pow(2.0, 3.0);      // べき乗 → 8.0
float e = abs(-5.0);          // 絶対値 → 5.0
float f = min(3.0, 5.0);      // 最小値 → 3.0
float g = max(3.0, 5.0);      // 最大値 → 5.0

// ベクトル関数
vec2 v = vec2(3.0, 4.0);
float len = length(v);        // ベクトルの長さ → 5.0
float dist = distance(v1, v2);  // 2点間の距離
vec2 norm = normalize(v);     // 単位ベクトル化（長さ1にする）

// 補間関数
float m = mix(0.0, 10.0, 0.5);  // 線形補間 → 5.0
float s = smoothstep(0.0, 1.0, 0.5);  // 滑らかな補間
float c = clamp(x, 0.0, 1.0);   // 値を範囲内に制限
```

### UV 座標とは？

**UV 座標**は、テクスチャ（画像）上の位置を表す座標系です。

```
(0, 0) ─────────── (1, 0)
  │                  │
  │                  │
  │    テクスチャ    │
  │                  │
  │                  │
(0, 1) ─────────── (1, 1)
```

- **U**: 横方向（X）の位置。0（左端）〜 1（右端）
- **V**: 縦方向（Y）の位置。0（上端）〜 1（下端）

**重要**: 画面サイズが変わっても、UV 座標は常に 0〜1 の範囲

```glsl
void main() {
  vec2 uv = vUv;  // 現在のピクセルの UV 座標

  // 左上のピクセル → uv = (0.0, 0.0)
  // 右下のピクセル → uv = (1.0, 1.0)
  // 中央のピクセル → uv = (0.5, 0.5)

  vec3 color = texture2D(uTexture, uv).rgb;  // UV 座標でテクスチャから色を取得
}
```

### テクスチャサンプリング

**テクスチャサンプリング**は、画像から特定の位置の色を取得する処理です。

```glsl
uniform sampler2D uTexture;  // 画像データ

void main() {
  vec2 uv = vUv;

  // 通常のサンプリング
  vec4 color = texture2D(uTexture, uv);

  // RGB成分だけを取得
  vec3 rgb = texture2D(uTexture, uv).rgb;

  // 赤チャンネルだけを取得
  float red = texture2D(uTexture, uv).r;
}
```

#### UV をずらして歪み効果

```glsl
void main() {
  vec2 uv = vUv;

  // UV座標を少しずらす
  vec2 distortion = vec2(0.01, 0.02);
  vec2 distortedUv = uv + distortion;

  // ずれた位置から色を取得 → 画像が歪む！
  vec3 color = texture2D(uTexture, distortedUv).rgb;

  gl_FragColor = vec4(color, 1.0);
}
```

### Uniform, Varying, Attribute の違い

#### Uniform（ユニフォーム）

JavaScript から GPU に送るデータ。**全ピクセルで同じ値**。

```glsl
uniform float uTime;        // 時間（全ピクセルで同じ時刻）
uniform vec2 uResolution;   // 画面解像度（全ピクセルで同じ）
uniform sampler2D uTexture; // 画像データ
```

#### Varying（ヴェアリング）

頂点シェーダーからフラグメントシェーダーに渡すデータ。**ピクセルごとに異なる値**（補間される）。

```glsl
// 頂点シェーダー
varying vec2 vUv;
void main() {
  vUv = uv;  // UV座標を渡す
}

// フラグメントシェーダー
varying vec2 vUv;
void main() {
  vec3 color = texture2D(uTexture, vUv).rgb;  // 受け取ったUV座標を使う
}
```

#### Attribute（アトリビュート）

頂点ごとのデータ。**頂点シェーダーでのみ使用**。

```glsl
attribute vec3 position;  // 頂点の位置
attribute vec2 uv;        // 頂点のUV座標
attribute vec3 normal;    // 頂点の法線
```

### シェーダーの実行順序

```
1. JavaScript (CPU)
   ↓ Uniform データを送信
   ↓

2. 頂点シェーダー (GPU)
   - 各頂点の位置を計算
   - Varying 変数を設定
   ↓

3. ラスタライゼーション（GPU が自動で行う）
   - 頂点間を補間してピクセルを生成
   - Varying 変数も補間される
   ↓

4. フラグメントシェーダー (GPU)
   - 各ピクセルの色を計算（並列実行）
   - gl_FragColor に色を出力
   ↓

5. 画面に表示
```

### シェーダーでできること、できないこと

#### できること ✅

- 各ピクセルの色を計算
- UV 座標を変形して歪み効果
- 数学的な計算（三角関数、ノイズなど）
- テクスチャサンプリング
- **超高速な並列処理**

#### できないこと ❌

- 他のピクセルの計算結果を参照（基本的に独立）
- ランダムアクセス（配列の任意の要素を読むのは遅い）
- JavaScript の関数を呼ぶ
- DOM 操作
- **ファイル入出力**

### 簡単な例：グラデーション

```glsl
void main() {
  vec2 uv = vUv;  // UV座標（0〜1）

  // 左から右へのグラデーション
  float gradient = uv.x;  // 0（左）〜 1（右）

  // 赤から青へのグラデーション
  vec3 colorLeft = vec3(1.0, 0.0, 0.0);   // 赤
  vec3 colorRight = vec3(0.0, 0.0, 1.0);  // 青
  vec3 color = mix(colorLeft, colorRight, gradient);

  gl_FragColor = vec4(color, 1.0);
}
```

### 今回のプロジェクトでの応用

1. **UV 座標の変形（歪み）**

   ```glsl
   vec2 distortion = calculateRipple(uv);  // 波紋を計算
   vec2 distortedUv = uv + distortion;     // UV をずらす
   vec3 color = texture2D(uTexture, distortedUv).rgb;  // ずれた位置から色を取得
   ```

2. **色収差（RGB をずらす）**

   ```glsl
   float r = texture2D(uTexture, uv + offset).r;   // 赤をずらす
   float g = texture2D(uTexture, uv).g;            // 緑はそのまま
   float b = texture2D(uTexture, uv - offset).b;   // 青を逆方向にずらす
   vec3 color = vec3(r, g, b);
   ```

3. **時間アニメーション**

   ```glsl
   uniform float uTime;  // JavaScript から送られてくる経過時間

   void main() {
     float wave = sin(uTime * 2.0);  // 時間で変化する波
     vec2 distortion = vec2(wave * 0.01, 0.0);
     vec3 color = texture2D(uTexture, vUv + distortion).rgb;
     gl_FragColor = vec4(color, 1.0);
   }
   ```

---

## Three.js と WebGL の基礎知識

### Three.js とは？

**Three.js** は WebGL を簡単に扱うための JavaScript ライブラリです。WebGL は GPU を使って高速に 3D グラフィックスを描画する技術です。

### React Three Fiber とは？

React で Three.js を扱いやすくするライブラリです。React のコンポーネントとして 3D シーンを記述できます。

```tsx
<Canvas>
  <mesh>
    <planeGeometry />
    <shaderMaterial />
  </mesh>
</Canvas>
```

### シェーダーとは？

**シェーダー (Shader)** は GPU 上で実行される小さなプログラムです。画面上の各ピクセルの色を計算します。

#### 2 種類のシェーダー

1. **頂点シェーダー (Vertex Shader)**
   - 3D オブジェクトの頂点（角）の位置を計算
   - 今回はシンプルに UV 座標を渡すだけ

2. **フラグメントシェーダー (Fragment Shader)**
   - 画面上の各ピクセルの色を計算
   - 今回の波紋効果や歪みはここで実装

### シェーダーの言語：GLSL

**GLSL (OpenGL Shading Language)** は、シェーダーを記述するための C 言語風の言語です。

```glsl
void main() {
  vec2 uv = vUv;  // UV座標（0-1の範囲）
  vec3 color = texture2D(uTexture, uv).rgb;  // テクスチャから色を取得
  gl_FragColor = vec4(color, 1.0);  // 最終的な色を出力
}
```

---

## 実装の詳細解説

### 1. LiquidGlassScene.tsx - Canvas のセットアップ

```tsx
<Canvas
  gl={{
    antialias: true,              // アンチエイリアス（ギザギザを滑らかに）
    alpha: false,                 // 背景を透明にしない
    powerPreference: 'high-performance',  // GPU パフォーマンス優先
    preserveDrawingBuffer: false  // スクリーンショット不要（パフォーマンス優先）
  }}
  camera={{ position: [0, 0, 1], fov: 75 }}  // カメラ位置と視野角
  dpr={Math.min(window.devicePixelRatio, 2)} // デバイスピクセル比（最大2倍）
>
```

**重要ポイント**:

- `dpr`: Retina ディスプレイなどの高解像度画面で、ピクセル比を制限してパフォーマンス確保
- `powerPreference: 'high-performance'`: GPU を全力で使う設定

---

### 2. LiquidGlassEffect.tsx - 物理演算とシェーダー制御

このファイルが最も複雑で、以下の処理を行います：

#### 2.1 物理シミュレーション定数

```tsx
const PHYSICS_PARAMS = {
  BASE_SPEED: 0.01, // カーソルの基本移動速度
  FORCE_MULTIPLIER: 0.8, // 入力力の倍率
  RESTORE_FORCE: 0.03, // 中央に戻ろうとする力
  DAMPING: 0.92, // 減衰係数（空気抵抗のようなもの）
  MAX_VIEWPORT_RATIO: 0.4 // 画面の40%まで移動可能
}
```

#### 2.2 波紋パラメータ

```tsx
const RIPPLE_PARAMS = {
  MAX_TRAIL_POINTS: 32, // 記録する軌跡点の最大数
  TRAIL_INTERVAL: 0.03, // 軌跡点を追加する時間間隔（秒）
  RIPPLE_LIFETIME: 2.0, // 波紋の寿命（2秒で消える）
  RIPPLE_SPEED: 0.8, // 波紋が広がる速度
  MIN_DISTANCE: 0.02 // 軌跡点を追加する最小移動距離
}
```

#### 2.3 カーソル軌跡の記録

```tsx
interface TrailPoint {
  x: number // 正規化座標 [0-1]
  y: number // 正規化座標 [0-1]
  time: number // 生成時刻
}

const trailPoints: TrailPoint[] = []
```

**正規化座標とは？**

- 画面の左上が `(0, 0)`、右下が `(1, 1)` となる座標系
- 画面サイズに依存しないため、シェーダーで扱いやすい

#### 2.4 Uniforms（シェーダーへの入力データ）

```tsx
uniforms: {
  uTexture: { value: backgroundTexture },           // 背景画像
  uCursorPosition: { value: new THREE.Vector2() },  // カーソル位置
  uResolution: { value: new THREE.Vector2() },      // 画面解像度
  uTime: { value: 0 },                              // 経過時間
  uRefractionStrength: { value: 0.015 },            // 屈折の強度
  uChromaticAberration: { value: 0.001 },           // 色収差の強度
  uTrailPoints: { value: trailData },               // 軌跡点の配列
  uTrailCount: { value: 0 },                        // 有効な軌跡点の数
  uRippleLifetime: { value: 2.0 },                  // 波紋の寿命
  uRippleSpeed: { value: 0.8 }                      // 波紋の速度
}
```

**Uniforms とは？**

- JavaScript から GPU (シェーダー) にデータを送る仕組み
- 全ピクセルで同じ値を使う（例：時間、カーソル位置）

#### 2.5 毎フレームの処理 (`useFrame`)

```tsx
useFrame((state, delta) => {
  // 1. 物理演算でカーソル位置を更新
  // 2. 軌跡点を記録
  // 3. 古い軌跡点を削除
  // 4. シェーダーにデータを送信
})
```

**処理の流れ**:

1. **物理演算**

   ```tsx
   // 入力から力を計算
   const rightForce = right * PHYSICS_PARAMS.BASE_SPEED

   // 速度に加算（加速度）
   pointerState.velocityX += rightForce * PHYSICS_PARAMS.FORCE_MULTIPLIER * timeScale

   // 中央への復元力
   pointerState.velocityX -= pointerState.x * PHYSICS_PARAMS.RESTORE_FORCE * timeScale

   // 減衰（空気抵抗）
   pointerState.velocityX *= dampingFactor

   // 位置更新
   pointerState.x += pointerState.velocityX * timeScale
   ```

2. **軌跡点の記録**

   ```tsx
   // 一定時間経過 or 一定距離移動したら軌跡点を追加
   if (shouldAddTrail) {
     trailPoints.push({ x: normalizedX, y: normalizedY, time: currentTime })
   }

   // 古い軌跡点を削除（2秒以上前のもの）
   while (currentTime - trailPoints[0].time > RIPPLE_PARAMS.RIPPLE_LIFETIME) {
     trailPoints.shift()
   }
   ```

3. **シェーダーへのデータ転送**
   ```tsx
   // Float32Array に軌跡点をパック
   for (let i = 0; i < MAX_TRAIL_POINTS; i++) {
     if (i < trailPoints.length) {
       trailData[i * 4 + 0] = point.x
       trailData[i * 4 + 1] = point.y
       trailData[i * 4 + 2] = point.time
     }
   }
   ```

---

### 3. liquidGlass.vert.glsl - 頂点シェーダー

```glsl
varying vec2 vUv;

void main() {
  vUv = uv;  // UV座標をフラグメントシェーダーに渡す
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

**解説**:

- `uv`: Three.js が自動で渡してくれる UV 座標（0-1 の範囲）
- `vUv`: `varying` 変数。フラグメントシェーダーに渡す
- `gl_Position`: 最終的な頂点位置（画面上の位置）

**頂点シェーダーの役割**:

- 今回はフルスクリーンの平面（quad）なので、単純に UV 座標を渡すだけ
- 複雑な 3D 変形などは行わない

---

### 4. liquidGlass.frag.glsl - フラグメントシェーダー（本体）

このファイルが波紋効果の心臓部です。

#### 4.1 Uniforms の宣言

```glsl
uniform sampler2D uTexture;          // 背景画像
uniform vec2 uCursorPosition;        // カーソル位置 [0-1]
uniform vec2 uResolution;            // 画面解像度（ピクセル）
uniform float uTime;                 // 経過時間（秒）
uniform float uRefractionStrength;   // 屈折の強度
uniform float uChromaticAberration;  // 色収差の強度

// 波紋効果用
uniform vec4 uTrailPoints[32];       // 軌跡点の配列（xyz=位置と時刻）
uniform int uTrailCount;             // 有効な軌跡点の数
uniform float uRippleLifetime;       // 波紋の寿命
uniform float uRippleSpeed;          // 波紋の速度

varying vec2 vUv;                    // UV座標（頂点シェーダーから受け取る）
```

#### 4.2 Simplex Noise（ノイズ関数）

```glsl
float snoise(vec2 v) {
  // Simplex Noiseの実装（約30行）
  // ランダムなようで滑らかな値を生成
}

float fbm(vec2 p) {
  // Fractal Brownian Motion
  // 複数のオクターブのノイズを重ねて、より自然な揺らぎを作る
  float value = 0.0;
  for (int i = 0; i < 4; i++) {
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;  // 周波数を2倍に
    amplitude *= 0.5;  // 振幅を半分に
  }
}
```

**Simplex Noise とは？**

- ランダムだけど滑らかな値を生成する関数
- 液体の揺らぎや、自然なアニメーションに使う
- Perlin Noise の改良版

**FBM (Fractal Brownian Motion) とは？**

- 複数の周波数のノイズを重ねる技術
- 細かいディテールと大きな変化を同時に表現できる

#### 4.3 メイン処理の流れ

```glsl
void main() {
  // 1. アスペクト比補正
  vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);

  // 2. 全軌跡点からの波紋を計算
  vec2 totalDistortion = vec2(0.0);
  float totalInfluence = 0.0;

  for (int i = 0; i < 32; i++) {
    // 各軌跡点について...
  }

  // 3. 歪みを適用してテクスチャをサンプリング
  vec2 distortedUv = vUv + totalDistortion;

  // 4. 色収差効果（RGB を少しずつずらす）
  float r = texture2D(uTexture, distortedUv + aberrationDir).r;
  float g = texture2D(uTexture, distortedUv + aberrationDir * 0.5).g;
  float b = texture2D(uTexture, distortedUv - aberrationDir * 0.5).b;

  // 5. 最終的な色を出力
  gl_FragColor = vec4(color, 1.0);
}
```

---

## 波紋効果の仕組み

### ステップ 1: 軌跡点からの距離を計算

```glsl
vec2 trailPos = trailData.xy;       // 軌跡点の位置
vec2 toPoint = (vUv - trailPos) * aspectRatio;  // 現在のピクセルから軌跡点へのベクトル
float dist = length(toPoint);       // 距離
```

**アスペクト比補正の必要性**:

- 画面が横長の場合、横方向の距離が実際より長く見える
- `aspectRatio` をかけることで、円形の波紋を正しく描画

### ステップ 2: 波紋の半径を計算

```glsl
float elapsed = uTime - trailTime;  // 軌跡点が生成されてからの経過時間
float rippleRadius = elapsed * uRippleSpeed;  // 波紋の半径（時間とともに拡大）
```

**例**:

- `elapsed = 0.5 秒`, `uRippleSpeed = 0.8`
- → `rippleRadius = 0.4`（画面の40%の半径）

### ステップ 3: 波の影響を計算（ガウス分布）

```glsl
float waveWidth = 0.15;  // 波の幅

// 波紋の中心からのズレ
float distanceFromWave = abs(dist - rippleRadius);

// ガウス分布で影響を計算（波紋の中心で最大、離れると減少）
float waveInfluence = exp(-distanceFromWave * distanceFromWave / (waveWidth * waveWidth));
```

**ガウス分布のグラフ**:

```
影響
 ^
1|    ___
 |  /     \
 | /       \
0|_|_________|___> 波紋からの距離
    中心
```

### ステップ 4: 時間減衰

```glsl
float decay = 1.0 - (elapsed / uRippleLifetime);
decay = decay * decay;  // 2乗で急激に減衰
waveInfluence *= decay;
```

**減衰カーブ**:

```
影響
 ^
1|___
 |   \__
 |      \___
0|__________\__> 時間
  0s       2s
```

### ステップ 5: 歪みベクトルを計算

```glsl
vec2 waveDirection = normalize(toPoint);  // 波紋の外向き方向
float radialDistortion = waveInfluence * 0.3;  // 歪みの大きさ

// ノイズによる揺らぎを追加
vec2 noise = vec2(fbm(noiseCoord), fbm(noiseCoord + vec2(100.0, 50.0)));

// 歪みを合成
totalDistortion += (waveDirection * radialDistortion + noise * 0.02) * uRefractionStrength;
```

**歪みの方向**:

- 波紋の中心から外側に向かって歪む
- ノイズで自然な揺らぎを追加

### ステップ 6: 色収差

```glsl
float aberrationAmount = uChromaticAberration * totalInfluence;
vec2 aberrationDir = normalize(totalDistortion) * aberrationAmount;

float r = texture2D(uTexture, distortedUv + aberrationDir * 1.0).r;
float g = texture2D(uTexture, distortedUv + aberrationDir * 0.5).g;
float b = texture2D(uTexture, distortedUv - aberrationDir * 0.5).b;
```

**色収差とは？**

- レンズを通した光が、色（波長）ごとに屈折率が異なる現象
- R（赤）を最も外側、B（青）を最も内側にずらすことで再現

---

## パラメータ調整ガイド

### 物理パラメータ (`PHYSICS_PARAMS`)

| パラメータ           | 現在値 | 効果                   | 調整のヒント                         |
| -------------------- | ------ | ---------------------- | ------------------------------------ |
| `BASE_SPEED`         | 0.01   | カーソルの基本移動速度 | 小さくすると遅く、大きくすると速く   |
| `FORCE_MULTIPLIER`   | 0.8    | 入力力の倍率           | 小さくすると鈍く、大きくすると敏感に |
| `RESTORE_FORCE`      | 0.03   | 中央への復元力         | 大きくすると中央に戻りやすい         |
| `DAMPING`            | 0.92   | 減衰係数               | 1 に近いほど慣性が残る（滑りやすい） |
| `MAX_VIEWPORT_RATIO` | 0.4    | 最大移動距離           | 0.5 なら画面の半分まで移動可能       |

### 波紋パラメータ (`RIPPLE_PARAMS`)

| パラメータ         | 現在値  | 効果                   | 調整のヒント                                   |
| ------------------ | ------- | ---------------------- | ---------------------------------------------- |
| `MAX_TRAIL_POINTS` | 32      | 記録する軌跡点の最大数 | 多いほど長い軌跡を記録（パフォーマンス影響大） |
| `TRAIL_INTERVAL`   | 0.03 秒 | 軌跡点の追加間隔       | 小さいほど密に記録（波紋が多くなる）           |
| `RIPPLE_LIFETIME`  | 2.0 秒  | 波紋の寿命             | 長いほど波紋が長く残る                         |
| `RIPPLE_SPEED`     | 0.8     | 波紋の拡散速度         | 大きいほど速く広がる                           |
| `MIN_DISTANCE`     | 0.02    | 軌跡点追加の最小距離   | 小さいほど密に記録                             |

### シェーダーパラメータ（Uniforms）

| パラメータ             | 現在値 | 効果         | 調整のヒント            |
| ---------------------- | ------ | ------------ | ----------------------- |
| `uRefractionStrength`  | 0.015  | 屈折の強度   | 大きいほど歪みが強い    |
| `uChromaticAberration` | 0.001  | 色収差の強度 | 大きいほど RGB がずれる |

### シェーダー内部のマジックナンバー

#### `liquidGlass.frag.glsl` の調整可能なパラメータ

```glsl
float waveWidth = 0.15;  // 波の幅（大きいほど波が太い）

float radialDistortion = waveInfluence * 0.3;  // 歪みの基本倍率

vec2 noise = vec2(...) * 0.02;  // ノイズの強度（揺らぎの大きさ）

float brightness = 1.03;  // 明度（1.0より大きいと明るく）
float saturation = 1.1;   // 彩度（1.0より大きいと鮮やか）
```

---

## トラブルシューティング

### 波紋が見えない

**原因**:

- `uRefractionStrength` が小さすぎる
- `uTrailCount` が 0（軌跡が記録されていない）

**解決策**:

```tsx
uRefractionStrength: {
  value: 0.05
} // 値を大きくする
```

### 波紋が強すぎる

**原因**:

- `uRefractionStrength` が大きすぎる
- `radialDistortion` の倍率が高い

**解決策**:

```tsx
uRefractionStrength: {
  value: 0.01
} // 値を小さくする
```

### 色収差が強すぎる

**原因**:

- `uChromaticAberration` が大きすぎる

**解決策**:

```tsx
uChromaticAberration: {
  value: 0.0005
} // 値を小さくする
```

### カーソルが飛び飛びになる

**原因**:

- フレームレートが低い
- `BASE_SPEED` が大きすぎる

**解決策**:

```tsx
BASE_SPEED: 0.005 // さらに遅くする
```

### パフォーマンスが悪い

**原因**:

- `MAX_TRAIL_POINTS` が多すぎる
- `dpr`（デバイスピクセル比）が高すぎる

**解決策**:

```tsx
MAX_TRAIL_POINTS: 16  // 軌跡点を減らす
dpr={1}  // ピクセル比を1倍に固定
```

### 波紋が残りすぎる

**原因**:

- `RIPPLE_LIFETIME` が長すぎる

**解決策**:

```tsx
RIPPLE_LIFETIME: 1.0 // 1秒で消えるように
```

---

## まとめ

### 実装の核心

1. **JavaScript 側 (LiquidGlassEffect.tsx)**
   - 物理演算でカーソルを滑らかに動かす
   - 軌跡点を記録して GPU に送信
   - 毎フレーム更新

2. **GPU 側 (liquidGlass.frag.glsl)**
   - 各軌跡点から波紋を計算
   - 時間経過で拡大 + 減衰
   - 全波紋を合成して歪みを生成
   - 色収差で RGB をずらす

### キーテクニック

- **ガウス分布**: 波紋の形状を自然に
- **FBM ノイズ**: 液体の揺らぎを表現
- **時間減衰**: 波紋が徐々に消える
- **正規化座標**: 画面サイズに依存しない計算

### 学習リソース

- [Three.js 公式ドキュメント](https://threejs.org/docs/)
- [React Three Fiber ドキュメント](https://docs.pmnd.rs/react-three-fiber)
- [The Book of Shaders](https://thebookofshaders.com/)（シェーダー学習の名著）
- [Shadertoy](https://www.shadertoy.com/)（シェーダーのサンプル集）

---

**作成日**: 2026-02-08
**技術スタック**: React, Three.js, React Three Fiber, WebGL, GLSL
