// Import des photos : lecture des métadonnées EXIF, compression, rattachement automatique à une étape.

import imageCompression from 'browser-image-compression'
// Copie locale du script de compression utilisé dans le « worker » (sinon il est téléchargé
// depuis un CDN, ce qui ne marche pas hors connexion)
import compressionLibUrl from 'browser-image-compression/dist/browser-image-compression.js?url'
import exifr from 'exifr'
import { geoDistance } from 'd3-geo'
import type { LatLng, Stop } from '../db/schema'

const libURL = new URL(compressionLibUrl, location.href).href

export type PhotoMeta = { takenAt?: string; coords?: LatLng }

/**
 * Heure de prise de vue telle qu'affichée sur l'appareil (« 2026-07-09T07:12:00 »).
 * L'EXIF ne contient pas de fuseau horaire : on garde l'heure locale du voyage, sans conversion,
 * sinon une photo prise à 7 h en Californie serait datée de la veille.
 */
function localStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** Date de prise de vue et position GPS, si présentes dans la photo */
export async function readPhotoMeta(file: File): Promise<PhotoMeta> {
  try {
    const tags = await exifr.parse(file, { tiff: true, exif: true, gps: true, xmp: false, icc: false, iptc: false, jfif: false })
    if (!tags) return {}
    const date: Date | undefined = tags.DateTimeOriginal ?? tags.CreateDate
    const hasGps = typeof tags.latitude === 'number' && typeof tags.longitude === 'number' && !(tags.latitude === 0 && tags.longitude === 0)
    return {
      takenAt: date instanceof Date && !isNaN(date.getTime()) ? localStamp(date) : undefined,
      coords: hasGps ? { lat: tags.latitude, lng: tags.longitude } : undefined,
    }
  } catch {
    return {}
  }
}

/** Image principale (~2000 px) et miniature (~400 px), en JPEG */
export async function compressPhoto(file: File): Promise<{ blob: Blob; thumb: Blob }> {
  const common = { useWebWorker: true, libURL, fileType: 'image/jpeg' }
  const blob = await imageCompression(file, { ...common, maxWidthOrHeight: 2000, initialQuality: 0.82 })
  const thumb = await imageCompression(blob, { ...common, maxWidthOrHeight: 400, initialQuality: 0.7 })
  return { blob, thumb }
}

const EARTH_KM = 6371

/** Distance en km entre deux points */
export const distanceKm = (a: LatLng, b: LatLng) => geoDistance([a.lng, a.lat], [b.lng, b.lat]) * EARTH_KM

/**
 * Étape la plus proche de l'endroit où la photo a été prise, si elle est à moins de `maxKm`.
 * En cas d'égalité de distance (même ville visitée deux fois), on préfère l'étape du bon jour.
 */
export function nearestStop(coords: LatLng, stops: Stop[], maxKm: number, takenDate?: string): Stop | undefined {
  let best: Stop | undefined
  let bestScore = Infinity
  for (const s of stops) {
    if (!s.coords) continue
    const d = distanceKm(coords, s.coords)
    if (d > maxKm) continue
    // Petit bonus si la date correspond au jour de l'étape
    const score = d - (takenDate && s.date === takenDate ? maxKm / 2 : 0)
    if (score < bestScore) {
      bestScore = score
      best = s
    }
  }
  return best
}
