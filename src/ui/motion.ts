// Ressorts partagés : courts et doux, proches des animations système iOS
import type { Transition } from 'motion/react'

export const spring: Transition = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }
export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 32 }
export const fade: Transition = { duration: 0.2, ease: 'easeOut' }
