import type { Config } from '../lib/types/config'

export type PingResponse = {
  message: string
}

export type EnvironmentVersions = {
  electron: string
  chrome: string
  node: string
}

export type LoadConfigResponse =
  | {
      success: true
      config: Config
    }
  | {
      success: false
      error: string
      details?: string
      config: Config
    }

export type SaveConfigResponse =
  | {
      success: true
    }
  | {
      success: false
      error: string
      details?: string
    }

export type LoadLogResponse =
  | {
      success: true
      logPath: string
      content: string
    }
  | {
      success: false
      error: string
      logPath: string
      content: string
    }

export type RendererApi = {
  ipc: {
    sendPing: () => Promise<PingResponse>
    getVersions: () => Promise<EnvironmentVersions>
    loadConfig: () => Promise<LoadConfigResponse>
    saveConfig: (config: Config) => Promise<SaveConfigResponse>
    loadLog: () => Promise<LoadLogResponse>
    toggleDevTools: () => Promise<void>
    quitApp: () => Promise<void>
  }
}
