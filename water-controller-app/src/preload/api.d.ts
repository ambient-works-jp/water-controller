export type PingResponse = {
  message: string
}

export type EnvironmentVersions = {
  electron: string
  chrome: string
  node: string
}

export type RendererApi = {
  ipc: {
    sendPing: () => Promise<PingResponse>
  }
  getVersions: () => EnvironmentVersions
}
