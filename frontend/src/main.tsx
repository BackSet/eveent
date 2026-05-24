import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'
import { initAnalytics } from './lib/analytics'

function markAppReady() {
  document.documentElement.classList.add('app-ready')
}

function scheduleAnalytics() {
  const run = () => initAnalytics()
  if (typeof window === 'undefined') return
  if (document.readyState === 'complete') {
    run()
    return
  }
  window.addEventListener('load', run, { once: true })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)

requestAnimationFrame(() => {
  requestAnimationFrame(markAppReady)
})

// Respaldo por si el paint se retrasa (evita pantalla en blanco indefinida)
window.setTimeout(markAppReady, 4000)

scheduleAnalytics()
