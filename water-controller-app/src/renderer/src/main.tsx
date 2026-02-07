import './styles/base.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './apps/App'
import { initRendererLogger } from './lib/logger'

// レンダラープロセスのロガーを初期化（グローバルエラーハンドリング有効化）
initRendererLogger()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
