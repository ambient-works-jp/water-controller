import Versions from './Versions'
import electronLogo from '../assets/electron.svg'

interface ContentsProps {
  onSendPing: () => void
}

/**
 * コンテンツ画面コンポーネント
 *
 * デフォルトの Electron + Vite のサンプル画面
 */
export function Contents({ onSendPing }: ContentsProps): React.JSX.Element {
  return (
    <div className="contents">
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </div>
      <p className="tip">
        Please try pressing <code>F12</code> to open the DevTools
      </p>
      <div className="actions">
        <div className="action">
          <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
            Documentation
          </a>
        </div>
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={onSendPing}>
            Send IPC
          </a>
        </div>
      </div>
      <Versions />
    </div>
  )
}
