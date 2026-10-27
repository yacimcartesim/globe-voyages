import { useEffect, useState } from 'react'
import { Loader2, MapPin, Trash2, WifiOff } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { Row, Section } from '../ui/GroupedList'
import { Button } from '../ui/controls'
import { ChipPicker, ChipSection, FieldRow, InlineInput, TextArea, TextInput } from '../ui/forms'
import { SearchField } from '../ui/SearchField'
import { STOP_TYPES, TRANSPORTS } from '../data/stopTypes'
import { searchPlaces, type GeoResult } from '../services/geocode'
import { addStop, dateOfDay, deleteStop, formatDay, tripLength, updateStop } from '../db/trips'
import type { LatLng, Stop, StopType, TransportMode, Trip } from '../db/schema'

type Props = {
  open: boolean
  onClose: () => void
  trip: Trip
  /** Étape à modifier ; absente = nouvelle étape */
  stop?: Stop
  /** Jour proposé pour une nouvelle étape */
  defaultDay?: number
  /** Nombre d'étapes déjà présentes (1re étape : pas de transport à choisir) */
  isFirst: boolean
}

type Draft = {
  name: string
  coords?: LatLng
  type: StopType
  day?: number
  transport?: TransportMode
  lodging: string
  notes: string
}

/** Ajout ou modification d'une étape, avec recherche du lieu sur OpenStreetMap */
export function StopSheet({ open, onClose, trip, stop, defaultDay, isFirst }: Props) {
  const [draft, setDraft] = useState<Draft>({ name: '', type: 'city', lodging: '', notes: '' })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(
      stop
        ? { ...stop, lodging: stop.lodging ?? '', notes: stop.notes ?? '' }
        : { name: '', type: 'city', day: defaultDay, transport: isFirst ? undefined : 'car', lodging: '', notes: '' },
    )
    setQuery('')
    setResults([])
    setConfirmDelete(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Recherche du lieu, 600 ms après la dernière frappe (respect de Nominatim)
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([])
      setSearchError(false)
      return
    }
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await searchPlaces(query, ctrl.signal)
        if (!ctrl.signal.aborted) {
          setResults(r)
          setSearchError(false)
        }
      } catch {
        if (!ctrl.signal.aborted) setSearchError(true)
      } finally {
        if (!ctrl.signal.aborted) setSearching(false)
      }
    }, 600)
    return () => {
      clearTimeout(timer)
      ctrl.abort()
    }
  }, [query])

  const set = (changes: Partial<Draft>) => setDraft((d) => ({ ...d, ...changes }))

  const choose = (r: GeoResult) => {
    set({ name: r.name, coords: r.coords, type: r.suggestedType })
    setQuery('')
    setResults([])
  }

  const days = tripLength(trip)
  const valid = draft.name.trim().length > 0

  const save = async () => {
    if (!valid) return
    const data = {
      name: draft.name.trim(),
      coords: draft.coords,
      type: draft.type,
      day: draft.day,
      date: dateOfDay(trip.start, draft.day),
      transport: draft.transport,
      lodging: draft.lodging.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    }
    if (stop) await updateStop(stop, data)
    else await addStop(trip.id, data)
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={stop ? 'Modifier l’étape' : 'Nouvelle étape'}
      leading={
        <Button variant="plain" onClick={onClose}>
          Annuler
        </Button>
      }
      trailing={
        <Button variant="plain" onClick={save} disabled={!valid} className="font-semibold">
          OK
        </Button>
      }
    >
      <div className="pt-2">
        {/* Recherche du lieu */}
        <div className="px-4 pb-3">
          <SearchField value={query} onChange={setQuery} placeholder="Chercher un lieu (ville, parc, hôtel…)" />
        </div>

        {(results.length > 0 || searching || searchError) && (
          <Section footer="Données © OpenStreetMap">
            {searching && results.length === 0 && (
              <Row label={<span className="text-label-2">Recherche…</span>} accessory={<Loader2 size={18} className="animate-spin text-label-2" />} />
            )}
            {searchError && (
              <Row
                icon={WifiOff}
                iconColor="var(--gray)"
                label={<span className="text-label-2">Recherche impossible sans réseau. Saisis le nom à la main.</span>}
              />
            )}
            {results.map((r, i) => (
              <Row
                key={`${r.label}-${i}`}
                icon={MapPin}
                iconColor="var(--red)"
                label={
                  <span className="block">
                    <span className="block">{r.name}</span>
                    <span className="text-footnote line-clamp-1 block text-label-2">{r.label}</span>
                  </span>
                }
                onClick={() => choose(r)}
              />
            ))}
          </Section>
        )}

        <Section
          header="Lieu"
          footer={
            draft.coords
              ? `Position : ${draft.coords.lat.toFixed(4)}, ${draft.coords.lng.toFixed(4)}`
              : 'Sans position, l’étape n’apparaîtra pas sur la carte.'
          }
        >
          <TextInput placeholder="Nom de l’étape" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </Section>

        <ChipSection header="Type">
          <ChipPicker options={STOP_TYPES} value={draft.type} onChange={(type) => set({ type })} />
        </ChipSection>

        <Section>
          <FieldRow label="Jour">
            <select
              value={draft.day ?? ''}
              onChange={(e) => set({ day: e.target.value ? Number(e.target.value) : undefined })}
              className="h-11 appearance-none bg-transparent text-right text-[17px] text-label-2 outline-none"
            >
              <option value="">Non défini</option>
              {Array.from({ length: Math.max(days ?? 0, draft.day ?? 0, 30) }, (_, i) => i + 1).map((d) => {
                const date = dateOfDay(trip.start, d)
                return (
                  <option key={d} value={d}>
                    Jour {d}
                    {date ? ` · ${formatDay(date)}` : ''}
                  </option>
                )
              })}
            </select>
          </FieldRow>
        </Section>

        {!isFirst && (
          <ChipSection header="Pour y arriver">
            <ChipPicker options={TRANSPORTS} value={draft.transport} onChange={(transport) => set({ transport })} />
          </ChipSection>
        )}

        <Section>
          <FieldRow label="Logement">
            <InlineInput placeholder="Hôtel, Airbnb, camping…" value={draft.lodging} onChange={(e) => set({ lodging: e.target.value })} />
          </FieldRow>
        </Section>

        <Section header="Notes">
          <TextArea placeholder="Conseils, horaires, réservations…" value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Section>

        {stop && (
          <Section>
            <Row
              icon={Trash2}
              iconColor="var(--red)"
              destructive
              label={confirmDelete ? 'Toucher encore pour confirmer' : 'Supprimer l’étape'}
              onClick={async () => {
                if (!confirmDelete) return setConfirmDelete(true)
                await deleteStop(stop)
                onClose()
              }}
            />
          </Section>
        )}
      </div>
    </BottomSheet>
  )
}
