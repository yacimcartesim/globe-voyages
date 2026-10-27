// Calcul des statistiques à partir des pays marqués.

import { COUNTRIES, COUNTRY_BY_ISO2 } from './countries'
import { CONTINENTS, type ContinentId } from './continents'
import type { CountryEntry } from '../db/schema'

export type Stats = {
  /** Pays comptés (parmi les 195) */
  visitedCountries: string[]
  /** Territoires visités (non comptés) */
  visitedTerritories: string[]
  wishlist: string[]
  total: number
  ratio: number
  byContinent: { id: ContinentId; name: string; color: string; visited: number; total: number }[]
}

export function computeStats(entries: CountryEntry[]): Stats {
  const visited = entries.filter((e) => e.status === 'visited').map((e) => e.code)
  const visitedCountries = visited.filter((c) => COUNTRY_BY_ISO2.has(c))
  const visitedTerritories = visited.filter((c) => !COUNTRY_BY_ISO2.has(c))
  const total = COUNTRIES.length

  return {
    visitedCountries,
    visitedTerritories,
    wishlist: entries.filter((e) => e.status === 'wishlist').map((e) => e.code),
    total,
    ratio: visitedCountries.length / total,
    byContinent: CONTINENTS.map((c) => ({
      ...c,
      total: COUNTRIES.filter((x) => x.continent === c.id).length,
      visited: visitedCountries.filter((code) => COUNTRY_BY_ISO2.get(code)?.continent === c.id).length,
    })),
  }
}

/** Pourcentage arrondi pour l'affichage : 0,5 % → « 0,5 », 12,3 % → « 12 » */
export function formatPercent(ratio: number): string {
  const p = ratio * 100
  if (p > 0 && p < 1) return p.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
  return Math.round(p).toString()
}
