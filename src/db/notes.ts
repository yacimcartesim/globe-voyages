// Notes rapides : saisies en deux secondes, puis classées plus tard dans un voyage.

import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, nowISO } from './db'
import { addStop, setPractical } from './trips'
import type { Id, LatLng, PracticalSection, QuickNote } from './schema'

/** Toutes les notes à classer, des plus récentes aux plus anciennes */
export function useNotes(): QuickNote[] | undefined {
  return useLiveQuery(async () => (await db.notes.toArray()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [])
}

export async function addNote(text: string, coords?: LatLng, tripId?: Id) {
  await db.notes.add({ id: newId(), text: text.trim(), createdAt: nowISO(), coords, tripId })
}

export async function deleteNote(id: Id) {
  await db.notes.delete(id)
}

/** Ajoute une note à la fin d'une section d'infos pratiques, sous forme de puce */
async function appendToPractical(tripId: Id, section: PracticalSection, text: string) {
  const trip = await db.trips.get(tripId)
  if (!trip) return
  const lines = text.trim().split('\n')
  const bullet = [`- ${lines[0]}`, ...lines.slice(1).map((l) => `  ${l}`)].join('\n')
  const current = trip.practical[section]?.trim()
  await setPractical(tripId, section, current ? `${current}\n${bullet}` : bullet)
}

export type TriageTarget = { kind: 'practical'; section: PracticalSection } | { kind: 'stop' }

/**
 * Classe une note dans un voyage puis la retire de la boîte de réception :
 * - en conseil ou en info pratique : ajoutée à la section choisie
 * - en étape : nouvelle étape (1re ligne = nom, le reste = notes, avec la position si elle existe)
 */
export async function triageNote(note: QuickNote, tripId: Id, target: TriageTarget) {
  if (target.kind === 'practical') {
    await appendToPractical(tripId, target.section, note.text)
  } else {
    const [first, ...rest] = note.text.trim().split('\n')
    await addStop(tripId, {
      name: first.slice(0, 80),
      notes: rest.join('\n').trim() || undefined,
      coords: note.coords,
      type: 'poi',
      transport: 'car',
    })
  }
  await db.notes.delete(note.id)
}
