'use client'

import { Hash, Home, Menu, MessageSquare, Pin, Search, Shield, Users, Volume2 } from 'lucide-react'
import { interactiveMotion, motion } from '@/lib/motion'
import { useMobileSidebar } from '@/components/layout/MobileSidebarShell'
import type { ChannelHeaderBarVisualProps, HeaderButtonProps } from './ChannelHeaderBar.shared'

export function ChannelHeaderBarVisual({
  channelKind,
  channelName,
  topic,
  isMemberListOpen,
  onToggleMemberList,
}: ChannelHeaderBarVisualProps) {
  const ChannelIcon =
    channelKind === 'voice' ? Volume2 : channelKind === 'welcome' ? Home : channelKind === 'rules' ? Shield : Hash
  const mobileSidebar = useMobileSidebar()

  return (
    <motion.header
      className="relative z-20 shrink-0 bg-[var(--s3)] pl-[5px] pr-0"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <div className="flex h-14 items-center gap-3 rounded-bl-2xl rounded-tl-none rounded-r-none border border-r-0 border-[var(--b1)] bg-[var(--s0)] px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {mobileSidebar && (
            <motion.button
              type="button"
              aria-label="Abrir sidebar"
              className="mr-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-transparent bg-[var(--s1)] text-[var(--t3)] transition-all hover:border-[var(--b1)] hover:text-[var(--t1)] md:hidden"
              onClick={mobileSidebar.toggle}
              {...interactiveMotion}
            >
              <Menu size={18} />
            </motion.button>
          )}
          <motion.div
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--s1)] text-[var(--t2)]"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 3.4, ease: 'easeInOut' }}
          >
            <ChannelIcon size={17} />
          </motion.div>
          <span className="truncate font-display text-[16px] font-700 text-[var(--t0)]">
            {channelName}
          </span>
          {topic && (
            <>
              <div className="h-4 w-px bg-[var(--b1)]" />
              <p className="max-w-sm truncate text-[13px] text-[var(--t2)]">{topic}</p>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <HeaderButton title="Threads" icon={<MessageSquare size={18} />} />
          <HeaderButton title="Pinned" icon={<Pin size={18} />} />
          <HeaderButton
            title="Member list"
            icon={<Users size={18} />}
            active={Boolean(isMemberListOpen)}
            {...(onToggleMemberList ? { onClick: onToggleMemberList } : {})}
          />

          <div className="ml-1 hidden h-8 w-44 items-center gap-2 rounded-lg border border-[var(--b1)] bg-[var(--s1)] px-2.5 transition-colors focus-within:border-[var(--b2)] sm:flex">
            <Search size={14} className="shrink-0 text-[var(--t3)]" />
            <input
              placeholder="Search"
              className="w-full bg-transparent text-xs text-[var(--t1)] placeholder:text-[var(--t3)] outline-none"
            />
          </div>
        </div>
      </div>
    </motion.header>
  )
}

function HeaderButton({ icon, title, active = false, onClick }: HeaderButtonProps) {
  return (
    <motion.button
      data-tooltip={title}
      data-tooltip-position="bottom"
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border bg-[var(--s1)] transition-all ${
        active
          ? 'border-[var(--b1)] text-[var(--t1)]'
          : 'border-transparent text-[var(--t3)] hover:border-[var(--b1)] hover:text-[var(--t1)]'
      }`}
      {...interactiveMotion}
    >
      {icon}
    </motion.button>
  )
}
