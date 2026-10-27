import { CloudUpload, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { countItems, getLastBackup } from '../services/backup'
import { usePreference } from '../hooks/usePreference'
import { sinceLabel } from '../screens/BackupSection'
import { spring } from './motion'

const DAY = 86_400_000

/**
 * Rappel discret de sauvegarde, affiché sur l'écran Globe :
 * - jamais sauvegardé alors qu'il y a déjà du contenu
 * - dernière sauvegarde de plus de 14 jours (et du nouveau depuis)
 * - beaucoup de contenu ajouté depuis la dernière sauvegarde
 * Peut être mis de côté pour 3 jours.
 */
export function BackupReminder({ onBackup }: { onBackup: () => void }) {
  const [snoozeUntil, setSnoozeUntil] = usePreference('backupSnoozeUntil', 0)
  const message = useLiveQuery(async () => {
    const [last, items] = await Promise.all([getLastBackup(), countItems()])
    if (!last) return items >= 5 ? 'Tu n’as encore jamais sauvegardé tes données.' : null
    const added = items - last.items
    if (added >= 30) return `${added} nouveautés depuis ta dernière sauvegarde.`
    if (Date.now() - new Date(last.at).getTime() > 14 * DAY && added > 0) return `Dernière sauvegarde ${sinceLabel(last.at)}.`
    return null
  }, [])

  const show = !!message && Date.now() > snoozeUntil

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={spring}
          className="glass pointer-events-auto mt-3 flex items-center gap-2 rounded-full py-1.5 pr-1.5 pl-4"
          role="status"
        >
          <CloudUpload size={18} className="shrink-0 text-orange" />
          <span className="text-footnote min-w-0 flex-1 leading-tight">{message}</span>
          <button type="button" onClick={onBackup} className="text-footnote min-h-9 rounded-full bg-blue px-3 font-semibold text-white">
            Sauvegarder
          </button>
          <button
            type="button"
            aria-label="Plus tard"
            onClick={() => setSnoozeUntil(Date.now() + 3 * DAY)}
            className="flex size-9 items-center justify-center text-label-2"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
