// Lecture et modification des voyages et de leurs étapes.

import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, nowISO } from './db'
import type { Id, PracticalSection, Stop, Trip } from './schema'
import { computeRoute } from '../services/routing'

/* ------------------------------------------------------------------ Voyages */

/** Tous les voyages, du plus récent au plus ancien (les voyages sans date à la fin) */
export function useTrips(): Trip[] | undefined {
  return useLiveQuery(async () => {
    const trips = await db.trips.toArray()
    return trips.sort((a, b) => (b.start ?? '').localeCompare(a.start ?? '') || b.createdAt.localeCompare(a.createdAt))
  }, [])
}

export function useTrip(id: Id | null): Trip | undefined {
  return useLiveQuery(() => (id ? db.trips.get(id) : undefined), [id])
}

export type TripDraft = Pick<Trip, 'title' | 'countries' | 'start' | 'end' | 'currency' | 'companions'>

export async function createTrip(draft: TripDraft): Promise<Id> {
  const id = newId()
  const now = nowISO()
  await db.trips.add({ ...draft, id, practical: {}, createdAt: now, updatedAt: now })
  return id
}

export async function updateTrip(id: Id, changes: Partial<Trip>) {
  await db.trips.update(id, { ...changes, updatedAt: nowISO() })
}

export async function setPractical(id: Id, section: PracticalSection, text: string) {
  const trip = await db.trips.get(id)
  if (!trip) return
  await updateTrip(id, { practical: { ...trip.practical, [section]: text } })
}

/** Supprime un voyage et tout ce qui lui est rattaché (étapes, dépenses, photos) */
export async function deleteTrip(id: Id) {
  await db.transaction('rw', [db.trips, db.stops, db.expenses, db.photos, db.notes], async () => {
    await db.stops.where('tripId').equals(id).delete()
    await db.expenses.where('tripId').equals(id).delete()
    await db.photos.where('tripId').equals(id).delete()
    // Les notes rapides liées retournent dans la boîte de réception
    await db.notes.where('tripId').equals(id).modify((n) => {
      delete n.tripId
    })
    await db.trips.delete(id)
  })
}

/* ------------------------------------------------------------------ Étapes */

export function useStops(tripId: Id | null): Stop[] | undefined {
  return useLiveQuery(
    () => (tripId ? db.stops.where('[tripId+order]').between([tripId, -Infinity], [tripId, Infinity]).toArray() : []),
    [tripId],
  )
}

/** Toutes les étapes de tous les voyages (points sur le globe) */
export function useAllStops(): Stop[] | undefined {
  return useLiveQuery(() => db.stops.toArray(), [])
}

async function orderedStops(tripId: Id) {
  return db.stops.where('[tripId+order]').between([tripId, -Infinity], [tripId, Infinity]).toArray()
}

/**
 * Recalcule les tracés des étapes dont l'étape précédente a changé.
 * Le calcul se fait en arrière-plan : la liste se met à jour tout de suite, le tracé suit.
 */
async function refreshRoutes(tripId: Id, onlyIds?: Set<Id>) {
  const stops = await orderedStops(tripId)
  for (let i = 0; i < stops.length; i++) {
    const s = stops[i]
    if (onlyIds && !onlyIds.has(s.id)) continue
    const prev = stops[i - 1]
    const route = prev?.coords && s.coords ? await computeRoute(prev.coords, s.coords, s.transport) : undefined
    await db.stops.update(s.id, { route })
  }
}

/** Identifiants des étapes qui suivent chaque étape (pour savoir quels tracés recalculer) */
function followers(stops: Stop[]) {
  return new Map(stops.map((s, i) => [s.id, stops[i + 1]?.id]))
}

export async function addStop(tripId: Id, data: Omit<Stop, 'id' | 'tripId' | 'order'>): Promise<Id> {
  const stops = await orderedStops(tripId)
  const id = newId()
  await db.stops.add({ ...data, id, tripId, order: stops.length })
  void refreshRoutes(tripId, new Set([id]))
  return id
}

export async function updateStop(stop: Stop, changes: Partial<Stop>) {
  await db.stops.update(stop.id, changes)
  // Lieu ou transport modifié : tracé de cette étape et de la suivante à refaire
  if ('coords' in changes || 'transport' in changes) {
    const next = followers(await orderedStops(stop.tripId)).get(stop.id)
    void refreshRoutes(stop.tripId, new Set([stop.id, ...(next ? [next] : [])]))
  }
}

