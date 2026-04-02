'use client'

import { MessageSquare } from 'lucide-react'
import { getUserDisplayName } from '@/lib/users/displayName.shared'
import { itemVariants, motion } from '@/lib/motion'
import { UserAvatar } from '@/components/user/UserAvatar'
import { MessageItem } from '../MessageItem'
import { type DMIntroCardData, type MessageListVisualProps } from './MessageList.shared'

export function MessageListVisual({
  isEmpty,
  isLoading,
  hasMoreBefore,
  groupedMessages,
  parentRef,
  dmIntro,
  onScroll,
}: MessageListVisualProps) {
  if (isEmpty) {
    return <EmptyState />
  }

  return (
    <div
      ref={parentRef}
      onScroll={onScroll}
      className="scrollable flex-1 overflow-y-auto"
      style={{ contain: 'strict' }}
    >
      {dmIntro && groupedMessages.length > 0 && <DMConversationStart intro={dmIntro} />}

      <div className="relative pb-3">
        {isLoading && hasMoreBefore && (
          <div className="sticky top-0 z-10 flex justify-center py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-ember/20 border-t-ember" />
          </div>
        )}

        {groupedMessages.map((group) => (
          <MessageItem key={group.message.id} message={group.message} grouped={group.grouped} />
        ))}
      </div>
    </div>
  )
}

function DMConversationStart({ intro }: { intro: DMIntroCardData }) {
  return (
    <motion.div
      className="px-4 pb-3 pt-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      <div className="rounded-2xl border border-[var(--b1)]/80 bg-[var(--s2)]/70 px-4 py-3">
        <div className="flex items-center gap-3">
          <UserAvatar user={intro.user} size={40} showStatus />
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-700 text-[var(--t1)]">
              {getUserDisplayName(intro.user)}
            </p>
            <p className="truncate text-xs text-[var(--t3)]">{intro.discriminatorLabel}</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--t3)]">{intro.subtitle}</p>
      </div>
      <div className="mt-3 flex items-center gap-3 px-1">
        <div className="h-px flex-1 bg-[var(--b1)]/70" />
        <span className="text-[11px] font-600 uppercase tracking-[0.18em] text-[var(--t4)]">
          Inicio de la conversación
        </span>
        <div className="h-px flex-1 bg-[var(--b1)]/70" />
      </div>
    </motion.div>
  )
}

function EmptyState() {
  return (
    <motion.div
      className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <motion.div
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--s2)] surface-elevated"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      >
        <MessageSquare size={28} className="text-[var(--t3)]" strokeWidth={1.5} />
      </motion.div>
      <div>
        <p className="font-display text-lg font-700 text-[var(--t1)]">Todavia no hay mensajes</p>
        <p className="mt-1 text-sm text-[var(--t3)]">Se la primera persona en escribir algo.</p>
      </div>
    </motion.div>
  )
}
