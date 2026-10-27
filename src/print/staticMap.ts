// Image fixe de la carte d'itinéraire, pour le guide imprimable.
//
// 1. Carte MapLibre hors écran, cadrée sur les étapes, avec les tracés ; capture du rendu
// 2. Marqueurs numérotés dessinés par-dessus l'image
// 3. Hors connexion (fond de carte indisponible) : schéma simple des tracés sur fond clair

import { LngLatBounds, Map as MapLibre, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { Stop } from '../db/schema'

setWorkerUrl(workerUrl)

const W = 1000
const H = 600
const SCALE = 2 // image en 2× pour une impression nette
const TYPE_COLORS: Record<Stop['type'], string> = {
  city: '#007aff',
  park: '#34c759',
  lodging: '#5856d6',
  poi: '#ff9500',
  event: '#ff2d55',
}

type Point = { x: number; y: number }

/** Marqueurs numérotés (comme sur la carte de l'app) */
function drawMarkers(ctx: CanvasRenderingContext2D, stops: Stop[], project: (s: Stop) => Point) {
  stops.forEach((s, i) => {
    if (!s.coords) return
    const { x, y } = project(s)
    ctx.beginPath()
    ctx.arc(x, y, 13 * SCALE, 0, Math.PI * 2)
    ctx.fillStyle = TYPE_COLORS[s.type]
    ctx.shadowColor = 'rgba(0,0,0,0.25)'
    ctx.shadowBlur = 6 * SCALE
    ctx.fill()
    ctx.shadowBlur = 0
    ctx.lineWidth = 2.5 * SCALE
    ctx.strokeStyle = '#fff'
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.font = `700 ${12 * SCALE}px -apple-system, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), x, y + 0.5)
  })
}

/** Schéma de repli : tracés et étapes sur fond uni, projection simple */
function schematic(stops: Stop[]): string {
  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#eef3f8'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const pts = stops.flatMap((s) => [...(s.route ?? []), ...(s.coords ? [[s.coords.lng, s.coords.lat] as [number, number]] : [])])
  const lngs = pts.map((p) => p[0])
  const lats = pts.map((p) => p[1])
  const [minX, maxX, minY, maxY] = [Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats)]
  const k = Math.cos((((minY + maxY) / 2) * Math.PI) / 180)
  const spanX = Math.max((maxX - minX) * k, 0.01)
  const spanY = Math.max(maxY - minY, 0.01)
  const pad = 60 * SCALE
  const scale = Math.min((canvas.width - 2 * pad) / spanX, (canvas.height - 2 * pad) / spanY)
  const ox = (canvas.width - spanX * scale) / 2
  const oy = (canvas.height - spanY * scale) / 2
  const proj = (lng: number, lat: number): Point => ({ x: ox + (lng - minX) * k * scale, y: oy + (maxY - lat) * scale })

  for (const s of stops) {
    if (!s.route || s.route.length < 2) continue
    ctx.beginPath()
    s.route.forEach(([lng, lat], i) => {
      const p = proj(lng, lat)
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.setLineDash(s.transport === 'plane' ? [6 * SCALE, 8 * SCALE] : [])
    ctx.lineWidth = (s.transport === 'plane' ? 2 : 4) * SCALE
    ctx.strokeStyle = '#007aff'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }
  ctx.setLineDash([])
  drawMarkers(ctx, stops, (s) => proj(s.coords!.lng, s.coords!.lat))
  return canvas.toDataURL('image/jpeg', 0.9)
}

/** Image de la carte (data URL JPEG). Ne lève jamais d'erreur : au pire, le schéma de repli. */
export async function renderStaticMap(stops: Stop[]): Promise<string | null> {
  const located = stops.filter((s) => s.coords)
  if (located.length === 0) return null

  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-10000px;top:0;width:${W}px;height:${H}px;`
  document.body.appendChild(container)

  try {
    const map = new MapLibre({
      container,
      style: 'https://tiles.openfreemap.org/styles/positron',
      interactive: false,
      attributionControl: false,
      pixelRatio: SCALE,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    })
    const bounds = new LngLatBounds()
    located.forEach((s) => bounds.extend([s.coords!.lng, s.coords!.lat]))

    const ready = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 12_000)
      map.on('error', () => {
        if (!map.isStyleLoaded()) {
          clearTimeout(timer)
          resolve(false)
        }
      })
      map.once('load', () => {
        map.addSource('routes', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: stops
              .filter((s) => s.route && s.route.length > 1)
              .map((s) => ({ type: 'Feature', properties: { plane: s.transport === 'plane' }, geometry: { type: 'LineString', coordinates: s.route! } })),
          },
        })
        map.addLayer({ id: 'casing', type: 'line', source: 'routes', filter: ['!', ['get', 'plane']], layout: { 'line-join': 'round' }, paint: { 'line-color': '#fff', 'line-width': 7 } })
        map.addLayer({ id: 'line', type: 'line', source: 'routes', filter: ['!', ['get', 'plane']], layout: { 'line-join': 'round' }, paint: { 'line-color': '#007aff', 'line-width': 4 } })
        map.addLayer({ id: 'plane', type: 'line', source: 'routes', filter: ['get', 'plane'], paint: { 'line-color': '#007aff', 'line-width': 1.5, 'line-dasharray': [2, 3] } })
        map.fitBounds(bounds, { padding: 70, maxZoom: 11, duration: 0 })
        map.once('idle', () => {
          clearTimeout(timer)
          resolve(true)
        })
      })
    })

    if (!ready) {
      map.remove()
      return schematic(stops)
    }

    const out = document.createElement('canvas')
    out.width = W * SCALE
    out.height = H * SCALE
    const ctx = out.getContext('2d')!
    ctx.drawImage(map.getCanvas(), 0, 0, out.width, out.height)
    drawMarkers(ctx, stops, (s) => {
      const p = map.project([s.coords!.lng, s.coords!.lat])
      return { x: p.x * SCALE, y: p.y * SCALE }
    })
    // Crédit obligatoire des données cartographiques
    ctx.font = `${10 * SCALE}px -apple-system, system-ui, sans-serif`
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText('© OpenFreeMap © OpenMapTiles © OpenStreetMap', out.width - 8 * SCALE, out.height - 6 * SCALE)
    map.remove()
    return out.toDataURL('image/jpeg', 0.9)
  } catch {
    return schematic(stops)
  } finally {
    container.remove()
  }
}
