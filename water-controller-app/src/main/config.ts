import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { createLogger } from './logger'
import type { Config } from '../lib/types/config'
import { CONTENTS, DEFAULT_PLAYLIST_IDS } from '../lib/constants/contents'

const logger = createLogger('main.config')

// 設定ファイルのパス
const CONFIG_DIR = path.join(app.getPath('home'), '.water-controller-app')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

/**
 * デフォルト設定（動的に生成）
 */
function createDefaultConfig(): Config {
  return {
    wsUrl: 'ws://127.0.0.1:8080/ws',
    enableCenteringCursorMode: true,
    debugModeOptions: {
      enableDebugMode: false,
      showCursor: false,
      showMovementArea: false
    },
    contents: CONTENTS,
    playlist: DEFAULT_PLAYLIST_IDS
  }
}

/**
 * 設定ディレクトリを作成する
 */
function ensureConfigDirectory(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    logger.info(`Creating config directory: ${CONFIG_DIR}`)
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

/**
 * 初回起動時にデフォルト設定を作成する
 */
function initializeConfigFile(): void {
  ensureConfigDirectory()

  if (!fs.existsSync(CONFIG_FILE)) {
    logger.info('Config file not found. Creating default config file.')

    try {
      const defaultConfig = createDefaultConfig()
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf-8')
      logger.info(`Created default config file at ${CONFIG_FILE}`)
    } catch (error) {
      logger.error('Failed to initialize config file:', error)
      throw error
    }
  }
}

/**
 * 2回目以降の起動時に CONTENTS を config.contents に同期する
 *
 * @param config - 現在の設定
 * @returns 同期後の設定
 */
function syncContents(config: Config): Config {
  // CONTENTS を config.contents に常に上書き（コード側が正）
  const syncedConfig = {
    ...config,
    contents: CONTENTS
  }

  // playlist が存在しない、または空の場合はデフォルト値を設定
  if (!syncedConfig.playlist || syncedConfig.playlist.length === 0) {
    logger.warn('config.playlist is empty or missing. Using default playlist.')
    syncedConfig.playlist = DEFAULT_PLAYLIST_IDS
  }

  return syncedConfig
}

/**
 * 設定ファイルを読み込む
 *
 * @returns 設定オブジェクト、またはエラー情報
 */
export function loadConfig():
  | { success: true; config: Config }
  | { success: false; error: string; details?: string } {
  try {
    // 初回起動時の処理
    initializeConfigFile()

    // 設定ファイルを読み込む
    logger.info(`Loading config from ${CONFIG_FILE}`)
    const configStr = fs.readFileSync(CONFIG_FILE, 'utf-8')

    // JSON パース
    const parsedConfig = JSON.parse(configStr)
    let config = parsedConfig as Config

    // バリデーション
    if (!config.wsUrl || typeof config.wsUrl !== 'string') {
      throw new Error('Invalid config: wsUrl is required and must be a string')
    }

    if (!config.debugModeOptions || typeof config.debugModeOptions !== 'object') {
      throw new Error('Invalid config: debugModeOptions is required and must be an object')
    }

    if (typeof config.debugModeOptions.enableDebugMode !== 'boolean') {
      throw new Error('Invalid config: debugModeOptions.enableDebugMode must be a boolean')
    }

    if (typeof config.debugModeOptions.showCursor !== 'boolean') {
      throw new Error('Invalid config: debugModeOptions.showCursor must be a boolean')
    }

    if (typeof config.debugModeOptions.showMovementArea !== 'boolean') {
      throw new Error('Invalid config: debugModeOptions.showMovementArea must be a boolean')
    }

    if (typeof config.enableCenteringCursorMode !== 'boolean') {
      throw new Error('Invalid config: enableCenteringCursorMode must be a boolean')
    }

    if (!Array.isArray(config.contents)) {
      throw new Error('Invalid config: contents must be an array')
    }

    if (!Array.isArray(config.playlist)) {
      throw new Error('Invalid config: playlist must be an array')
    }

    // 2回目以降の起動時：CONTENTS を config.contents に同期
    config = syncContents(config)

    // 同期後の設定を保存
    const saveResult = saveConfig(config)
    if (!saveResult.success) {
      logger.warn('Failed to save synced config:', saveResult.error)
    }

    logger.info('Config loaded successfully')
    return { success: true, config }
  } catch (error) {
    logger.error('Failed to load config:', error)

    // エラーの種類を判定
    if (error instanceof Error) {
      // JSON パースエラー
      if (error.message.includes('JSON') || error.name === 'SyntaxError') {
        return {
          success: false,
          error: '設定ファイルの形式が不正です。デフォルト設定を使用します。',
          details: error.message
        }
      }

      // バリデーションエラー
      if (error.message.includes('Invalid config')) {
        return {
          success: false,
          error: '設定ファイルの内容が不正です。デフォルト設定を使用します。',
          details: error.message
        }
      }

      // ファイル読み込みエラー（権限エラーなど）
      if ('code' in error && error.code === 'EACCES') {
        return {
          success: false,
          error: '設定ファイルの読み込み権限がありません。',
          details: error.message
        }
      }

      // その他のエラー
      return {
        success: false,
        error: '設定ファイルの読み込みに失敗しました。デフォルト設定を使用します。',
        details: error.message
      }
    }

    return {
      success: false,
      error: '設定ファイルの読み込みに失敗しました。デフォルト設定を使用します。'
    }
  }
}

/**
 * デフォルト設定を取得する
 */
export function getDefaultConfig(): Config {
  return createDefaultConfig()
}

/**
 * 設定ファイルを保存する
 *
 * @param config - 保存する設定オブジェクト
 * @returns 保存結果
 */
export function saveConfig(
  config: Config
): { success: true } | { success: false; error: string; details?: string } {
  try {
    // 設定ディレクトリを作成（存在しない場合）
    ensureConfigDirectory()

    // バリデーション
    if (!config.wsUrl || typeof config.wsUrl !== 'string') {
      throw new Error('Invalid config: wsUrl is required and must be a string')
    }

    if (!config.debugModeOptions || typeof config.debugModeOptions !== 'object') {
      throw new Error('Invalid config: debugModeOptions is required and must be an object')
    }

    if (typeof config.debugModeOptions.enableDebugMode !== 'boolean') {
      throw new Error('Invalid config: debugModeOptions.enableDebugMode must be a boolean')
    }

    if (typeof config.debugModeOptions.showCursor !== 'boolean') {
      throw new Error('Invalid config: debugModeOptions.showCursor must be a boolean')
    }

    if (typeof config.debugModeOptions.showMovementArea !== 'boolean') {
      throw new Error('Invalid config: debugModeOptions.showMovementArea must be a boolean')
    }

    if (typeof config.enableCenteringCursorMode !== 'boolean') {
      throw new Error('Invalid config: enableCenteringCursorMode must be a boolean')
    }

    if (!Array.isArray(config.contents)) {
      throw new Error('Invalid config: contents must be an array')
    }

    if (!Array.isArray(config.playlist)) {
      throw new Error('Invalid config: playlist must be an array')
    }

    // JSON 形式で保存
    const configStr = JSON.stringify(config, null, 2)
    fs.writeFileSync(CONFIG_FILE, configStr, 'utf-8')

    logger.info('Config saved successfully')
    return { success: true }
  } catch (error) {
    logger.error('Failed to save config:', error)

    if (error instanceof Error) {
      // バリデーションエラー
      if (error.message.includes('Invalid config')) {
        return {
          success: false,
          error: '設定ファイルの内容が不正です。',
          details: error.message
        }
      }

      // ファイル書き込みエラー（権限エラーなど）
      if ('code' in error && error.code === 'EACCES') {
        return {
          success: false,
          error: '設定ファイルの書き込み権限がありません。',
          details: error.message
        }
      }

      // その他のエラー
      return {
        success: false,
        error: '設定ファイルの保存に失敗しました。',
        details: error.message
      }
    }

    return {
      success: false,
      error: '設定ファイルの保存に失敗しました。'
    }
  }
}
