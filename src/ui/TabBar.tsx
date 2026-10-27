import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { spring } from './motion'

export type Tab<T extends string> = { id: T; label: string; icon: LucideIcon }

type Props<T extends string> = {
  tabs: Tab<T>[]
  active: T
  onChange: (id: T) => void
}

/**
 * Tab bar « Liquid Glass » (iOS 26) : capsule de verre flottante au-dessus du contenu,
 * avec une pastille de sélection qui glisse d'un onglet à l'autre.
 */
export function TabBar<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-5"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <ul className="glass pointer-events-auto flex h-[62px] w-full max-w-md items-center rounded-full p-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = id === active
          return (
            <li key={id} className="relative h-full flex-1">
              {isActive && (
                <motion.span
                  layoutId="tab-selection"
                  transition={spring}
                  className="absolute inset-0 rounded-full bg-[var(--glass-selection)]"
                />
              )}
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                transition={spring}
                onClick={() => {
                  if (isActive) window.dispatchEvent(new CustomEvent('tab-retap', { detail: id }))
                  else onChange(id)
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-blue' : 'text-label'
                }`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.1 : 1.7} />
                <span className="text-[10px] font-semibold leading-3 tracking-[0.1px]">{label}</span>
              </motion.button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
