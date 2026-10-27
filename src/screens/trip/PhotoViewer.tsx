import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Ellipsis, Image as ImageIcon, MapPin, Trash2, X } from 'lucide-react'
import { AssignStopSheet } from './AssignStopSheet'
import { deletePhoto, updatePhoto, usePhotoUrl } from '../../db/photos'
import { updateTrip } from '../../db/trips'
import type { Photo, Stop, Trip } from '../../db/schema'
import { spring } from '../../ui/motion'

type Props = {
  trip: Trip
  photos: Photo[]
  stops: Stop[]
  /** Index de la photo ouverte ; null = visionneuse fermée */
  index: number | null
  onClose: () => void
}

const fmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

/**
 * Visionneuse plein écran : on passe d'une photo à l'autre en glissant (défilement « aimanté »),
 * légende modifiable en bas, actions dans le menu.
 */
export function PhotoViewer({ trip, photos, stops, index, onClose }: Props) {
  const scroller = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const photo = photos[current]

  // Ouverture : on se place directement sur la photo touchée
  useEffect(() => {
    if (index === null) return
    setCurrent(index)
    setMenuOpen(false)
    requestAnimationFrame(() => {
      const el = scroller.current
      if (el) el.scrollTo({ left: index * el.clientWidth, behavior: 'instant' })
    })
  }, [index])

  useEffect(() => setConfirmDelete(false), [current])

  // Photo supprimée : on reste dans les limites
  useEffect(() => {
    if (index !== null && photos.length === 0) onClose()
    else if (current >= photos.length && photos.length > 0) setCurrent(photos.length - 1)
  }, [photos.length, current, index, onClose])

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => {
      const el = scroller.current
      if (e.key === 'Escape') onClose()
      if (el && e.key === 'ArrowRight') el.scrollBy({ left: el.clientWidth, behavior: 'smooth' })
      if (el && e.key === 'ArrowLeft') el.scrollBy({ left: -el.clientWidth, behavior: 'smooth' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, onClose])

  const stop = stops.find((s) => s.id === photo?.stopId)
  const isCover = trip.coverPhotoId === photo?.id

  return createPortal(
    <AnimatePresence>
      {index !== null && photo && (
        <motion.div
          key="viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          className="fixed inset-0 z-50 bg-black text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Photos côte à côte, défilement horizontal aimanté */}
          <div
            ref={scroller}
            className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
            onScroll={(e) => {
              const el = e.currentTarget
              const i = Math.round(el.scrollLeft / el.clientWidth)
              if (i !== current) setCurrent(i)
            }}
          >
            {photos.map((p, i) => (
              <Slide key={p.id} photo={p} near={Math.abs(i - current) <= 1} />
            ))}
          </div>

          {/* Barre du haut */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent px-4 pb-6" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}>
            <RoundButton label="Fermer" onClick={onClose}>
              <X size={20} strokeWidth={2.2} />
            </RoundButton>
            <span className="text-subhead font-semibold tabular-nums">
              {current + 1} / {photos.length}
            </span>
            <RoundButton label="Options de la photo" onClick={() => setMenuOpen((v) => !v)}>
              <Ellipsis size={20} strokeWidth={2.2} />
            </RoundButton>
          </div>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -8 }}
                transition={spring}
                className="glass absolute right-4 z-10 w-64 origin-top-right overflow-hidden rounded-[18px] text-label"
                style={{ top: 'calc(env(safe-area-inset-top) + 60px)' }}
              >
                <MenuItem
                  icon={ImageIcon}
                  label={isCover ? 'Photo de couverture ✓' : 'Utiliser en couverture'}
                  onClick={async () => {
                    await updateTrip(trip.id, { coverPhotoId: photo.id })
                    setMenuOpen(false)
                  }}
                />
                <MenuItem
                  icon={MapPin}
                  label="Rattacher à une étape…"
                  onClick={() => {
                    setMenuOpen(false)
                    setAssignOpen(true)
                  }}
                />
                <MenuItem
                  icon={Trash2}
                  destructive
                  label={confirmDelete ? 'Confirmer la suppression' : 'Supprimer la photo'}
                  onClick={async () => {
                    if (!confirmDelete) return setConfirmDelete(true)
                    setMenuOpen(false)
                    await deletePhoto(photo)
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Légende et infos */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pt-10" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            <Caption key={photo.id} photo={photo} />
            <p className="text-footnote mt-1 text-white/70">
              {[photo.takenAt && fmt.format(new Date(photo.takenAt)), stop?.name ?? 'À classer'].filter(Boolean).join(' · ')}
            </p>
          </div>

          <AssignStopSheet
            open={assignOpen}
            onClose={() => setAssignOpen(false)}
            stops={stops}
            currentId={photo.stopId}
            onPick={async (stopId) => {
              await updatePhoto(photo.id, { stopId })
              setAssignOpen(false)
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/** Une photo : la grande image n'est chargée que pour la photo affichée et ses voisines */
function Slide({ photo, near }: { photo: Photo; near: boolean }) {
  const full = usePhotoUrl(near ? photo : undefined, 'image')
  const thumb = usePhotoUrl(photo, 'thumb')
  return (
    <div className="flex h-full w-full shrink-0 snap-center items-center justify-center">
      {(full ?? thumb) && <img src={full ?? thumb} alt={photo.caption ?? ''} className="max-h-full max-w-full object-contain" draggable={false} />}
    </div>
  )
}

/** Légende modifiable directement, enregistrée quand on quitte le champ */
function Caption({ photo }: { photo: Photo }) {
  const [text, setText] = useState(photo.caption ?? '')
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text.trim() !== (photo.caption ?? '') && updatePhoto(photo.id, { caption: text.trim() || undefined })}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      placeholder="Ajouter une légende"
      aria-label="Légende"
      className="w-full bg-transparent text-[17px] font-medium text-white outline-none placeholder:text-white/50"
    />
  )
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      transition={spring}
      className="flex size-11 items-center justify-center rounded-full bg-white/15 shadow-[inset_0_1px_0.5px_rgb(255_255_255/0.3)] backdrop-blur-xl"
    >
      {children}
    </motion.button>
  )
}

function MenuItem({ icon: Icon, label, onClick, destructive }: { icon: typeof X; label: string; onClick: () => void; destructive?: boolean }) {
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
