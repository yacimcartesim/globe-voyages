// Génération des écrans de démarrage (splash screens) iPhone, en clair et en sombre.
// Lancer avec : npm run generate:icons
import { createAppleSplashScreens, defineConfig } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: { sizes: [] },
    maskable: { sizes: [] },
    apple: { sizes: [] },
    appleSplashScreens: createAppleSplashScreens(
      {
        padding: 0.36,
        resizeOptions: { background: '#F2F2F7', fit: 'contain' },
        darkResizeOptions: { background: '#000000', fit: 'contain' },
        linkMediaOptions: { log: true, addMediaScreen: true, basePath: '%BASE_URL%', xhtml: false },
        png: { compressionLevel: 9, quality: 80 },
      },
      [
        'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone Air', 'iPhone 17',
        'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16e',
        'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15',
        'iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14',
        'iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini',
        'iPhone SE 4.7"',
      ],
    ),
  },
  images: ['public/splash.svg'],
})
