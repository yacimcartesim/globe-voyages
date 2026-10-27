// Base de données locale (IndexedDB via Dexie).

import Dexie, { type EntityTable } from 'dexie'
import type { CountryEntry, Expense, MetaEntry, Photo, QuickNote, Stop, Trip, WishPlace } from './schema'

export const db = new Dexie('globe-voyages') as Dexie & {
  countries: EntityTable<CountryEntry, 'code'>
  trips: EntityTable<Trip, 'id'>
  stops: EntityTable<Stop, 'id'>
  expenses: EntityTable<Expense, 'id'>
  photos: EntityTable<Photo, 'id'>
  notes: EntityTable<QuickNote, 'id'>
  wishPlaces: EntityTable<WishPlace, 'id'>
  meta: EntityTable<MetaEntry, 'key'>
}

// Version 1 du schéma. Seuls les champs indexés (recherche/tri) sont listés ici.
// « *countries » = index sur chaque élément du tableau (voyages d'un pays).
db.version(1).stores({
  countries: '&code, status',
  trips: '&id, *countries, start',
  stops: '&id, tripId, [tripId+order]',
  expenses: '&id, tripId, stopId, date',
  photos: '&id, tripId, stopId, takenAt',
  notes: '&id, tripId, createdAt',
  wishPlaces: '&id, countryCode',
  meta: '&key',
})

/** Identifiant unique (crypto.randomUUID n'existe pas en http sur le réseau local) */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export const nowISO = () => new Date().toISOString()
