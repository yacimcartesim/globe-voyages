import { useSyncExternalStore } from 'react'

// Thème clair/sombre de l'appareil, mis à jour en direct quand il change.

const query = () => window.matchMedia('(prefers-color-scheme: dark)')

export function useColorScheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    (cb) => {
      const mq = query()
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => (query().matches ? 'dark' : 'light'),
  )
}
