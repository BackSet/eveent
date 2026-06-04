import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
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

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
)

// Mostrar página tras primer frame con estilos aplicados
requestAnimationFrame(() => {
  requestAnimationFrame(markAppReady)
})
window.setTimeout(markAppReady, 4000)

scheduleAnalytics()
