import { SquarePen } from 'lucide-react'
import { motion } from 'motion/react'
import { spring } from './motion'

/** Bouton flottant « note rapide », en verre, au-dessus de la tab bar, accessible partout */
export function QuickNoteButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      type="button"
      aria-label="Note rapide"
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      transition={spring}
      className="glass fixed right-5 z-[45] flex size-14 items-center justify-center rounded-full text-blue"
      style={{ bottom: 'calc(var(--tabbar-h) + 14px)' }}
    >
      <SquarePen size={24} strokeWidth={2} />
    </motion.button>
  )
}
