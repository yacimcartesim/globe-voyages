import { useState } from 'react'
import { Flag } from 'lucide-react'
import { motion } from 'motion/react'
import { Screen } from '../ui/Screen'
import { Section } from '../ui/GroupedList'
import { EmptyState, ProgressBar, SegmentedControl } from '../ui/controls'
import { CONTINENTS, WORLD_TOTAL } from '../data/continents'

type View = 'continents' | 'territories'

export function StatsScreen() {
  const [view, setView] = useState<View>('continents')
  const visited = 0
  const ratio = visited / WORLD_TOTAL

  return (
    <Screen title="Statistiques" tabId="stats">
      {/* Carte principale : anneau de progression façon app Forme */}
      <div className="mx-4 mb-6 flex items-center gap-5 rounded-[22px] bg-elevated p-5">
        <Ring value={ratio} />
        <div>
          <p className="text-[44px] font-bold leading-none tracking-tight">
            {Math.round(ratio * 100)}
            <span className="text-title-2 ml-0.5 text-label-2">%</span>
          </p>
          <p className="text-subhead mt-1 text-label-2">
            {visited} pays sur {WORLD_TOTAL}
          </p>
        </div>
      </div>

      <div className="mx-4 mb-6">
        <SegmentedControl<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'continents', label: 'Continents' },
            { value: 'territories', label: 'Territoires' },
          ]}
        />
      </div>

      {view === 'continents' ? (
        <Section header="Par continent">
          {CONTINENTS.map((c) => (
            <div key={c.id} className="border-b-[0.5px] border-separator px-4 py-3 last:border-b-0">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-body">{c.name}</span>
                <span className="text-subhead tabular-nums text-label-2">0 / {c.total}</span>
              </div>
              <ProgressBar value={0} color={c.color} />
            </div>
          ))}
        </Section>
      ) : (
        <EmptyState
          icon={Flag}
          title="Aucun territoire"
          text="Groenland, Guyane, Réunion, Polynésie… Ces territoires s'affichent sur le globe mais ne comptent pas dans les 195 pays."
        />
      )}
    </Screen>
  )
}

/** Anneau de progression (style app Forme) */
function Ring({ value }: { value: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 84 84" className="size-21 -rotate-90">
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
        animate={{ strokeDashoffset: c * (1 - value) }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
      />
    </svg>
  )
}
