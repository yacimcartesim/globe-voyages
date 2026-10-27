// Formes des pays (Natural Earth) : chargement, découpage en polygones, recherche au toucher.

import { feature } from 'topojson-client'
import { geoArea, geoBounds, geoCentroid, geoContains, geoDistance } from 'd3-geo'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import type { Topology, GeometryCollection } from 'topojson-specification'
import worldTopo from '../data/world.topo.json'

type Props = { code: string | null; name: string }
export type CountryFeature = Feature<Polygon | MultiPolygon, Props>

export type Shape = {
  code: string | null
  feature: CountryFeature
  /** Chaque polygone séparément (île, enclave…) */
  polygons: Feature<Polygon>[]
  /** Plus grand polygone : sert à centrer la caméra et à cadrer le drapeau */
  main: Feature<Polygon>
  bounds: [[number, number], [number, number]]
  /** Centre du plus grand polygone [lng, lat] */
  center: [number, number]
  /** Surface (stéradians) */
  area: number
}

const topo = worldTopo as unknown as Topology<{ countries: GeometryCollection<Props> }>
const collection = feature(topo, topo.objects.countries)

function splitPolygons(f: CountryFeature): Feature<Polygon>[] {
  const g = f.geometry
  const rings = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  return rings.map((coordinates) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates } }))
}

export const SHAPES: Shape[] = (collection.features as CountryFeature[])
  .filter((f) => f.geometry)
  .map((f) => {
    const polygons = splitPolygons(f)
    const main = polygons.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a))
    return {
      code: f.properties.code,
      feature: f,
      polygons,
      main,
      bounds: geoBounds(f) as Shape['bounds'],
      center: geoCentroid(main) as [number, number],
      area: geoArea(f),
    }
  })

export const SHAPE_BY_CODE = new Map(SHAPES.filter((s) => s.code).map((s) => [s.code!, s]))

/** Vrai si le point est dans le rectangle géographique (gère l'antiméridien) */
function inBounds([[w, s], [e, n]]: Shape['bounds'], lng: number, lat: number) {
  if (lat < s || lat > n) return false
  return w <= e ? lng >= w && lng <= e : lng >= w || lng <= e
}

/**
 * Trouve le pays ou territoire touché sur le globe.
 * Si aucun ne contient le point (micro-État, petite île), prend le plus proche dans un rayon d'environ 150 km.
 */
export function findShapeAt(lat: number, lng: number): Shape | null {
  for (const s of SHAPES) {
    if (s.code && inBounds(s.bounds, lng, lat) && geoContains(s.feature, [lng, lat])) return s
  }
  let best: Shape | null = null
  let bestDist = 0.025 // en radians ≈ 160 km
  for (const s of SHAPES) {
    if (!s.code || s.area > 0.002) continue
    const d = geoDistance(s.center, [lng, lat])
    if (d < bestDist) {
      bestDist = d
      best = s
    }
  }
  return best
}

/** Altitude de caméra adaptée à la taille du pays (pour l'animation de centrage) */
export function altitudeFor(shape: Shape): number {
  const [[w, s], [e, n]] = geoBounds(shape.main)
  const span = Math.max(n - s, (e >= w ? e - w : e + 360 - w) * Math.cos((shape.center[1] * Math.PI) / 180))
  return Math.min(2.6, Math.max(1.1, 0.7 + span / 14))
}
