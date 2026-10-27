import { lazy, Suspense, useEffect, useState } from 'react'
import { BedDouble, ChevronRight, GripVertical, MapPinned, Plus } from 'lucide-react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, EmptyState } from '../../ui/controls'
import { StopSheet } from '../StopSheet'
import { stopType, transport } from '../../data/stopTypes'
import { dateOfDay, formatDay, reorderStops, useStops } from '../../db/trips'
import type { Stop, Trip } from '../../db/schema'

// La carte (MapLibre, assez lourde) n'est chargée qu'à l'ouverture d'un voyage
const ItineraryMap = lazy(() => import('../../map/ItineraryMap'))

/** Onglet « Itinéraire » : carte + liste jour par jour, réordonnable par glisser-déposer */
export function ItineraryTab({ trip }: { trip: Trip }) {
  const stops = useStops(trip.id) ?? []
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<Stop | 'new' | null>(null)
  // Ordre affiché pendant un déplacement (avant l'enregistrement)
  const [order, setOrder] = useState<string[]>([])
  useEffect(() => setOrder(stops.map((s) => s.id)), [stops])

  const byId = new Map(stops.map((s) => [s.id, s]))
  const list = order.map((id) => byId.get(id)).filter((s): s is Stop => !!s)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Sur iPhone : appui maintenu sur la poignée pour déplacer (le défilement reste fluide)
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)))
    setOrder(next)
    reorderStops(trip.id, next, String(active.id))
  }

  const lastDay = stops.reduce((m, s) => Math.max(m, s.day ?? 0), 0)

  return (
    <div>
      {/* Carte */}
      <div className="mx-4 mb-6 h-72 overflow-hidden rounded-[22px] bg-elevated shadow-soft">
        {stops.some((s) => s.coords) ? (
          <Suspense fallback={null}>
            <ItineraryMap stops={list} selectedId={selected} onSelect={setSelected} />
          </Suspense>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-label-2">
            <MapPinned size={36} strokeWidth={1.4} />
            <p className="text-subhead">La carte apparaîtra avec la première étape</p>
          </div>
        )}
      </div>

      {stops.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="Aucune étape"
          text="Ajoute les villes, parcs et logements de ton voyage, jour par jour."
          action={
            <Button icon={Plus} onClick={() => setEditing('new')}>
              Ajouter une étape
            </Button>
          }
        />
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <ol className="mx-4 overflow-hidden rounded-[22px] bg-elevated">
                {list.map((s, i) => (
                  <StopRow
                    key={s.id}
                    stop={s}
                    index={i}
                    // En-tête de jour quand le jour change par rapport à l'étape précédente
                    dayHeader={i === 0 || list[i - 1].day !== s.day ? dayLabel(trip, s.day) : null}
                    selected={selected === s.id}
                    onSelect={() => setSelected(s.id)}
                    onEdit={() => setEditing(s)}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
          <p className="text-footnote mx-8 mt-2 text-label-2">Maintiens la poignée ⋮⋮ pour changer l’ordre des étapes.</p>
          <div className="mx-4 mt-4">
            <Button variant="tinted" size="lg" icon={Plus} onClick={() => setEditing('new')}>
              Ajouter une étape
            </Button>
          </div>
        </>
      )}

      <StopSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        trip={trip}
        stop={editing && editing !== 'new' ? editing : undefined}
        defaultDay={lastDay || 1}
        isFirst={editing === 'new' ? stops.length === 0 : (editing?.order ?? 0) === 0}
      />
    </div>
  )
}

function dayLabel(trip: Trip, day?: number) {
  if (!day) return 'Jour non défini'
  const date = dateOfDay(trip.start, day)
  return date ? `Jour ${day} · ${formatDay(date)}` : `Jour ${day}`
}

function StopRow({
  stop,
  index,
  dayHeader,
  selected,
  onSelect,
  onEdit,
}: {
  stop: Stop
  index: number
  dayHeader: string | null
  selected: boolean
  onSelect: () => void
  onEdit: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id })
  const t = stopType(stop.type)
  const tr = index > 0 ? transport(stop.transport) : undefined

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative bg-elevated ${isDragging ? 'z-10 shadow-soft' : ''}`}
    >
      {dayHeader && (
        <div className="text-footnote border-b-[0.5px] border-separator bg-grouped/60 px-4 py-1.5 font-semibold uppercase text-label-2">
          {dayHeader}
        </div>
      )}
      <div className={`flex items-center ${selected ? 'bg-blue/8' : ''}`}>
        {/* Poignée de déplacement */}
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={`Déplacer ${stop.name}`}
          className="flex h-16 w-10 shrink-0 touch-none items-center justify-center text-label-3"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={18} />
        </button>

        <button type="button" onClick={onSelect} className="flex min-h-16 flex-1 items-center gap-3 border-b-[0.5px] border-separator py-2 text-left">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
            style={{ background: t.color }}
          >
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-body block truncate">{stop.name}</span>
            <span className="text-footnote flex items-center gap-1.5 text-label-2">
              {tr && <tr.icon size={13} />}
              <span className="truncate">{[t.label, tr?.label].filter(Boolean).join(' · ')}</span>
              {stop.lodging && (
                <>
                  <BedDouble size={13} className="ml-1 shrink-0" />
                  <span className="truncate">{stop.lodging}</span>
                </>
              )}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onEdit}
          aria-label={`Modifier ${stop.name}`}
          className="flex h-16 w-11 shrink-0 items-center justify-center border-b-[0.5px] border-separator text-label-3"
        >
          <ChevronRight size={18} strokeWidth={2.2} />
        </button>
      </div>
      {stop.notes && selected && (
        <p className="text-subhead select-text border-b-[0.5px] border-separator py-2 pr-4 pl-[86px] whitespace-pre-line text-label-2">{stop.notes}</p>
      )}
    </li>
  )
}
