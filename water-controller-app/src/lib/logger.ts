/**
 * ログレベル
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * ロガーインタフェース
 * メイン・レンダラー両プロセスで共通の API を提供
 */
export interface Logger {
  /**
   * デバッグレベルのログ出力
   */
  debug(message: string, ...args: any[]): void

  /**
   * 情報レベルのログ出力
   */
  info(message: string, ...args: any[]): void

  /**
   * 警告レベルのログ出力
   */
  warn(message: string, ...args: any[]): void

  /**
   * エラーレベルのログ出力
   */
  error(message: string, ...args: any[]): void
}

/**
 * ロガーを作成する関数の型
 */
export type CreateLogger = (moduleName: string) => Logger
