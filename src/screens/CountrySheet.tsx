import { useEffect, useState } from 'react'
import { CalendarDays, Check, Luggage, Plus, Star, Trash2 } from 'lucide-react'
import { BottomSheet } from '../ui/BottomSheet'
import { Row, Section } from '../ui/GroupedList'
import { Button } from '../ui/controls'
import { Flag } from '../ui/Flag'
import { getPlace, placeName, placeSubtitle } from '../data/places'
import { markVisited, markWishlist, removeCountry, updateCountry } from '../db/countries'
import type { CountryEntry } from '../db/schema'
import { useUI } from '../state/ui'
import { formatRange, useTrips } from '../db/trips'

/** Fiche d'un pays : statut (visité / wishlist), date de première visite, voyages liés */
export function CountrySheet({ entries }: { entries: CountryEntry[] }) {
  const { countryCode: code, closeCountry, openTrip, startNewTrip } = useUI()
  const trips = (useTrips() ?? []).filter((t) => code && t.countries.includes(code))
  const entry = entries.find((e) => e.code === code)
  const place = code ? getPlace(code) : undefined
  const [confirmRemove, setConfirmRemove] = useState(false)

  useEffect(() => setConfirmRemove(false), [code])

  return (
    <BottomSheet
      open={!!code}
      onClose={closeCountry}
      size="auto"
      trailing={
        <Button variant="plain" onClick={closeCountry}>
          OK
        </Button>
      }
    >
      {code && (
        <div>
          {/* En-tête : grand drapeau + nom */}
          <div className="flex flex-col items-center px-6 pb-6 text-center">
            <Flag code={code} size={112} radius={14} />
            <h2 className="text-title-1 mt-4">{placeName(code)}</h2>
            <p className="text-subhead mt-1 text-label-2">{placeSubtitle(code)}</p>
            {place && !place.counted && (
              <p className="text-footnote mt-2 max-w-72 text-label-2">
                Ce territoire s’affiche sur le globe mais ne compte pas dans les 195 pays.
              </p>
            )}
          </div>

          {entry?.status === 'visited' ? (
            <>
              <Section>
                <Row
                  icon={Check}
                  iconColor="var(--green)"
                  label="Visité"
                />
                <Row
                  icon={CalendarDays}
                  iconColor="var(--red)"
                  label="Première visite"
                  accessory={
                    <input
                      type="month"
                      aria-label="Première visite"
                      value={entry.firstVisit?.slice(0, 7) ?? ''}
                      onChange={(e) => updateCountry(code, { firstVisit: e.target.value ? `${e.target.value}-01` : undefined })}
                      className="rounded-lg bg-fill px-2 py-1 text-[16px] text-label"
                    />
                  }
                />
              </Section>

              <Section header="Voyages">
                {trips.map((t) => (
                  <Row
                    key={t.id}
                    icon={Luggage}
                    iconColor="var(--orange)"
                    label={
                      <span className="block">
                        <span className="block">{t.title}</span>
                        <span className="text-footnote block text-label-2">{formatRange(t.start, t.end)}</span>
                      </span>
                    }
                    chevron
                    onClick={() => openTrip(t.id)}
                  />
                ))}
                <Row
                  icon={Plus}
                  iconColor="var(--green)"
                  label="Nouveau voyage"
                  onClick={() => {
                    closeCountry()
                    startNewTrip([code])
                  }}
                />
              </Section>

              <Section>
                <Row
                  icon={Trash2}
                  iconColor="var(--red)"
                  label={confirmRemove ? 'Toucher encore pour confirmer' : 'Retirer des pays visités'}
                  destructive
                  onClick={() => {
                    if (!confirmRemove) return setConfirmRemove(true)
                    removeCountry(code)
                    closeCountry()
                  }}
                />
              </Section>
            </>
          ) : (
            <div className="flex flex-col gap-3 px-4 pb-4">
              <Button size="lg" icon={Check} onClick={() => markVisited(code)}>
                {entry?.status === 'wishlist' ? 'C’est fait !' : 'Marquer comme visité'}
              </Button>
              {entry?.status === 'wishlist' ? (
                <Button size="lg" variant="tinted" icon={Star} onClick={() => removeCountry(code)}>
                  Retirer de la wishlist
                </Button>
              ) : (
                <Button size="lg" variant="tinted" icon={Star} onClick={() => markWishlist(code)}>
                  Ajouter à la wishlist
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
