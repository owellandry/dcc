'use client'

import { useState } from 'react'
import { resolveMediaUrl } from '@/lib/api'
import { type ServerPreviewCardProps, type ServerPreviewCardVisualProps } from './ServerPreviewCard.shared'

export function useServerPreviewCardModel({
  server,
  x,
  y,
  containerRef,
}: ServerPreviewCardProps): ServerPreviewCardVisualProps {
  const [copied, setCopied] = useState(false)
  const text = `${server.name} ${server.description ?? ''} ${server.inviteCode}`.toLowerCase()
  const isGaming = /(game|gaming|esport|fps|moba|rpg|valorant|cs|minecraft|fortnite)/.test(text)
  const isDesign = /(design|ui|ux|token|figma|pixel)/.test(text)
  const categoryKind = isGaming ? 'gaming' : isDesign ? 'design' : 'tech'
  const inviteUrl = `https://dcc.gg/${server.inviteCode}`

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return {
    server,
    x,
    y,
    containerRef,
    copied,
    initials: server.name.split(/\s+/).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join(''),
    bannerBackground: server.bannerUrl
      ? `url(${resolveMediaUrl(server.bannerUrl)})`
      : 'linear-gradient(135deg,var(--ember),var(--ember-hover))',
    inviteUrl,
    category: isGaming ? 'Gaming' : isDesign ? 'Design' : 'Tech',
    isPartner: server.isPublic && server.memberCount >= 5,
    categoryKind,
    onCopyInvite: () => {
      void copyInvite()
    },
  }
}
