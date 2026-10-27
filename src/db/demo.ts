// Mode démo : remplit l'app avec un exemple (road trip dans l'Ouest américain) pour la tester.
// Tout ce qui est créé est noté, pour pouvoir l'effacer ensuite sans toucher à tes vraies données.

import { useLiveQuery } from 'dexie-react-hooks'
import { db, nowISO } from './db'
import { addStop, createTrip, deleteTrip, updateTrip } from './trips'
import type { Stop } from './schema'

type DemoRecord = { tripIds: string[]; countryCodes: string[] }
const KEY = 'demo'

export function useDemoLoaded(): boolean {
  return useLiveQuery(async () => !!(await db.meta.get(KEY)), [], false)
}

const STOPS: Omit<Stop, 'id' | 'tripId' | 'order'>[] = [
  {
    name: 'Los Angeles',
    coords: { lat: 34.0522, lng: -118.2437 },
    type: 'city',
    day: 1,
    transport: 'plane',
    lodging: 'Hôtel à Santa Monica',
    notes: 'Arrivée à LAX. Récupération de la voiture de location le lendemain matin.',
  },
  {
    name: 'Mojave',
    coords: { lat: 35.0525, lng: -118.1739 },
    type: 'city',
    day: 3,
    transport: 'car',
    notes: 'Pause au cimetière d’avions, vue depuis la route.',
  },
  {
    name: 'Death Valley',
    coords: { lat: 36.4573, lng: -116.8664 },
    type: 'park',
    day: 4,
    transport: 'car',
    lodging: 'The Ranch at Death Valley',
    notes: 'Badwater Basin au lever du soleil, Zabriskie Point, Artist’s Palette. 48 °C l’après-midi !',
  },
  {
    name: 'Las Vegas',
    coords: { lat: 36.1699, lng: -115.1398 },
    type: 'city',
    day: 5,
    transport: 'car',
    lodging: 'Hôtel sur le Strip',
  },
  {
    name: 'Joshua Tree',
    coords: { lat: 33.8734, lng: -115.901 },
    type: 'park',
    day: 8,
    transport: 'car',
    lodging: 'Airbnb à Twentynine Palms',
    notes: 'Hidden Valley et Cholla Cactus Garden au coucher du soleil.',
  },
  {
    name: 'Palm Springs',
    coords: { lat: 33.8303, lng: -116.5453 },
    type: 'city',
    day: 9,
    transport: 'car',
    lodging: 'Motel mid-century',
  },
  {
    name: 'Aéroport de Los Angeles (LAX)',
    coords: { lat: 33.9416, lng: -118.4085 },
    type: 'poi',
    day: 11,
    transport: 'car',
    notes: 'Rendre la voiture 3 h avant le vol.',
  },
]

const PRACTICAL = {
  transport: `# Location de voiture
- Réservée en avance chez un loueur à LAX, assurance tous risques incluse
- Permis français accepté (permis international conseillé)
- Faire le plein dès que possible dans le désert : stations rares

# À Los Angeles
- Le métro existe (ligne B / D vers Downtown) mais la voiture reste plus pratique`,
  money: `- Carte bancaire acceptée partout, prévoir un peu de cash pour les pourboires
- Pourboire au restaurant : 18 à 20 %
- Les prix affichés sont **hors taxes**`,
  visa: `- Passeport valide + **ESTA** à demander en ligne au moins 72 h avant ([site officiel](https://esta.cbp.dhs.gov))
- Assurance santé indispensable : les frais médicaux sont très élevés`,
  tips: `- Partir tôt le matin dans les parcs, se reposer l’après-midi
- Télécharger les cartes hors connexion : pas de réseau dans Death Valley`,
  pitfalls: `- **Chaleur extrême** dans le désert en juillet : 4 litres d’eau par personne et par jour
- Ne jamais s’écarter de la route en cas de panne
- Parkings payants et chers à Las Vegas`,
  deals: `- Pass annuel des parcs nationaux (« America the Beautiful ») rentabilisé dès 3 parcs
- Buffets moins chers en semaine à Las Vegas`,
}

/** Pays visités ajoutés par la démo (en plus des États-Unis) */
const DEMO_COUNTRIES = ['us', 'fr', 'es', 'it', 'pt', 'gb', 'ma', 'jp', 'is', 'gl']

export async function loadDemo() {
  if (await db.meta.get(KEY)) return
  const existing = new Set((await db.countries.toArray()).map((c) => c.code))
  const countryCodes = DEMO_COUNTRIES.filter((c) => !existing.has(c))
  const now = nowISO()
  await db.countries.bulkPut(countryCodes.map((code) => ({ code, status: 'visited' as const, addedAt: now })))
  for (const code of ['nz', 'pe'].filter((c) => !existing.has(c))) {
    await db.countries.put({ code, status: 'wishlist', addedAt: now })
    countryCodes.push(code)
  }

  const tripId = await createTrip({
    title: 'Road trip dans l’Ouest américain',
    countries: ['us'],
    start: '2026-07-06',
    end: '2026-07-16',
    currency: 'USD',
    companions: 'Léa et Tom',
  })
  await updateTrip(tripId, { practical: PRACTICAL })
  for (const s of STOPS) await addStop(tripId, { ...s, date: undefined })

  const record: DemoRecord = { tripIds: [tripId], countryCodes }
  await db.meta.put({ key: KEY, value: record })
}

export async function clearDemo() {
  const entry = await db.meta.get(KEY)
  if (!entry) return
  const record = entry.value as DemoRecord
  for (const id of record.tripIds) await deleteTrip(id)
  await db.countries.bulkDelete(record.countryCodes)
  await db.meta.delete(KEY)
}
