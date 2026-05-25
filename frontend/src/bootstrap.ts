/**
 * El CSS debe importarse aquí (no solo en main) para que Vite lo inyecte en index.html
 * como <link rel="stylesheet"> antes de ejecutar JavaScript.
 */
import './index.css'

/**
 * Espera a que el CSS de producción esté cargado antes de montar React.
 * Evita el aviso de Firefox "diseño forzado antes de cargar estilos" (FOUC).
 */
function whenStylesReady(): Promise<void> {
  return new Promise((resolve) => {
    const bundleCss = document.querySelector<HTMLLinkElement>(
      'link[rel="stylesheet"][href*="/assets/"]'
    )

    // Dev (Vite): el CSS entra por import(); esperar load del documento.
    if (!bundleCss) {
      if (document.readyState === 'complete') {
        resolve()
        return
      }
      window.addEventListener('load', () => resolve(), { once: true })
      return
    }

    const finish = () => resolve()

    try {
      if (bundleCss.sheet) {
        finish()
        return
      }
    } catch {
      finish()
      return
    }

    bundleCss.addEventListener('load', finish, { once: true })
    bundleCss.addEventListener('error', finish, { once: true })
    window.setTimeout(finish, 5000)
  })
}

await whenStylesReady()
await import('./main.tsx')
