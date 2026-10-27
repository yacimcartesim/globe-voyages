import { useEffect, useState } from 'react'
import { Inbox, Lightbulb, MapPin, MapPinned, NotebookText, Trash2 } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { Row, Section } from '../ui/GroupedList'
import { Button, EmptyState } from '../ui/controls'
import { ChipPicker, ChipSection } from '../ui/forms'
import { deleteNote, triageNote, useNotes } from '../db/notes'
import { useTrips } from '../db/trips'
import { PRACTICAL } from './trip/PracticalTab'
import type { PracticalSection, QuickNote } from '../db/schema'

const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Boîte de réception : les notes rapides à classer dans un voyage */
export function InboxSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notes = useNotes() ?? []
  const trips = useTrips() ?? []
  const [triaging, setTriaging] = useState<QuickNote | null>(null)

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Boîte de réception"
      trailing={
        <Button variant="plain" onClick={onClose}>
          OK
        </Button>
      }
    >
      <div className="pt-4">
        {notes.length === 0 ? (
          <EmptyState icon={Inbox} title="Tout est classé" text="Les notes rapides prises avec le bouton ✎ arrivent ici en attendant d’être rangées dans un voyage." />
        ) : (
          <ul className="flex flex-col gap-3 px-4">
            {notes.map((n) => {
              const trip = trips.find((t) => t.id === n.tripId)
              return (
                <li key={n.id} className="rounded-[22px] bg-elevated p-4">
                  <p className="text-body select-text whitespace-pre-line">{n.text}</p>
                  <p className="text-footnote mt-1.5 flex flex-wrap items-center gap-x-2 text-label-2">
                    <span>{fmt.format(new Date(n.createdAt))}</span>
                    {n.coords && (
                      <span className="flex items-center gap-0.5">
                        <MapPin size={12} /> position
                      </span>
                    )}
                    {trip && <span>· {trip.title}</span>}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="tinted" className="flex-1" onClick={() => setTriaging(n)} disabled={trips.length === 0}>
                      Classer…
                    </Button>
                    <DeleteButton onConfirm={() => deleteNote(n.id)} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {notes.length > 0 && trips.length === 0 && (
          <p className="text-footnote mx-8 mt-3 text-label-2">Crée d’abord un voyage pour y classer tes notes.</p>
        )}
      </div>

      <TriageSheet note={triaging} onClose={() => setTriaging(null)} />
    </BottomSheet>
  )
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false)
  return (
    <Button
      variant={armed ? 'filled' : 'tinted'}
      className={armed ? '!bg-red' : '!bg-red/12 !text-red'}
      aria-label={armed ? 'Confirmer la suppression' : 'Supprimer la note'}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? 'Supprimer' : <Trash2 size={18} />}
    </Button>
  )
}

type Kind = 'tips' | 'stop' | 'practical'

/** Classement d'une note : voyage + destination (conseil, étape ou info pratique) */
function TriageSheet({ note, onClose }: { note: QuickNote | null; onClose: () => void }) {
  const trips = useTrips() ?? []
  const [tripId, setTripId] = useState('')
  const [kind, setKind] = useState<Kind>('tips')
  const [section, setSection] = useState<PracticalSection>('transport')

  useEffect(() => {
    if (!note) return
    setTripId(note.tripId ?? trips[0]?.id ?? '')
    setKind(note.coords ? 'stop' : 'tips')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note])

  const save = async () => {
    if (!note || !tripId) return
    await triageNote(
      note,
      tripId,
      kind === 'stop' ? { kind: 'stop' } : { kind: 'practical', section: kind === 'tips' ? 'tips' : section },
    )
    onClose()
  }

  return (
    <BottomSheet
      open={!!note}
      onClose={onClose}
      title="Classer la note"
      leading={
        <Button variant="plain" onClick={onClose}>
          Annuler
        </Button>
      }
      trailing={
        <Button variant="plain" onClick={save} disabled={!tripId} className="font-semibold">
          Classer
        </Button>
      }
    >
      <div className="pt-4">
        <Section header="Voyage">
          {trips.map((t) => (
            <Row
              key={t.id}
              label={t.title}
              accessory={
                <span className={`size-5 rounded-full border-2 ${t.id === tripId ? 'border-blue bg-blue shadow-[inset_0_0_0_3px_var(--bg-elevated)]' : 'border-label-3'}`} />
              }
              onClick={() => setTripId(t.id)}
            />
          ))}
        </Section>

        <ChipSection header="Ranger en">
          <ChipPicker<Kind>
            value={kind}
            onChange={setKind}
            options={[
              { value: 'tips', label: 'Conseil', icon: Lightbulb },
              { value: 'stop', label: 'Étape', icon: MapPinned },
              { value: 'practical', label: 'Info pratique', icon: NotebookText },
            ]}
          />
        </ChipSection>

        {kind === 'practical' && (
          <Section header="Section">
            {PRACTICAL.filter((p) => p.id !== 'tips').map((p) => (
              <Row
                key={p.id}
                icon={p.icon}
                iconColor={p.color}
                label={p.title}
                accessory={p.id === section ? <span className="text-blue">✓</span> : undefined}
                onClick={() => setSection(p.id)}
              />
            ))}
          </Section>
        )}

        <p className="text-footnote mx-8 text-label-2">
          {kind === 'stop'
            ? note?.coords
              ? 'Une nouvelle étape est créée à l’endroit où la note a été prise. La 1re ligne devient son nom.'
              : 'Une nouvelle étape est créée (sans position : tu pourras la chercher ensuite). La 1re ligne devient son nom.'
            : 'La note est ajoutée en liste à la fin de la section.'}
        </p>
      </div>
    </BottomSheet>
  )
}
