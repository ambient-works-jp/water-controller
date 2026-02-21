import { shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const WINDOW_WIDTH = 1920
const WINDOW_HEIGHT = 1080

export function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: true,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // ref: BrowserWindow.ready-to-show イベントを使用する
  // www.electronjs.org/ja/docs/latest/api/browser-window#ready-to-show-%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E3%82%92%E4%BD%BF%E7%94%A8%E3%81%99%E3%82%8B
  https: mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // ここで HTML のレンダリングが行われる
  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}
