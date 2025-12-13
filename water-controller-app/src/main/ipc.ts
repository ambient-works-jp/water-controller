import { ipcMain, app, BrowserWindow } from 'electron'
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
  static handleLoadLog(
    _event: Electron.IpcMainInvokeEvent,
    tailLines?: number
  ): {
    success: boolean
    logPath: string
    content: string
    error?: string
  } {
    // electron-log のデフォルトパスを取得
    const logsDir = app.getPath('logs')
    const logPath = path.join(logsDir, 'main.log')

    logger.info('Getting log file info:', { logsDir, logPath, tailLines })

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

      const fullContent = fs.readFileSync(logPath, 'utf-8')
      logger.info('Log file read successfully, size:', fullContent.length)

      // tailLines が指定されている場合は末尾から指定行数を取得
      let content = fullContent
      if (tailLines !== undefined) {
        // tailLines が 0 の場合は空文字列を返す
        if (tailLines === 0) {
          content = ''
          logger.info('Log file tail: 0 lines requested, returning empty string')
        } else if (tailLines > 0) {
          // 正の数の場合は末尾から指定行数を取得
          const lines = fullContent.split('\n')
          const startIndex = Math.max(0, lines.length - tailLines)
          content = lines.slice(startIndex).join('\n')
          logger.info('Log file tail extracted:', {
            totalLines: lines.length,
            tailLines,
            startIndex,
            actualLines: lines.length - startIndex
          })
        }
        // tailLines が負の数の場合は全文を返す（undefined と同じ扱い）
      }

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

  /**
   * DevTools を開く/閉じるハンドラ
   */
  static handleToggleDevTools(): void {
    const window = BrowserWindow.getFocusedWindow()
    if (window) {
      window.webContents.toggleDevTools()
      logger.info('DevTools toggled')
    } else {
      logger.warn('No focused window to toggle DevTools')
    }
  }

  /**
   * アプリケーションを終了するハンドラ
   */
  static handleQuitApp(): void {
    logger.info('Quitting application')
    app.quit()
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

  // DevTools を開く/閉じる
  ipcMain.handle(IpcChannelNames.toggleDevTools, IpcHandlers.handleToggleDevTools)

  // アプリケーションを終了する
  ipcMain.handle(IpcChannelNames.quitApp, IpcHandlers.handleQuitApp)
}
