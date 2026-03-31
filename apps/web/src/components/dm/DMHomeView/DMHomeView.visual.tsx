'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, Check, MessageCircle, Users, X, Zap } from 'lucide-react'
import { UserAvatar } from '@/components/user/UserAvatar'
import type {
  DMFriendCard,
  DMPendingFriendCard,
  DMQuickAccessItem,
  DMServerCard,
  DMHomeViewVisualProps,
} from './DMHomeView.shared'

export function DMHomeViewVisual({ model }: DMHomeViewVisualProps) {
  const {
    greeting,
    username,
    heroSubtitle,
    quickAccessItems,
    quickAccessOverflow,
    friendCards,
    pendingFriendCards,
    serverCards,
    showQuickAccess,
    showFriendsSection,
    showPendingSection,
    showServersSection,
    showEmptyState,
  } = model

  return (
    <main className="scrollable relative flex flex-1 flex-col overflow-y-auto bg-[var(--s3)]">
      <BackgroundAccent />

      <div className="relative border-b border-[var(--b1)] px-8 pb-12 pt-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex items-baseline gap-3">
            <p className="font-display text-sm font-700 uppercase tracking-widest text-[var(--t3)]">
              {greeting}
            </p>
            <div className="h-1 w-1 rounded-full bg-[var(--ember)]" />
          </div>

          <div className="mb-12">
            <h1 className="font-display text-6xl font-800 leading-tight tracking-tight text-[var(--t0)]">
              {username}
              <span
                className="text-[var(--ember)]"
                style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
              >
                .
              </span>
            </h1>
            <p className="mt-3 text-[15px] text-[var(--t2)]">{heroSubtitle}</p>
          </div>

          {showQuickAccess && (
            <QuickAccessSection items={quickAccessItems} overflowCount={quickAccessOverflow} />
          )}
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-6xl flex-1 px-8 py-12">
        {showFriendsSection && <FriendsSection cards={friendCards} />}
        {showPendingSection && <PendingRequestsSection cards={pendingFriendCards} />}
        {showServersSection && <ServersSection cards={serverCards} />}
        {showEmptyState && <EmptyState />}
      </div>
    </main>
  )
}

function BackgroundAccent() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 h-full w-full opacity-30"
      style={{
        background: `
          radial-gradient(circle at 80% -10%, rgba(255,104,53,0.08) 0%, transparent 40%),
          radial-gradient(circle at 0% 100%, rgba(124,107,255,0.05) 0%, transparent 50%)
        `,
      }}
    />
  )
}

