'use client'

import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, modalBackdropVariants, modalPanelVariants, motion } from '@/lib/motion'
import { cn } from '@/lib/cn'

interface AppModalShellProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  panelClassName: string
  overlayClassName?: string
  contentClassName?: string
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  closeDisabled?: boolean
}

export function AppModalShell({
  open,
  onClose,
  children,
  panelClassName,
  overlayClassName,
  contentClassName,
  closeOnBackdrop = true,
  closeOnEscape = true,
  closeDisabled = false,
}: AppModalShellProps) {
  useEffect(() => {
    if (!open || !closeOnEscape || closeDisabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeDisabled, closeOnEscape, onClose, open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 flex items-center justify-center overflow-y-auto bg-[var(--modal-scrim)] p-4',
            overlayClassName
          )}
          onClick={() => {
            if (!closeOnBackdrop || closeDisabled) return
            onClose()
          }}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalBackdropVariants}
        >
          <motion.div
            className={cn(panelClassName, contentClassName)}
            onClick={(event) => event.stopPropagation()}
            variants={modalPanelVariants}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
