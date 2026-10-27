// Lecture et modification des pays marqués (visités / wishlist).

import { useLiveQuery } from 'dexie-react-hooks'
import { db, nowISO } from './db'
import type { CountryEntry } from './schema'

/** Tous les pays marqués, mis à jour en direct à chaque modification */
export function useCountryEntries(): CountryEntry[] | undefined {
  return useLiveQuery(() => db.countries.toArray(), [])
}

export async function markVisited(code: string, firstVisit?: string) {
  const existing = await db.countries.get(code)
  await db.countries.put({
    ...existing,
    code,
    status: 'visited',
    firstVisit: firstVisit ?? existing?.firstVisit,
    addedAt: existing?.status === 'visited' ? existing.addedAt : nowISO(),
  })
}

export async function markWishlist(code: string) {
  const existing = await db.countries.get(code)
  if (existing?.status === 'visited') return
  await db.countries.put({ ...existing, code, status: 'wishlist', addedAt: existing?.addedAt ?? nowISO() })
}

export async function updateCountry(code: string, changes: Partial<CountryEntry>) {
  await db.countries.update(code, changes)
}

export async function removeCountry(code: string) {
  await db.countries.delete(code)
}
