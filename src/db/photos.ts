// Lecture et modification des photos d'un voyage.

import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from './db'
import { updateTrip } from './trips'
import type { Id, Photo, Stop } from './schema'
import { compressPhoto, nearestStop, readPhotoMeta } from '../services/photos'

/** Photos d'un voyage, triées par date de prise de vue (les photos sans date à la fin) */
export function usePhotos(tripId: Id | null): Photo[] | undefined {
  return useLiveQuery(async () => {
    if (!tripId) return []
    const photos = await db.photos.where('tripId').equals(tripId).toArray()
    return photos.sort((a, b) => (a.takenAt ?? '9').localeCompare(b.takenAt ?? '9'))
  }, [tripId])
}

export function usePhoto(id: Id | undefined): Photo | undefined {
  return useLiveQuery(() => (id ? db.photos.get(id) : undefined), [id])
}

/** Image d'une photo, prête à afficher ou à exporter */
export function photoBlob(photo: Photo, size: 'image' | 'thumb'): Blob {
  return new Blob([photo[size]], { type: photo.mime })
}

/**
 * Adresse temporaire pour afficher une photo enregistrée (libérée automatiquement).
 * `photo` absent = rien à afficher.
 */
export function usePhotoUrl(photo: Photo | undefined, size: 'image' | 'thumb'): string | undefined {
  const [url, setUrl] = useState<string>()
  const data = photo?.[size]
  useEffect(() => {
    if (!photo || !data) return setUrl(undefined)
    const u = URL.createObjectURL(photoBlob(photo, size))
    setUrl(u)
    return () => URL.revokeObjectURL(u)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])
  return url
}

export type ImportReport = { total: number; withGps: number; matched: number; failed: number }

/**
 * Importe des photos dans un voyage : lecture EXIF, compression, rattachement automatique
 * à l'étape la plus proche (à moins de `maxKm`). Les photos sans position restent « à classer ».
 */
export async function importPhotos(
  tripId: Id,
  files: File[],
  stops: Stop[],
  maxKm: number,
  onProgress: (done: number) => void,
): Promise<ImportReport> {
  const report: ImportReport = { total: files.length, withGps: 0, matched: 0, failed: 0 }
  let done = 0
  let firstId: Id | undefined
  for (const file of files) {
    try {
      const meta = await readPhotoMeta(file)
      const { blob, thumb } = await compressPhoto(file)
      const stop = meta.coords ? nearestStop(meta.coords, stops, maxKm, meta.takenAt?.slice(0, 10)) : undefined
      const id = newId()
      firstId ??= id
      await db.photos.add({
        id,
        tripId,
        stopId: stop?.id,
        image: await blob.arrayBuffer(),
        thumb: await thumb.arrayBuffer(),
        mime: blob.type || 'image/jpeg',
        takenAt: meta.takenAt,
        coords: meta.coords,
      })
      if (meta.coords) report.withGps++
      if (stop) report.matched++
    } catch (e) {
      console.error('Import photo impossible', file.name, e instanceof Error ? `${e.name} : ${e.message}` : String(e))
      report.failed++
    }
    onProgress(++done)
  }
  // Première photo importée : elle devient la couverture du voyage s'il n'en a pas
  const trip = await db.trips.get(tripId)
  if (trip && !trip.coverPhotoId && firstId) await updateTrip(tripId, { coverPhotoId: firstId })
  return report
}

export async function updatePhoto(id: Id, changes: Partial<Photo>) {
  await db.photos.update(id, changes)
}

export async function deletePhoto(photo: Photo) {
  await db.photos.delete(photo.id)
  const trip = await db.trips.get(photo.tripId)
  if (trip?.coverPhotoId === photo.id) await updateTrip(trip.id, { coverPhotoId: undefined })
}
