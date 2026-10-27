// Génère l'image plaquée sur le globe : océan, pays en gris, wishlist en bleu pâle
// et drapeaux découpés sur la forme exacte des pays visités.
//
// L'image est en projection équirectangulaire (longitude → x, latitude → y), le format
// attendu par le globe. 4096 × 2048 px : la taille maximale sûre pour le WebGL de l'iPhone.

import { geoEquirectangular, geoPath } from 'd3-geo'
import type { Feature, Polygon } from 'geojson'
import { SHAPES, SHAPE_BY_CODE, type Shape } from './geo'
import { loadFlagImage } from '../data/flags'

export const TEX_W = 4096
export const TEX_H = 2048

export type Palette = {
  ocean: string
  land: string
  border: string
  wish: string
  wishBorder: string
  badgeRing: string
}

export const PALETTE_LIGHT: Palette = {
  ocean: '#cfe0f0',
  land: '#e9e9ee',
  border: '#ffffff',
  wish: '#a9cdf7',
  wishBorder: '#ffffff',
  badgeRing: '#ffffff',
}

export const PALETTE_DARK: Palette = {
  ocean: '#0f1d2b',
  land: '#3a3a3e',
  border: '#1f1f22',
  wish: '#2b5287',
  wishBorder: '#1f1f22',
  badgeRing: '#ffffff',
}

// Projection : la longitude -180° est au bord gauche, la latitude 90° en haut.
// d3-geo découpe automatiquement les formes qui traversent l'antiméridien (Russie, Fidji…).
const projection = geoEquirectangular()
  .scale(TEX_W / (2 * Math.PI))
  .translate([TEX_W / 2, TEX_H / 2])
  .precision(0.1)
const toPath = geoPath(projection)

// Formes converties une seule fois en Path2D (dessin rapide et réutilisable)
type Prepared = {
  shape: Shape
  path: Path2D
  polys: { path: Path2D; box: Box }[]
  mainBox: Box
  /** Cadre du drapeau principal : le plus grand polygone + les petites îles toutes proches (Corse…) */
  flagBox: Box
}
type Box = { x0: number; y0: number; x1: number; y1: number }

const boxOf = (f: Feature<Polygon>): Box => {
  const [[x0, y0], [x1, y1]] = toPath.bounds(f)
  return { x0, y0, x1, y1 }
}

const boxArea = (b: Box) => (b.x1 - b.x0) * (b.y1 - b.y0)
const gapBetween = (a: Box, b: Box) => Math.max(a.x0 - b.x1, b.x0 - a.x1, a.y0 - b.y1, b.y0 - a.y1, 0)

/**
 * Agrandit le cadre du drapeau aux petites îles proches du polygone principal.
 * Les grands morceaux ou les territoires lointains (Alaska, Hawaï…) n'y entrent pas :
 * ils reçoivent leur propre drapeau, pour ne pas étirer celui du pays.
 */
function flagBoxOf(main: Box, boxes: Box[]): Box {
  const size = Math.max(main.x1 - main.x0, main.y1 - main.y0)
  const b = { ...main }
  for (const box of boxes) {
    if (boxArea(box) < 0.15 * boxArea(main) && gapBetween(box, main) < 0.25 * size) {
      b.x0 = Math.min(b.x0, box.x0)
      b.y0 = Math.min(b.y0, box.y0)
      b.x1 = Math.max(b.x1, box.x1)
      b.y1 = Math.max(b.y1, box.y1)
    }
  }
  return b
}

let prepared: Prepared[] | null = null
function prepare(): Prepared[] {
  if (!prepared) {
    prepared = SHAPES.map((shape) => {
      const polys = shape.polygons.map((p) => ({ path: new Path2D(toPath(p) ?? ''), box: boxOf(p) }))
      const mainBox = boxOf(shape.main)
      return {
        shape,
        path: new Path2D(toPath(shape.feature) ?? ''),
        polys,
        mainBox,
        flagBox: flagBoxOf(mainBox, polys.map((p) => p.box)),
      }
    })
  }
  return prepared
}

