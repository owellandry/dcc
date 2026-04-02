'use client'

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { FaCrown } from 'react-icons/fa6'
import { serversApi } from '@/lib/api'
import { getMemberDisplayName } from '@/lib/users/displayName.shared'
import { isMockSession } from '@/lib/mock-init'
import type { UserStatus } from '@/lib/types'
import { useServerMembers, useServersStore } from '@/stores/serversStore'
import { usePresenceStore } from '@/stores/presenceStore'
import { UserAvatar } from '@/components/user/UserAvatar'
import {
  UserDecorationBackdrop,
  getUserDecorationToneColors,
  useUserDecorationPresentation,
} from '@/components/user/UserDecorationBackdrop.module'
import { OfficialMemberTag, hasOfficialMemberBadge } from '@/components/user/Badge'
import { MemberPreviewCard } from '@/components/user/MemberPreviewCard'
import type { ServerMember } from '@/lib/types'
import { cn } from '@/lib/cn'
import type { FloatingAnchorRect } from '@/lib/layout/floatingCard.shared'

interface Props {
  serverId: string
}

export function MemberSidebar({ serverId }: Props) {
  const members = useServerMembers(serverId)
  const server = useServersStore((s) => s.servers[serverId])
  const setMembers = useServersStore((s) => s.setMembers)
  const presence = usePresenceStore((state) => state.presence)
  const [preview, setPreview] = useState<{
    member: ServerMember
    anchorRect: FloatingAnchorRect
  } | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const resolveMemberStatus = (member: ServerMember): UserStatus =>
    presence[member.userId]?.status ?? member.user.status ?? 'offline'

  const online = members.filter((member) => resolveMemberStatus(member) !== 'offline')
  const offline = members.filter((member) => resolveMemberStatus(member) === 'offline')

  useEffect(() => {
    if (!serverId || isMockSession()) return
    if (members.length > 0) return

    let cancelled = false

    serversApi
      .getMembers(serverId, { limit: 200 })
      .then((response) => {
        if (cancelled) return
        setMembers(serverId, response.data)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [members.length, serverId, setMembers])

  const openMemberPreview = (event: ReactMouseEvent<HTMLButtonElement>, member: ServerMember) => {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    setPreview({
      member,
      anchorRect: {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    })
  }

  useEffect(() => {
    if (!preview) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (previewRef.current && !previewRef.current.contains(target)) {
        setPreview(null)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreview(null)
    }

    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [preview])

  return (
    <>
      <aside className="h-full w-72 shrink-0 border-l border-[var(--b0)] bg-[var(--s1)] lg:w-60">
        <div className="scrollable h-full px-2 py-4">
          {online.length > 0 && (
            <MemberGroup
              label={`Online - ${online.length}`}
              members={online}
              faded={false}
              {...(server?.ownerId ? { ownerId: server.ownerId } : {})}
              onMemberContextMenu={openMemberPreview}
            />
          )}

          {offline.length > 0 && (
            <MemberGroup
              label={`Offline - ${offline.length}`}
              members={offline}
              faded
              {...(server?.ownerId ? { ownerId: server.ownerId } : {})}
              onMemberContextMenu={openMemberPreview}
            />
          )}
        </div>
      </aside>

      {preview && (
        <MemberPreviewCard
          previewRef={previewRef}
          member={preview.member}
          status={resolveMemberStatus(preview.member)}
          isOwner={server?.ownerId === preview.member.userId}
          anchorRect={preview.anchorRect}
          preferredPlacement="left"
        />
      )}
    </>
  )
}

function MemberGroup({
  label,
  members,
  faded,
  ownerId,
  onMemberContextMenu,
}: {
  label: string
  members: ServerMember[]
  faded: boolean
  ownerId?: string
  onMemberContextMenu: (event: ReactMouseEvent<HTMLButtonElement>, member: ServerMember) => void
}) {
  return (
    <div className="mb-4">
      <p className={cn('sidebar-section-label mb-1', faded && 'opacity-40')}>{label}</p>

      {members.map((member) => (
        <MemberRow
          key={member.userId}
          member={member}
          faded={faded}
          isOwner={ownerId === member.userId}
          onContextMenu={onMemberContextMenu}
        />
      ))}
    </div>
  )
}

function MemberRow({
  member,
  faded,
  isOwner,
  onContextMenu,
}: {
  member: ServerMember
  faded: boolean
  isOwner: boolean
  onContextMenu: (event: ReactMouseEvent<HTMLButtonElement>, member: ServerMember) => void
}) {
  const displayName = getMemberDisplayName(member)
  const isOfficialMember = hasOfficialMemberBadge({ user: member.user })
  const decorationPresentation = useUserDecorationPresentation(member.user.avatarDecorationUrl)
  const hasDecoration = Boolean(decorationPresentation)
  const decorationColors = decorationPresentation
    ? getUserDecorationToneColors(decorationPresentation.tone)
    : null

  return (
    <button
      onClick={(event) => onContextMenu(event, member)}
      onContextMenu={(event) => onContextMenu(event, member)}
      className={cn(
        'group relative flex w-full items-center gap-2.5 overflow-hidden rounded-md border border-transparent px-2 py-1.5 transition-colors hover:bg-[var(--surface-soft)]',
        hasDecoration &&
          decorationPresentation?.tone === 'dark' &&
          'bg-[rgba(208,221,255,0.18)] shadow-[0_10px_24px_rgba(48,66,112,0.14)] hover:bg-[rgba(220,231,255,0.24)]',
        hasDecoration &&
          decorationPresentation?.tone === 'light' &&
          'bg-[rgba(28,38,62,0.42)] shadow-[0_10px_24px_rgba(10,16,28,0.28)] hover:bg-[rgba(36,49,80,0.52)]',
        faded && 'opacity-40 hover:opacity-100'
      )}
    >
      <UserDecorationBackdrop
        src={member.user.avatarDecorationUrl}
        presentation={decorationPresentation ?? undefined}
      />
      <div className="relative z-10">
        <UserAvatar user={member.user} size={32} showStatus />
      </div>

      <div className="relative z-10 min-w-0 flex-1 text-left">
        <div className="flex items-center gap-1.5">
          <p
            className="font-500 truncate text-[13px] transition-colors"
            style={
              decorationColors
                ? {
                    color: decorationColors.title,
                  }
                : undefined
            }
          >
            {displayName}
          </p>
          {isOfficialMember && <OfficialMemberTag compact className="translate-y-[1px]" />}
          {isOwner && (
            <FaCrown size={11} className="shrink-0 text-[#f5a623]" aria-label="Server owner" />
          )}
        </div>

        {member.user.customStatus && (
          <p
            className="truncate text-[11px]"
            style={
              decorationColors
                ? {
                    color: decorationColors.subtitle,
                  }
                : undefined
            }
          >
            {member.user.customStatus}
          </p>
        )}
      </div>
    </button>
  )
}
