import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { Plus, Settings } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { IconButton } from '../ui/controls'
import type { GlobeHandle } from '../globe/GlobeView'
import { AddCountrySheet } from './AddCountrySheet'
import { computeStats, formatPercent } from '../data/stats'
import { markVisited } from '../db/countries'
import type { CountryEntry } from '../db/schema'
import { usePreference } from '../hooks/usePreference'
import { useUI } from '../state/ui'

// Le globe (three.js) est chargé à part : l'interface s'affiche tout de suite, le globe juste après
const GlobeView = lazy(() => import('../globe/GlobeView').then((m) => ({ default: m.GlobeView })))

type Props = { entries: CountryEntry[]; active: boolean; onOpenSettings: () => void }

/** Écran principal : le globe plein écran, le compteur et les boutons en verre par-dessus */
export function GlobeScreen({ entries, active, onOpenSettings }: Props) {
  const [autoRotate] = usePreference('autoRotate', true)
  const [addOpen, setAddOpen] = useState(false)
  const [reveal, setReveal] = useState<string | null>(null)
  const globe = useRef<GlobeHandle>(null)
  const { openCountry } = useUI()

  const stats = useMemo(() => computeStats(entries), [entries])
  const visited = useMemo(() => entries.filter((e) => e.status === 'visited').map((e) => e.code).sort(), [entries])
  const visitedSet = useMemo(() => new Set(visited), [visited])

  const pick = async (code: string) => {
    setAddOpen(false)
    if (visitedSet.has(code)) {
      globe.current?.flyTo(code)
      return
    }
    // Le globe pivote vers le pays, puis son drapeau apparaît en fondu
    setReveal(code)
    await markVisited(code)
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[var(--ocean-bg)]">
      <Suspense fallback={null}>
        <GlobeView
          ref={globe}
          visited={visited}
          wishlist={stats.wishlist}
          reveal={reveal}
          onRevealDone={() => setReveal(null)}
          active={active}
          autoRotate={autoRotate}
          onSelect={openCountry}
        />
      </Suspense>

      {/* En-tête flottant (laisse passer les gestes vers le globe, sauf sur les boutons) */}
      <header
        className="pointer-events-none relative z-10 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-large-title">Mon globe</h1>
            <p className="text-title-3 mt-0.5 text-label-2">
              <span className="text-label">
                <Counter value={stats.visitedCountries.length} /> pays
              </span>{' '}
              · {formatPercent(stats.ratio)} % du monde
            </p>
            {stats.visitedTerritories.length > 0 && (
              <p className="text-footnote mt-0.5 text-label-2">
                + {stats.visitedTerritories.length} territoire{stats.visitedTerritories.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="pointer-events-auto mt-0.5 flex gap-2">
            <IconButton icon={Settings} label="Réglages" onClick={onOpenSettings} />
            <IconButton icon={Plus} label="Ajouter un pays" filled onClick={() => setAddOpen(true)} />
          </div>
        </div>
      </header>

      <AddCountrySheet open={addOpen} onClose={() => setAddOpen(false)} visited={visitedSet} onPick={pick} />
    </div>
  )
}

/** Chiffre qui défile verticalement quand il change */
function Counter({ value }: { value: number }) {
  return (
    <span className="relative inline-flex overflow-hidden align-bottom tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
