import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Adresse de l'app sur GitHub Pages : https://yacimcartesim.github.io/globe-voyages/
// Ne pas changer ce chemin après l'installation : les données sont liées à l'adresse.
const BASE = '/globe-voyages/'

export default defineConfig({
  base: BASE,
  build: {
    // Les drapeaux restent des fichiers séparés (chargés seulement si besoin) au lieu d'être collés dans le code
    assetsInlineLimit: (file) => (file.endsWith('.svg') ? false : undefined),
    // Le moteur 3D (three.js) est volumineux par nature ; il est mis en cache après le premier chargement
    chunkSizeWarningLimit: 2500,
  },
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
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,ico,json,woff2}'],
        // Les écrans de démarrage ne servent qu'à l'installation : inutile de les garder en cache
        globIgnores: ['**/apple-splash-*.png', '**/splash.svg'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: `${BASE}index.html`,
        // Cartes d'itinéraire (OpenFreeMap) : les zones déjà consultées restent visibles hors connexion
        runtimeCaching: [
          {
            // Style et index des tuiles : version à jour si le réseau répond vite, sinon la copie en cache
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\/(styles\/.*|planet)$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'carte-styles',
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Tuiles, polices et icônes de la carte : jamais modifiées, donc servies depuis le cache
            urlPattern: /^https:\/\/tiles\.openfreemap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'carte-tuiles',
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
