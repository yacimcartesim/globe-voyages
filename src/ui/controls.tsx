import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { spring } from './motion'

/* ---------------------------------------------------------------- Bouton */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** filled = fond bleu, tinted = fond bleu pâle, plain = texte seul */
  variant?: 'filled' | 'tinted' | 'plain'
  size?: 'md' | 'lg'
  icon?: LucideIcon
}

export function Button({ variant = 'filled', size = 'md', icon: Icon, className = '', children, ...rest }: ButtonProps) {
  const variants = {
    filled: 'bg-blue text-white',
    tinted: 'bg-blue/15 text-blue',
    plain: 'text-blue',
  }
  const sizes = {
    md: 'min-h-11 px-4 text-headline rounded-xl',
    lg: 'min-h-[50px] px-5 text-headline rounded-[14px] w-full',
  }
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97, opacity: 0.8 }}
      transition={spring}
      className={`inline-flex items-center justify-center gap-2 disabled:opacity-40 ${variants[variant]} ${sizes[size]} ${className}`}
      {...(rest as object)}
    >
      {Icon && <Icon size={20} strokeWidth={2} />}
      {children}
    </motion.button>
  )
}

/* ------------------------------------------------------- Bouton icône rond */

/** Bouton rond en verre (Liquid Glass), 44 × 44 px de zone tactile */
export function IconButton({ icon: Icon, label, onClick, filled }: { icon: LucideIcon; label: string; onClick?: () => void; filled?: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      transition={spring}
      className={`flex size-11 items-center justify-center rounded-full ${filled ? 'bg-blue text-white shadow-[inset_0_1px_0.5px_rgb(255_255_255/0.45),0_6px_16px_rgb(0_122_255/0.3)]' : 'glass text-label'}`}
    >
      <Icon size={20} strokeWidth={2} />
    </motion.button>
  )
}

/* ------------------------------------------------------------ Interrupteur */

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-green' : 'bg-fill-strong'}`}
    >
      <motion.span
        className="absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)]"
        animate={{ x: checked ? 20 : 0 }}
        transition={spring}
      />
    </button>
  )
}

/* ---------------------------------------------------- Contrôle segmenté */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  const id = useId()
  return (
    <div role="tablist" className="flex rounded-[9px] bg-fill p-[2px]">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className="relative min-h-8 flex-1 px-2 text-[13px] font-medium"
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={spring}
                className="absolute inset-0 rounded-[7px] bg-elevated shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)] dark:bg-[#636366]"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* ----------------------------------------------- Barre de progression */

/** Barre de progression arrondie, inspirée des apps Santé/Forme */
export function ProgressBar({ value, color = 'var(--blue)' }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="h-2 overflow-hidden rounded-full bg-fill">
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 24 }}
      />
    </div>
  )
}

/* ------------------------------------------------------------ État vide */

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-10 pt-16 text-center">
      <Icon size={56} strokeWidth={1.2} className="mb-4 text-label-3" />
      <h2 className="text-title-3 mb-1.5">{title}</h2>
      <p className="text-subhead mb-6 text-label-2">{text}</p>
      {action}
    </div>
  )
}
