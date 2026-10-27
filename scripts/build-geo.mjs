// Prépare les frontières du globe à partir de Natural Earth 50m (« map units »).
//
// - Télécharge le fichier source s'il n'est pas déjà là (une seule fois)
// - Identifie chaque zone par son code ISO alpha-2 (« fr », « gf », « gl »…)
// - Fusionne les découpages internes inutiles (régions belges…) en gardant à part les
//   territoires (Guyane, Réunion, Groenland, Svalbard…)
// - Sépare les îles et nations de src/data/parts.json (Tenerife, Corse, Écosse…)
// - Simplifie légèrement et écrit src/data/world.topo.json (embarqué dans l'app, hors-ligne)
//
// Lancer avec : npm run geo

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { geoCentroid } from 'd3-geo'
import { topology } from 'topojson-server'
import { mergeArcs, quantize } from 'topojson-client'
import { presimplify, quantile, simplify } from 'topojson-simplify'

const SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_map_units.geojson'
const CACHE = 'scripts/.cache/ne_50m_admin_0_map_units.geojson'
const OUT = 'src/data/world.topo.json'

if (!existsSync(CACHE)) {
  console.log('Téléchargement de Natural Earth…')
  mkdirSync('scripts/.cache', { recursive: true })
  const res = await fetch(SOURCE_URL)
  if (!res.ok) throw new Error(`Téléchargement impossible (${res.status})`)
  writeFileSync(CACHE, await res.text())
}

const source = JSON.parse(readFileSync(CACHE, 'utf8'))
const { parts } = JSON.parse(readFileSync('src/data/parts.json', 'utf8'))

// Îles et nations : zone Natural Earth entière (« unit ») ou polygones du pays parent
// dont le centre tombe dans un rectangle (« bbox »)
for (const part of parts) {
  if (part.unit) {
    const f = source.features.find((x) => x.properties.NAME === part.unit)
    if (!f) throw new Error(`Zone introuvable : ${part.unit}`)
    f.properties.PART = part.code
    continue
  }
  const [w, s, e, n] = part.bbox
  const inBox = (rings) => {
    const [x, y] = geoCentroid({ type: 'Polygon', coordinates: rings })
    return x >= w && x <= e && y >= s && y <= n
  }
  const parent = source.features.find((x) => codeOf(x.properties) === part.parent && x.geometry.type === 'MultiPolygon'
    && x.geometry.coordinates.some(inBox))
  if (!parent) throw new Error(`Île introuvable : ${part.name}`)
  const polys = parent.geometry.coordinates
  parent.geometry.coordinates = polys.filter((r) => !inBox(r))
  source.features.push({
    type: 'Feature',
    properties: { ...parent.properties, PART: part.code, NAME_FR: part.name },
    geometry: { type: 'MultiPolygon', coordinates: polys.filter(inBox) },
  })
}

// Code de chaque zone : ISO alpha-2 « étendu » de Natural Earth (gère France, Norvège, Kosovo…)
function codeOf(p) {
  if (p.PART) return p.PART
  const c = p.ISO_A2_EH
  return c && c !== '-99' ? c.toLowerCase() : null
}

// Regroupe les zones par code. Les zones sans code (Chypre du Nord, Somaliland, Siachen…)
// restent seules, grises et non cliquables.
const groups = new Map()
source.features.forEach((f, i) => {
  const code = codeOf(f.properties)
  const key = code ?? `_${i}`
  if (!groups.has(key)) groups.set(key, { code, features: [] })
  groups.get(key).features.push(f)
})

// Une seule topologie pour toutes les zones : les frontières communes sont partagées
const features = source.features.map((f, i) => ({ ...f, id: i }))
const topo = topology({ units: { type: 'FeatureCollection', features } }, 1e5)
const unitGeoms = topo.objects.units.geometries

const merged = []
for (const { code, features: fs } of groups.values()) {
  const geoms = fs.map((f) => unitGeoms[source.features.indexOf(f)])
  // Fusion : supprime les frontières internes entre les zones d'un même code
  const geom = geoms.length > 1 ? mergeArcs(topo, geoms) : { ...geoms[0] }
  const p = fs.find((f) => f.properties.TYPE !== 'Geo unit' || codeOf(f.properties))?.properties ?? fs[0].properties
  geom.properties = {
    code,
    // Nom français fourni par Natural Earth (sert de repli pour les territoires)
    name: code === 'fr' ? 'France' : p.NAME_FR || p.NAME,
    // Code ISO du pays souverain (ex. « fr » pour la Guyane)
    sov: p.SOV_A3,
  }
  delete geom.id
  merged.push(geom)
}

topo.objects = { countries: { type: 'GeometryCollection', geometries: merged } }

// Simplification légère : garde les petites îles, allège les côtes très détaillées
const pre = presimplify(topo)
const simplified = simplify(pre, quantile(pre, 0.4))
// Retire les poids de simplification (3e coordonnée) puis recompresse les coordonnées
simplified.arcs = simplified.arcs.map((arc) => arc.map(([x, y]) => [x, y]))
const out = quantize(simplified, 1e5)

writeFileSync(OUT, JSON.stringify(out))
const codes = merged.map((g) => g.properties.code).filter(Boolean)
console.log(`${merged.length} zones (${codes.length} avec un code ISO) → ${OUT}`)
console.log(`Taille : ${(JSON.stringify(out).length / 1024).toFixed(0)} Ko`)
