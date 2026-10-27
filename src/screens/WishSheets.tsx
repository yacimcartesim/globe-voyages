import { useEffect, useState } from 'react'
import { Check, Loader2, MapPin, PartyPopper, Trash2, WifiOff } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { Row, Section } from '../ui/GroupedList'
import { Button } from '../ui/controls'
import { ChipPicker, ChipSection, TextArea, TextInput } from '../ui/forms'
import { Flag } from '../ui/Flag'
import { SearchField } from '../ui/SearchField'
import { placeName, placeSubtitle } from '../data/places'
import { markVisited, removeCountry, updateCountry } from '../db/countries'
import { deleteWishPlace, PRIORITIES, saveWishPlace, type Priority } from '../db/wishlist'
import { searchPlaces, type GeoResult } from '../services/geocode'
import type { CountryEntry, LatLng, WishPlace } from '../db/schema'
import { useUI } from '../state/ui'

const priorityOptions = PRIORITIES.map((p) => ({ value: String(p.value) as '1' | '2' | '3', label: p.label }))

/** Bloc « C'est fait ! » : le pays devient visité, puis on propose de créer le voyage */
function DoneBlock({ countryCode, onDone, onClose }: { countryCode?: string; onDone: () => Promise<void>; onClose: () => void }) {
  const { startNewTrip } = useUI()
  const [done, setDone] = useState(false)
  useEffect(() => setDone(false), [countryCode])

  if (done) {
    return (
      <div className="mx-4 mb-6 rounded-[22px] bg-elevated p-5 text-center">
        <PartyPopper size={36} strokeWidth={1.6} className="mx-auto mb-2 text-orange" />
        <p className="text-headline">Bravo, c’est fait !</p>
        <p className="text-subhead mt-1 mb-4 text-label-2">
          {countryCode ? `${placeName(countryCode)} est maintenant sur ton globe.` : 'Ce lieu est coché.'} Tu veux créer le voyage ?
        </p>
        <div className="flex gap-2">
          <Button variant="tinted" className="flex-1" onClick={onClose}>
            Plus tard
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onClose()
              startNewTrip(countryCode ? [countryCode] : [])
            }}
          >
            Créer le voyage
          </Button>
        </div>
      </div>
    )
  }
  return (
    <div className="mx-4 mb-6">
      <Button
        size="lg"
        icon={Check}
        onClick={async () => {
          await onDone()
          setDone(true)
        }}
      >
        C’est fait !
      </Button>
    </div>
  )
}

/** Fiche d'un pays de la wishlist : note, priorité, « C'est fait », retrait */
export function WishCountrySheet({ entry, onClose }: { entry: CountryEntry | null; onClose: () => void }) {
  const [note, setNote] = useState('')
  useEffect(() => setNote(entry?.note ?? ''), [entry?.code])
  const code = entry?.code

  const close = () => {
    if (code && note.trim() !== (entry?.note ?? '')) void updateCountry(code, { note: note.trim() || undefined })
    onClose()
  }

  return (
    <BottomSheet
      open={!!entry}
      onClose={close}
      trailing={
        <Button variant="plain" onClick={close}>
          OK
        </Button>
      }
    >
      {entry && code && (
        <div>
          <div className="flex flex-col items-center px-6 pb-6 text-center">
            <Flag code={code} size={96} radius={12} />
            <h2 className="text-title-1 mt-4">{placeName(code)}</h2>
            <p className="text-subhead mt-1 text-label-2">{placeSubtitle(code)}</p>
          </div>

          <DoneBlock countryCode={code} onDone={() => markVisited(code)} onClose={onClose} />

          {entry.status === 'wishlist' && (
            <>
              <ChipSection header="Priorité">
                <ChipPicker
                  options={priorityOptions}
                  value={String(entry.priority ?? 1) as '1' | '2' | '3'}
                  onChange={(v) => updateCountry(code, { priority: Number(v) as Priority })}
                />
              </ChipSection>

              <Section header="Note">
                <TextArea placeholder="Pourquoi, quand, avec qui…" value={note} onChange={(e) => setNote(e.target.value)} />
              </Section>

              <Section>
                <Row
                  icon={Trash2}
                  iconColor="var(--red)"
                  destructive
                  label="Retirer de la wishlist"
                  onClick={async () => {
                    await removeCountry(code)
                    onClose()
                  }}
                />
              </Section>
            </>
          )}
        </div>
      )}
    </BottomSheet>
  )
}

