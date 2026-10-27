import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { requestPersistentStorage } from './services/storage'

// Service worker : met l'app en cache pour le hors-ligne et l'actualise toute seule
registerSW({ immediate: true })

// Demande au navigateur de ne jamais effacer nos données
requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
