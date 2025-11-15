import { useState, useEffect } from 'react'

function Versions(): React.JSX.Element {
  const [versions, setVersions] = useState<{
    electron: string
    chrome: string
    node: string
  } | null>(null)

  useEffect(() => {
    window.api.ipc.getVersions().then(setVersions)
  }, [])

  if (!versions) {
    return <div>Loading versions...</div>
  }

  return (
    <ul className="versions">
      <li className="electron-version">Electron v{versions.electron}</li>
      <li className="chrome-version">Chromium v{versions.chrome}</li>
      <li className="node-version">Node v{versions.node}</li>
    </ul>
  )
}

export default Versions
