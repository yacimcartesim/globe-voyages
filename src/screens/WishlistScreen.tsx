import { useMemo, useState } from 'react'
import { MapPin, Plus, Star } from 'lucide-react'
import { Screen } from '../ui/Screen'
import { Row, Section } from '../ui/GroupedList'
import { Button, EmptyState, IconButton, SegmentedControl } from '../ui/controls'
import { Flag } from '../ui/Flag'
import { AddCountrySheet } from './AddCountrySheet'
import { WishCountrySheet, WishPlaceSheet } from './WishSheets'
import { placeName } from '../data/places'
import { markWishlist } from '../db/countries'
import { priority, useWishPlaces } from '../db/wishlist'
import type { CountryEntry, WishPlace } from '../db/schema'

type View = 'countries' | 'places'

/** Pastille de priorité */
function PriorityTag({ value }: { value?: 1 | 2 | 3 }) {
  const p = priority(value)
  return (
    <span className="text-footnote rounded-full px-2 py-0.5 font-semibold" style={{ color: p.color, background: `color-mix(in srgb, ${p.color} 14%, transparent)` }}>
      {p.label}
    </span>
  )
}

/** Wishlist : pays et lieux à visiter, en bleu pâle sur le globe */
export function WishlistScreen({ entries }: { entries: CountryEntry[] }) {
  const [view, setView] = useState<View>('countries')
  const places = useWishPlaces() ?? []
  const [addCountryOpen, setAddCountryOpen] = useState(false)
  const [placeSheet, setPlaceSheet] = useState<WishPlace | 'new' | null>(null)
  const [openCode, setOpenCode] = useState<string | null>(null)

  const countries = useMemo(
    () =>
      entries
        .filter((e) => e.status === 'wishlist')
        .sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1) || placeName(a.code).localeCompare(placeName(b.code), 'fr')),
    [entries],
  )
  const visited = useMemo(() => new Set(entries.filter((e) => e.status === 'visited').map((e) => e.code)), [entries])
  // La fiche reste ouverte après « C'est fait ! » (le pays devient alors « visité »)
  const openEntry = entries.find((e) => e.code === openCode) ?? null

  const add = () => (view === 'countries' ? setAddCountryOpen(true) : setPlaceSheet('new'))

  return (
    <Screen title="Wishlist" tabId="wishlist" trailing={<IconButton icon={Plus} label="Ajouter à la wishlist" filled onClick={add} />}>
      <div className="mx-4 mb-6">
        <SegmentedControl<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'countries', label: `Pays${countries.length ? ` (${countries.length})` : ''}` },
            { value: 'places', label: `Lieux${places.length ? ` (${places.length})` : ''}` },
          ]}
        />
      </div>

      {view === 'countries' &&
        (countries.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Aucun pays"
            text="Ajoute les pays qui te font rêver. Ils apparaissent en bleu pâle sur le globe."
            action={
              <Button icon={Plus} onClick={() => setAddCountryOpen(true)}>
                Ajouter un pays
              </Button>
            }
          />
        ) : (
          <Section footer="Touche un pays pour le cocher (« C’est fait ! »), changer sa priorité ou ajouter une note.">
            {countries.map((e) => (
              <Row
                key={e.code}
                label={
                  <span className="flex items-center gap-3">
                    <Flag code={e.code} size={28} />
                    <span className="min-w-0">
                      <span className="block truncate">{placeName(e.code)}</span>
                      {e.note && <span className="text-footnote block truncate text-label-2">{e.note}</span>}
                    </span>
                  </span>
                }
                accessory={<PriorityTag value={e.priority} />}
                chevron
                onClick={() => setOpenCode(e.code)}
              />
            ))}
          </Section>
        ))}

      {view === 'places' &&
        (places.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Aucun lieu"
            text="Machu Picchu, les fjords, un resto à Tokyo… Note les endroits précis que tu veux voir."
            action={
              <Button icon={Plus} onClick={() => setPlaceSheet('new')}>
                Ajouter un lieu
              </Button>
            }
          />
        ) : (
          <Section>
            {places.map((p) => (
              <Row
                key={p.id}
                label={
                  <span className="flex items-center gap-3">
                    {p.countryCode ? <Flag code={p.countryCode} size={28} /> : <MapPin size={20} className="mx-1 text-red" />}
                    <span className="min-w-0">
                      <span className="block truncate">{p.name}</span>
                      <span className="text-footnote block truncate text-label-2">
                        {[p.countryCode && placeName(p.countryCode), p.note].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </span>
                }
                accessory={<PriorityTag value={p.priority} />}
                chevron
                onClick={() => setPlaceSheet(p)}
              />
            ))}
          </Section>
        ))}

      <AddCountrySheet
        open={addCountryOpen}
        title="Ajouter à la wishlist"
        visited={visited}
        onClose={() => setAddCountryOpen(false)}
        onPick={async (code) => {
          setAddCountryOpen(false)
          await markWishlist(code)
        }}
      />
      <WishCountrySheet entry={openEntry} onClose={() => setOpenCode(null)} />
      <WishPlaceSheet open={placeSheet !== null} place={placeSheet && placeSheet !== 'new' ? placeSheet : undefined} onClose={() => setPlaceSheet(null)} />
    </Screen>
  )
}
