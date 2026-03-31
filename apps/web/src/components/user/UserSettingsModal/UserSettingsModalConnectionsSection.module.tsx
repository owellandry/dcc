'use client'

import type { IconType } from 'react-icons'
import { FaAmazon } from 'react-icons/fa6'
import {
  MdAdd,
  MdChevronRight,
  MdLinkOff,
  MdOutlineExtension,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md'
import {
  SiBluesky,
  SiCrunchyroll,
  SiEbay,
  SiEpicgames,
  SiGithub,
  SiLeagueoflegends,
  SiPaypal,
  SiSteam,
  SiTiktok,
  SiTwitch,
} from 'react-icons/si'

type ConnectionProvider = {
  id: string
  name: string
  gradient: string
  icon: IconType
}

type ConnectedAccount = {
  id: string
  provider: string
  handle: string
  profileVisible: boolean
  syncStatus: string
  icon: IconType
}

const connectionProviders: ConnectionProvider[] = [
  { id: 'bluesky', name: 'Bluesky', gradient: 'from-[#1da1f2]/50 to-[#1d9bf0]/20', icon: SiBluesky },
  { id: 'paypal', name: 'PayPal', gradient: 'from-[#00457C]/50 to-[#0070BA]/20', icon: SiPaypal },
  { id: 'steam', name: 'Steam', gradient: 'from-[#1b2838]/60 to-[#66c0f4]/20', icon: SiSteam },
  { id: 'tiktok', name: 'TikTok', gradient: 'from-[#111111]/80 to-[#ff0050]/20', icon: SiTiktok },
  { id: 'ebay', name: 'eBay', gradient: 'from-[#e53238]/40 to-[#0064d2]/20', icon: SiEbay },
  { id: 'crunchyroll', name: 'Crunchyroll', gradient: 'from-[#f47521]/55 to-[#f89d53]/20', icon: SiCrunchyroll },
  { id: 'amazon-music', name: 'Amazon Music', gradient: 'from-[#00a8e1]/55 to-[#35c2f1]/20', icon: FaAmazon },
  { id: 'bungie', name: 'Bungie.net', gradient: 'from-[#f7a700]/45 to-[#c27f00]/20', icon: MdOutlineExtension },
  { id: 'epic', name: 'Epic Games', gradient: 'from-[#202020]/75 to-[#484848]/20', icon: SiEpicgames },
  { id: 'lol', name: 'League of Legends', gradient: 'from-[#0a1428]/80 to-[#c89b3c]/20', icon: SiLeagueoflegends },
]

const connectedAccounts: ConnectedAccount[] = [
  {
    id: '1',
    provider: 'Twitch',
    handle: 'midudev',
    profileVisible: true,
    syncStatus: 'Sincronizado hace 2 horas',
    icon: SiTwitch,
  },
  {
    id: '2',
    provider: 'GitHub',
    handle: 'owellpolanco',
    profileVisible: false,
    syncStatus: 'Sincronizado ayer',
    icon: SiGithub,
  },
]

export function UserSettingsModalConnectionsSection() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
        <h3 className="text-base font-700 text-[var(--t0)]">Agrega cuentas a tu perfil</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--t3)]">
          Esta informacion no se compartira fuera de DCC sin tu permiso y se utilizara segun lo establecido en la politica de privacidad de la plataforma.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {connectionProviders.map((provider) => (
            <button
              key={provider.id}
              type="button"
              className={`group relative overflow-hidden rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-3 text-left transition-colors hover:border-[var(--b2)]`}
              aria-label={provider.name}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${provider.gradient} opacity-60 transition-opacity group-hover:opacity-80`} />
              <div className="relative flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-black/30 text-xs font-700 text-white">
                  <provider.icon size={18} />
                </div>
                <span className="truncate text-sm font-700 text-[var(--t0)]">{provider.name}</span>
              </div>
            </button>
          ))}

          <button
            type="button"
            className="group rounded-xl border border-dashed border-[var(--b2)] bg-[var(--s1)] p-3 text-left transition-colors hover:bg-[var(--s0)]"
            aria-label="Ver mas conexiones"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--s0)] text-[var(--t2)]">
                <MdAdd size={16} />
              </div>
              <span className="text-sm font-700 text-[var(--t1)]">Ver mas</span>
              <MdChevronRight size={16} className="ml-auto text-[var(--t4)] transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
        <h3 className="text-base font-700 text-[var(--t0)]">Cuentas conectadas</h3>
        <p className="mt-2 text-sm text-[var(--t3)]">Administra visibilidad de perfil, sincronizacion y desconexion.</p>

        <div className="mt-4 space-y-3">
          {connectedAccounts.map((account) => (
            <div key={account.id} className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-700 text-[var(--t0)]">
                    <account.icon size={15} className="text-[var(--t4)]" />
                    {account.provider}
                  </p>
                  <p className="truncate text-sm text-[var(--t2)]">@{account.handle}</p>
                  <p className="text-xs text-[var(--t4)]">{account.syncStatus}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--b1)] bg-[var(--s0)] px-3 py-1.5 text-xs font-700 text-[var(--t2)] transition-colors hover:text-[var(--t0)]"
                  >
                    {account.profileVisible ? <MdVisibility size={14} /> : <MdVisibilityOff size={14} />}
                    {account.profileVisible ? 'Visible en perfil' : 'Oculto en perfil'}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-[var(--dnd)]/10 px-3 py-1.5 text-xs font-700 text-[var(--dnd)] transition-colors hover:bg-[var(--dnd)]/20"
                  >
                    <MdLinkOff size={14} />
                    Desconectar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
