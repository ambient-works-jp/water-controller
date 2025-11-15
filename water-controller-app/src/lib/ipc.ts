/**
 * IPC チャネル名の定数定義
 * メインプロセスとレンダラープロセス間の通信で使用する
 */
export const IpcChannelNames = {
  ping: 'ping',
  getVersions: 'getVersions',
  loadConfig: 'loadConfig',
  loadLog: 'loadLog'
} as const

/**
 * IPC チャネル名の型
 */
export type IpcChannelName = (typeof IpcChannelNames)[keyof typeof IpcChannelNames]
