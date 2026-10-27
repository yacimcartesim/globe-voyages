// Stockage local : demande de stockage persistant et mesure de l'espace utilisé.

/**
 * Demande au navigateur de ne pas effacer nos données en cas de manque de place.
 * Sur iPhone, c'est accordé automatiquement quand l'app est installée sur l'écran d'accueil.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false
  } catch {
    return false
  }
}

export type StorageInfo = { usage: number; quota: number }

export async function getStorageInfo(): Promise<StorageInfo | null> {
  if (!navigator.storage?.estimate) return null
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    return { usage, quota }
  } catch {
    return null
  }
}

/** 1536000 → « 1,5 Mo » */
export function formatBytes(bytes: number): string {
  const units = ['octets', 'Ko', 'Mo', 'Go']
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toLocaleString('fr-FR', { maximumFractionDigits: i === 0 ? 0 : 1 })} ${units[i]}`
}

/** Vrai si l'app est lancée depuis l'écran d'accueil (mode « app » plein écran) */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}
