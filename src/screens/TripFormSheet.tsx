import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { Row, Section } from '../ui/GroupedList'
import { Button, Switch } from '../ui/controls'
import { DateInput, FieldRow, InlineInput, TextInput } from '../ui/forms'
import { Flag } from '../ui/Flag'
import { AddCountrySheet } from './AddCountrySheet'
import { placeName } from '../data/places'
import { CURRENCIES, currencyForCountry, currencyName } from '../data/currencies'
import { createTrip, updateTrip, type TripDraft } from '../db/trips'
import { markVisited } from '../db/countries'
import type { Trip } from '../db/schema'

type Props = {
  open: boolean
  onClose: () => void
  /** Voyage à modifier ; absent = nouveau voyage */
  trip?: Trip
  /** Pays pré-sélectionnés (création depuis la fiche d'un pays) */
  initialCountries?: string[]
  onCreated?: (id: string) => void
}

const empty = (countries: string[] = []): TripDraft => ({
  title: '',
  countries,
  start: undefined,
  end: undefined,
  currency: currencyForCountry(countries[0]),
  companions: '',
})

/** Création ou modification d'un voyage */
export function TripFormSheet({ open, onClose, trip, initialCountries, onCreated }: Props) {
  const [draft, setDraft] = useState<TripDraft>(empty())
  const [markAsVisited, setMarkAsVisited] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [currencyTouched, setCurrencyTouched] = useState(false)

  // Remise à zéro à chaque ouverture
  useEffect(() => {
    if (!open) return
    setDraft(trip ? { ...trip } : empty(initialCountries))
    setCurrencyTouched(!!trip)
    setMarkAsVisited(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (changes: Partial<TripDraft>) => setDraft((d) => ({ ...d, ...changes }))

  const addCountry = (code: string) => {
    setPickerOpen(false)
    if (draft.countries.includes(code)) return
    const countries = [...draft.countries, code]
    set({ countries, ...(currencyTouched ? {} : { currency: currencyForCountry(countries[0]) }) })
  }

  const valid = draft.title.trim().length > 0
  const datesInvalid = !!draft.start && !!draft.end && draft.end < draft.start

  const save = async () => {
    if (!valid || datesInvalid) return
    const clean = { ...draft, title: draft.title.trim(), companions: draft.companions?.trim() || undefined }
    if (trip) {
      await updateTrip(trip.id, clean)
      onClose()
    } else {
      const id = await createTrip(clean)
      if (markAsVisited) await Promise.all(clean.countries.map((c) => markVisited(c, clean.start)))
      onClose()
      onCreated?.(id)
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={trip ? 'Modifier le voyage' : 'Nouveau voyage'}
      leading={
        <Button variant="plain" onClick={onClose}>
          Annuler
        </Button>
      }
      trailing={
        <Button variant="plain" onClick={save} disabled={!valid || datesInvalid} className="font-semibold">
          {trip ? 'OK' : 'Créer'}
        </Button>
      }
    >
      <div className="pt-4">
        <Section>
          <TextInput
            placeholder="Titre (ex. Road trip dans l’Ouest)"
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            autoFocus={!trip}
          />
        </Section>

        <Section header="Pays">
          {draft.countries.map((code) => (
            <Row
              key={code}
              label={
                <span className="flex items-center gap-3">
                  <Flag code={code} size={28} />
                  {placeName(code)}
                </span>
              }
              accessory={
                <button
                  type="button"
                  aria-label={`Retirer ${placeName(code)}`}
                  onClick={() => set({ countries: draft.countries.filter((c) => c !== code) })}
                  className="-mr-2 flex size-11 items-center justify-center text-label-3"
                >
                  <X size={18} strokeWidth={2.4} />
                </button>
              }
            />
          ))}
          <Row icon={Plus} iconColor="var(--green)" label="Ajouter un pays" onClick={() => setPickerOpen(true)} />
        </Section>

        <Section footer={datesInvalid ? 'La date de fin est avant la date de début.' : undefined}>
          <FieldRow label="Début">
            <DateInput value={draft.start ?? ''} onChange={(e) => set({ start: e.target.value || undefined })} />
          </FieldRow>
          <FieldRow label="Fin">
            <DateInput
              value={draft.end ?? ''}
              min={draft.start}
              onChange={(e) => set({ end: e.target.value || undefined })}
            />
          </FieldRow>
        </Section>

        <Section footer="Devise dans laquelle tu paies la plupart du temps (pour le budget).">
          <FieldRow label="Devise">
            <select
              value={draft.currency}
              onChange={(e) => {
                setCurrencyTouched(true)
                set({ currency: e.target.value })
              }}
              className="h-11 max-w-56 appearance-none truncate bg-transparent text-right text-[17px] text-label-2 outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {currencyName(c)} ({c})
                </option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="Avec">
            <InlineInput
              placeholder="Compagnons de voyage"
              value={draft.companions ?? ''}
              onChange={(e) => set({ companions: e.target.value })}
            />
          </FieldRow>
        </Section>

        {!trip && draft.countries.length > 0 && (
          <Section footer="Ajoute ces pays à ton globe. Désactive pour un voyage futur.">
            <Row
              label="Marquer les pays comme visités"
              accessory={<Switch checked={markAsVisited} onChange={setMarkAsVisited} label="Marquer les pays comme visités" />}
            />
          </Section>
        )}
      </div>

      <AddCountrySheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Pays du voyage"
        visited={new Set(draft.countries)}
        onPick={addCountry}
      />
    </BottomSheet>
  )
}
