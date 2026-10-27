// Sauvegarde complète de l'app dans un fichier ZIP : data.json + dossier photos/.
//
// Le ZIP sert à la fois de sauvegarde (iCloud Drive) et de transfert entre l'iPhone et le Mac.
// Format pensé pour durer : version du schéma incluse, photos en fichiers JPEG lisibles partout.

import JSZip from 'jszip'
import { db } from '../db/db'
import { SCHEMA_VERSION, type CountryEntry, type Expense, type Photo, type QuickNote, type Stop, type Trip, type WishPlace } from '../db/schema'

const APP_ID = 'globe-voyages'

/** Photo dans data.json : tout sauf les images, qui sont des fichiers à part dans photos/ */
type PhotoRecord = Omit<Photo, 'image' | 'thumb'> & { file: string; thumbFile: string }

export type BackupData = {
  app: typeof APP_ID
  schemaVersion: number
  exportedAt: string
  countries: CountryEntry[]
  trips: Trip[]
  stops: Stop[]
  expenses: Expense[]
  photos: PhotoRecord[]
  notes: QuickNote[]
  wishPlaces: WishPlace[]
  /** Réglages utiles à garder (derniers taux de change…) */
  meta: { key: string; value: unknown }[]
}

export type BackupSummary = {
  countries: number
  trips: number
  stops: number
  photos: number
  expenses: number
  notes: number
  wishPlaces: number
}

// Clés techniques jamais exportées (propres à chaque appareil)
const LOCAL_META = ['lastBackup', 'demo']

/* ------------------------------------------------------------------ Export */

/** Crée le ZIP de sauvegarde. `onProgress` reçoit une valeur de 0 à 1. */
export async function createBackup(onProgress?: (p: number) => void): Promise<File> {
  const zip = new JSZip()
  const folder = zip.folder('photos')!
  const photos = await db.photos.toArray()

  const data: BackupData = {
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    countries: await db.countries.toArray(),
    trips: await db.trips.toArray(),
    stops: await db.stops.toArray(),
    expenses: await db.expenses.toArray(),
    notes: await db.notes.toArray(),
    wishPlaces: await db.wishPlaces.toArray(),
    meta: (await db.meta.toArray()).filter((m) => !LOCAL_META.includes(m.key)),
    photos: photos.map(({ image, thumb, ...rest }) => {
      folder.file(`${rest.id}.jpg`, image)
      folder.file(`${rest.id}-mini.jpg`, thumb)
      return { ...rest, file: `photos/${rest.id}.jpg`, thumbFile: `photos/${rest.id}-mini.jpg` }
    }),
  }
  zip.file('data.json', JSON.stringify(data, null, 1))
  zip.file(
    'LISEZMOI.txt',
    'Sauvegarde de l’app « Globe de voyages ».\n' +
      'Pour la restaurer : Réglages → Importer une sauvegarde, puis choisir ce fichier ZIP.\n' +
      'Le dossier photos/ contient tes photos en JPEG (lisibles sans l’app).\n',
  )

  // Les JPEG sont déjà compressés : on les range sans recompresser (plus rapide)
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, (m) => onProgress?.(m.percent / 100))
  const date = new Date().toISOString().slice(0, 10)
  return new File([blob], `globe-voyages-${date}.zip`, { type: 'application/zip' })
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled'

/**
 * Envoie la sauvegarde :
 * - iPhone : feuille de partage iOS (→ « Enregistrer dans Fichiers » / iCloud Drive)
 * - Mac (ou si le partage n'est pas possible) : téléchargement classique
 */
export async function shareBackup(file: File): Promise<ShareOutcome> {
  const touch = navigator.maxTouchPoints > 0
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Sauvegarde Globe de voyages' })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // Autre erreur (fichier trop gros…) : on retombe sur le téléchargement
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'downloaded'
}

/* ------------------------------------------------------------------ Suivi */

type LastBackup = { at: string; items: number }

/** Nombre d'éléments (sert à détecter « beaucoup de contenu ajouté depuis la dernière sauvegarde ») */
export async function countItems(): Promise<number> {
  const counts = await Promise.all([
    db.countries.count(),
    db.trips.count(),
    db.stops.count(),
    db.expenses.count(),
    db.photos.count(),
    db.notes.count(),
    db.wishPlaces.count(),
  ])
  return counts.reduce((a, b) => a + b, 0)
}

