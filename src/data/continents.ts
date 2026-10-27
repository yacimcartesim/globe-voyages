// Les 6 continents utilisés pour les statistiques (le nombre de pays de chacun
// est calculé à partir de la liste de référence, voir countries.ts).

export type ContinentId = 'africa' | 'north-america' | 'south-america' | 'asia' | 'europe' | 'oceania'

export const CONTINENTS: { id: ContinentId; name: string; color: string }[] = [
  { id: 'europe', name: 'Europe', color: 'var(--blue)' },
  { id: 'asia', name: 'Asie', color: 'var(--orange)' },
  { id: 'africa', name: 'Afrique', color: 'var(--yellow)' },
  { id: 'north-america', name: 'Amérique du Nord', color: 'var(--red)' },
  { id: 'south-america', name: 'Amérique du Sud', color: 'var(--green)' },
  { id: 'oceania', name: 'Océanie', color: 'var(--teal)' },
]
