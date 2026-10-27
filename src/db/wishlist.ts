// Wishlist : pays (dans la table des pays, statut « wishlist ») et lieux précis.

import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, nowISO } from './db'
import type { Id, WishPlace } from './schema'

export type Priority = 1 | 2 | 3

export const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 3, label: 'Prioritaire', color: 'var(--red)' },
  { value: 2, label: 'Bientôt', color: 'var(--orange)' },
  { value: 1, label: 'Un jour', color: 'var(--gray)' },
]

export const priority = (p?: Priority) => PRIORITIES.find((x) => x.value === (p ?? 1))!

export function useWishPlaces(): WishPlace[] | undefined {
  return useLiveQuery(
    async () => (await db.wishPlaces.toArray()).sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1) || a.name.localeCompare(b.name, 'fr')),
    [],
  )
}

export async function saveWishPlace(data: Omit<WishPlace, 'id' | 'createdAt'> & { id?: Id }) {
  const existing = data.id ? await db.wishPlaces.get(data.id) : undefined
  await db.wishPlaces.put({ ...data, id: data.id ?? newId(), createdAt: existing?.createdAt ?? nowISO() })
}

export async function deleteWishPlace(id: Id) {
  await db.wishPlaces.delete(id)
}
