'use client'

import {
  AnimatePresence,
  motion,
  type HTMLMotionProps,
  type Transition,
  type Variants,
} from 'motion/react'
import type { ReactNode } from 'react'

const ease = [0.22, 1, 0.36, 1] as const

export const transitions = {
  smooth: { duration: 0.42, ease } satisfies Transition,
  slow: { duration: 0.62, ease } satisfies Transition,
  spring: { type: 'spring', stiffness: 280, damping: 28, mass: 0.9 } satisfies Transition,
}

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: transitions.smooth },
}

export const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: transitions.smooth,
  },
}

export const listVariants = (stagger = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger,
      delayChildren,
    },
  },
})

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.smooth,
  },
}

export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease } },
  exit: { opacity: 0, transition: { duration: 0.16, ease } },
}

export const modalPanelVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.spring,
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.98,
    transition: { duration: 0.18, ease },
  },
}

export const overlayCardVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.spring,
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.98,
    transition: { duration: 0.14, ease },
  },
}

export const interactiveMotion = {
  whileHover: { y: -2, scale: 1.01, transition: transitions.spring },
  whileTap: { scale: 0.985, transition: { duration: 0.12 } satisfies Transition },
}

export const subtleMotion = {
  whileHover: { scale: 1.015, transition: transitions.spring },
  whileTap: { scale: 0.985, transition: { duration: 0.12 } satisfies Transition },
}

type MotionSurfaceProps = HTMLMotionProps<'div'> & {
  children: ReactNode
}

export function MotionPage({ children, ...props }: MotionSurfaceProps) {
  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants} {...props}>
      {children}
    </motion.div>
  )
}

export { AnimatePresence, motion }
