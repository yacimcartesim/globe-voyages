import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { CanvasTexture, Color, MeshPhongMaterial, SRGBColorSpace } from 'three'
import { altitudeFor, findShapeAt, SHAPE_BY_CODE } from './geo'
import { fadeInFlag, PALETTE_DARK, PALETTE_LIGHT, renderTexture, TEX_H, TEX_W } from './texture'
import { useColorScheme } from '../hooks/useColorScheme'

type Props = {
  visited: string[]
  wishlist: string[]
  /** Pays qui vient d'être ajouté : le globe pivote vers lui puis son drapeau apparaît en fondu */
  reveal: string | null
  onRevealDone: () => void
  /** false quand l'onglet Globe n'est pas affiché : le rendu est mis en pause */
  active: boolean
  autoRotate: boolean
  onSelect: (code: string) => void
}

export type GlobeHandle = { flyTo: (code: string) => void }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Globe 3D (three.js via react-globe.gl) recouvert de l'image générée dans texture.ts.
 */
export const GlobeView = forwardRef<GlobeHandle, Props>(function GlobeView(
  { visited, wishlist, reveal, onRevealDone, active, autoRotate, onSelect },
  ref,
) {
  const globeRef = useRef<GlobeMethods>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const scheme = useColorScheme()
  const palette = scheme === 'dark' ? PALETTE_DARK : PALETTE_LIGHT

  // Image du globe : un canvas 4096 × 2048 transformé en texture three.js
  const canvas = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = TEX_W
    c.height = TEX_H
    return c
  }, [])
  const texture = useMemo(() => {
    const t = new CanvasTexture(canvas)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 8
    return t
  }, [canvas])
  const material = useMemo(
    () => new MeshPhongMaterial({ map: texture, color: 0xffffff, shininess: 3, specular: new Color(0x0c0c0c) }),
    [texture],
  )

  // Taille du globe = taille de son conteneur
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ width: e.contentRect.width, height: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Réglages du rendu une fois le globe créé
  const onGlobeReady = useCallback(() => {
    const g = globeRef.current
    if (!g) return
    // Limite la résolution à 2× : au-delà, l'iPhone chauffe pour une différence invisible
    g.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 2))
    g.pointOfView({ lat: 30, lng: 10, altitude: 2.6 })
  }, [])

  // Rotation automatique lente au repos
  useEffect(() => {
    const c = globeRef.current?.controls()
    if (!c) return
    c.autoRotate = autoRotate
    c.autoRotateSpeed = 0.35
  }, [autoRotate, size.width])

  const flyTo = useCallback((code: string) => {
    const g = globeRef.current
    const shape = SHAPE_BY_CODE.get(code)
    if (!g || !shape) return
    const c = g.controls()
    const wasRotating = c.autoRotate
    c.autoRotate = false
    g.pointOfView({ lng: shape.center[0], lat: shape.center[1], altitude: altitudeFor(shape) }, 1200)
    // La rotation reprend après quelques secondes
    if (wasRotating) setTimeout(() => (c.autoRotate = true), 6000)
  }, [])

  useImperativeHandle(ref, () => ({ flyTo }), [flyTo])

  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // Tap sur un pays : appui court sans glisser → coordonnées → pays touché
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let down: { x: number; y: number; t: number } | null = null
    const onDown = (e: PointerEvent) => {
      down = e.isPrimary ? { x: e.clientX, y: e.clientY, t: e.timeStamp } : null
    }
    // On réagit au « click » final (et non au relâchement) : sinon le click qui suit sur iPhone
    // tomberait sur la fiche qui vient de s'ouvrir
    const onClick = (e: MouseEvent) => {
      const g = globeRef.current
      if (!down || !g) return
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
      const long = e.timeStamp - down.t > 500
      down = null
      if (moved > 8 || long) return
      const rect = el.getBoundingClientRect()
      const coords = g.toGlobeCoords(e.clientX - rect.left, e.clientY - rect.top)
      if (!coords) return // tap dans le vide, à côté du globe
      const shape = findShapeAt(coords.lat, coords.lng)
      if (shape?.code) onSelectRef.current(shape.code)
    }
    el.addEventListener('pointerdown', onDown, true)
    el.addEventListener('click', onClick, true)
    return () => {
      el.removeEventListener('pointerdown', onDown, true)
      el.removeEventListener('click', onClick, true)
    }
  }, [])

  // Pause du rendu quand l'onglet est masqué ou l'app en arrière-plan (économie de batterie)
  useEffect(() => {
    const update = () => {
      const g = globeRef.current
      if (!g) return
      if (active && !document.hidden) g.resumeAnimation()
      else g.pauseAnimation()
    }
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [active, size.width])

  // Régénère l'image du globe quand les pays ou le thème changent.
  // Les rendus sont mis en file pour ne jamais se chevaucher.
  const queue = useRef(Promise.resolve())
  const visitedKey = visited.join(',')
  const wishKey = wishlist.join(',')
  useEffect(() => {
    const revealCode = reveal && visited.includes(reveal) ? reveal : null
    queue.current = queue.current.then(async () => {
      await renderTexture(canvas, { visited, wishlist, palette }, revealCode ?? undefined)
      texture.needsUpdate = true
      if (revealCode) {
        flyTo(revealCode)
        await sleep(1150)
        await fadeInFlag(canvas, revealCode, palette, () => (texture.needsUpdate = true))
        onRevealDone()
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitedKey, wishKey, scheme, reveal])

  return (
    <div ref={containerRef} className="absolute inset-0">
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          rendererConfig={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          globeMaterial={material}
          showAtmosphere
          atmosphereColor={scheme === 'dark' ? '#3a6ea5' : '#9cc3ea'}
          atmosphereAltitude={0.12}
          showGraticules={false}
          animateIn={false}
          onGlobeReady={onGlobeReady}
          // Pas de survol/raycasting à chaque image : les taps sont gérés ci-dessus
          enablePointerInteraction={false}
        />
      )}
    </div>
  )
})
