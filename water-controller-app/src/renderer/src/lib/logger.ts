import log from 'electron-log/renderer'
import type { Logger, CreateLogger } from '../../../lib/logger'

/**
 * レンダラープロセス用のロガーを初期化（オプショナル）
 * グローバルエラーハンドリングを有効化する場合に呼び出す
 */
export function initRendererLogger(): void {
  // レンダラープロセスでもグローバルエラーハンドリングを有効化
  const logger = createLogger('renderer.lib.logger')
  log.errorHandler.startCatching({
    onError(error) {
      // レンダラープロセスでは error プロパティのみ利用可能
      logger.error('Renderer global error:', error)
    }
  })
}

/**
 * モジュールごとのロガーを作成
 */
export const createLogger: CreateLogger = (moduleName: string): Logger => {
  return log.scope(moduleName)
}

// デフォルトエクスポート
export default log
