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
  virtualizer,
  totalSize,
  virtualItems,
  dmIntro,
  onScroll,
}: MessageListVisualProps) {
  if (isEmpty && !dmIntro) {
    return <EmptyState />
  }

  return (
    <div
      ref={parentRef}
      onScroll={onScroll}
      className="scrollable flex-1 overflow-y-auto"
      style={{ contain: 'strict' }}
    >
      {dmIntro && (
        <div className="px-4 pb-6 pt-8">
          <DMIntroCard intro={dmIntro} />
        </div>
      )}

      <div style={{ height: totalSize, position: 'relative' }}>
        {isLoading && hasMoreBefore && (
          <div className="absolute left-0 right-0 top-0 flex justify-center py-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-ember/20 border-t-ember" />
          </div>
        )}

        {virtualItems.map((item) => {
          const group = groupedMessages[item.index]
          if (!group) return null

          return (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${item.start}px)`,
              }}
            >
              <MessageItem message={group.message} grouped={group.grouped} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DMIntroCard({ intro }: { intro: DMIntroCardData }) {
  return (
    <motion.div
      className="rounded-[28px] border border-[var(--b1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_56px_rgba(0,0,0,0.28)]"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <UserAvatar user={intro.user} size={72} showStatus />
      <h2 className="mt-4 font-display text-4xl font-800 tracking-tight text-[var(--t0)]">
        {getUserDisplayName(intro.user)}
      </h2>
      <p className="mt-1 text-[15px] font-500 text-[var(--t2)]">{intro.discriminatorLabel}</p>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--t3)]">{intro.subtitle}</p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--b1)] bg-[var(--s4)] px-3 py-1.5 text-xs font-600 text-[var(--t2)]">
        <span className="h-2 w-2 rounded-full bg-[var(--online)]" />
        Mensaje directo activo
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
