// Tracé entre deux étapes.
//
// - Voiture / bus / moto : itinéraire routier via le serveur public OSRM (gratuit, sans clé)
// - Avion : arc de grand cercle (le chemin le plus court sur le globe)
// - Autres (train, bateau, à pied…) ou OSRM indisponible : ligne droite
//
// Le tracé est enregistré avec l'étape : la carte s'affiche ensuite sans réseau.

import { geoInterpolate } from 'd3-geo'
import type { LatLng, TransportMode } from '../db/schema'

export type Route = [number, number][] // [lng, lat]

const OSRM = 'https://router.project-osrm.org/route/v1/driving'

const straight = (a: LatLng, b: LatLng): Route => [
  [a.lng, a.lat],
  [b.lng, b.lat],
]

/** Arc de grand cercle découpé en 64 segments */
export function greatCircle(a: LatLng, b: LatLng): Route {
  const interp = geoInterpolate([a.lng, a.lat], [b.lng, b.lat])
  return Array.from({ length: 65 }, (_, i) => interp(i / 64) as [number, number])
}

/** Simplifie une ligne (algorithme de Douglas-Peucker) pour limiter la place prise */
export function simplify(points: Route, tolerance = 0.0004): Route {
  if (points.length <= 2) return points
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()!
    const [x1, y1] = points[s]
    const [x2, y2] = points[e]
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    let maxD = 0
    let idx = -1
    for (let i = s + 1; i < e; i++) {
      const d = Math.abs(dy * points[i][0] - dx * points[i][1] + x2 * y1 - y2 * x1) / len
      if (d > maxD) {
        maxD = d
        idx = i
      }
    }
    if (maxD > tolerance && idx > 0) {
      keep[idx] = 1
      stack.push([s, idx], [idx, e])
    }
  }
  return points.filter((_, i) => keep[i])
}

async function roadRoute(a: LatLng, b: LatLng): Promise<Route | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    const res = await fetch(`${OSRM}/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`, {
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const data = (await res.json()) as { routes?: { geometry: { coordinates: Route } }[] }
    const coords = data.routes?.[0]?.geometry.coordinates
    return coords?.length ? simplify(coords) : null
  } catch {
    return null
  }
}

/** Calcule le tracé pour arriver à une étape depuis la précédente */
export async function computeRoute(from: LatLng, to: LatLng, mode: TransportMode | undefined): Promise<Route> {
  if (mode === 'plane') return greatCircle(from, to)
  if (mode === 'car' || mode === 'bus' || mode === undefined) {
    return (await roadRoute(from, to)) ?? straight(from, to)
  }
  return straight(from, to)
}
