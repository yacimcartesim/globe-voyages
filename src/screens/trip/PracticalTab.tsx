import { useState } from 'react'
import { AlertTriangle, BadgeEuro, BedDouble, Car, Lightbulb, Pencil, Sparkles, Stamp, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { BottomSheet } from '../../ui/BottomSheet'
import { Button } from '../../ui/controls'
import { Markdown } from '../../ui/Markdown'
import { spring } from '../../ui/motion'
import { setPractical } from '../../db/trips'
import type { PracticalSection, Trip } from '../../db/schema'

export const PRACTICAL: { id: PracticalSection; title: string; icon: LucideIcon; color: string; hint: string }[] = [
  { id: 'transport', title: 'Transport et location de voiture', icon: Car, color: 'var(--blue)', hint: 'Loueur, assurance, péages, métro…' },
  { id: 'lodging', title: 'Logements', icon: BedDouble, color: 'var(--indigo)', hint: 'Où dormir, réservations, bons quartiers…' },
  { id: 'money', title: 'Argent et budget', icon: BadgeEuro, color: 'var(--green)', hint: 'Carte bancaire, pourboires, prix moyens…' },
  { id: 'visa', title: 'Formalités et visa', icon: Stamp, color: 'var(--purple)', hint: 'Passeport, ESTA, assurance santé…' },
  { id: 'tips', title: 'Conseils', icon: Lightbulb, color: 'var(--yellow)', hint: 'Ce que tu dirais à un ami qui part…' },
  { id: 'pitfalls', title: 'Pièges à éviter', icon: AlertTriangle, color: 'var(--red)', hint: 'Arnaques, chaleur, horaires…' },
  { id: 'deals', title: 'Bons plans', icon: Sparkles, color: 'var(--orange)', hint: 'Pass, adresses, réductions…' },
]

/** Onglet « Infos pratiques » : 7 sections de texte riche simple, modifiables */
export function PracticalTab({ trip }: { trip: Trip }) {
  const [editing, setEditing] = useState<PracticalSection | null>(null)
  const [text, setText] = useState('')
  const section = PRACTICAL.find((s) => s.id === editing)

  const open = (id: PracticalSection) => {
    setText(trip.practical[id] ?? '')
    setEditing(id)
  }

  const save = async () => {
    if (editing) await setPractical(trip.id, editing, text.trim())
    setEditing(null)
  }

  return (
    <div className="flex flex-col gap-3 px-4">
      {PRACTICAL.map(({ id, title, icon: Icon, color, hint }) => {
        const content = trip.practical[id]
        return (
          <motion.button
            key={id}
            type="button"
            onClick={() => open(id)}
            whileTap={{ scale: 0.985 }}
            transition={spring}
            className="rounded-[22px] bg-elevated p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-[29px] shrink-0 items-center justify-center rounded-[7px] text-white" style={{ background: color }}>
                <Icon size={18} strokeWidth={2} />
              </span>
              <span className="text-headline flex-1">{title}</span>
              <Pencil size={16} className="text-label-3" />
            </div>
            <div className="mt-2">
              {content ? <Markdown text={content} /> : <p className="text-subhead text-label-3">{hint}</p>}
            </div>
          </motion.button>
        )
      })}

      <BottomSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={section?.title}
        leading={
          <Button variant="plain" onClick={() => setEditing(null)}>
            Annuler
          </Button>
        }
        trailing={
          <Button variant="plain" onClick={save} className="font-semibold">
            OK
          </Button>
        }
      >
        <div className="px-4 pt-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={section?.hint}
            autoFocus
            className="min-h-[45vh] w-full resize-none rounded-[22px] bg-elevated p-4 text-[17px] leading-[24px] outline-none placeholder:text-label-3"
          />
          <p className="text-footnote mt-2 px-2 text-label-2">
            Mise en forme : <code># Titre</code>, <code>- liste</code>, <code>**gras**</code>, <code>[lien](https://…)</code>
          </p>
        </div>
      </BottomSheet>
    </div>
  )
}
