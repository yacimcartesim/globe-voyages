import { useEffect, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { Row, Section } from '../ui/GroupedList'
import { Button, Switch } from '../ui/controls'
import { FieldRow } from '../ui/forms'
import { addNote } from '../db/notes'
import { useTrips } from '../db/trips'
import { currentPosition, LocationError } from '../services/location'
import type { LatLng } from '../db/schema'

/**
 * Note rapide : un conseil, un lieu, une adresse… notés en deux secondes, même sans réseau.
 * Elle part dans la boîte de réception (ou directement rattachée au voyage ouvert).
 */
export function QuickNoteSheet({ open, onClose, tripId }: { open: boolean; onClose: () => void; tripId?: string }) {
  const trips = useTrips() ?? []
  const [text, setText] = useState('')
  const [withPosition, setWithPosition] = useState(false)
  const [coords, setCoords] = useState<LatLng>()
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string>()
  const [target, setTarget] = useState('')

  useEffect(() => {
    if (!open) return
    setText('')
    setWithPosition(false)
    setCoords(undefined)
    setLocError(undefined)
    setTarget(tripId ?? '')
  }, [open, tripId])

  const togglePosition = async (on: boolean) => {
    setWithPosition(on)
    setLocError(undefined)
    if (!on) return setCoords(undefined)
    setLocating(true)
    try {
      setCoords(await currentPosition())
    } catch (e) {
      setWithPosition(false)
      setLocError(e instanceof LocationError ? e.message : 'Position introuvable.')
    } finally {
      setLocating(false)
    }
  }

  const save = async () => {
    if (!text.trim()) return
    await addNote(text, coords, target || undefined)
    onClose()
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      size="auto"
      title="Note rapide"
      leading={
        <Button variant="plain" onClick={onClose}>
          Annuler
        </Button>
      }
      trailing={
        <Button variant="plain" onClick={save} disabled={!text.trim()} className="font-semibold">
          Enregistrer
        </Button>
      }
    >
      <div className="pt-2">
        <div className="mx-4 mb-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Un conseil, un lieu, une adresse…"
            aria-label="Texte de la note"
            autoFocus
            rows={4}
            className="w-full resize-none rounded-[22px] bg-elevated p-4 text-[17px] leading-[24px] outline-none placeholder:text-label-3"
          />
        </div>

        <Section
          footer={
            locError ??
            (coords ? `Position : ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'La note pourra devenir une étape de voyage à cet endroit.')
          }
        >
          <Row
            icon={MapPin}
            iconColor="var(--red)"
            label="Ajouter ma position"
            accessory={
              locating ? (
                <Loader2 size={20} className="animate-spin text-label-2" />
              ) : (
                <Switch checked={withPosition} onChange={togglePosition} label="Ajouter ma position" />
              )
            }
          />
        </Section>

        <Section footer="Tu pourras la classer plus tard en conseil, en étape ou en info pratique.">
          <FieldRow label="Voyage">
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="h-11 max-w-56 appearance-none truncate bg-transparent text-right text-[17px] text-label-2 outline-none"
            >
              <option value="">Boîte de réception</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </FieldRow>
        </Section>
      </div>
    </BottomSheet>
  )
}
