// Mode démo : remplit l'app avec un exemple (road trip dans l'Ouest américain) pour la tester.
// Tout ce qui est créé est noté, pour pouvoir l'effacer ensuite sans toucher à tes vraies données.

import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId, nowISO } from './db'
import { addStop, createTrip, deleteTrip, updateTrip } from './trips'
import type { Expense, Stop } from './schema'
import { saveExpense } from './expenses'

type DemoRecord = { tripIds: string[]; countryCodes: string[]; wishPlaceIds?: string[]; noteIds?: string[] }
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

// Dépenses : [index de l'étape, date, catégorie, libellé, montant en USD]
const EXPENSES: [number | null, string, Expense['category'], string, number][] = [
  [0, '2026-07-06', 'transport', 'Location de voiture (11 jours)', 612],
  [0, '2026-07-06', 'lodging', 'Hôtel Santa Monica (2 nuits)', 398],
  [0, '2026-07-07', 'food', 'Tacos à Venice Beach', 34.5],
  [0, '2026-07-07', 'activities', 'Griffith Observatory (parking)', 20],
  [1, '2026-07-08', 'transport', 'Plein d’essence', 71.2],
  [2, '2026-07-09', 'activities', 'Entrée Death Valley', 35],
  [2, '2026-07-09', 'lodging', 'The Ranch at Death Valley', 289],
  [2, '2026-07-09', 'food', 'Eau et provisions', 26.8],
  [3, '2026-07-10', 'lodging', 'Hôtel sur le Strip (2 nuits)', 316],
  [3, '2026-07-11', 'events', 'Spectacle du Cirque du Soleil', 178],
  [3, '2026-07-11', 'food', 'Buffet', 62],
  [4, '2026-07-13', 'transport', 'Plein d’essence', 64.9],
  [4, '2026-07-13', 'lodging', 'Airbnb Twentynine Palms', 167],
  [5, '2026-07-14', 'food', 'Dîner à Palm Springs', 58],
  [null, '2026-07-16', 'misc', 'Souvenirs', 45],
]
const DEMO_RATE = 0.8745 // 1 USD en euros (juillet 2026), fixé pour fonctionner hors connexion

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
  const stopIds: string[] = []
  for (const s of STOPS) stopIds.push(await addStop(tripId, { ...s, date: undefined }))
  for (const [stop, date, category, label, amount] of EXPENSES) {
    await saveExpense({
      tripId,
      stopId: stop === null ? undefined : stopIds[stop],
      date,
      category,
      label,
      amount,
      currency: 'USD',
      rate: DEMO_RATE,
      amountEUR: Math.round(amount * DEMO_RATE * 100) / 100,
    })
  }

  // Un lieu de wishlist et une note rapide à classer
  const wishId = newId()
  await db.wishPlaces.add({
    id: wishId,
    name: 'Machu Picchu',
    countryCode: 'pe',
    coords: { lat: -13.1631, lng: -72.545 },
    note: 'Par le chemin de l’Inca, en saison sèche (mai à septembre)',
    priority: 3,
    createdAt: now,
  })
  const noteId = newId()
  await db.notes.add({
    id: noteId,
    text: 'Peggy Sue’s Diner à Yermo\nMilkshakes géants, déco années 50, pause parfaite sur la route de Las Vegas',
    createdAt: now,
    coords: { lat: 34.9036, lng: -116.8253 },
    tripId,
  })

  const record: DemoRecord = { tripIds: [tripId], countryCodes, wishPlaceIds: [wishId], noteIds: [noteId] }
  await db.meta.put({ key: KEY, value: record })
}

export async function clearDemo() {
  const entry = await db.meta.get(KEY)
  if (!entry) return
  const record = entry.value as DemoRecord
  for (const id of record.tripIds) await deleteTrip(id)
  await db.countries.bulkDelete(record.countryCodes)
  await db.wishPlaces.bulkDelete(record.wishPlaceIds ?? [])
  await db.notes.bulkDelete(record.noteIds ?? [])
  await db.meta.delete(KEY)
}
