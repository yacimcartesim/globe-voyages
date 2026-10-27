import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'motion/react'
import { spring } from './motion'

type Props = {
  open: boolean
  onClose: () => void
  /** Titre centré dans l'en-tête */
  title?: string
  /** Bouton à gauche (ex. « Annuler ») */
  leading?: ReactNode
  /** Bouton à droite (ex. « OK ») */
  trailing?: ReactNode
  /** « large » = presque plein écran, « auto » = hauteur du contenu */
  size?: 'large' | 'auto'
  children: ReactNode
}

/**
 * Fiche qui glisse depuis le bas, avec poignée.
 * On la ferme en la tirant vers le bas (depuis la poignée/l'en-tête), en tapant le fond, ou avec Échap.
 */
export function BottomSheet({ open, onClose, title, leading, trailing, size = 'large', children }: Props) {
  const dragControls = useDragControls()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose()
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
          {/* Fond assombri */}
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          <motion.div
            className="absolute inset-x-0 bottom-0 mx-auto flex max-w-xl flex-col overflow-hidden rounded-t-[34px] bg-grouped shadow-soft"
            style={{
              top: size === 'large' ? 'calc(env(safe-area-inset-top) + 12px)' : undefined,
              maxHeight: 'calc(100% - env(safe-area-inset-top) - 12px)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={onDragEnd}
          >
            {/* Poignée + en-tête : zone qui permet de tirer la fiche */}
            <div className="shrink-0 touch-none" onPointerDown={(e) => dragControls.start(e)}>
              <div className="flex justify-center pt-1.5 pb-1">
                <div className="h-[5px] w-9 rounded-full bg-label-3" />
              </div>
              {(title || leading || trailing) && (
                <div className="relative flex h-11 items-center justify-center px-4">
                  <div className="absolute left-2">{leading}</div>
                  {title && <span className="text-headline">{title}</span>}
                  <div className="absolute right-2">{trailing}</div>
                </div>
              )}
            </div>

            <div
              className="no-scrollbar min-h-0 flex-1 overflow-y-auto"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
