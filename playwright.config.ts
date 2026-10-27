import { defineConfig, devices } from '@playwright/test'

// Tests visuels : l'app construite, ouverte dans WebKit (moteur de Safari) en taille iPhone 15,
// en thème clair et sombre. Les captures sont rangées dans tests/screenshots/.
export default defineConfig({
  testDir: 'tests',
  reporter: 'list',
  use: {
    ...devices['iPhone 15'],
    baseURL: 'http://localhost:4173/globe-voyages/',
  },
  projects: [
    { name: 'clair', use: { colorScheme: 'light' } },
    { name: 'sombre', use: { colorScheme: 'dark' } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/globe-voyages/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
