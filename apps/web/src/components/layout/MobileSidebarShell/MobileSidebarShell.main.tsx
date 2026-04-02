'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from '@/lib/motion'

type MobileSidebarContextValue = {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const MobileSidebarContext = createContext<MobileSidebarContextValue | null>(null)

export function useMobileSidebar() {
  return useContext(MobileSidebarContext)
}

export function MobileSidebarShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Si pasamos a desktop, cerramos el overlay mobile.
    const mql = window.matchMedia('(min-width: 768px)')
    const onChange = () => {
      if (mql.matches) setIsOpen(false)
    }
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  const ctx = useMemo<MobileSidebarContextValue>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((v) => !v),
    }),
    [isOpen]
  )

  return (
    <MobileSidebarContext.Provider value={ctx}>
      <div className="flex h-full min-w-0 flex-1 overflow-hidden">
        {/* Scrim (solo mobile) */}
        <AnimatePresence>
          {isOpen && (
            <motion.button
              type="button"
              aria-label="Cerrar sidebar"
              className="fixed inset-0 z-[88] bg-black/60 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar: en desktop es “normal”, en mobile es overlay */}
        <div
          className={[
            'h-full',
            isOpen
              ? 'fixed inset-y-0 left-0 z-[90] block max-w-[92vw] md:static md:z-auto md:max-w-none'
              : 'hidden md:block',
          ].join(' ')}
        >
          {sidebar}
        </div>

        {/* Contenido */}
        <div className="min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </MobileSidebarContext.Provider>
  )
}
