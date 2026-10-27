import { useEffect, useRef, useState } from 'react'
import { LngLatBounds, Map as MapLibre, Marker, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { WifiOff } from 'lucide-react'
import type { Stop } from '../db/schema'
import { stopType } from '../data/stopTypes'
import { useColorScheme } from '../hooks/useColorScheme'

// Carte d'itinéraire : MapLibre + tuiles gratuites OpenFreeMap (sans clé).
// Style clair « positron » ou sombre « dark » selon le thème de l'iPhone.

// Le « worker » de MapLibre (qui prépare les tuiles en arrière-plan) est un fichier à part :
// on indique où Vite l'a rangé, sinon MapLibre le cherche au mauvais endroit
setWorkerUrl(workerUrl)

const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
}

type Props = {
  stops: Stop[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/** Noms des lieux en français quand ils existent dans OpenStreetMap */
function frenchLabels(map: MapLibre) {
  for (const layer of map.getStyle().layers) {
    if (layer.type !== 'symbol') continue
    const field = map.getLayoutProperty(layer.id, 'text-field')
    if (field && JSON.stringify(field).includes('name')) {
      map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:fr'], ['get', 'name:latin'], ['get', 'name']])
    }
  }
}

/** Tracés entre étapes : ligne pleine (route), pointillés (avion) */
function routesGeoJSON(stops: Stop[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: stops
      .filter((s) => s.route && s.route.length > 1)
      .map((s) => ({
        type: 'Feature',
        properties: { plane: s.transport === 'plane' },
        geometry: { type: 'LineString', coordinates: s.route! },
      })),
  }
}

function addRouteLayers(map: MapLibre, stops: Stop[], blue: string) {
  if (map.getSource('routes')) return
  map.addSource('routes', { type: 'geojson', data: routesGeoJSON(stops) })
  map.addLayer({
    id: 'route-casing',
    type: 'line',
    source: 'routes',
    filter: ['!', ['get', 'plane']],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.9 },
  })
  map.addLayer({
    id: 'route-line',
    type: 'line',
    source: 'routes',
    filter: ['!', ['get', 'plane']],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': blue, 'line-width': 4 },
  })
  // Vols : un seul arc fin en pointillés, discret
  map.addLayer({
    id: 'route-plane',
    type: 'line',
    source: 'routes',
    filter: ['get', 'plane'],
    layout: { 'line-cap': 'round' },
    paint: { 'line-color': blue, 'line-width': 1.5, 'line-opacity': 0.7, 'line-dasharray': [2, 3] },
  })
}

export default function ItineraryMap({ stops, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibre | null>(null)
  const markersRef = useRef<Map<string, Marker>>(new Map())
  const stopsRef = useRef(stops)
  stopsRef.current = stops
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const scheme = useColorScheme()
  const [offline, setOffline] = useState(false)

  const blue = () => getComputedStyle(document.documentElement).getPropertyValue('--blue').trim() || '#007aff'

  // Création de la carte
  useEffect(() => {
    const map = new MapLibre({
      container: containerRef.current!,
      style: STYLES[scheme],
      center: [2.35, 48.85],
      zoom: 2,
      attributionControl: { compact: true },
      // Limite la résolution comme pour le globe (batterie)
      pixelRatio: Math.min(window.devicePixelRatio, 2),
    })
    map.on('style.load', () => {
      setOffline(false)
      frenchLabels(map)
      addRouteLayers(map, stopsRef.current, blue())
    })
    // Crédits OpenStreetMap repliés en petit bouton « i » (ils restent accessibles)
    map.once('load', () => containerRef.current?.querySelector('.maplibregl-compact-show')?.classList.remove('maplibregl-compact-show'))
    map.on('error', () => {
      if (!map.isStyleLoaded()) setOffline(true)
    })
    mapRef.current = map
    const markers = markersRef.current
    return () => {
      markers.clear()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Changement de thème clair/sombre (pas au premier affichage : le bon style est déjà chargé)
  const initialScheme = useRef(scheme)
  useEffect(() => {
    if (scheme === initialScheme.current) return
    initialScheme.current = scheme
    mapRef.current?.setStyle(STYLES[scheme])
  }, [scheme])

  // Tracés et marqueurs numérotés
  const key = stops.map((s) => `${s.id}:${s.coords?.lat},${s.coords?.lng}:${s.type}:${s.route?.length ?? 0}`).join('|')
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    ;(map.getSource('routes') as GeoJSONSource | undefined)?.setData(routesGeoJSON(stops))

    markersRef.current.forEach((m) => m.remove())
    markersRef.current.clear()
    stops.forEach((s, i) => {
      if (!s.coords) return
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'stop-marker'
      el.textContent = String(i + 1)
      el.style.background = stopType(s.type).color
      el.setAttribute('aria-label', `Étape ${i + 1} : ${s.name}`)
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onSelectRef.current(s.id)
      })
      markersRef.current.set(s.id, new Marker({ element: el }).setLngLat([s.coords.lng, s.coords.lat]).addTo(map))
    })

    // Cadre la carte sur toutes les étapes
    const pts = stops.filter((s) => s.coords)
    if (pts.length === 1) map.jumpTo({ center: [pts[0].coords!.lng, pts[0].coords!.lat], zoom: 9 })
    if (pts.length > 1) {
      const b = new LngLatBounds()
      pts.forEach((s) => b.extend([s.coords!.lng, s.coords!.lat]))
      map.fitBounds(b, { padding: 48, maxZoom: 11, duration: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Étape sélectionnée : la carte s'y centre
  useEffect(() => {
    const map = mapRef.current
    markersRef.current.forEach((m, id) => m.getElement().classList.toggle('is-selected', id === selectedId))
    const s = stops.find((x) => x.id === selectedId)
    if (map && s?.coords) map.flyTo({ center: [s.coords.lng, s.coords.lat], zoom: Math.max(map.getZoom(), 10), duration: 900 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  return (
    <div className="relative h-full w-full">
      {/* Taille en style direct : la feuille de style de MapLibre impose « position: relative » au conteneur */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {offline && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-elevated text-center text-label-2">
          <WifiOff size={28} strokeWidth={1.6} />
          <p className="text-footnote max-w-60">Carte indisponible hors connexion pour cette zone. Les étapes restent visibles ci-dessous.</p>
        </div>
      )}
    </div>
  )
}
