import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

const DEFAULT_SITE_URL = 'http://localhost:5173'
const DEFAULT_APP_NAME = 'Event'
const DEFAULT_DESCRIPTION =
  'Gestiona convocatorias deportivas, confirma asistencias y organiza alineaciones en un solo lugar.'

function getSeoEnv() {
  const siteUrl = (process.env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '')
  const appName = process.env.VITE_APP_NAME || DEFAULT_APP_NAME
  const description = process.env.VITE_APP_DESCRIPTION || DEFAULT_DESCRIPTION
  const googleVerification = process.env.VITE_GOOGLE_SITE_VERIFICATION?.trim() || ''
  const googleMeta = googleVerification
    ? `<meta name="google-site-verification" content="${googleVerification}" />`
    : ''
  return { siteUrl, appName, description, googleMeta }
}

function replaceSeoPlaceholders(content: string): string {
  const { siteUrl, appName, description, googleMeta } = getSeoEnv()
  return content
    .replaceAll('__SEO_SITE_URL__', siteUrl)
    .replaceAll('__SEO_APP_NAME__', appName)
    .replaceAll('__SEO_APP_DESCRIPTION__', description)
    .replaceAll('__SEO_GOOGLE_VERIFICATION_META__', googleMeta)
}

/** Coloca el CSS del bundle tras el crítico y el JS al final del body. */
function htmlAssetOrderPlugin(): Plugin {
  const bundleCss = /<link[^>]*rel="stylesheet"[^>]*href="\/assets\/[^"]*"[^>]*>/gi
  const bundleModule = /<script[^>]*type="module"[^>]*src="\/assets\/[^"]*"[^>]*><\/script>/gi

  return {
    name: 'html-asset-order',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const styles = [...html.matchAll(bundleCss)].map((m) => m[0])
        const moduleScripts = [...html.matchAll(bundleModule)].map((m) => m[0])
        if (styles.length === 0 && moduleScripts.length === 0) return html

        let out = html.replace(bundleCss, '').replace(bundleModule, '')

        if (styles.length > 0) {
          const anchor = '</style>'
          const idx = out.indexOf(anchor)
          if (idx !== -1) {
            const insertAt = idx + anchor.length
            out = `${out.slice(0, insertAt)}\n    ${styles.join('\n    ')}\n${out.slice(insertAt)}`
          }
        }

        if (moduleScripts.length > 0) {
          out = out.replace('</body>', `    ${moduleScripts.join('\n    ')}\n  </body>`)
        }

        return out
      },
    },
  }
}

function seoBuildPlugin(): Plugin {
  return {
    name: 'seo-build',
    enforce: 'pre',
    transformIndexHtml(html) {
      return replaceSeoPlaceholders(html)
    },
    closeBundle() {
      const { siteUrl } = getSeoEnv()
      const outDir = path.resolve(__dirname, 'dist')
      const robots = `User-agent: *
Allow: /login
Disallow: /dashboard
Disallow: /convocatorias
Disallow: /deportes
Disallow: /usuarios
Disallow: /grupos
Disallow: /mis-grupos
Disallow: /mis-asistencias
Disallow: /perfil
Disallow: /roles
Disallow: /permisos

Sitemap: ${siteUrl}/sitemap.xml
`
      const today = new Date().toISOString().slice(0, 10)
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/login</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(path.join(outDir, 'robots.txt'), robots, 'utf-8')
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap, 'utf-8')
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react(), seoBuildPlugin(), htmlAssetOrderPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react') || id.includes('@radix-ui')) {
              return 'vendor-ui';
            }
            if (id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'vendor-utils';
            }
          }
        },
      },
    },
  },
})
