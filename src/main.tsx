import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import { startAutoSync } from './lib/sync'

registerSW({ immediate: true })
startAutoSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HashRouter>
  </StrictMode>,
)
