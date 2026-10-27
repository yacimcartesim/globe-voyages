// Schéma des données de l'app (version 2).
//
// Toutes les données vivent dans IndexedDB, sur l'appareil. Les identifiants sont des
// chaînes uniques (UUID) pour pouvoir fusionner des sauvegardes sans collision.
// Les dates sont au format ISO « AAAA-MM-JJ » (jour) ou ISO complet (horodatage).
//
// Pour faire évoluer le schéma : incrémenter SCHEMA_VERSION, ajouter une version
// dans db.ts avec sa fonction de migration, et adapter l'import des sauvegardes.

export const SCHEMA_VERSION = 2

/**
 * Version 2 : le Royaume-Uni est découpé en nations sur le globe.
 * Un « gb » existant devient l'Angleterre (modifiable ensuite dans l'app).
 */
export const RENAMED_CODES_V2: Record<string, string> = { gb: 'gb-eng' }
export const renameCodeV2 = (code: string) => RENAMED_CODES_V2[code] ?? code

export type Id = string
export type ISODate = string // « 2026-07-14 »
export type ISODateTime = string // « 2026-07-14T09:30:00.000Z »
export type LatLng = { lat: number; lng: number }

/** Pays ou territoire marqué sur le globe (code ISO alpha-2 en minuscules) */
export type CountryEntry = {
  code: string
  status: 'visited' | 'wishlist'
  /** Date de première visite (facultative) */
  firstVisit?: ISODate
  /** Wishlist : note et priorité */
  note?: string
  priority?: 1 | 2 | 3
  addedAt: ISODateTime
}

export type Trip = {
  id: Id
  title: string
  /** Pays/territoires concernés : un voyage peut en couvrir plusieurs */
  countries: string[]
  start?: ISODate
  end?: ISODate
  coverPhotoId?: Id
  /** Devise principale (code ISO 4217, ex. « USD ») */
  currency: string
  companions?: string
  /** Infos pratiques : une entrée par section, texte riche simple (Markdown léger) */
  practical: Partial<Record<PracticalSection, string>>
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

export const PRACTICAL_SECTIONS = [
  'transport',
  'lodging',
  'money',
  'visa',
  'tips',
  'pitfalls',
  'deals',
] as const
export type PracticalSection = (typeof PRACTICAL_SECTIONS)[number]

export type StopType = 'city' | 'park' | 'lodging' | 'poi' | 'event'
export type TransportMode = 'car' | 'plane' | 'train' | 'bus' | 'boat' | 'foot' | 'bike' | 'other'

export type Stop = {
  id: Id
  tripId: Id
  /** Position dans l'itinéraire (0, 1, 2…) */
  order: number
  /** Jour du voyage (1 = premier jour) */
  day?: number
  date?: ISODate
  name: string
  coords?: LatLng
  type: StopType
  notes?: string
  lodging?: string
  /** Moyen de transport pour arriver à cette étape */
  transport?: TransportMode
  /** Tracé depuis l'étape précédente, enregistré pour l'affichage hors-ligne ([lng, lat]) */
  route?: [number, number][]
}

export type ExpenseCategory = 'lodging' | 'transport' | 'food' | 'activities' | 'events' | 'misc'

export type Expense = {
  id: Id
  tripId: Id
  stopId?: Id
  label?: string
  amount: number
  currency: string
  /** Taux utilisé (1 unité de la devise = rate €) et montant converti */
  rate: number
  amountEUR: number
  category: ExpenseCategory
  date: ISODate
}

export type Photo = {
  id: Id
  tripId: Id
  stopId?: Id
  /**
   * Image compressée (~2000 px) et miniature (~400 px), en données binaires JPEG.
   * (Pas en Blob : WebKit/Safari refuse parfois d'enregistrer des Blob dans IndexedDB.)
   */
  image: ArrayBuffer
  thumb: ArrayBuffer
  mime: string
  caption?: string
  /** Heure locale de prise de vue, sans fuseau (« 2026-07-09T07:12:00 ») */
  takenAt?: string
  coords?: LatLng
}

export type QuickNote = {
  id: Id
  text: string
  createdAt: ISODateTime
  coords?: LatLng
  /** Voyage lié ; absent = boîte de réception */
  tripId?: Id
}

/** Lieu précis de la wishlist (les pays de la wishlist sont dans CountryEntry) */
export type WishPlace = {
  id: Id
  name: string
  countryCode?: string
  coords?: LatLng
  note?: string
  priority?: 1 | 2 | 3
  createdAt: ISODateTime
}

/** Réglages et informations techniques (clé/valeur) */
export type MetaEntry = { key: string; value: unknown }
