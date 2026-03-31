'use client'

import { BadgeCheck, Code2, Gamepad2, Globe2, Lock, Palette } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/api'
import { interactiveMotion, motion, overlayCardVariants } from '@/lib/motion'
import { type ServerPreviewCardVisualProps } from './ServerPreviewCard.shared'

export function ServerPreviewCardVisual({
  server,
  x,
  y,
  containerRef,
  copied,
  initials,
  bannerBackground,
  inviteUrl,
  category,
  isPartner,
  categoryKind,
  onCopyInvite,
}: ServerPreviewCardVisualProps) {
  const CategoryIcon = categoryKind === 'gaming' ? Gamepad2 : categoryKind === 'design' ? Palette : Code2

  return (
    <motion.div
      ref={containerRef}
      className="fixed z-[95] w-[360px] overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s1)] shadow-[0_22px_44px_rgba(0,0,0,0.46)]"
      style={{ left: x, top: y }}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={overlayCardVariants}
    >
      <div className="relative h-28">
        <span className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: bannerBackground }} />
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.16),rgba(0,0,0,0.52))]" />
      </div>
      <div className="relative z-10 px-4 pb-4">
        <div className="relative z-10 -mt-7 mb-3 flex items-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[var(--s2)] ring-4 ring-[var(--s1)]">
            {server.iconUrl ? (
              <img src={resolveMediaUrl(server.iconUrl)} alt={server.name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-lg font-700 text-[var(--t1)]">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[17px] font-700 text-[var(--t0)]">{server.name}</p>
            <p className="text-xs text-[var(--t3)]">{server.memberCount} miembros</p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--s2)] px-2 py-1 text-[11px] font-600 text-[var(--t1)]">
            <BadgeCheck size={13} className={isPartner ? 'text-sky-300' : 'text-[var(--t3)]'} />
            {isPartner ? 'Partner' : 'Community'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--s2)] px-2 py-1 text-[11px] font-600 text-[var(--t1)]">
            <CategoryIcon size={13} className="text-violet-300" />
            {category}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--s2)] px-2 py-1 text-[11px] font-600 text-[var(--t1)]">
            {server.isPublic ? (
              <Globe2 size={13} className="text-emerald-300" />
            ) : (
              <Lock size={13} className="text-amber-300" />
            )}
            {server.isPublic ? 'Publico' : 'Privado'}
          </span>
        </div>

        <div className="rounded-xl bg-[var(--s2)] p-3">
          <p className="text-[11px] font-700 uppercase tracking-wide text-[var(--t3)]">Invitacion</p>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-[var(--b1)] bg-[var(--s1)] px-2.5 py-2">
            <span className="truncate text-xs text-[var(--t0)]">{inviteUrl}</span>
            <motion.button
              onClick={onCopyInvite}
              className="shrink-0 rounded-md bg-[var(--s2)] px-2 py-1 text-[10px] font-700 text-[var(--t2)] transition-colors hover:text-[var(--t0)]"
              {...interactiveMotion}
            >
              {copied ? 'Copiado' : 'Copiar URL'}
            </motion.button>
          </div>
        </div>

        {server.description && (
          <div className="mt-3 rounded-xl bg-[var(--s2)] p-3">
            <p className="text-[11px] font-700 uppercase tracking-wide text-[var(--t3)]">Acerca del server</p>
            <p className="mt-1 text-xs leading-snug text-[var(--t1)]">{server.description}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
