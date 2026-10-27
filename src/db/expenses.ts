// Lecture et modification des dépenses d'un voyage.

import { useLiveQuery } from 'dexie-react-hooks'
import { BedDouble, Fuel, Mountain, Package, Ticket, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import { db, newId } from './db'
import type { Expense, ExpenseCategory, Id } from './schema'

export const CATEGORIES: { value: ExpenseCategory; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'lodging', label: 'Logement', icon: BedDouble, color: 'var(--indigo)' },
  { value: 'transport', label: 'Essence et transport', icon: Fuel, color: 'var(--blue)' },
  { value: 'food', label: 'Nourriture', icon: UtensilsCrossed, color: 'var(--orange)' },
  { value: 'activities', label: 'Activités', icon: Mountain, color: 'var(--green)' },
  { value: 'events', label: 'Événements', icon: Ticket, color: 'var(--pink)' },
  { value: 'misc', label: 'Divers', icon: Package, color: 'var(--gray)' },
]

export const category = (c: ExpenseCategory) => CATEGORIES.find((x) => x.value === c) ?? CATEGORIES[5]

/** Dépenses d'un voyage, de la plus récente à la plus ancienne */
export function useExpenses(tripId: Id | null): Expense[] | undefined {
  return useLiveQuery(async () => {
    if (!tripId) return []
    const list = await db.expenses.where('tripId').equals(tripId).toArray()
    return list.sort((a, b) => b.date.localeCompare(a.date))
  }, [tripId])
}

export async function saveExpense(data: Omit<Expense, 'id'> & { id?: Id }) {
  await db.expenses.put({ ...data, id: data.id ?? newId() })
}

export async function deleteExpense(id: Id) {
  await db.expenses.delete(id)
}