function QuickAccessSection({
  items,
  overflowCount,
}: {
  items: DMQuickAccessItem[]
  overflowCount: number
}) {
  return (
    <div className="mb-4">
      <p className="mb-4 text-xs font-600 uppercase tracking-widest text-[var(--t3)]">
        Favoritos rapidos
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative overflow-hidden rounded-xl border border-[var(--b1)] bg-[var(--s4)] p-3 transition-all duration-300 hover:border-[var(--b2)] hover:bg-[var(--s5)]"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: 'radial-gradient(ellipse at top right, rgba(255,104,53,0.1), transparent)' }}
            />

            <div className="relative flex flex-col items-center text-center">
              <UserAvatar user={item.user} size={40} showStatus />
              <p className="mt-2 truncate text-[13px] font-600 text-[var(--t1)]">
                {item.user.username}
              </p>
            </div>
          </Link>
        ))}

        {overflowCount > 0 && (
          <Link
            href="/friends"
            className="group relative flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--b2)] bg-transparent p-3 transition-all duration-300 hover:border-[var(--ember)] hover:bg-[var(--ember-dim)]"
          >
            <div className="flex flex-col items-center text-center">
              <Zap size={20} className="text-[var(--ember)] transition-transform group-hover:scale-110" />
              <p className="mt-2 text-[11px] font-600 uppercase tracking-wider text-[var(--t3)] transition-colors group-hover:text-[var(--ember)]">
                +{overflowCount}
              </p>
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}

function FriendsSection({ cards }: { cards: DMFriendCard[] }) {
  return (
    <section className="mb-16">
      <SectionHeader
        iconContainerClassName="bg-[var(--ember-dim)]"
        icon={<MessageCircle size={18} className="text-[var(--ember)]" />}
        title="Amigos"
        subtitle={`${cards.length} amigos activos`}
      />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className="group relative overflow-hidden rounded-lg border border-[var(--b1)] bg-[var(--s4)] p-4 transition-all duration-300 hover:border-[var(--b2)] hover:shadow-md"
          >
            <div className="pointer-events-none absolute left-0 top-0 h-full w-1 origin-top scale-y-0 bg-gradient-to-b from-[var(--ember)] to-[var(--volt)] transition-transform duration-300 group-hover:scale-y-100" />

            <div className="flex items-start gap-4">
              <UserAvatar user={card.user} size={44} showStatus />
              <div className="min-w-0 flex-1">
                <p className="truncate font-600 text-[var(--t0)] transition-colors group-hover:text-[var(--ember)]">
                  {card.user.username}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--t3)]">{card.subtitle}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--s3)] px-2 py-1 text-[11px] text-[var(--t2)]">
                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--online)]" />
                    En linea
                  </span>
                  <ArrowRight
                    size={14}
                    className="text-transparent transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--ember)]"
                  />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function PendingRequestsSection({ cards }: { cards: DMPendingFriendCard[] }) {
  return (
    <section className="mb-16">
      <SectionHeader
        iconContainerClassName="relative bg-[var(--volt-dim)]"
        icon={
          <>
            <Users size={18} className="text-[var(--volt)]" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ember)] text-[10px] font-700 text-[var(--ember-contrast)]">
              {cards.length}
            </span>
          </>
        }
        title="Solicitudes pendientes"
        subtitle={`${cards.length} ${cards.length === 1 ? 'solicitud' : 'solicitudes'} esperando`}
      />
      <div className="space-y-3">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex items-center justify-between rounded-lg border border-[var(--b1)] bg-[var(--s4)] p-4 transition-all duration-300 hover:border-[var(--b2)]"
          >
            <div className="flex min-w-0 items-center gap-4">
              <UserAvatar user={card.user} size={40} showStatus />
              <div className="min-w-0">
                <p className="truncate font-600 text-[var(--t0)]">{card.user.username}</p>
                <p className="text-xs text-[var(--t3)]">{card.subtitle}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ember-dim)] text-[var(--ember)] transition-all duration-200 hover:bg-[var(--ember)] hover:text-[var(--ember-contrast)] hover:shadow-md"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-soft)] text-[var(--t4)] transition-all duration-200 hover:bg-[var(--dnd-glow)] hover:text-[var(--dnd)]"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ServersSection({ cards }: { cards: DMServerCard[] }) {
  return (
    <section className="mb-16">
      <SectionHeader
        iconContainerClassName="bg-[var(--volt-dim)]"
        icon={<Zap size={18} className="text-[var(--volt)]" />}
        title="Servidores"
        subtitle={`${cards.length} ${cards.length === 1 ? 'servidor' : 'servidores'} disponibles`}
      />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className="group relative overflow-hidden rounded-lg border border-[var(--b1)] bg-[var(--s4)] p-4 transition-all duration-300 hover:border-[var(--b2)] hover:shadow-md"
          >
            <div className="pointer-events-none absolute left-0 top-0 h-1 w-full origin-left scale-x-0 bg-gradient-to-r from-[var(--volt)] to-[var(--ember)] transition-transform duration-300 group-hover:scale-x-100" />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--volt)] via-[var(--ember)] to-[var(--dnd)] font-display text-sm font-800 text-white">
                  {card.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-700 text-[var(--t0)] transition-colors group-hover:text-[var(--ember)]">
                    {card.name}
                  </p>
                  <p className="text-xs text-[var(--t3)]">{card.memberCount} miembros</p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="text-transparent transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--ember)]"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function EmptyState() {
  return (
    <div className="flex h-96 flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--s4)]">
        <MessageCircle size={32} className="text-[var(--t3)]" />
      </div>
      <h2 className="font-display text-2xl font-700 text-[var(--t2)]">Todo tranquilo por aqui</h2>
      <p className="mt-2 max-w-xs text-sm text-[var(--t3)]">
        Anade amigos o unete a servidores para empezar a chatear.
      </p>
      <Link
        href="/friends"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-[var(--ember)] px-4 py-2 text-[13px] font-700 text-[var(--ember-contrast)] transition-opacity hover:opacity-90"
      >
        Buscar amigos
        <ArrowRight size={13} />
      </Link>
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  subtitle,
  iconContainerClassName,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  iconContainerClassName: string
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconContainerClassName}`}>
        {icon}
      </div>
      <div>
        <h2 className="font-display text-2xl font-700 text-[var(--t0)]">{title}</h2>
        <p className="text-xs text-[var(--t3)]">{subtitle}</p>
      </div>
    </div>
  )
}
