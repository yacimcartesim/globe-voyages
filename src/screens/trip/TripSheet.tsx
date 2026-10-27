import { useEffect, useRef, useState } from 'react'
import { Ellipsis, Pencil, Trash2, Wallet, X } from 'lucide-react'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import { createPortal } from 'react-dom'
import { EmptyState, SegmentedControl } from '../../ui/controls'
import { Flag } from '../../ui/Flag'
import { TripCover } from '../../ui/TripCover'
import { spring } from '../../ui/motion'
import { ItineraryTab } from './ItineraryTab'
import { PracticalTab } from './PracticalTab'
import { PhotosTab } from './PhotosTab'
import { TripFormSheet } from '../TripFormSheet'
import { deleteTrip, formatRange, tripLength, useTrip } from '../../db/trips'
import { useUI } from '../../state/ui'

type Tab = 'itinerary' | 'photos' | 'practical' | 'budget'

/**
 * Fiche voyage plein écran : en-tête (couverture, titre, dates, drapeaux)
 * puis 4 onglets segmentés façon iOS.
 */
export function TripSheet() {
  const { tripId, closeTrip } = useUI()
  const trip = useTrip(tripId)
  const [tab, setTab] = useState<Tab>('itinerary')
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setTab('itinerary')
    setMenuOpen(false)
    setConfirmDelete(false)
  }, [tripId])

  useEffect(() => {
    if (!tripId) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeTrip()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tripId, closeTrip])

  const days = trip ? tripLength(trip) : undefined

  // Bandeau flouté sous la barre d'état, qui apparaît quand l'en-tête photo a défilé
  const scrollRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: scrollRef })
  const statusBarOpacity = useTransform(scrollY, [180, 220], [0, 1])

  return createPortal(
    <AnimatePresence>
      {tripId && trip && (
        <motion.div
          key="trip"
          role="dialog"
          aria-modal="true"
          aria-label={trip.title}
          className="fixed inset-0 z-40 overflow-hidden bg-grouped"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={spring}
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-grouped/85 backdrop-blur-xl"
            style={{ height: 'env(safe-area-inset-top)', opacity: statusBarOpacity }}
          />
          <div ref={scrollRef} className="no-scrollbar h-full overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}>
            {/* En-tête */}
            <header className="relative h-64 text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
              <TripCover countries={trip.countries} coverPhotoId={trip.coverPhotoId} />
              <div className="absolute inset-x-0 flex justify-between px-4" style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}>
                <HeaderButton label="Fermer" onClick={closeTrip}>
                  <X size={20} strokeWidth={2.2} />
                </HeaderButton>
                <HeaderButton label="Options" onClick={() => setMenuOpen((v) => !v)}>
                  <Ellipsis size={20} strokeWidth={2.2} />
                </HeaderButton>
              </div>
              <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {trip.countries.map((c) => (
                    <Flag key={c} code={c} size={26} radius={3} />
                  ))}
                </div>
                <h1 className="text-title-1 leading-tight">{trip.title}</h1>
                <p className="text-subhead mt-1 text-white/85">
                  {formatRange(trip.start, trip.end)}
                  {days ? ` · ${days} jours` : ''}
                  {trip.companions ? ` · avec ${trip.companions}` : ''}
                </p>
              </div>

              {/* Menu d'options */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -8 }}
                    transition={spring}
                    className="glass absolute right-4 z-10 w-60 origin-top-right overflow-hidden rounded-[18px] text-label"
                    style={{ top: 'calc(env(safe-area-inset-top) + 60px)' }}
                  >
                    <MenuItem
                      icon={Pencil}
                      label="Modifier le voyage"
                      onClick={() => {
                        setMenuOpen(false)
                        setEditOpen(true)
                      }}
                    />
                    <MenuItem
                      icon={Trash2}
                      destructive
                      label={confirmDelete ? 'Confirmer la suppression' : 'Supprimer le voyage'}
                      onClick={async () => {
                        if (!confirmDelete) return setConfirmDelete(true)
                        closeTrip()
                        await deleteTrip(trip.id)
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </header>

            {/* Onglets */}
            <div className="sticky z-10 bg-grouped/85 px-4 pt-3 pb-3 backdrop-blur-xl" style={{ top: 'env(safe-area-inset-top)' }}>
              <SegmentedControl<Tab>
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'itinerary', label: 'Itinéraire' },
                  { value: 'photos', label: 'Photos' },
                  { value: 'practical', label: 'Infos' },
                  { value: 'budget', label: 'Budget' },
                ]}
              />
            </div>

            <div className="pt-3">
              {tab === 'itinerary' && <ItineraryTab trip={trip} />}
              {tab === 'practical' && <PracticalTab trip={trip} />}
              {tab === 'photos' && <PhotosTab trip={trip} />}
              {tab === 'budget' && (
                <EmptyState
                  icon={Wallet}
                  title="Budget"
                  text={`Le suivi des dépenses (en ${trip.currency} et en euros) arrive en phase 5.`}
                />
              )}
            </div>
          </div>

          <TripFormSheet open={editOpen} onClose={() => setEditOpen(false)} trip={trip} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function HeaderButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      transition={spring}
      className="flex size-11 items-center justify-center rounded-full bg-black/25 text-white shadow-[inset_0_1px_0.5px_rgb(255_255_255/0.35)] backdrop-blur-xl"
    >
      {children}
    </motion.button>
  )
}

function MenuItem({ icon: Icon, label, onClick, destructive }: { icon: typeof Pencil; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center justify-between border-b-[0.5px] border-separator px-4 text-left text-[17px] last:border-b-0 active:bg-fill ${destructive ? 'text-red' : ''}`}
    >
      {label}
      <Icon size={18} />
    </button>
  )
}

