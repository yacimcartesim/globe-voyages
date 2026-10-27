import { Inbox, Luggage, MapPin, Plus } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'motion/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Screen } from '../ui/Screen'
import { Button, EmptyState, IconButton } from '../ui/controls'
import { Flag } from '../ui/Flag'
import { TripCover } from '../ui/TripCover'
import { spring } from '../ui/motion'
import { formatRange, tripLength, useTrips } from '../db/trips'
import { db } from '../db/db'
import { useUI } from '../state/ui'
import { useNotes } from '../db/notes'
import { Row, Section } from '../ui/GroupedList'
import { InboxSheet } from './InboxSheet'

export function TripsScreen() {
  const trips = useTrips()
  const { openTrip, startNewTrip } = useUI()
  const notes = useNotes() ?? []
  const [inboxOpen, setInboxOpen] = useState(false)
  // Nombre d'étapes par voyage
  const stopCounts = useLiveQuery(async () => {
    const counts = new Map<string, number>()
    await db.stops.each((s) => counts.set(s.tripId, (counts.get(s.tripId) ?? 0) + 1))
    return counts
  }, [])

  return (
    <Screen
      title="Voyages"
      tabId="trips"
      trailing={<IconButton icon={Plus} label="Nouveau voyage" filled onClick={() => startNewTrip()} />}
    >
      {notes.length > 0 && (
        <Section>
          <Row
            icon={Inbox}
            iconColor="var(--blue)"
            label="Boîte de réception"
            accessory={
              <span className="rounded-full bg-blue px-2 text-[15px] font-semibold text-white tabular-nums">{notes.length}</span>
            }
            chevron
            onClick={() => setInboxOpen(true)}
          />
        </Section>
      )}

      {trips && trips.length === 0 && (
        <EmptyState
          icon={Luggage}
          title="Aucun voyage"
          text="Tes voyages apparaîtront ici, avec leur itinéraire, leurs photos, tes conseils et ton budget."
          action={
            <Button icon={Plus} onClick={() => startNewTrip()}>
              Créer un voyage
            </Button>
          }
        />
      )}

      <ul className="flex flex-col gap-4 px-4">
        {trips?.map((trip) => {
          const days = tripLength(trip)
          const stops = stopCounts?.get(trip.id) ?? 0
          return (
            <li key={trip.id}>
              <motion.button
                type="button"
                onClick={() => openTrip(trip.id)}
                whileTap={{ scale: 0.98 }}
                transition={spring}
                className="relative block h-48 w-full overflow-hidden rounded-[22px] text-left shadow-soft"
              >
                <TripCover countries={trip.countries} coverPhotoId={trip.coverPhotoId} />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <div className="mb-2 flex gap-1.5">
                    {trip.countries.slice(0, 6).map((c) => (
                      <Flag key={c} code={c} size={24} radius={3} />
                    ))}
                  </div>
                  <h2 className="text-title-2 leading-tight">{trip.title}</h2>
                  <p className="text-subhead mt-0.5 text-white/85">
                    {formatRange(trip.start, trip.end)}
                    {days ? ` · ${days} jours` : ''}
                    {stops ? (
                      <>
                        {' · '}
                        <MapPin size={13} className="-mt-0.5 inline" /> {stops} étape{stops > 1 ? 's' : ''}
                      </>
                    ) : null}
                  </p>
                </div>
              </motion.button>
            </li>
          )
        })}
      </ul>
      <InboxSheet open={inboxOpen} onClose={() => setInboxOpen(false)} />
    </Screen>
  )
}
