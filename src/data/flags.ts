// Drapeaux SVG (paquet flag-icons, format 4:3), embarqués dans l'app pour le hors-ligne.

const FLAG_URLS = import.meta.glob('../../node_modules/flag-icons/flags/4x3/*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

const BY_CODE = new Map(
  Object.entries(FLAG_URLS).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]),
)

/** Adresse du drapeau SVG d'un pays (code ISO alpha-2 en minuscules) */
export function flagUrl(code: string): string | undefined {
  return BY_CODE.get(code)
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>()

/**
 * Charge un drapeau sous forme d'image dessinable dans un canvas.
 * Les SVG de flag-icons n'ont pas de taille fixe : on l'ajoute (640 × 480),
 * sinon certains navigateurs refusent de les dessiner.
 */
export function loadFlagImage(code: string): Promise<HTMLImageElement | null> {
  let p = imageCache.get(code)
  if (!p) {
    p = (async () => {
      const url = flagUrl(code)
      if (!url) return null
      try {
        let svg = await (await fetch(url)).text()
        if (!/<svg[^>]*\swidth=/.test(svg)) svg = svg.replace('<svg', '<svg width="640" height="480"')
        const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
        const img = new Image()
        img.src = blobUrl
        await img.decode()
        return img
      } catch {
        return null
      }
    })()
    imageCache.set(code, p)
  }
  return p
}
