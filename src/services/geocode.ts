// Recherche de lieux (géocodage) avec Nominatim, le service gratuit d'OpenStreetMap.
//
// Politique d'usage de Nominatim respectée :
// - 1 requête par seconde au maximum (file d'attente ci-dessous)
// - pas de recherche à chaque lettre : l'appelant attend une pause dans la saisie (debounce)
// - résultats identiques gardés en mémoire pour ne pas redemander
// https://operations.osmfoundation.org/policies/nominatim/

import type { LatLng, StopType } from '../db/schema'

export type GeoResult = {
  /** Nom court (« Las Vegas ») */
  name: string
  /** Description complète (« Las Vegas, Comté de Clark, Nevada, États-Unis ») */
  label: string
  coords: LatLng
  /** Code pays ISO alpha-2 en minuscules */
  countryCode?: string
  /** Type d'étape suggéré d'après la nature du lieu */
  suggestedType: StopType
}

const ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const MIN_INTERVAL = 1100 // ms entre deux requêtes

let lastRequest = 0
let chain: Promise<unknown> = Promise.resolve()
const cache = new Map<string, GeoResult[]>()

/** Exécute les requêtes l'une après l'autre, espacées d'au moins 1,1 s */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const wait = lastRequest + MIN_INTERVAL - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    lastRequest = Date.now()
    return fn()
  })
  chain = run.catch(() => undefined)
  return run
}

type NominatimItem = {
  lat: string
  lon: string
  name?: string
  display_name: string
  category?: string
  class?: string
  type?: string
  address?: { country_code?: string; city?: string; town?: string; village?: string }
}

function typeFor(item: NominatimItem): StopType {
  const cls = item.category ?? item.class
  if (cls === 'boundary' && item.type === 'national_park') return 'park'
  if (cls === 'leisure' && (item.type === 'park' || item.type === 'nature_reserve')) return 'park'
  if (cls === 'tourism' && ['hotel', 'motel', 'hostel', 'guest_house', 'camp_site', 'apartment'].includes(item.type ?? '')) return 'lodging'
  if (cls === 'place' || cls === 'boundary') return 'city'
  return 'poi'
}

/** Recherche un lieu. Lève une erreur si le réseau est indisponible. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const key = q.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  return throttled(async () => {
    if (signal?.aborted) return []
    const url = new URL(ENDPOINT)
    url.searchParams.set('q', q)
    url.searchParams.set('format', 'jsonv2')
    url.searchParams.set('addressdetails', '1')
    url.searchParams.set('limit', '6')
    url.searchParams.set('accept-language', 'fr')
    const res = await fetch(url, { signal })
    if (!res.ok) throw new Error(`Nominatim ${res.status}`)
    const items = (await res.json()) as NominatimItem[]
    const results = items.map((it) => ({
      name: it.name || it.display_name.split(',')[0],
      label: it.display_name,
      coords: { lat: Number(it.lat), lng: Number(it.lon) },
      countryCode: it.address?.country_code?.toLowerCase(),
      suggestedType: typeFor(it),
    }))
    cache.set(key, results)
    return results
  })
}
