/**
 * IPC チャネル名の定数定義
 * メインプロセスとレンダラープロセス間の通信で使用する
 */
export const IpcChannelNames = {
  ping: 'ping',
  getVersions: 'getVersions',
  loadConfig: 'loadConfig',
  saveConfig: 'saveConfig',
  loadLog: 'loadLog',
  toggleDevTools: 'toggleDevTools',
  quitApp: 'quitApp'
} as const

/**
 * IPC チャネル名の型
 */
export type IpcChannelName = (typeof IpcChannelNames)[keyof typeof IpcChannelNames]
