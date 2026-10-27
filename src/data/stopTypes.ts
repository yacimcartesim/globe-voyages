// Libellés, icônes et couleurs des types d'étape et des moyens de transport.

import { BedDouble, Bike, Building2, Bus, Car, Footprints, MapPin, Plane, Route, Ship, Ticket, TrainFront, Trees, type LucideIcon } from 'lucide-react'
import type { StopType, TransportMode } from '../db/schema'

export const STOP_TYPES: { value: StopType; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'city', label: 'Ville', icon: Building2, color: 'var(--blue)' },
  { value: 'park', label: 'Parc naturel', icon: Trees, color: 'var(--green)' },
  { value: 'lodging', label: 'Logement', icon: BedDouble, color: 'var(--indigo)' },
  { value: 'poi', label: 'Point d’intérêt', icon: MapPin, color: 'var(--orange)' },
  { value: 'event', label: 'Événement', icon: Ticket, color: 'var(--pink)' },
]

export const TRANSPORTS: { value: TransportMode; label: string; icon: LucideIcon }[] = [
  { value: 'car', label: 'Voiture', icon: Car },
  { value: 'plane', label: 'Avion', icon: Plane },
  { value: 'train', label: 'Train', icon: TrainFront },
  { value: 'bus', label: 'Bus', icon: Bus },
  { value: 'boat', label: 'Bateau', icon: Ship },
  { value: 'foot', label: 'À pied', icon: Footprints },
  { value: 'bike', label: 'Vélo', icon: Bike },
  { value: 'other', label: 'Autre', icon: Route },
]

export const stopType = (t: StopType) => STOP_TYPES.find((s) => s.value === t) ?? STOP_TYPES[3]
export const transport = (t?: TransportMode) => TRANSPORTS.find((s) => s.value === t)
