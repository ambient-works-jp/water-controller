import { ipcMain, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { loadConfig, getDefaultConfig, saveConfig } from './config'
import { createLogger } from './logger'
import { IpcChannelNames } from '../lib/ipc'
import type { Config } from '../lib/types/config'

const logger = createLogger('main.ipc')

/**
 * IPC ハンドラクラス
 * 各ハンドラを static メソッドとして実装
 */
class IpcHandlers {
  /**
   * Ping テスト用ハンドラ
   */
  static handlePing(): { message: string } {
    const response = {
      message: 'pong'
    }
    console.log('Received ping message from renderer process: ', { response })
    return response
  }

  /**
   * バージョン情報取得ハンドラ
   */
  static handleGetVersions(): {
    electron: string
    chrome: string
    node: string
  } {
    return {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node
    }
  }

  /**
   * 設定ファイル読み込みハンドラ
   */
  static handleLoadConfig():
    | { success: true; config: Config }
    | { success: false; error: string; details?: string; config: Config } {
    const result = loadConfig()

    if (result.success) {
      return {
        success: true,
        config: result.config
      }
    } else {
      // エラー時はデフォルト設定を返す
      return {
        success: false,
        error: result.error,
        details: result.details,
        config: getDefaultConfig()
      }
    }
  }

  /**
   * 設定ファイル保存ハンドラ
   */
  static handleSaveConfig(
    _event: Electron.IpcMainInvokeEvent,
    config: Config
  ): { success: true } | { success: false; error: string; details?: string } {
    return saveConfig(config)
  }

  /**
   * ログファイル読み込みハンドラ
   */
  static handleLoadLog(): {
    success: boolean
    logPath: string
    content: string
    error?: string
  } {
    // electron-log のデフォルトパスを取得
    const logsDir = app.getPath('logs')
    const logPath = path.join(logsDir, 'main.log')

    logger.info('Getting log file info:', { logsDir, logPath })

    try {
      // ログディレクトリの存在確認
      if (!fs.existsSync(logsDir)) {
        logger.warn('Logs directory does not exist:', logsDir)
        return {
          success: false,
          error: `Logs directory not found: ${logsDir}`,
          logPath,
          content: ''
        }
      }

      // ログファイルの存在確認
      if (!fs.existsSync(logPath)) {
        logger.warn('Log file does not exist:', logPath)
        // ディレクトリ内のファイル一覧を確認
        const files = fs.readdirSync(logsDir)
        logger.info('Files in logs directory:', files)

        return {
          success: false,
          error: `Log file not found: ${logPath}\nFiles in directory: ${files.join(', ')}`,
          logPath,
          content: ''
        }
      }

      const content = fs.readFileSync(logPath, 'utf-8')
      logger.info('Log file read successfully, size:', content.length)

      return {
        success: true,
        logPath,
        content
      }
    } catch (error) {
      logger.error('Failed to read log file:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        logPath,
        content: ''
      }
    }
  }
}

/**
 * IPC ハンドラを登録する
 * エントリーポイント: シンプルで読みやすく保つ
 */
export function registerIpcHandlers(): void {
  // IPC test
  ipcMain.handle(IpcChannelNames.ping, IpcHandlers.handlePing)

  // バージョン情報を取得
  ipcMain.handle(IpcChannelNames.getVersions, IpcHandlers.handleGetVersions)

  // 設定ファイルを読み込む
  ipcMain.handle(IpcChannelNames.loadConfig, IpcHandlers.handleLoadConfig)

  // 設定ファイルを保存する
  ipcMain.handle(IpcChannelNames.saveConfig, IpcHandlers.handleSaveConfig)

  // ログファイルを読み込む
  ipcMain.handle(IpcChannelNames.loadLog, IpcHandlers.handleLoadLog)
}
