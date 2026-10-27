import { useMemo, useState } from 'react'
import { Flag as FlagIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { Screen } from '../ui/Screen'
import { Row, Section } from '../ui/GroupedList'
import { EmptyState, ProgressBar, SegmentedControl } from '../ui/controls'
import { Flag } from '../ui/Flag'
import { computeStats, formatPercent } from '../data/stats'
import { placeName, placeSubtitle } from '../data/places'
import type { CountryEntry } from '../db/schema'
import { useUI } from '../state/ui'

type View = 'continents' | 'territories'

export function StatsScreen({ entries }: { entries: CountryEntry[] }) {
  const [view, setView] = useState<View>('continents')
  const stats = useMemo(() => computeStats(entries), [entries])
  const { openCountry } = useUI()

  const byName = (codes: string[]) => [...codes].sort((a, b) => placeName(a).localeCompare(placeName(b), 'fr'))

  return (
    <Screen title="Statistiques" tabId="stats">
      {/* Carte principale : anneau de progression façon app Forme */}
      <div className="mx-4 mb-6 flex items-center gap-5 rounded-[22px] bg-elevated p-5">
        <Ring value={stats.ratio} />
        <div>
          <p className="text-[44px] font-bold leading-none tracking-tight">
            {formatPercent(stats.ratio)}
            <span className="text-title-2 ml-0.5 text-label-2">%</span>
          </p>
          <p className="text-subhead mt-1 text-label-2">
            {stats.visitedCountries.length} pays sur {stats.total}
          </p>
        </div>
      </div>

      <div className="mx-4 mb-6">
        <SegmentedControl<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'continents', label: 'Continents' },
            { value: 'territories', label: `Territoires${stats.visitedTerritories.length ? ` (${stats.visitedTerritories.length})` : ''}` },
          ]}
        />
      </div>

      {view === 'continents' ? (
        <>
          <Section header="Par continent">
            {stats.byContinent.map((c) => (
              <div key={c.id} className="border-b-[0.5px] border-separator px-4 py-3 last:border-b-0">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-body">{c.name}</span>
                  <span className="text-subhead tabular-nums text-label-2">
                    {c.visited} / {c.total}
                  </span>
                </div>
                <ProgressBar value={c.visited / c.total} color={c.color} />
              </div>
            ))}
          </Section>

          {stats.visitedCountries.length > 0 && (
            <Section header="Mes pays">
              {byName(stats.visitedCountries).map((code) => (
                <Row
                  key={code}
                  label={
                    <span className="flex items-center gap-3">
                      <Flag code={code} size={28} />
                      {placeName(code)}
                    </span>
                  }
                  detail={<span className="text-subhead">{placeSubtitle(code)}</span>}
                  chevron
                  onClick={() => openCountry(code)}
                />
              ))}
            </Section>
          )}
        </>
      ) : stats.visitedTerritories.length === 0 ? (
        <EmptyState
          icon={FlagIcon}
          title="Aucun territoire"
          text="Groenland, Guyane, Réunion, Polynésie… Ces territoires s'affichent sur le globe mais ne comptent pas dans les 195 pays."
        />
      ) : (
        <Section
          header="Territoires visités"
          footer="Ces territoires s’affichent sur le globe mais ne comptent pas dans le pourcentage."
        >
          {byName(stats.visitedTerritories).map((code) => (
            <Row
              key={code}
              label={
                <span className="flex items-center gap-3">
                  <Flag code={code} size={28} />
                  {placeName(code)}
                </span>
              }
              chevron
              onClick={() => openCountry(code)}
            />
          ))}
        </Section>
      )}
    </Screen>
  )
}

/** Anneau de progression (style app Forme) */
function Ring({ value }: { value: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 84 84" className="size-21 shrink-0 -rotate-90">
      <circle cx="42" cy="42" r={r} fill="none" stroke="var(--fill-strong)" strokeWidth="12" />
      <motion.circle
        cx="42"
        cy="42"
        r={r}
        fill="none"
        stroke="var(--blue)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - Math.max(value, value > 0 ? 0.01 : 0)) }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      />
    </svg>
  )
}
