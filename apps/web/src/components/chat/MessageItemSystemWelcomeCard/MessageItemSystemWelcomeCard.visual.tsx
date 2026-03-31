'use client'

import Link from 'next/link'
import { interactiveMotion, motion } from '@/lib/motion'
import { UserAvatar } from '@/components/user/UserAvatar'
import { type SystemWelcomeCardVisualProps } from './MessageItemSystemWelcomeCard.shared'

export function SystemWelcomeCardVisual({
  message,
  title,
  joinedAt,
  serverId,
  serverName,
  sideImage,
  serverInitials,
  welcomeChannelId,
  rulesChannelId,
}: SystemWelcomeCardVisualProps) {
  return (
    <motion.div
      className="px-4 pt-4 pb-2"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s1)] shadow-[0_16px_34px_rgba(0,0,0,0.28)]">
        <div className="absolute bottom-0 left-0 top-0 w-1 bg-[linear-gradient(180deg,#f6b9ff,var(--ember))]" />
        <div className="px-4 py-3">
          <div className="mb-3 flex items-center gap-2">
            <UserAvatar user={message.author} size={32} />
            <span className="truncate text-[15px] font-800 text-[var(--t0)]">
              {message.author.username}
            </span>
            <span className="rounded-md bg-[var(--ember-dim)] px-1.5 py-0.5 text-[10px] font-700 text-ember">
              SYSTEM
            </span>
            <span className="ml-auto text-[11px] font-600 text-[var(--t4)]">{joinedAt}</span>
          </div>

          <div className="rounded-xl border border-[var(--b1)] bg-[var(--s2)] p-3">
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-800 leading-tight text-[var(--t0)]">
                  Bienvenido a {serverName ?? 'el servidor'}, {message.author.username}
                </p>
                <p className="mt-1 text-[13px] text-[var(--t3)]">{title}</p>
                <div className="mt-3 flex flex-col items-start gap-2">
                  {welcomeChannelId && serverId ? (
                    <motion.div {...interactiveMotion}>
                      <Link
                      href={`/channels/${serverId}/${welcomeChannelId}`}
                      className="rounded-md border border-[var(--b2)] bg-[var(--s0)] px-2 py-1 text-[12px] font-700 text-[var(--t1)] transition-colors hover:bg-[var(--s1)] hover:text-[var(--t0)]"
                    >
                      #bienvenida
                    </Link>
                    </motion.div>
                  ) : null}
                  {rulesChannelId && serverId ? (
                    <motion.div {...interactiveMotion}>
                      <Link
                      href={`/channels/${serverId}/${rulesChannelId}`}
                      className="rounded-md border border-[var(--b2)] bg-[var(--s0)] px-2 py-1 text-[12px] font-700 text-[var(--t1)] transition-colors hover:bg-[var(--s1)] hover:text-[var(--t0)]"
                    >
                      #reglas
                    </Link>
                    </motion.div>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-start">
                <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-[16px] bg-ember transition-all duration-200 surface-elevated">
                  {sideImage ? (
                    <img src={sideImage} alt={serverName ?? 'server logo'} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-[13px] font-700 text-white transition-colors">
                      {serverInitials}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-[var(--b1)] bg-[var(--s1)] px-3 py-2 text-[12px] font-700 text-[var(--t2)]">
              Nuevo miembro de la comunidad ✨
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
