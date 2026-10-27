import { Plus, Settings } from 'lucide-react'
import { motion } from 'motion/react'
import { IconButton } from '../ui/controls'
import { WORLD_TOTAL } from '../data/continents'

type Props = { onOpenSettings: () => void }

/**
 * Écran principal : le globe occupe tout l'écran, le titre et les boutons en verre flottent par-dessus.
 * Phase 1 : globe provisoire en CSS. Le vrai globe 3D arrive en phase 2.
 */
export function GlobeScreen({ onOpenSettings }: Props) {
  const visited = 0
  const percent = Math.round((visited / WORLD_TOTAL) * 100)

  return (
    <div className="absolute inset-0 overflow-hidden bg-[var(--ocean-bg)]">
      {/* Globe provisoire */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: 'var(--tabbar-h)' }}>
        <motion.div
          className="aspect-square w-[82vmin] max-w-[520px] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 34% 30%, var(--ocean-light) 0%, var(--ocean) 55%, var(--ocean-dark) 100%)',
            boxShadow: '0 30px 80px rgb(0 0 0 / 0.12)',
          }}
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      {/* En-tête flottant */}
      <header className="relative z-10 px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-large-title">Mon globe</h1>
            <p className="text-title-3 mt-0.5 text-label-2">
              <span className="text-label">{visited} pays</span> · {percent} % du monde
            </p>
          </div>
          <div className="mt-0.5 flex gap-2">
            <IconButton icon={Settings} label="Réglages" onClick={onOpenSettings} />
            <IconButton icon={Plus} label="Ajouter un pays" filled />
          </div>
        </div>
      </header>
    </div>
  )
}
