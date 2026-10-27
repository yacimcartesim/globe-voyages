import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { motion } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import { spring } from './motion'

// Champs de formulaire façon iOS, à placer dans une <Section> de liste groupée.
// Police à 16 px minimum : sinon Safari zoome sur le champ.

const rowBase = 'flex min-h-11 items-center gap-3 border-b-[0.5px] border-separator pr-4 last:border-b-0'

/** Ligne avec libellé à gauche et champ à droite (« Début   6 juil. 2026 ») */
export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={`${rowBase} ml-4`}>
      <span className="text-body shrink-0">{label}</span>
      <span className="flex min-w-0 flex-1 justify-end">{children}</span>
    </label>
  )
}

/** Champ texte pleine largeur dans une cellule */
export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`${rowBase} pl-4`}>
      <input
        {...props}
        className={`text-body h-11 w-full min-w-0 bg-transparent text-[17px] outline-none placeholder:text-label-3 ${props.className ?? ''}`}
      />
    </div>
  )
}

/** Champ intégré à une FieldRow (aligné à droite, gris) */
export function InlineInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full min-w-0 bg-transparent text-right text-[17px] text-label-2 outline-none placeholder:text-label-3 ${props.className ?? ''}`}
    />
  )
}

/** Date au format natif iOS (pastille grise) */
export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="date"
      {...props}
      className="min-h-8 rounded-lg bg-fill px-2.5 py-1 text-[16px] text-label outline-none"
    />
  )
}

/** Zone de texte multiligne qui grandit avec le contenu */
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={`${rowBase} pl-4`}>
      <textarea
        rows={4}
        {...props}
        className="w-full resize-none bg-transparent py-3 text-[17px] leading-[22px] outline-none placeholder:text-label-3 [field-sizing:content] min-h-24"
      />
    </div>
  )
}

/** Liste de choix sous forme de pastilles (type d'étape, transport…) */
export function ChipPicker<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: LucideIcon }[]
  value: T | undefined
  onChange: (v: T) => void
}) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
      {options.map(({ value: v, label, icon: Icon }) => {
        const active = v === value
        return (
          <motion.button
            key={v}
            type="button"
            whileTap={{ scale: 0.94 }}
            transition={spring}
            onClick={() => onChange(v)}
            aria-pressed={active}
            className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[15px] font-medium transition-colors ${
              active ? 'bg-blue text-white' : 'bg-elevated text-label'
            }`}
          >
            {Icon && <Icon size={16} strokeWidth={2} />}
            {label}
          </motion.button>
        )
      })}
    </div>
  )
}

/** Groupe de pastilles avec un en-tête, sans cellule blanche autour */
export function ChipSection({ header, children }: { header: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-footnote mb-1.5 px-8 uppercase text-label-2">{header}</h2>
      <div className="px-4">{children}</div>
    </section>
  )
}
