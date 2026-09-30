import type { Transition, Variants } from 'motion/react'

export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]
export const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1]

export const quickTransition: Transition = { duration: 0.22, ease: EASE_OUT }

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.3, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.18, ease: EASE_OUT } }
}

export const staggerParent: Variants = {
  animate: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } }
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10, filter: 'blur(3px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.32, ease: EASE_OUT } }
}

export const toastVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.96, filter: 'blur(5px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: { duration: 0.28, ease: EASE_OUT } },
  exit: { opacity: 0, y: 8, scale: 0.97, filter: 'blur(5px)', transition: { duration: 0.18, ease: EASE_OUT } }
}

export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }
}

export const modalVariants: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', duration: 0.34, bounce: 0 } },
  exit: { opacity: 0, scale: 0.96, y: 6, transition: { duration: 0.16, ease: EASE_OUT } }
}
