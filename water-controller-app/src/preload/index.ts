import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import log from 'electron-log/renderer'
import { IpcChannelNames } from '../lib/ipc'
import type { Config } from '../lib/types/config'
import type {
  RendererApi,
  PingResponse,
  EnvironmentVersions,
  LoadConfigResponse,
  SaveConfigResponse,
  LoadLogResponse
} from './api.d.ts'

log.info('[preload] Loading preload.ts...')
console.log('[preload] Loading preload.ts...')

// Custom APIs for renderer
const api: RendererApi = {
  ipc: {
    sendPing: async () => ipcRenderer.invoke(IpcChannelNames.ping) as Promise<PingResponse>,
    getVersions: async () =>
      ipcRenderer.invoke(IpcChannelNames.getVersions) as Promise<EnvironmentVersions>,
    loadConfig: async () =>
      ipcRenderer.invoke(IpcChannelNames.loadConfig) as Promise<LoadConfigResponse>,
    saveConfig: async (config: Config) =>
      ipcRenderer.invoke(IpcChannelNames.saveConfig, config) as Promise<SaveConfigResponse>,
    loadLog: async (tailLines?: number) =>
      ipcRenderer.invoke(IpcChannelNames.loadLog, tailLines) as Promise<LoadLogResponse>,
    toggleDevTools: async () => ipcRenderer.invoke(IpcChannelNames.toggleDevTools) as Promise<void>,
    quitApp: async () => ipcRenderer.invoke(IpcChannelNames.quitApp) as Promise<void>
  }
}

function registerApi(api: RendererApi): void {
  // Use `contextBridge` APIs to expose Electron APIs to
  // renderer only if context isolation is enabled, otherwise
  // just add to the DOM global.
  if (process.contextIsolated) {
    try {
      contextBridge.exposeInMainWorld('electron', electronAPI)
      contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
      console.error(error)
    }
  } else {
    // @ts-ignore (define in dts)
    window.electron = electronAPI
    // @ts-ignore (define in dts)
    window.api = api
  }
}

registerApi(api)

log.info('[preload] Loaded preload.ts. API registered:', { hasApi: !!api, hasIpc: !!api.ipc })
console.log('[preload] Loaded preload.ts. API registered:', { hasApi: !!api, hasIpc: !!api.ipc })
