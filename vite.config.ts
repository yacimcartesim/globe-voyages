import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Adresse de l'app sur GitHub Pages : https://yacimcartesim.github.io/globe-voyages/
// Ne pas changer ce chemin après l'installation : les données sont liées à l'adresse.
const BASE = '/globe-voyages/'

export default defineConfig({
  base: BASE,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // L'app se met à jour toute seule ; les données (IndexedDB) ne sont jamais touchées
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: 'Globe de voyages',
        short_name: 'Globe',
        description: 'Mon globe de voyages personnel',
        lang: 'fr',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F2F2F7',
        theme_color: '#F2F2F7',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout ce qui est construit (JS, CSS, drapeaux, frontières, icônes) est mis en cache pour le hors-ligne
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,woff2}'],
        // Les écrans de démarrage ne servent qu'à l'installation : inutile de les garder en cache
        globIgnores: ['**/apple-splash-*.png', '**/splash.svg'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: `${BASE}index.html`,
      },
    }),
  ],
})
