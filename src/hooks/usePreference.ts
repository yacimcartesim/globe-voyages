import { useCallback, useSyncExternalStore } from 'react'

// Petites préférences d'affichage (rotation du globe…), gardées dans le navigateur.
// Partagées entre composants : changer un réglage met à jour tout l'écran immédiatement.

const PREFIX = 'globe-voyages:'
const listeners = new Set<() => void>()
const memory = new Map<string, string>() // repli si le stockage est indisponible (navigation privée)

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key)
  } catch {
    return memory.get(key) ?? null
  }
}

function write(key: string, raw: string) {
  try {
    localStorage.setItem(PREFIX + key, raw)
  } catch {
    memory.set(key, raw)
  }
  listeners.forEach((l) => l())
}

export function usePreference<T>(key: string, initial: T) {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => read(key),
  )
  const value = raw == null ? initial : (JSON.parse(raw) as T)
  const update = useCallback((v: T) => write(key, JSON.stringify(v)), [key])
  return [value, update] as const
}
