'use client'

import { Menu, MessageSquare, Pin, Search, UserRound } from 'lucide-react'
import { interactiveMotion, motion } from '@/lib/motion'
import { ChannelHeaderBar } from '@/components/chat/ChannelHeaderBar'
import { OfficialMemberTag, hasOfficialMemberBadge } from '@/components/user/Badge'
import { UserAvatar } from '@/components/user/UserAvatar'
import { useMobileSidebar } from '@/components/layout/MobileSidebarShell'
import { type ChatHeaderVisualProps } from './ChatHeader.shared'

export function ChatHeaderVisual({
  kind,
  channelName,
  topic,
  channelType,
  isMemberListOpen,
  onToggleMemberList,
  dmUser,
  dmSearchPlaceholder,
}: ChatHeaderVisualProps) {
  const mobileSidebar = useMobileSidebar()
  if (kind === 'dm' && dmUser) {
    return (
      <motion.header
        className="relative z-20 shrink-0 bg-[var(--s3)] pl-[5px] pr-0"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
      >
        <div className="flex h-14 items-center gap-3 rounded-bl-2xl border border-r-0 border-[var(--b1)] bg-[var(--s0)] px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
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
            <UserAvatar user={dmUser} size={20} showStatus />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate font-display text-[16px] font-700 text-[var(--t0)]">{dmUser.username}</p>
                {hasOfficialMemberBadge({ user: dmUser }) && <OfficialMemberTag compact className="translate-y-[1px]" />}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <HeaderButton title="Mensajes fijados" icon={<Pin size={18} />} />
            <HeaderButton title="Mostrar perfil" icon={<UserRound size={18} />} />

            <div className="ml-1 hidden h-8 w-48 items-center gap-2 rounded-lg border border-[var(--b1)] bg-[var(--s1)] px-2.5 transition-colors focus-within:border-[var(--b2)] sm:flex">
              <Search size={14} className="shrink-0 text-[var(--t3)]" />
              <input
                placeholder={dmSearchPlaceholder ?? `Buscar ${channelName}`}
                className="w-full bg-transparent text-xs text-[var(--t1)] placeholder:text-[var(--t3)] outline-none"
              />
            </div>
          </div>
        </div>
      </motion.header>
    )
  }

  return (
    <ChannelHeaderBar
      channelName={channelName}
      {...(topic != null ? { topic } : {})}
      {...(channelType != null ? { channelType } : {})}
      {...(isMemberListOpen !== undefined ? { isMemberListOpen } : {})}
      {...(onToggleMemberList !== undefined ? { onToggleMemberList } : {})}
    />
  )
}

function HeaderButton({
  title,
  icon,
}: {
  title: string
  icon: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      data-tooltip={title}
      data-tooltip-position="bottom"
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-[var(--s1)] text-[var(--t3)] transition-all hover:border-[var(--b1)] hover:text-[var(--t1)]"
      {...interactiveMotion}
    >
      {icon}
    </motion.button>
  )
}