export async function deleteStop(stop: Stop) {
  const next = followers(await orderedStops(stop.tripId)).get(stop.id)
  await db.stops.delete(stop.id)
  await renumber(stop.tripId)
  if (next) void refreshRoutes(stop.tripId, new Set([next]))
}

async function renumber(tripId: Id) {
  const stops = await orderedStops(tripId)
  await Promise.all(stops.map((s, i) => (s.order === i ? null : db.stops.update(s.id, { order: i }))))
}

/**
 * Nouvel ordre des étapes après un glisser-déposer.
 * L'étape déplacée prend le jour de l'étape qui la précède (ou suit) à sa nouvelle place.
 */
export async function reorderStops(tripId: Id, orderedIds: Id[], movedId: Id) {
  const before = followers(await orderedStops(tripId))
  const stops = await orderedStops(tripId)
  const byId = new Map(stops.map((s) => [s.id, s]))
  const idx = orderedIds.indexOf(movedId)
  const neighbour = byId.get(orderedIds[idx - 1] ?? orderedIds[idx + 1])

  await db.transaction('rw', db.stops, async () => {
    await Promise.all(orderedIds.map((id, i) => db.stops.update(id, { order: i })))
    if (neighbour?.day != null) await db.stops.update(movedId, { day: neighbour.day })
  })

  // Les étapes dont la précédente a changé doivent recalculer leur tracé
  const after = new Map(orderedIds.map((id, i) => [id, orderedIds[i + 1]]))
  const changed = new Set<Id>()
  for (const id of orderedIds) {
    const prevBefore = [...before].find(([, next]) => next === id)?.[0]
    const prevAfter = [...after].find(([, next]) => next === id)?.[0]
    if (prevBefore !== prevAfter) changed.add(id)
  }
  if (changed.size) void refreshRoutes(tripId, changed)
}

/* ------------------------------------------------------------------ Dates */

/** Date du jour N d'un voyage (« 2026-07-06 » + jour 3 → « 2026-07-08 ») */
export function dateOfDay(start: string | undefined, day: number | undefined): string | undefined {
  if (!start || !day) return undefined
  const d = new Date(`${start}T12:00:00`)
  d.setDate(d.getDate() + day - 1)
  return d.toISOString().slice(0, 10)
}

/** Nombre de jours d'un voyage (dates incluses) */
export function tripLength(trip: Pick<Trip, 'start' | 'end'>): number | undefined {
  if (!trip.start || !trip.end) return undefined
  const ms = new Date(`${trip.end}T12:00:00`).getTime() - new Date(`${trip.start}T12:00:00`).getTime()
  return Math.round(ms / 86_400_000) + 1
}

const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const fmtFull = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
const fmtShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

export const formatDay = (iso: string) => fmtDay.format(new Date(`${iso}T12:00:00`))

/** « 6 – 17 juillet 2026 », « 28 juin – 3 juil. 2026 » */
export function formatRange(start?: string, end?: string): string {
  if (!start) return 'Dates à définir'
  const a = new Date(`${start}T12:00:00`)
  if (!end || end === start) return fmtFull.format(a)
  const b = new Date(`${end}T12:00:00`)
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${a.getDate()} – ${fmtFull.format(b)}`
  }
  if (a.getFullYear() === b.getFullYear()) return `${fmtShort.format(a)} – ${fmtFull.format(b)}`
  return `${fmtFull.format(a)} – ${fmtFull.format(b)}`
}

/**
 * Sépare « Léa Tom, Max et Zoé » en prénoms individuels : un espace, une virgule
 * ou « et » séparent deux prénoms (les prénoms composés s'écrivent avec un tiret : Jean-Pierre)
 */
export function splitCompanions(text?: string): string[] {
  return (text ?? '')
    .split(/[\s,;&+]+/)
    .map((n) => n.trim())
    .filter((n) => n && !/^(et|and)$/i.test(n))
}

/** Écriture propre pour l'enregistrement : « Léa, Tom, Max » */
export const formatCompanions = (text?: string) => splitCompanions(text).join(', ') || undefined

/** Compagnons des voyages précédents, les plus fréquents d'abord */
export function useCompanionNames(): string[] {
  return (
    useLiveQuery(async () => {
      const counts = new Map<string, { name: string; n: number }>()
      for (const t of await db.trips.toArray()) {
        for (const name of splitCompanions(t.companions)) {
          const key = name.toLocaleLowerCase('fr')
          const c = counts.get(key) ?? { name, n: 0 }
          c.n++
          counts.set(key, c)
        }
      }
      return [...counts.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'fr')).map((c) => c.name)
    }, []) ?? []
  )
}