/** Ajout ou modification d'un lieu précis de la wishlist (recherche OpenStreetMap) */
export function WishPlaceSheet({ open, place, onClose }: { open: boolean; place?: WishPlace; onClose: () => void }) {
  const [name, setName] = useState('')
  const [coords, setCoords] = useState<LatLng>()
  const [countryCode, setCountryCode] = useState<string>()
  const [note, setNote] = useState('')
  const [prio, setPrio] = useState<Priority>(2)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(place?.name ?? '')
    setCoords(place?.coords)
    setCountryCode(place?.countryCode)
    setNote(place?.note ?? '')
    setPrio(place?.priority ?? 2)
    setQuery('')
    setResults([])
  }, [open, place])

  // Recherche 600 ms après la dernière frappe (politique d'usage de Nominatim)
  useEffect(() => {
    if (query.trim().length < 3) return setResults([])
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await searchPlaces(query, ctrl.signal)
        if (!ctrl.signal.aborted) {
          setResults(r)
          setError(false)
        }
      } catch {
        if (!ctrl.signal.aborted) setError(true)
      } finally {
        if (!ctrl.signal.aborted) setSearching(false)
      }
    }, 600)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query])

  const save = async () => {
    if (!name.trim()) return
    await saveWishPlace({ id: place?.id, name: name.trim(), coords, countryCode, note: note.trim() || undefined, priority: prio })
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={place ? 'Lieu à visiter' : 'Nouveau lieu'}
      leading={
        <Button variant="plain" onClick={onClose}>
          Annuler
        </Button>
      }
      trailing={
        <Button variant="plain" onClick={save} disabled={!name.trim()} className="font-semibold">
          OK
        </Button>
      }
    >
      <div className="pt-2">
        {place && (
          <DoneBlock
            countryCode={place.countryCode}
            onDone={async () => {
              if (place.countryCode) await markVisited(place.countryCode)
              await deleteWishPlace(place.id)
            }}
            onClose={onClose}
          />
        )}

        <div className="px-4 pb-3">
          <SearchField value={query} onChange={setQuery} placeholder="Chercher un lieu (Machu Picchu, Kyoto…)" />
        </div>
        {(results.length > 0 || searching || error) && (
          <Section footer="Données © OpenStreetMap">
            {searching && results.length === 0 && <Row label={<span className="text-label-2">Recherche…</span>} accessory={<Loader2 size={18} className="animate-spin" />} />}
            {error && <Row icon={WifiOff} iconColor="var(--gray)" label={<span className="text-label-2">Recherche impossible sans réseau.</span>} />}
            {results.map((r, i) => (
              <Row
                key={i}
                icon={MapPin}
                iconColor="var(--red)"
                label={
                  <span className="block">
                    <span className="block">{r.name}</span>
                    <span className="text-footnote line-clamp-1 block text-label-2">{r.label}</span>
                  </span>
                }
                onClick={() => {
                  setName(r.name)
                  setCoords(r.coords)
                  setCountryCode(r.countryCode)
                  setQuery('')
                  setResults([])
                }}
              />
            ))}
          </Section>
        )}

        <Section footer={countryCode ? `${placeName(countryCode)}${coords ? ' · position enregistrée' : ''}` : undefined}>
          <TextInput placeholder="Nom du lieu" value={name} onChange={(e) => setName(e.target.value)} />
        </Section>

        <ChipSection header="Priorité">
          <ChipPicker options={priorityOptions} value={String(prio) as '1' | '2' | '3'} onChange={(v) => setPrio(Number(v) as Priority)} />
        </ChipSection>

        <Section header="Note">
          <TextArea placeholder="Pourquoi, quand, avec qui…" value={note} onChange={(e) => setNote(e.target.value)} />
        </Section>

        {place && (
          <Section>
            <Row
              icon={Trash2}
              iconColor="var(--red)"
              destructive
              label="Supprimer le lieu"
              onClick={async () => {
                await deleteWishPlace(place.id)
                onClose()
              }}
            />
          </Section>
        )}
      </div>
    </BottomSheet>
  )
}
