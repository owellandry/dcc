'use client'

import { useEffect, useLayoutEffect, useMemo, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { MessageSquare, AtSign, UserRound } from 'lucide-react'
import { dmsApi, resolveMediaUrl } from '@/lib/api'
import { getFloatingCardPosition, type FloatingAnchorRect, type FloatingPlacement } from '@/lib/layout/floatingCard.shared'
import { useCachedRemoteGifUrl } from '@/lib/media/remoteGifCache.shared'
import { isMockSession } from '@/lib/mock-init'
import type { Channel, ServerMember, UserStatus } from '@/lib/types'
import { getMemberDisplayName, getUserHandle } from '@/lib/users/displayName.shared'
import { useAuthStore } from '@/stores/authStore'
import { useServersStore } from '@/stores/serversStore'
import { Badge, OfficialMemberTag, buildMemberBadges, hasOfficialMemberBadge } from '@/components/user/Badge'
import { UserAvatar } from '@/components/user/UserAvatar'
import { avatarColor } from '@/components/user/UserAvatar/UserAvatar.shared'

interface Props {
  previewRef: RefObject<HTMLDivElement | null>
  member: ServerMember
  status: UserStatus
  isOwner: boolean
  anchorRect: FloatingAnchorRect
  preferredPlacement: FloatingPlacement
}

export function MemberPreviewCard({ previewRef, member, status, isOwner, anchorRect, preferredPlacement }: Props) {
  if (typeof window === 'undefined') return null

  const router = useRouter()
  const myUserId = useAuthStore((state) => state.user?.id ?? null)
  const channels = useServersStore((state) => state.channels)
  const upsertChannel = useServersStore((state) => state.upsertChannel)
  const [isOpeningDm, setIsOpeningDm] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const [bannerAccentColor, setBannerAccentColor] = useState<string | null>(null)
  const isMock = isMockSession()
  const resolvedBannerUrl = useCachedRemoteGifUrl(resolveMediaUrl(member.user.bannerUrl))

  const dmChannels = useMemo(
    () =>
      Object.values(channels).filter(
        (channel) => channel.serverId == null && (channel.type === 'dm' || channel.type === 'group_dm'),
      ),
    [channels],
  )

  const displayName = getMemberDisplayName(member)
  const badgeItems = buildMemberBadges({ isOwner, user: member.user, roles: member.roles })
  const hasOfficialBadge = hasOfficialMemberBadge({ user: member.user, roles: member.roles })
  const sortedRoles = [...member.roles].sort((a, b) => b.position - a.position)
  const primaryRoleColor = sortedRoles.find((role) => role.color !== null)?.color
  const baseAccentColor = primaryRoleColor !== undefined && primaryRoleColor !== null
    ? `#${primaryRoleColor.toString(16).padStart(6, '0')}`
    : avatarColor(member.user.username)
  const accentColor = bannerAccentColor ?? baseAccentColor
  const isCurrentUser = myUserId === member.user.id

  useEffect(() => {
    const bannerUrl = resolvedBannerUrl
    if (!bannerUrl) {
      setBannerAccentColor(null)
      return
    }

    let cancelled = false
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => {
      if (cancelled) return
      try {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) {
          setBannerAccentColor(null)
          return
        }

        canvas.width = 28
        canvas.height = 28
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
        let red = 0
        let green = 0
        let blue = 0
        let samples = 0

        for (let index = 0; index < data.length; index += 16) {
          const alpha = data[index + 3] ?? 0
          if (alpha < 120) continue
          red += data[index] ?? 0
          green += data[index + 1] ?? 0
          blue += data[index + 2] ?? 0
          samples += 1
        }

        if (samples === 0) {
          setBannerAccentColor(null)
          return
        }

        setBannerAccentColor(
          toAccentHex(
            Math.round(red / samples),
            Math.round(green / samples),
            Math.round(blue / samples),
          ),
        )
      } catch {
        setBannerAccentColor(null)
      }
    }
    image.onerror = () => {
      if (!cancelled) setBannerAccentColor(null)
    }
    image.src = bannerUrl

    return () => {
      cancelled = true
    }
  }, [resolvedBannerUrl])

  const bannerStyle = resolvedBannerUrl
    ? {
        backgroundImage: `url(${resolvedBannerUrl})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }
    : {
        background: `linear-gradient(135deg, color-mix(in srgb, ${accentColor} 78%, white 22%), color-mix(in srgb, ${accentColor} 44%, #0b1020 56%))`,
      }

  const cardSurfaceStyle = {
    background: `linear-gradient(180deg, color-mix(in srgb, var(--s1) 80%, ${accentColor} 20%), color-mix(in srgb, var(--s0) 86%, ${accentColor} 14%))`,
    borderColor: `color-mix(in srgb, ${accentColor} 22%, var(--b1) 78%)`,
  }

  const sectionSurfaceStyle = {
    background: `linear-gradient(180deg, color-mix(in srgb, var(--s2) 90%, ${accentColor} 10%), color-mix(in srgb, var(--s1) 92%, ${accentColor} 8%))`,
    borderColor: `color-mix(in srgb, ${accentColor} 16%, var(--b1) 84%)`,
  }

  useLayoutEffect(() => {
    const updatePosition = () => {
      if (!previewRef.current) return
      const rect = previewRef.current.getBoundingClientRect()
      const nextPosition = getFloatingCardPosition({
        anchorRect,
        cardWidth: rect.width || 360,
        cardHeight: rect.height || 430,
        preferredPlacement,
      })
      setPosition({ left: nextPosition.left, top: nextPosition.top })
    }

    updatePosition()

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && previewRef.current) {
      observer = new ResizeObserver(() => updatePosition())
      observer.observe(previewRef.current)
    }

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      observer?.disconnect()
    }
  }, [anchorRect, preferredPlacement, previewRef])

  const openDm = async () => {
    if (isCurrentUser || isOpeningDm) return
    if (isMock) {
      router.push(`/channels/@me/${member.user.id}`)
      return
    }

    const existingChannel = dmChannels.find((channel) =>
      channel.participants?.some((participant) => participant.id === member.user.id),
    )

    if (existingChannel) {
      router.push(`/channels/@me/${existingChannel.id}`)
      return
    }

    try {
      setIsOpeningDm(true)
      const response = await dmsApi.open(member.user.id)
      const channel = withDerivedDmName(response.data, member.user.username)
      upsertChannel(channel)
      router.push(`/channels/@me/${channel.id}`)
    } finally {
      setIsOpeningDm(false)
    }
  }

  return createPortal(
    <div
      ref={previewRef}
      className="fixed z-[999] w-[360px] overflow-visible rounded-[24px] border backdrop-blur-xl"
      style={{ left: position?.left ?? -9999, top: position?.top ?? -9999, ...cardSurfaceStyle }}
    >
      <div className="relative h-32 overflow-hidden rounded-t-[24px]">
        <span className="absolute inset-0" style={bannerStyle} />
        <span
          className="absolute inset-0"
          style={{
            background: resolvedBannerUrl
              ? 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.18))'
              : 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          }}
        />
        <span
          className="absolute inset-x-0 bottom-0 h-20"
          style={{ background: `linear-gradient(180deg, transparent, color-mix(in srgb, ${accentColor} 18%, var(--s1) 82%))` }}
        />
      </div>

      <div className="px-4 pb-4">
        <div className="-mt-8 mb-3 flex items-end gap-3">
          <div
            className="rounded-full border-[5px]"
            style={{ borderColor: `color-mix(in srgb, ${accentColor} 18%, var(--s1) 82%)` }}
          >
            <UserAvatar user={member.user} size={64} showStatus />
          </div>
        </div>

        <div className="mb-3">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate font-display text-[18px] font-700 text-[var(--t0)]">{displayName}</p>
            {hasOfficialBadge && <OfficialMemberTag className="translate-y-[1px]" />}
          </div>
          <p className="truncate text-xs text-[var(--t3)]">{getUserHandle(member.user)} · {status}</p>
        </div>

        {badgeItems.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-0.5">
            {badgeItems.map((badge) => (
              <Badge key={badge.id} badge={badge} />
            ))}
          </div>
        )}

        <div className="mb-3 rounded-2xl border p-3" style={sectionSurfaceStyle}>
          <p className="mb-1 text-[11px] font-700 uppercase tracking-wide text-[var(--t3)]">Sobre mi</p>
          <p className="text-[12px] leading-snug text-[var(--t1)]">{member.user.bio ?? 'Sin descripcion todavia.'}</p>
        </div>

        <div className="mb-3 rounded-2xl border p-3" style={sectionSurfaceStyle}>
          <p className="mb-1 text-[11px] font-700 uppercase tracking-wide text-[var(--t3)]">Roles</p>
          <div className="flex flex-wrap gap-1.5">
            {sortedRoles.length === 0 ? (
              <span className="text-[12px] text-[var(--t3)]">Sin roles</span>
            ) : (
              sortedRoles.map((role) => (
                <span
                  key={role.id}
                  className="rounded-full border border-[var(--b1)] px-2 py-1 text-[11px] font-600 text-[var(--t1)]"
                  style={role.color !== null ? { borderColor: `#${role.color.toString(16).padStart(6, '0')}`, color: `#${role.color.toString(16).padStart(6, '0')}` } : undefined}
                >
                  {role.name}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => {
              void openDm()
            }}
            disabled={isCurrentUser || isOpeningDm}
            className="inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-600 text-[var(--t2)] transition-colors hover:text-[var(--t0)] disabled:cursor-not-allowed disabled:opacity-60"
            style={sectionSurfaceStyle}
          >
            <MessageSquare size={13} />
            {isOpeningDm ? 'Abriendo...' : 'Mensaje'}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-600 text-[var(--t2)] transition-colors hover:text-[var(--t0)]"
            style={sectionSurfaceStyle}
          >
            <AtSign size={13} />
            Mencionar
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-600 text-[var(--t2)] transition-colors hover:text-[var(--t0)]"
            style={sectionSurfaceStyle}
          >
            <UserRound size={13} />
            Perfil
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function withDerivedDmName(channel: Channel, fallbackUsername: string): Channel {
  const primaryParticipant = channel.participants?.[0]
  return {
    ...channel,
    name: channel.name ?? primaryParticipant?.displayName ?? primaryParticipant?.username ?? fallbackUsername,
  }
}

function toAccentHex(red: number, green: number, blue: number) {
  const clamp = (value: number) => Math.max(36, Math.min(224, value))
  return `#${[clamp(red), clamp(green), clamp(blue)].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}