const PREPARED_BY_CODE = () => new Map(prepare().filter((p) => p.shape.code).map((p) => [p.shape.code!, p]))

/** Latitude (degrés) correspondant à une ordonnée de l'image */
const latAt = (y: number) => 90 - (y / TEX_H) * 180

// Les drapeaux peuvent être légèrement étirés (35 % max) pour épouser la forme du pays :
// c'est invisible à l'œil et ça évite de ne voir que le centre d'un drapeau sur un pays allongé.
const FLAG_RATIO = 4 / 3
const MAX_STRETCH = 1.35

/**
 * Rectangle (dans l'image) où dessiner le drapeau pour qu'il recouvre la zone b (mode « cover »).
 * Correction de latitude : sur le globe, l'image est comprimée horizontalement d'un facteur
 * cos(latitude). On élargit donc le drapeau d'autant pour qu'il garde ses proportions.
 */
function coverRect(b: Box): Box {
  const cx = (b.x0 + b.x1) / 2
  const cy = (b.y0 + b.y1) / 2
  const cos = Math.max(0.25, Math.cos((latAt(cy) * Math.PI) / 180))
  const wSphere = Math.max(1, (b.x1 - b.x0) * cos)
  const h = Math.max(1, b.y1 - b.y0)
  const ratio = Math.min(FLAG_RATIO * MAX_STRETCH, Math.max(FLAG_RATIO / MAX_STRETCH, wSphere / h))
  const fh = Math.max(h, wSphere / ratio)
  const fw = (fh * ratio) / cos
  return { x0: cx - fw / 2, y0: cy - fh / 2, x1: cx + fw / 2, y1: cy + fh / 2 }
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, b: Box) {
  const r = coverRect(b)
  ctx.drawImage(img, r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0)
}

const BADGE_THRESHOLD = 10 // px : en dessous, le pays devient une pastille ronde

function isTiny(b: Box) {
  return b.x1 - b.x0 < BADGE_THRESHOLD && b.y1 - b.y0 < BADGE_THRESHOLD
}

/** Pastille ronde avec drapeau pour les micro-États et petites îles (Vatican, Malte, Tuvalu…) */
function drawBadge(ctx: CanvasRenderingContext2D, img: HTMLImageElement, b: Box, ring: string) {
  const cx = (b.x0 + b.x1) / 2
  const cy = (b.y0 + b.y1) / 2
  const cos = Math.max(0.25, Math.cos((latAt(cy) * Math.PI) / 180))
  const ry = 7
  const rx = ry / cos
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.clip()
  drawCover(ctx, img, { x0: cx - rx, y0: cy - ry, x1: cx + rx, y1: cy + ry })
  ctx.restore()
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = ring
  ctx.stroke()
}

/** Dessine le drapeau d'un pays visité, découpé sur sa forme */
function drawFlag(ctx: CanvasRenderingContext2D, p: Prepared, img: HTMLImageElement, palette: Palette, alpha = 1) {
  ctx.save()
  ctx.globalAlpha = alpha
  if (isTiny(p.mainBox)) {
    drawBadge(ctx, img, p.mainBox, palette.badgeRing)
  } else {
    // 1. Drapeau principal cadré sur le plus grand polygone (et ses petites îles proches)
    ctx.save()
    ctx.clip(p.path)
    drawCover(ctx, img, p.flagBox)
    ctx.restore()
    // 2. Les polygones lointains qui dépassent ce cadre (Alaska, Hawaï, îles…) reçoivent leur propre drapeau
    const cover = coverRect(p.flagBox)
    for (const poly of p.polys) {
      const b = poly.box
      const inside = b.x0 >= cover.x0 && b.x1 <= cover.x1 && b.y0 >= cover.y0 && b.y1 <= cover.y1
      if (inside) continue
      ctx.save()
      ctx.clip(poly.path)
      drawCover(ctx, img, b)
      ctx.restore()
    }
  }
  ctx.restore()
}

export type TextureState = {
  visited: string[]
  wishlist: string[]
  palette: Palette
}

