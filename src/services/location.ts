// Position actuelle (Geolocation API), pour joindre l'endroit où l'on est à une note.

import type { LatLng } from '../db/schema'

export class LocationError extends Error {}

export function currentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new LocationError('Localisation non disponible sur cet appareil.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) =>
        reject(
          new LocationError(
            e.code === e.PERMISSION_DENIED
              ? 'Accès à la position refusé. Autorise-le dans Réglages → Confidentialité → Service de localisation.'
              : 'Position introuvable pour le moment.',
          ),
        ),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  })
}
