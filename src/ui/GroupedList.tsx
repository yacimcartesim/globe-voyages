import type { ReactNode } from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'

/** Section de liste groupée façon Réglages iOS : en-tête gris, cellules arrondies, pied de note */
export function Section({ header, footer, children }: { header?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-4 mb-8">
      {header && <h2 className="text-footnote mb-1.5 px-4 uppercase text-label-2">{header}</h2>}
      <div className="overflow-hidden rounded-[22px] bg-elevated">{children}</div>
      {footer && <p className="text-footnote mt-1.5 px-4 text-label-2">{footer}</p>}
    </section>
  )
}

type RowProps = {
  label: ReactNode
  /** Icône dans un carré de couleur, comme dans Réglages */
  icon?: LucideIcon
  iconColor?: string
  /** Texte gris à droite */
  detail?: ReactNode
  /** Élément à droite (interrupteur, badge…) */
  accessory?: ReactNode
  /** Affiche le chevron « > » */
  chevron?: boolean
  onClick?: () => void
  disabled?: boolean
  destructive?: boolean
}

export function Row({ label, icon: Icon, iconColor = 'var(--blue)', detail, accessory, chevron, onClick, disabled, destructive }: RowProps) {
  const content = (
    <>
      {Icon && (
        <span
          className="mr-3 flex size-[29px] shrink-0 items-center justify-center rounded-[7px] text-white"
          style={{ background: iconColor }}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
      )}
      {/* Le séparateur commence après l'icône, comme sur iOS */}
      <span className="flex min-h-11 flex-1 items-center gap-2 border-b-[0.5px] border-separator py-2.5 pr-4 group-last:border-b-0">
        <span className={`text-body flex-1 text-left ${destructive ? 'text-red' : ''}`}>{label}</span>
        {detail != null && <span className="text-body text-label-2">{detail}</span>}
        {accessory}
        {chevron && <ChevronRight size={18} strokeWidth={2.2} className="-mr-1 text-label-3" />}
      </span>
    </>
  )

  const base = `group flex w-full items-center pl-4 ${disabled ? 'opacity-40' : ''}`

  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={`${base} transition-colors active:bg-fill`}>
        {content}
      </button>
    )
  }
  return <div className={base}>{content}</div>
}