export async function markBackupDone() {
  await db.meta.put({ key: 'lastBackup', value: { at: new Date().toISOString(), items: await countItems() } satisfies LastBackup })
}

export async function getLastBackup(): Promise<LastBackup | null> {
  return ((await db.meta.get('lastBackup'))?.value as LastBackup | undefined) ?? null
}

/* ------------------------------------------------------------------ Import */

export class BackupError extends Error {}

export type ParsedBackup = { data: BackupData; zip: JSZip; summary: BackupSummary }

/** Fait évoluer une sauvegarde ancienne vers le schéma actuel (rien à faire pour la v1) */
function migrate(data: BackupData): BackupData {
  // Exemple pour plus tard : if (data.schemaVersion < 2) { …; data.schemaVersion = 2 }
  return data
}

/** Ouvre et vérifie un ZIP de sauvegarde, sans rien modifier (pour l'aperçu) */
export async function readBackup(file: File): Promise<ParsedBackup> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new BackupError('Ce fichier n’est pas un ZIP valide.')
  }
  const json = zip.file('data.json')
  if (!json) throw new BackupError('Ce ZIP ne contient pas de sauvegarde (data.json manquant).')
  let data: BackupData
  try {
    data = JSON.parse(await json.async('string'))
  } catch {
    throw new BackupError('Le fichier data.json est illisible.')
  }
  if (data.app !== APP_ID) throw new BackupError('Ce fichier ne vient pas de Globe de voyages.')
  if (data.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError('Cette sauvegarde vient d’une version plus récente de l’app. Mets l’app à jour puis réessaie.')
  }
  data = migrate(data)
  return {
    data,
    zip,
    summary: {
      countries: data.countries.filter((c) => c.status === 'visited').length,
      trips: data.trips.length,
      stops: data.stops.length,
      photos: data.photos.length,
      expenses: data.expenses.length,
      notes: data.notes.length,
      wishPlaces: data.wishPlaces.length + data.countries.filter((c) => c.status === 'wishlist').length,
    },
  }
}

/**
 * Restaure une sauvegarde.
 * - « replace » : efface tout puis restaure
 * - « merge » : ajoute/met à jour les éléments de la sauvegarde, garde le reste
 *   (un pays visité ici ne redevient jamais « wishlist » à cause de la sauvegarde)
 */
export async function restoreBackup({ data, zip }: ParsedBackup, mode: 'merge' | 'replace', onProgress?: (p: number) => void) {
  // Les photos sont lues avant d'ouvrir la transaction (IndexedDB n'aime pas attendre au milieu)
  const photos: Photo[] = []
  for (const [i, p] of data.photos.entries()) {
    const image = await zip.file(p.file)?.async('arraybuffer')
    const thumb = await zip.file(p.thumbFile)?.async('arraybuffer')
    if (image && thumb) {
      const { file: _f, thumbFile: _t, ...rest } = p
      photos.push({ ...rest, image, thumb })
    }
    onProgress?.((i + 1) / Math.max(1, data.photos.length))
  }

  const tables = [db.countries, db.trips, db.stops, db.expenses, db.photos, db.notes, db.wishPlaces, db.meta]
  await db.transaction('rw', tables, async () => {
    let countries = data.countries
    if (mode === 'replace') {
      // On garde seulement la date de dernière sauvegarde (la démo éventuelle disparaît avec le reste)
      await Promise.all(tables.map((t) => (t === db.meta ? db.meta.where('key').notEqual('lastBackup').delete() : t.clear())))
    } else {
      const visitedHere = new Set((await db.countries.where('status').equals('visited').primaryKeys()) as string[])
      countries = countries.filter((c) => !(c.status === 'wishlist' && visitedHere.has(c.code)))
    }
    await db.countries.bulkPut(countries)
    await db.trips.bulkPut(data.trips)
    await db.stops.bulkPut(data.stops)
    await db.expenses.bulkPut(data.expenses)
    await db.photos.bulkPut(photos)
    await db.notes.bulkPut(data.notes)
    await db.wishPlaces.bulkPut(data.wishPlaces)
    await db.meta.bulkPut(data.meta.filter((m) => !LOCAL_META.includes(m.key)))
  })
}
