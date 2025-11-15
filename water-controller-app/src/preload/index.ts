import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { RendererApi, PingResponse } from './api.d.ts'

console.log('[preload] Loading preload.ts...')

// Custom APIs for renderer
const api: RendererApi = {
  getVersions: () => ({
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }),
  ipc: {
    sendPing: async () => ipcRenderer.invoke('ping') as Promise<PingResponse>
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

console.log('[preload] Loaded preload.ts.')
