import { useEffect, useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'

type Props = {
  /** Grand titre iOS (« Large Title »), qui se réduit dans la barre au défilement */
  title: string
  /** Boutons affichés à droite de la barre de navigation */
  trailing?: ReactNode
  /** Contenu affiché sous le grand titre, avant le reste (ex. compteur) */
  subtitle?: ReactNode
  /** Identifiant de l'onglet : un 2e tap sur l'onglet actif remonte en haut */
  tabId?: string
  /** Désactive le défilement (écran Globe) */
  fixed?: boolean
  children: ReactNode
}

/**
 * Écran standard : barre de navigation translucide + grand titre qui se réduit au scroll,
 * comme dans les apps Apple (Réglages, Santé…).
 */
export function Screen({ title, trailing, subtitle, tabId, fixed, children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll({ container: scrollRef })

  // Le petit titre et le fond de la barre apparaissent quand le grand titre passe dessous
  const smallTitleOpacity = useTransform(scrollY, [28, 44], [0, 1])
  const barOpacity = useTransform(scrollY, [0, 20], [0, 1])
  // Effet « élastique » : le grand titre grossit légèrement quand on tire vers le bas
  const largeTitleScale = useTransform(scrollY, [-80, 0], [1.1, 1])

  // Remonter en haut quand on retape sur l'onglet déjà actif
  useEffect(() => {
    if (!tabId) return
    const onRetap = (e: Event) => {
      if ((e as CustomEvent<string>).detail === tabId) {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
    window.addEventListener('tab-retap', onRetap)
    return () => window.removeEventListener('tab-retap', onRetap)
  }, [tabId])

  return (
    <div
      ref={scrollRef}
      className={`absolute inset-0 no-scrollbar ${fixed ? 'overflow-hidden' : 'overflow-y-auto'}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Barre de navigation */}
      <div className="sticky top-0 z-20" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Fondu flou iOS 26 au lieu d'une barre opaque avec bordure */}
        <motion.div className="scroll-edge-top absolute inset-x-0 top-0 -bottom-5" style={{ opacity: barOpacity }} />
        <div className="relative flex h-13 items-center justify-center px-4">
          <motion.span className="text-headline" style={{ opacity: smallTitleOpacity }}>
            {title}
          </motion.span>
          {trailing && <div className="absolute right-4 flex items-center gap-2">{trailing}</div>}
        </div>
      </div>

      {/* Grand titre */}
      <div className="px-4 pb-2">
        <motion.h1 className="text-large-title origin-left" style={{ scale: largeTitleScale }}>
          {title}
        </motion.h1>
        {subtitle}
      </div>

      <div style={{ paddingBottom: fixed ? 0 : 'calc(var(--tabbar-h) + 88px)' }}>{children}</div>
    </div>
  )
}
