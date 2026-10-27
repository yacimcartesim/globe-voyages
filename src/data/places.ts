// Point d'entrée unique pour retrouver un pays ou un territoire à partir de son code.

import { COUNTRIES, COUNTRY_BY_ISO2 } from './countries'
import { TERRITORIES, TERRITORY_BY_CODE } from './territories'
import { CONTINENTS, type ContinentId } from './continents'

export type Place = {
  code: string
  name: string
  /** true = un des 195 pays comptés */
  counted: boolean
  continent: ContinentId | null
  /** Pays de rattachement (territoires) */
  parent: string | null
}

export const PLACES: Place[] = [
  ...COUNTRIES.map((c) => ({ code: c.iso2, name: c.name, counted: true, continent: c.continent, parent: null })),
  ...TERRITORIES.map((t) => ({
    code: t.code,
    name: t.name,
    counted: false,
    continent: t.parent ? (COUNTRY_BY_ISO2.get(t.parent)?.continent ?? null) : null,
    parent: t.parent,
  })),
].sort((a, b) => a.name.localeCompare(b.name, 'fr'))

const BY_CODE = new Map(PLACES.map((p) => [p.code, p]))

export const getPlace = (code: string) => BY_CODE.get(code)

/** Nom affiché, ex. « Guyane » ; code inconnu → code en majuscules */
export const placeName = (code: string) => BY_CODE.get(code)?.name ?? code.toUpperCase()

/** Sous-titre d'un lieu : « Europe » ou « Territoire · France » */
export function placeSubtitle(code: string): string {
  const p = BY_CODE.get(code)
  if (!p) return ''
  if (p.counted) return CONTINENTS.find((c) => c.id === p.continent)?.name ?? ''
  const parent = p.parent ? COUNTRY_BY_ISO2.get(p.parent)?.name : null
  return parent ? `Territoire · ${parent}` : 'Territoire à statut particulier'
}

/** Recherche insensible aux accents et à la casse (« reunion » trouve « La Réunion ») */
export function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'-]/g, ' ')
    .toLowerCase()
    .trim()
}

export const TOTAL_COUNTRIES = COUNTRIES.length
export { TERRITORY_BY_CODE }
