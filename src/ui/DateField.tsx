import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { spring } from './motion'

// Champ date avec calendrier qui se déplie sous la ligne (comme dans Calendrier sur iPhone).
// Plus rapide que le sélecteur natif : flèches année par année, et choix direct de
// l'année puis du mois en touchant le titre « novembre 2024 ».

type Props = {
  label: string
  /** « AAAA-MM-JJ » ou undefined */
  value: string | undefined
  onChange: (value: string | undefined) => void
  /** Date minimale (les jours avant sont grisés) */
  min?: string
  /** Mois affiché à l'ouverture quand le champ est vide (ex. date de début pour la date de fin) */
  openAt?: string
  /** Affiche « Effacer » (champ facultatif) */
  clearable?: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const todayISO = () => {
  const d = new Date()
  return toISO(d.getFullYear(), d.getMonth(), d.getDate())
}
const MONTHS = Array.from({ length: 12 }, (_, m) =>
  new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2024, m, 1)),
)
const MONTHS_SHORT = Array.from({ length: 12 }, (_, m) =>
  new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(new Date(2024, m, 1)),
)
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const fmtValue = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/** Mois affiché : { y, m } (m de 0 à 11) */
function monthOf(iso: string | undefined) {
  const [y, m] = (iso ?? todayISO()).split('-').map(Number)
  return { y, m: m - 1 }
}

export function DateField({ label, value, onChange, min, openAt, clearable }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => monthOf(value ?? openAt))
  const [mode, setMode] = useState<'days' | 'years' | 'months'>('days')

  const toggle = () => {
    if (!open) {
      setView(monthOf(value ?? openAt))
      setMode('days')
    }
    setOpen(!open)
  }

  const shift = (months: number) =>
    setView(({ y, m }) => {
      const t = y * 12 + m + months
      return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 }
    })

  const pick = (iso: string) => {
    onChange(iso || undefined)
    setOpen(false)
  }

  return (
    <div className="ml-4 border-b-[0.5px] border-separator last:border-b-0">
      <div className="flex min-h-11 items-center gap-3 pr-4">
        <span className="text-body shrink-0">{label}</span>
        <span className="flex min-w-0 flex-1 justify-end">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-label={`${label} : ${value ? fmtValue.format(new Date(`${value}T12:00:00`)) : 'aucune date'}`}
            className={`min-h-8 rounded-lg px-2.5 py-1 text-[16px] ${open ? 'bg-blue/15 text-blue' : 'bg-fill text-label'} ${
              value ? '' : 'text-label-3'
            }`}
          >
            {value ? fmtValue.format(new Date(`${value}T12:00:00`)) : 'Choisir'}
          </button>
        </span>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="pr-4 pb-3" role="group" aria-label={`Calendrier ${label}`}>
              {/* En-tête : année −, mois −, titre (choix rapide), mois +, année + */}
              <div className="flex items-center justify-between py-1">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'days' ? 'years' : 'days')}
                  className="text-headline flex min-h-11 items-center gap-1 capitalize"
                  aria-label="Choisir l’année et le mois"
                >
                  {MONTHS[view.m]} {view.y}
                  <ChevronDown size={18} className={`text-blue transition-transform ${mode === 'days' ? '' : 'rotate-180'}`} />
                </button>
                {mode === 'days' && (
                  <div className="flex text-blue">
                    <NavButton label="Année précédente" onClick={() => shift(-12)}>
                      <ChevronsLeft size={22} />
                    </NavButton>
                    <NavButton label="Mois précédent" onClick={() => shift(-1)}>
                      <ChevronLeft size={22} />
                    </NavButton>
                    <NavButton label="Mois suivant" onClick={() => shift(1)}>
                      <ChevronRight size={22} />
                    </NavButton>
                    <NavButton label="Année suivante" onClick={() => shift(12)}>
                      <ChevronsRight size={22} />
                    </NavButton>
                  </div>
                )}
              </div>

              {mode === 'days' && <DaysGrid view={view} value={value} min={min} onPick={pick} />}
              {mode === 'years' && (
                <YearsGrid
                  year={view.y}
                  onPick={(y) => {
                    setView((v) => ({ ...v, y }))
                    setMode('months')
                  }}
                />
              )}
              {mode === 'months' && (
                <div className="grid grid-cols-4 gap-2 py-2">
                  {MONTHS_SHORT.map((name, m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setView((v) => ({ ...v, m }))
                        setMode('days')
                      }}
                      className={`min-h-11 rounded-xl text-[16px] capitalize ${
                        m === view.m ? 'bg-blue font-semibold text-white' : 'bg-fill text-label'
                      }`}
                    >
                      {name.replace('.', '')}
                    </button>
                  ))}
                </div>
              )}

              {clearable && value && (
                <button type="button" onClick={() => pick('')} className="text-subhead mt-1 min-h-9 text-red">
                  Effacer la date
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NavButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex size-11 items-center justify-center active:opacity-50">
      {children}
    </button>
  )
}

function DaysGrid({
  view,
  value,
  min,
  onPick,
}: {
  view: { y: number; m: number }
  value?: string
  min?: string
  onPick: (iso: string) => void
}) {
  const first = new Date(view.y, view.m, 1)
  const offset = (first.getDay() + 6) % 7 // lundi en premier
  const days = new Date(view.y, view.m + 1, 0).getDate()
  const today = todayISO()
  return (
    <div className="grid grid-cols-7 text-center">
      {WEEKDAYS.map((d, i) => (
        <span key={i} className="text-caption py-1 font-semibold uppercase text-label-3">
          {d}
        </span>
      ))}
      {Array.from({ length: offset }, (_, i) => (
        <span key={`v${i}`} />
      ))}
      {Array.from({ length: days }, (_, i) => {
        const iso = toISO(view.y, view.m, i + 1)
        const selected = iso === value
        const disabled = !!min && iso < min
        return (
          <button
            key={iso}
            type="button"
            disabled={disabled}
            onClick={() => onPick(iso)}
            aria-label={new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(new Date(`${iso}T12:00:00`))}
            aria-pressed={selected}
            className="flex h-10 items-center justify-center disabled:opacity-30"
          >
            <span
              className={`flex size-9 items-center justify-center rounded-full text-[17px] tabular-nums ${
                selected ? 'bg-blue font-semibold text-white' : iso === today ? 'font-semibold text-blue' : ''
              }`}
            >
              {i + 1}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Grille des années (1950 → dans 10 ans), l'année affichée centrée */
function YearsGrid({ year, onPick }: { year: number; onPick: (y: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const last = new Date().getFullYear() + 10
  const years = Array.from({ length: last - 1950 + 1 }, (_, i) => 1950 + i)
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[data-current]')
    if (el && ref.current) ref.current.scrollTop = el.offsetTop - ref.current.clientHeight / 2 + el.clientHeight / 2
  }, [])
  return (
    <div ref={ref} className="relative grid max-h-56 grid-cols-4 gap-2 overflow-y-auto py-2">
      {years.map((y) => (
        <button
          key={y}
          type="button"
          data-current={y === year ? '' : undefined}
          onClick={() => onPick(y)}
          className={`min-h-11 rounded-xl text-[16px] tabular-nums ${y === year ? 'bg-blue font-semibold text-white' : 'bg-fill text-label'}`}
        >
          {y}
        </button>
      ))}
    </div>
  )
}
