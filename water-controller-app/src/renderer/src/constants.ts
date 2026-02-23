/**
 * アプリケーション全体で使用する定数
 */

/**
 * デバッグUIの表示位置（画面下からの距離）
 */
export const DEBUG_UI_BOTTOM_OFFSET = 60 // px

/**
 * 動画フェード効果のパラメータ
 */
export const VIDEO_FADE_PARAMS = {
  FADE_DURATION: 1.5, // フェードイン・アウトの時間（秒）
  FADE_START_BEFORE_END: 2.0 // 終端の何秒前からフェードアウトを開始するか（秒）
} as const

/**
 * カーソル移動範囲のパラメータ（1080p動画の中央正方形エリア用）
 */
export const MOVEMENT_AREA = {
  USE_SQUARE_CONSTRAINT: true, // 正方形制約を使用（false の場合は画面全体の楕円）
  // 移動可能範囲（画面高さを基準とした比率）
  WIDTH_RATIO: 0.5, // X方向の移動範囲（正方形の場合、高さと同じ比率推奨）
  HEIGHT_RATIO: 0.4 // Y方向の移動範囲
} as const

/**
 * カーソル物理シミュレーションのパラメータプリセット
 */
export const PHYSICS_PRESETS = {
  /**
   * シンプルモード：入力なしで即停止、機械的な動き
   */
  SIMPLE: {
    BASE_SPEED: 0.006, // 基本移動速度（低いほど遅い）
    FORCE_MULTIPLIER: 0.8, // 入力力の倍率
    RESTORE_FORCE: 0.0, // 中央への復元力なし
    DAMPING: 0.92, // 減衰係数（シンプルモードでは使用しない）
    MAX_VIEWPORT_RATIO: 0.4 // 画面に対する最大移動距離の比率
  },
  /**
   * ふよふよモード：中央へ戻る復元力あり、滑らかな動き
   */
  FUYOFUYO: {
    BASE_SPEED: 0.01, // 基本移動速度（シンプルより速め）
    FORCE_MULTIPLIER: 0.8, // 入力力の倍率
    RESTORE_FORCE: 0.03, // 中央への復元力
    DAMPING: 0.92, // 減衰係数（慣性を保ちながら徐々に減速）
    MAX_VIEWPORT_RATIO: 0.4 // 画面に対する最大移動距離の比率
  }
} as const
