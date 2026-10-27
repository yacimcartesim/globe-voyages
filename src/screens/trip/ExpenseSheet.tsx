import { useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { BottomSheet } from '../../ui/BottomSheet'
import { Row, Section } from '../../ui/GroupedList'
import { Button } from '../../ui/controls'
import { ChipPicker, ChipSection, FieldRow, InlineInput, TextInput } from '../../ui/forms'
import { DateField } from '../../ui/DateField'
import { CATEGORIES, deleteExpense, saveExpense } from '../../db/expenses'
import { CURRENCIES, currencyName } from '../../data/currencies'
import { formatMoney, parseAmount, rateToEUR, round2, type RateResult } from '../../services/currency'
import type { Expense, ExpenseCategory, Stop, Trip } from '../../db/schema'

type Props = {
  open: boolean
  onClose: () => void
  trip: Trip
  stops: Stop[]
  /** Dépense à modifier ; absente = nouvelle dépense */
  expense?: Expense
  /** Date proposée pour une nouvelle dépense */
  defaultDate: string
}

const fmtDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtRate = (n: number) => n.toLocaleString('fr-FR', { maximumSignificantDigits: 5 })

/** Ajout rapide ou modification d'une dépense, avec conversion automatique en euros */
export function ExpenseSheet({ open, onClose, trip, stops, expense, defaultDate }: Props) {
  const [amountText, setAmountText] = useState('')
  const [currency, setCurrency] = useState(trip.currency)
  const [label, setLabel] = useState('')
  const [cat, setCat] = useState<ExpenseCategory>('food')
  const [date, setDate] = useState(defaultDate)
  const [stopId, setStopId] = useState<string>('')
  const [rateText, setRateText] = useState('')
  const [rateInfo, setRateInfo] = useState<RateResult | null>(null)
  const [rateTouched, setRateTouched] = useState(false)
  const [loadingRate, setLoadingRate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Remise à zéro à chaque ouverture
  useEffect(() => {
    if (!open) return
    setAmountText(expense ? String(expense.amount).replace('.', ',') : '')
    setCurrency(expense?.currency ?? trip.currency)
    setLabel(expense?.label ?? '')
    setCat(expense?.category ?? 'food')
    setDate(expense?.date ?? defaultDate)
    setStopId(expense?.stopId ?? '')
    setRateText(expense ? fmtRate(expense.rate) : '')
    setRateTouched(!!expense)
    setRateInfo(null)
    setConfirmDelete(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Taux du jour de la dépense (sauf s'il a été saisi à la main)
  useEffect(() => {
    if (!open || rateTouched) return
    let cancelled = false
    setLoadingRate(true)
    rateToEUR(currency, date).then((r) => {
      if (cancelled) return
      setLoadingRate(false)
      setRateInfo(r)
      setRateText(r ? fmtRate(r.rate) : '')
    })
    return () => {
      cancelled = true
    }
  }, [open, currency, date, rateTouched])

  const amount = parseAmount(amountText)
  const rate = parseAmount(rateText)
  const eur = amount != null && rate != null ? round2(amount * rate) : null
  const valid = amount != null && amount > 0 && rate != null && rate > 0

  const save = async () => {
    if (!valid) return
    await saveExpense({
      id: expense?.id,
      tripId: trip.id,
      stopId: stopId || undefined,
      label: label.trim() || undefined,
      amount: amount!,
      currency,
      rate: rate!,
      amountEUR: eur!,
      category: cat,
      date,
    })
    onClose()
  }

  const rateNote = () => {
    if (currency === 'EUR') return null
    if (loadingRate) return 'Recherche du taux…'
    if (rateTouched) return 'Taux saisi à la main.'
    if (!rateInfo) return 'Taux introuvable (hors connexion ou devise non couverte) : saisis-le ci-dessus.'
    if (rateInfo.source === 'fixed') return 'Parité fixe avec l’euro.'
    const d = rateInfo.date ? fmtDate.format(new Date(`${rateInfo.date}T12:00:00`)) : ''
    return rateInfo.source === 'ecb' ? `Taux de la BCE du ${d}.` : `Hors connexion : dernier taux connu (${d}).`
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={expense ? 'Modifier la dépense' : 'Nouvelle dépense'}
      leading={
        <Button variant="plain" onClick={onClose}>
          Annuler
        </Button>
      }
      trailing={
        <Button variant="plain" onClick={save} disabled={!valid} className="font-semibold">
          OK
        </Button>
      }
    >
      <div className="pt-2">
        {/* Montant en grand + devise */}
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-[22px] bg-elevated px-4 py-3">
          <input
            inputMode="decimal"
            placeholder="0"
            aria-label="Montant"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            autoFocus={!expense}
            className="min-w-0 flex-1 bg-transparent text-[40px] leading-tight font-semibold tabular-nums outline-none placeholder:text-label-3"
          />
          <select
            aria-label="Devise"
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value)
              setRateTouched(false)
            }}
            className="rounded-full bg-fill px-3 py-1.5 text-[17px] font-semibold outline-none"
          >
            {[...new Set([trip.currency, 'EUR', ...CURRENCIES])].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <p className="text-subhead mx-8 mb-6 text-label-2" aria-live="polite">
          {currency === 'EUR' ? currencyName('EUR') : eur != null ? `≈ ${formatMoney(eur)}` : currencyName(currency)}
        </p>

        <Section>
          <TextInput placeholder="Description (ex. Plein d’essence)" value={label} onChange={(e) => setLabel(e.target.value)} />
        </Section>

        <ChipSection header="Catégorie">
          <ChipPicker options={CATEGORIES} value={cat} onChange={setCat} />
        </ChipSection>

        <Section>
          <DateField
            label="Date"
            value={date}
            onChange={(d) => {
              if (!d) return
              setDate(d)
              setRateTouched(false)
            }}
          />
          <FieldRow label="Étape">
            <select
              value={stopId}
              onChange={(e) => setStopId(e.target.value)}
              className="h-11 max-w-56 appearance-none truncate bg-transparent text-right text-[17px] text-label-2 outline-none"
            >
              <option value="">Aucune</option>
              {stops.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {i + 1}. {s.name}
                </option>
              ))}
            </select>
          </FieldRow>
        </Section>

        {currency !== 'EUR' && (
          <Section footer={rateNote()}>
            <FieldRow label={`1 ${currency} =`}>
              <span className="flex items-center gap-1">
                {loadingRate && <Loader2 size={16} className="animate-spin text-label-2" />}
                <InlineInput
                  inputMode="decimal"
                  aria-label="Taux de change"
                  placeholder="taux"
                  value={rateText}
                  onChange={(e) => {
                    setRateText(e.target.value)
                    setRateTouched(true)
                  }}
                  className="w-28"
                />
                <span className="text-body text-label-2">€</span>
              </span>
            </FieldRow>
          </Section>
        )}

        {expense && (
          <Section>
            <Row
              icon={Trash2}
              iconColor="var(--red)"
              destructive
              label={confirmDelete ? 'Toucher encore pour confirmer' : 'Supprimer la dépense'}
              onClick={async () => {
                if (!confirmDelete) return setConfirmDelete(true)
                await deleteExpense(expense.id)
                onClose()
              }}
            />
          </Section>
        )}
      </div>
    </BottomSheet>
  )
}
