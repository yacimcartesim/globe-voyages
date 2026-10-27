// Les 6 continents utilisés pour les statistiques.
// Les totaux seront calculés à partir de la liste officielle des 195 pays (phase 2) ;
// ces valeurs servent de repère en attendant.

export type ContinentId = 'africa' | 'north-america' | 'south-america' | 'asia' | 'europe' | 'oceania'

export const CONTINENTS: { id: ContinentId; name: string; color: string; total: number }[] = [
  { id: 'europe', name: 'Europe', color: 'var(--blue)', total: 44 },
  { id: 'asia', name: 'Asie', color: 'var(--orange)', total: 48 },
  { id: 'africa', name: 'Afrique', color: 'var(--yellow)', total: 54 },
  { id: 'north-america', name: 'Amérique du Nord', color: 'var(--red)', total: 23 },
  { id: 'south-america', name: 'Amérique du Sud', color: 'var(--green)', total: 12 },
  { id: 'oceania', name: 'Océanie', color: 'var(--teal)', total: 14 },
]

export const WORLD_TOTAL = 195
