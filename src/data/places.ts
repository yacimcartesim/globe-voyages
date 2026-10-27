// Point d'entrée unique pour retrouver un pays ou un territoire à partir de son code.

import { COUNTRIES, COUNTRY_BY_ISO2 } from './countries'
import { TERRITORIES, TERRITORY_BY_CODE } from './territories'
import { CONTINENTS, type ContinentId } from './continents'
import partsData from './parts.json'

/** Île ou nation affichée à part sur le globe, qui compte pour son pays (Tenerife → Espagne) */
export type Part = { code: string; name: string; parent: string; kind: 'ile' | 'nation'; flag?: string }

export const PARTS = partsData.parts as Part[]
const PART_BY_CODE = new Map(PARTS.map((p) => [p.code, p]))

/** Pays entièrement découpés en nations (Royaume-Uni) : on ne peut choisir que leurs nations */
const SPLIT_COUNTRIES = new Set(PARTS.filter((p) => p.kind === 'nation').map((p) => p.parent))

/** Pays des 195 qu'un lieu fait compter : lui-même, ou son pays pour une île/nation */
export function countedCountry(code: string): string | null {
  if (COUNTRY_BY_ISO2.has(code)) return code
  return PART_BY_CODE.get(code)?.parent ?? null
}

export type Place = {
  code: string
  name: string
  /** true = un des 195 pays comptés */
  counted: boolean
  continent: ContinentId | null
  /** Pays de rattachement (territoires, îles, nations) */
  parent: string | null
  kind: 'country' | 'territory' | 'ile' | 'nation'
}

export const PLACES: Place[] = [
  ...COUNTRIES.filter((c) => !SPLIT_COUNTRIES.has(c.iso2)).map((c) => ({
    code: c.iso2,
    name: c.name,
    counted: true,
    continent: c.continent,
    parent: null,
    kind: 'country' as const,
  })),
  ...PARTS.map((p) => ({
    code: p.code,
    name: p.name,
    counted: false,
    continent: COUNTRY_BY_ISO2.get(p.parent)?.continent ?? null,
    parent: p.parent,
    kind: p.kind,
  })),
  ...TERRITORIES.map((t) => ({
    code: t.code,
    name: t.name,
    counted: false,
    continent: t.parent ? (COUNTRY_BY_ISO2.get(t.parent)?.continent ?? null) : null,
    parent: t.parent,
    kind: 'territory' as const,
  })),
].sort((a, b) => a.name.localeCompare(b.name, 'fr'))

const BY_CODE = new Map(PLACES.map((p) => [p.code, p]))
// Pays découpés : gardés pour l'affichage d'anciennes données (nom, drapeau)
for (const code of SPLIT_COUNTRIES) {
  const c = COUNTRY_BY_ISO2.get(code)!
  BY_CODE.set(code, { code, name: c.name, counted: true, continent: c.continent, parent: null, kind: 'country' })
}

export const getPlace = (code: string) => BY_CODE.get(code)

/** Nom affiché, ex. « Guyane » ; code inconnu → code en majuscules */
export const placeName = (code: string) => BY_CODE.get(code)?.name ?? code.toUpperCase()

/** Sous-titre d'un lieu : « Europe », « Île · Espagne » ou « Territoire · France » */
export function placeSubtitle(code: string): string {
  const p = BY_CODE.get(code)
  if (!p) return ''
  if (p.counted) return CONTINENTS.find((c) => c.id === p.continent)?.name ?? ''
  const parent = p.parent ? COUNTRY_BY_ISO2.get(p.parent)?.name : null
  if (p.kind === 'ile') return `Île · ${parent}`
  if (p.kind === 'nation') return `Nation · ${parent}`
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
