import log from 'electron-log/main'
import { app } from 'electron'
import path from 'path'
import type { Logger, CreateLogger } from '../lib/logger'
import { FormatParams, LogMessage } from 'electron-log'

const LOG_TIMEZONE = process.env.LOG_TIMEZONE || 'Asia/Tokyo'

// electron-log の LogLevel 型に合わせて環境変数を変換
type ElectronLogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly'

function parseLogLevel(level: string | undefined): ElectronLogLevel {
  const normalizedLevel = (level || 'INFO').toUpperCase()

  switch (normalizedLevel) {
    case 'ERROR':
      return 'error'
    case 'WARN':
      return 'warn'
    case 'INFO':
      return 'info'
    case 'DEBUG':
      return 'debug'
    default:
      return 'info'
  }
}

const LOG_LEVEL: ElectronLogLevel = parseLogLevel(process.env.LOG_LEVEL)

/**
 * タイムゾーン付き ISO 8601 形式のタイムスタンプを生成
 */
function formatTimestamp(date: Date, timezone: string): string {
  // タイムゾーン付きで ISO 8601 形式に変換
  const isoString = date.toLocaleString('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false
  })

  // タイムゾーンオフセットを取得（例: +09:00）
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset'
  })

  const parts = formatter.formatToParts(date)
  const timeZonePart = parts.find((part) => part.type === 'timeZoneName')
  const offset = timeZonePart?.value || 'GMT+0'

  // "GMT+9" -> "+09:00" 形式に変換
  const offsetMatch = offset.match(/GMT([+-])(\d+)/)
  let formattedOffset = '+00:00'

  if (offsetMatch) {
    const sign = offsetMatch[1]
    const hours = offsetMatch[2].padStart(2, '0')
    formattedOffset = `${sign}${hours}:00`
  }

  return `${isoString.replace(' ', 'T')}${formattedOffset}`
}

/**
 * メッセージデータを文字列化
 */
function formatMessageData(data: LogMessage['data']): string {
  if (Array.isArray(data)) {
    return data
      .map((item) =>
        typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item)
      )
      .join(' ')
  }

  if (typeof data === 'object' && data !== null) {
    return JSON.stringify(data)
  }

  return String(data)
}

/**
 * JSON Lines フォーマット関数
 */
function jsonLinesFormat(params: FormatParams): any[] {
  const { level, message } = params
  const date = message.date

  const levelMap: Record<string, string> = {
    error: 'ERROR',
    warn: 'WARN',
    info: 'INFO',
    verbose: 'DEBUG',
    debug: 'DEBUG',
    silly: 'DEBUG'
  }

  const logEntry: {
    timestamp: string
    level: string
    module: string
    message: string
    stacktrace?: string
  } = {
    timestamp: formatTimestamp(date, LOG_TIMEZONE),
    level: levelMap[level] || 'INFO',
    module: message.scope || 'unknown',
    message: formatMessageData(message.data)
  }

  // エラーの場合はスタックトレースを追加
  if (level === 'error' && message.data[0] instanceof Error) {
    logEntry.stacktrace = message.data[0].stack
  }

  return [JSON.stringify(logEntry)]
}

/**
 * メインプロセス用のロガーを初期化
 */
export function initMainLogger(): void {
  // プリロードスクリプトを自動的にセッションに注入
  log.initialize()

  // ログレベルを設定
  log.transports.file.level = LOG_LEVEL
  log.transports.console.level = LOG_LEVEL

  // コンソール設定（人間が読みやすい形式）
  log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {scope} {text}'

  // ファイル設定（JSON Lines 形式）
  log.transports.file.format = jsonLinesFormat
  log.transports.file.resolvePathFn = () => {
    // すべてのログを main.log に出力
    // レンダラープロセスのログも IPC 経由で main.log に記録される
    return path.join(app.getPath('logs'), 'main.log')
  }

  // グローバルエラーハンドリング
  log.errorHandler.startCatching({
    showDialog: true,
    onError(options) {
      log.error('Global error caught:', options.error)
      log.error('App versions:', options.versions)
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
