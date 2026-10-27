// Calcul des statistiques à partir des pays marqués.

import { COUNTRIES, COUNTRY_BY_ISO2 } from './countries'
import { CONTINENTS, type ContinentId } from './continents'
import type { CountryEntry } from '../db/schema'
import { countedCountry, getPlace } from './places'

export type Stats = {
  /** Pays comptés (parmi les 195) ; une île ou une nation visitée compte pour son pays */
  visitedCountries: string[]
  /** Îles et nations visitées (Tenerife, Écosse…) */
  visitedParts: string[]
  /** Territoires visités (non comptés) */
  visitedTerritories: string[]
  wishlist: string[]
  total: number
  ratio: number
  byContinent: { id: ContinentId; name: string; color: string; visited: number; total: number }[]
}

export function computeStats(entries: CountryEntry[]): Stats {
  const visited = entries.filter((e) => e.status === 'visited').map((e) => e.code)
  const visitedCountries = [...new Set(visited.map(countedCountry).filter((c): c is string => !!c))]
  const visitedParts = visited.filter((c) => !COUNTRY_BY_ISO2.has(c) && countedCountry(c))
  const visitedTerritories = visited.filter((c) => getPlace(c)?.kind === 'territory')
  const total = COUNTRIES.length

  return {
    visitedCountries,
    visitedParts,
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
