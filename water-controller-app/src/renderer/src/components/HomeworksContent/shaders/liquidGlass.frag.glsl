// Liquid Glass Fragment Shader
// 波紋ベースの歪み効果

uniform sampler2D uTexture;
uniform vec2 uCursorPosition; // 正規化座標 [0-1]
uniform vec2 uResolution;
uniform float uTime;
uniform float uRefractionStrength;
uniform float uChromaticAberration;

// 波紋効果用
uniform vec4 uTrailPoints[32]; // xyz=位置と時刻, w=未使用
uniform int uTrailCount;
uniform float uRippleLifetime;
uniform float uRippleSpeed;

varying vec2 vUv;

// ============================================
// Simplex Noise 2D
// ============================================
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// ============================================
// Fractal Brownian Motion (複数オクターブのノイズ)
// ============================================
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  // オクターブの数
  int octaves = 4;

  for (int i = 0; i < octaves; i++) {
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  // アスペクト比補正
  vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);

  // 全軌跡点からの波紋効果を合成
  vec2 totalDistortion = vec2(0.0);
  float totalInfluence = 0.0;

  for (int i = 0; i < 32; i++) {
    if (i >= uTrailCount) break;

    vec4 trailData = uTrailPoints[i];
    if (trailData.x < 0.0) continue; // 無効なデータ

    vec2 trailPos = trailData.xy;
    float trailTime = trailData.z;

    // 現在の軌跡点からの経過時間
    float elapsed = uTime - trailTime;
    if (elapsed < 0.0 || elapsed > uRippleLifetime) continue;

    // 軌跡点からの距離
    vec2 toPoint = (vUv - trailPos) * aspectRatio;
    float dist = length(toPoint);

    // 波紋の半径（時間経過で拡大）
    float rippleRadius = elapsed * uRippleSpeed;

    // 波の幅
    float waveWidth = 0.15;

    // 波紋の影響（ガウス分布風）
    float distanceFromWave = abs(dist - rippleRadius);
    float waveInfluence = exp(-distanceFromWave * distanceFromWave / (waveWidth * waveWidth));

    // 時間経過による減衰
    float decay = 1.0 - (elapsed / uRippleLifetime);
    decay = decay * decay; // 2乗で急激に減衰

    waveInfluence *= decay;

    // 波紋方向の歪み（外向き）
    vec2 waveDirection = normalize(toPoint);
    float radialDistortion = waveInfluence * 0.3;

    // ノイズを削除してシンプルな波紋のみ
    totalDistortion += waveDirection * radialDistortion * waveInfluence * uRefractionStrength;
    totalInfluence += waveInfluence;
  }

  // 影響が完全にない場合は普通の画像を表示（静止時）
  if (totalInfluence < 0.0001) {
    gl_FragColor = texture2D(uTexture, vUv);
    return;
  }

  // 影響が弱い時は徐々にフェードアウト（0.0001 〜 0.02 の範囲で滑らかに）
  float fadeFactor = smoothstep(0.0001, 0.02, totalInfluence);
  totalDistortion *= fadeFactor;

  // 歪みを適用
  vec2 distortedUv = vUv + totalDistortion;

  // Chromatic Aberration（色収差）もフェードアウト
  float aberrationAmount = uChromaticAberration * totalInfluence * fadeFactor;
  vec2 aberrationDir = normalize(totalDistortion) * aberrationAmount;

  float r = texture2D(uTexture, distortedUv + aberrationDir * 1.0).r;
  float g = texture2D(uTexture, distortedUv + aberrationDir * 0.5).g;
  float b = texture2D(uTexture, distortedUv - aberrationDir * 0.5).b;

  vec3 color = vec3(r, g, b);

  // 軽い彩度と明度の調整
  float brightness = 1.03;
  float saturation = 1.1;

  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(gray), color, saturation);
  color *= brightness;

  gl_FragColor = vec4(color, 1.0);
}
