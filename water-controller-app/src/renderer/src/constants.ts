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
