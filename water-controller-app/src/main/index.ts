import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createWindow } from './window'
import { registerIpcHandlers } from './ipc'
import { initMainLogger, createLogger } from './logger'

// ロガーの初期化（アプリの初期化前に実行）
initMainLogger()

// モジュールごとのロガーを作成
const logger = createLogger('main.index')

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// `ready` イベントは、Electron アプリが初期化され、ウィンドウを作成する準備ができたことを示します。
app.whenReady().then(() => {
  logger.info('Electron has finished initialization and is ready to create browser windows.')

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handler の登録
  registerIpcHandlers()

  // Electron アプリのウィンドウを作成する
  createWindow()

  // on macOS: ウィンドウが activate になったとき、ウィンドウを作成する
  // ref: www.electronjs.org/ja/docs/latest/tutorial/tutorial-first-app#%E9%96%8B%E3%81%84%E3%81%9F%E3%82%A6%E3%82%A4%E3%83%B3%E3%83%89%E3%82%A6%E3%81%8C%E3%81%AA%E3%81%84%E5%A0%B4%E5%90%88%E3%81%AB%E3%82%A6%E3%82%A4%E3%83%B3%E3%83%89%E3%82%A6%E3%82%92%E9%96%8B%E3%81%8F-macos
  https: app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 全てのウィンドウが閉じたときにアプリを終了する (Windows と Linux のみ)
// ref: https://www.electronjs.org/ja/docs/latest/tutorial/tutorial-first-app#%E5%85%A8%E3%82%A6%E3%82%A4%E3%83%B3%E3%83%89%E3%82%A6%E3%82%92%E9%96%89%E3%81%98%E3%81%9F%E6%99%82%E3%81%AB%E3%82%A2%E3%83%97%E3%83%AA%E3%82%92%E7%B5%82%E4%BA%86%E3%81%99%E3%82%8B-windows--linux
//
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
