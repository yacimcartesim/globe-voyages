import { useCallback, useState } from 'react'

// Petites préférences d'affichage (rotation du globe…), gardées dans le navigateur.
// Les vraies données (pays, voyages, photos) iront dans IndexedDB à partir de la phase 2.

const PREFIX = 'globe-voyages:'

export function usePreference<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      return raw == null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  const update = useCallback(
    (v: T) => {
      setValue(v)
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(v))
      } catch {
        // Stockage indisponible (navigation privée) : la préférence reste en mémoire
      }
    },
    [key],
  )

  return [value, update] as const
}