/**
 * Dessine l'image complète du globe.
 * `hidden` : pays visité à ne pas encore dessiner (il apparaîtra ensuite en fondu).
 */
export async function renderTexture(canvas: HTMLCanvasElement, state: TextureState, hidden?: string) {
  const ctx = canvas.getContext('2d')!
  // En développement : image accessible depuis la console pour l'inspecter
  if (import.meta.env.DEV) (window as unknown as { __globeTexture: HTMLCanvasElement }).__globeTexture = canvas
  const all = prepare()
  const byCode = PREPARED_BY_CODE()
  const { palette } = state

  // Les drapeaux sont chargés avant de commencer à dessiner (pas d'image à moitié faite)
  const flags = new Map(
    await Promise.all(state.visited.map(async (code) => [code, await loadFlagImage(code)] as const)),
  )

  ctx.fillStyle = palette.ocean
  ctx.fillRect(0, 0, TEX_W, TEX_H)

  ctx.fillStyle = palette.land
  for (const p of all) ctx.fill(p.path)

  ctx.fillStyle = palette.wish
  for (const code of state.wishlist) {
    const p = byCode.get(code)
    if (p) ctx.fill(p.path)
  }

  for (const code of state.visited) {
    if (code === hidden) continue
    const p = byCode.get(code)
    const img = flags.get(code)
    // (les micro-États sont dessinés en pastille plus bas, au-dessus des frontières)
    if (p && img && !isTiny(p.mainBox)) drawFlag(ctx, p, img, palette)
  }

  // Frontières fines par-dessus tout
  ctx.lineJoin = 'round'
  ctx.lineWidth = 1.1
  ctx.strokeStyle = palette.border
  for (const p of all) ctx.stroke(p.path)

  // Pastilles des micro-États redessinées au-dessus des frontières
  for (const code of state.visited) {
    if (code === hidden) continue
    const p = byCode.get(code)
    const img = flags.get(code)
    if (p && img && isTiny(p.mainBox)) drawBadge(ctx, img, p.mainBox, palette.badgeRing)
  }
}

/**
 * Fait apparaître le drapeau d'un pays en fondu.
 * `onFrame` est appelé à chaque étape pour envoyer l'image mise à jour au globe.
 */
export async function fadeInFlag(
  canvas: HTMLCanvasElement,
  code: string,
  palette: Palette,
  onFrame: () => void,
  durationMs = 600,
) {
  const p = PREPARED_BY_CODE().get(code)
  const img = await loadFlagImage(code)
  if (!p || !img) return
  const ctx = canvas.getContext('2d')!

  // Sauvegarde de la zone avant le drapeau (avec une marge pour les pastilles et polygones lointains)
  const zone = p.polys.reduce(
    (z, { box }) => ({ x0: Math.min(z.x0, box.x0), y0: Math.min(z.y0, box.y0), x1: Math.max(z.x1, box.x1), y1: Math.max(z.y1, box.y1) }),
    { ...p.mainBox },
  )
  const x = Math.max(0, Math.floor(zone.x0 - 30))
  const y = Math.max(0, Math.floor(zone.y0 - 30))
  const w = Math.min(TEX_W - x, Math.ceil(zone.x1 - zone.x0 + 60))
  const h = Math.min(TEX_H - y, Math.ceil(zone.y1 - zone.y0 + 60))
  const before = ctx.getImageData(x, y, w, h)

  const steps = 6
  for (let i = 1; i <= steps; i++) {
    await new Promise((r) => setTimeout(r, durationMs / steps))
    ctx.putImageData(before, x, y)
    drawFlag(ctx, p, img, palette, i / steps)
    ctx.lineWidth = 1.1
    ctx.strokeStyle = palette.border
    ctx.stroke(p.path)
    if (isTiny(p.mainBox)) drawBadge(ctx, img, p.mainBox, palette.badgeRing)
    onFrame()
  }
}

/** Indique si un code a une forme sur le globe */
export const hasShape = (code: string) => SHAPE_BY_CODE.has(code)
