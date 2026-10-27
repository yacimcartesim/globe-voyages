import { useMemo, useState } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { motion } from 'motion/react'
import { Button, EmptyState } from '../../ui/controls'
import { ExpenseSheet } from './ExpenseSheet'
import { CATEGORIES, category, useExpenses } from '../../db/expenses'
import { formatDay, tripLength, useStops } from '../../db/trips'
import { formatMoney, round2 } from '../../services/currency'
import type { Expense, Trip } from '../../db/schema'

/** Onglet « Budget » : total en euros, moyenne par jour, répartition par catégorie, liste des dépenses */
export function BudgetTab({ trip }: { trip: Trip }) {
  const expenses = useExpenses(trip.id) ?? []
  const stops = useStops(trip.id) ?? []
  const [editing, setEditing] = useState<Expense | 'new' | null>(null)

  const total = round2(expenses.reduce((s, e) => s + e.amountEUR, 0))
  // Moyenne : sur la durée du voyage si elle est connue, sinon sur les jours avec dépenses
  const days = tripLength(trip) ?? new Set(expenses.map((e) => e.date)).size
  const perDay = days ? total / days : 0

  const byCategory = useMemo(
    () =>
      CATEGORIES.map((c) => ({ ...c, total: round2(expenses.filter((e) => e.category === c.value).reduce((s, e) => s + e.amountEUR, 0)) }))
        .filter((c) => c.total > 0)
        .sort((a, b) => b.total - a.total),
    [expenses],
  )

  const byDate = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of expenses) map.set(e.date, [...(map.get(e.date) ?? []), e])
    return [...map]
  }, [expenses])

  // Date proposée : celle de la dernière dépense, sinon aujourd'hui (borné aux dates du voyage)
  const defaultDate = useMemo(() => {
    if (expenses[0]) return expenses[0].date
    const today = new Date().toISOString().slice(0, 10)
    if (trip.start && today < trip.start) return trip.start
    if (trip.end && today > trip.end) return trip.start ?? trip.end
    return today
  }, [expenses, trip.start, trip.end])

  return (
    <div>
      {expenses.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Aucune dépense"
          text={`Note tes dépenses dans n’importe quelle devise (${trip.currency} par défaut) : elles sont converties en euros automatiquement.`}
          action={
            <Button icon={Plus} onClick={() => setEditing('new')}>
              Ajouter une dépense
            </Button>
          }
        />
      ) : (
        <>
          {/* Total et moyenne */}
          <div className="mx-4 mb-4 rounded-[22px] bg-elevated p-5">
            <p className="text-footnote font-semibold uppercase text-label-2">Total</p>
            <p className="text-[40px] leading-tight font-bold tracking-tight tabular-nums">{formatMoney(total)}</p>
            <p className="text-subhead mt-1 text-label-2">
              {formatMoney(perDay, 'EUR', true)} par jour en moyenne · {expenses.length} dépense{expenses.length > 1 ? 's' : ''}
            </p>

            {/* Répartition par catégorie */}
            <div className="mt-5 flex items-center gap-5">
              <Donut parts={byCategory.map((c) => ({ value: c.total, color: c.color }))} />
              <ul className="min-w-0 flex-1 space-y-1.5">
                {byCategory.map((c) => (
                  <li key={c.value} className="text-subhead flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                    <span className="tabular-nums text-label-2">{Math.round((c.total / total) * 100)} %</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mx-4 mb-6">
            <Button size="lg" variant="tinted" icon={Plus} onClick={() => setEditing('new')}>
              Ajouter une dépense
            </Button>
          </div>

          {/* Liste par jour */}
          {byDate.map(([date, list]) => (
            <section key={date} className="mb-6">
              <div className="mx-8 mb-1.5 flex justify-between">
                <h3 className="text-footnote font-semibold uppercase text-label-2">{formatDay(date)}</h3>
                <span className="text-footnote tabular-nums text-label-2">{formatMoney(list.reduce((s, e) => s + e.amountEUR, 0))}</span>
              </div>
              <ul className="mx-4 overflow-hidden rounded-[22px] bg-elevated">
                {list.map((e) => {
                  const c = category(e.category)
                  const stop = stops.find((s) => s.id === e.stopId)
                  return (
                    <li key={e.id}>
                      <button type="button" onClick={() => setEditing(e)} className="flex w-full items-center gap-3 pl-4 text-left active:bg-fill">
                        <span className="flex size-[29px] shrink-0 items-center justify-center rounded-[7px] text-white" style={{ background: c.color }}>
                          <c.icon size={17} strokeWidth={2} />
                        </span>
                        <span className="flex min-h-14 min-w-0 flex-1 items-center gap-2 border-b-[0.5px] border-separator py-2 pr-4 [li:last-child_&]:border-b-0">
                          <span className="min-w-0 flex-1">
                            <span className="text-body block truncate">{e.label || c.label}</span>
                            <span className="text-footnote block truncate text-label-2">{stop ? stop.name : c.label}</span>
                          </span>
                          <span className="text-right tabular-nums">
                            <span className="text-body block">{formatMoney(e.amount, e.currency)}</span>
                            {e.currency !== 'EUR' && <span className="text-footnote block text-label-2">{formatMoney(e.amountEUR)}</span>}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </>
      )}

      <ExpenseSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        trip={trip}
        stops={stops}
        expense={editing && editing !== 'new' ? editing : undefined}
        defaultDate={defaultDate}
      />
    </div>
  )
}

/** Anneau de répartition (segments séparés par un petit espace, style app Santé) */
function Donut({ parts }: { parts: { value: number; color: string }[] }) {
  const r = 38
  const c = 2 * Math.PI * r
  const sum = parts.reduce((s, p) => s + p.value, 0) || 1
  const gap = parts.length > 1 ? 2.5 : 0
  let offset = 0
  return (
    <svg viewBox="0 0 100 100" className="size-28 shrink-0 -rotate-90" role="img" aria-label="Répartition des dépenses par catégorie">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--fill)" strokeWidth="14" />
      {parts.map((p, i) => {
        const len = Math.max(0, (p.value / sum) * c - gap)
        const el = (
          <motion.circle
            key={i}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={p.color}
            strokeWidth="14"
            strokeDasharray={`${len} ${c - len}`}
            initial={{ strokeDashoffset: -offset + 20, opacity: 0 }}
            animate={{ strokeDashoffset: -offset, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, delay: i * 0.04 }}
          />
        )
        offset += (p.value / sum) * c
        return el
      })}
    </svg>
  )
}
