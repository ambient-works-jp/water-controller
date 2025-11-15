import { ipcMain } from 'electron'

export function registerIpcHandlers(): void {
  // IPC test
  // Main プロセスで renderer プロセスから ping メッセージを受信したら、pong メッセージを返す
  ipcMain.handle('ping', () => {
    const response = {
      message: 'pong'
    }
    console.log('Received ping message from renderer process: ', { response })
    return response
  })
}
