import { Check, CircleSlash } from 'lucide-react'
import { BottomSheet } from '../../ui/BottomSheet'
import { Row, Section } from '../../ui/GroupedList'
import { Button } from '../../ui/controls'
import { stopType } from '../../data/stopTypes'
import type { Stop } from '../../db/schema'

/** Choix manuel de l'étape d'une photo */
export function AssignStopSheet({
  open,
  onClose,
  stops,
  currentId,
  onPick,
}: {
  open: boolean
  onClose: () => void
  stops: Stop[]
  currentId?: string
  onPick: (stopId: string | undefined) => void
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Rattacher à une étape"
      trailing={
        <Button variant="plain" onClick={onClose}>
          OK
        </Button>
      }
    >
      <div className="pt-4">
        {stops.length === 0 ? (
          <p className="text-body px-8 text-center text-label-2">Ajoute d’abord des étapes dans l’onglet Itinéraire.</p>
        ) : (
          <Section>
            {stops.map((s, i) => {
              const t = stopType(s.type)
              return (
                <Row
                  key={s.id}
                  icon={t.icon}
                  iconColor={t.color}
                  label={`${i + 1}. ${s.name}`}
                  detail={s.day ? `Jour ${s.day}` : undefined}
                  accessory={s.id === currentId ? <Check size={20} className="text-blue" strokeWidth={2.4} /> : undefined}
                  onClick={() => onPick(s.id)}
                />
              )
            })}
          </Section>
        )}
        <Section>
          <Row icon={CircleSlash} iconColor="var(--gray)" label="Aucune étape (à classer)" onClick={() => onPick(undefined)} />
        </Section>
      </div>
    </BottomSheet>
  )
}
