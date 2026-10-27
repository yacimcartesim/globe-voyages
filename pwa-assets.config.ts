// Génération des icônes de l'app (favicon, icônes PWA, icône écran d'accueil iPhone).
// Lancer avec : npm run generate:icons
import { defineConfig } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    // Le logo est déjà plein cadre : aucune marge ajoutée
    transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']], padding: 0 },
    maskable: { sizes: [512], padding: 0 },
    apple: { sizes: [180], padding: 0 },
  },
  images: ['public/logo.svg'],
})
