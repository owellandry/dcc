'use client'

import Link from 'next/link'
import { Plus, Search, Users } from 'lucide-react'
import { cn } from '@/lib/cn'
import { interactiveMotion, itemVariants, listVariants, motion } from '@/lib/motion'
import { UserAvatar } from '@/components/user/UserAvatar'
import type { DMSidebarItem, DMSidebarVisualProps } from './DMSidebar.shared'

export function DMSidebarVisual({ pathname, badgeCount, items, onOpenDm }: DMSidebarVisualProps) {
  return (
    <motion.aside
      className="flex h-full w-80 flex-col border-r border-[var(--b1)] bg-[var(--s1)]"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div className="px-3 pb-3 pt-4">
        <div className="flex items-center gap-2 rounded-md bg-[var(--s4)] px-3 py-2 ring-1 ring-inset ring-[var(--b1)]">
          <Search size={13} className="shrink-0 text-[var(--t4)]" />
          <input
            placeholder="Buscar conversacion"
            className="w-full bg-transparent text-[13px] text-[var(--t1)] placeholder:text-[var(--t4)] outline-none"
          />
        </div>
      </div>

      <div className="px-2 pb-3">
        <Link
          href="/channels/@me"
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-500 transition-colors',
            pathname === '/channels/@me'
              ? 'bg-[var(--ember-dim)] text-[var(--t0)]'
              : 'text-[var(--t3)] hover:bg-[var(--surface-soft)] hover:text-[var(--t1)]'
          )}
        >
          <Users size={15} className="shrink-0" />
          <span className="flex-1">Amigos</span>
          {badgeCount > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--ember)] px-1 text-[10px] font-700 text-[var(--ember-contrast)]">
              {badgeCount}
            </span>
          )}
        </Link>

        <button
          type="button"
          className="mt-0.5 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-500 text-[var(--t3)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--t1)]"
        >
          <Plus size={15} className="shrink-0" />
          <span>Nuevo mensaje</span>
        </button>
      </div>

      <div className="mx-3 border-t border-[var(--b1)]" />

      <div className="px-3 pb-1 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">
            Mensajes directos
          </span>
          <button type="button" className="text-[var(--t4)] transition-colors hover:text-[var(--t2)]">
            <Plus size={13} />
          </button>
        </div>
      </div>

      <motion.div
        className="scrollable flex-1 px-2 pb-3 pt-1"
        initial="hidden"
        animate="visible"
        variants={listVariants(0.05, 0.05)}
      >
        {items.length === 0 && (
          <p className="px-2.5 py-4 text-[12px] text-[var(--t4)]">Sin conversaciones todavia.</p>
        )}

        {items.map((item) => (
          <motion.div key={item.user.id} variants={itemVariants}>
            <DMItem item={item} onClick={() => onOpenDm(item.user)} />
          </motion.div>
        ))}
      </motion.div>
    </motion.aside>
  )
}

function DMItem({ item, onClick }: { item: DMSidebarItem; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={item.isLoading}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors',
        item.active
          ? 'bg-[var(--surface-soft)] text-[var(--t0)]'
          : 'text-[var(--t3)] hover:bg-[var(--surface-soft)] hover:text-[var(--t1)]',
        item.isLoading ? 'opacity-80' : ''
      )}
      {...interactiveMotion}
    >
      <UserAvatar user={item.user} size={28} showStatus />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-500 leading-tight">{item.user.username}</p>
        <p className="truncate text-[11px] leading-tight text-[var(--t4)]">
          {item.isLoading ? 'Abriendo...' : item.user.customStatus ?? item.user.status ?? 'En linea'}
        </p>
      </div>
    </motion.button>
  )
}
