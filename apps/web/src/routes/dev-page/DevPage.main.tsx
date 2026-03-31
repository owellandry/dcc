'use client'

import { useRouter } from 'next/navigation'
import { initMockSession, clearMockSession, isMockSession } from '@/lib/mock-init'
import { MOCK_SERVERS, MOCK_CHANNELS } from '@/lib/mock-data'
import Link from 'next/link'
import {
  MessageSquare,
  LayoutList,
  Users,
  Inbox,
  Hash,
  LogOut,
  Zap,
  Database,
  ExternalLink,
} from 'lucide-react'

export default function DevPage() {
  const router = useRouter()

  const launch = (path: string) => {
    initMockSession()
    router.push(path)
  }

  const exitDev = () => {
    clearMockSession()
    router.push('/')
  }

  const alreadyInDev = typeof window !== 'undefined' && isMockSession()

  const firstServer = MOCK_SERVERS[0]!
  const firstChannel = MOCK_CHANNELS.find((ch) => ch.serverId === firstServer.id)!

  return (
    <main className="app-shell-bg min-h-screen px-6 py-12">
      <div className="mx-auto max-w-2xl space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))' }}
          >
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-700 text-[var(--t0)]">DCC Dev Mode</h1>
            <p className="text-xs text-[var(--t3)]">Preview all UI without a backend</p>
          </div>
          {alreadyInDev && (
            <button
              onClick={exitDev}
              className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--dnd)]/30 px-3 py-1.5 text-xs font-600 text-[var(--dnd)] transition-colors hover:bg-[var(--dnd)]/10"
            >
              <LogOut size={12} />
              Exit dev mode
            </button>
          )}
        </div>

        <div className="h-px bg-[var(--b0)]" />

        {/* Quick launch */}
        <Section
          icon={<Zap size={14} className="text-ember" />}
          title="Quick Launch"
          subtitle="Jump straight into a view"
        >
          <div className="grid grid-cols-2 gap-3">
            <LaunchCard
              icon={<MessageSquare size={20} />}
              label="General chat"
              description="Server with messages, reactions, typing"
              onClick={() => launch(`/channels/${firstServer.id}/${firstChannel.id}`)}
            />
            <LaunchCard
              icon={<LayoutList size={20} />}
              label="Channel list"
              description="Browse servers, categories, channels"
              onClick={() => launch(`/channels/${firstServer.id}/${firstChannel.id}`)}
            />
            <LaunchCard
              icon={<Users size={20} />}
              label="Friends page"
              description="Friend list, add friend, pending"
              onClick={() => launch('/friends')}
            />
            <LaunchCard
              icon={<Inbox size={20} />}
              label="DM home"
              description="Direct messages sidebar"
              onClick={() => launch('/channels/@me')}
            />
          </div>
        </Section>

        {/* All servers & channels */}
        <Section
          icon={<Hash size={14} className="text-ember" />}
          title="Servers & Channels"
          subtitle="Navigate directly to any channel"
        >
          <div className="space-y-3">
            {MOCK_SERVERS.map((server) => {
              const serverChannels = MOCK_CHANNELS.filter((ch) => ch.serverId === server.id)
              return (
                <div key={server.id} className="rounded-xl border border-[var(--b1)] bg-[var(--s2)] p-4 surface-elevated">
                  <div className="mb-3 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ember-dim)] font-display text-sm font-700 text-ember">
                      {server.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-700 text-[var(--t0)]">{server.name}</p>
                      <p className="text-xs text-[var(--t3)]">{serverChannels.length} channels · {server.memberCount} members</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {serverChannels.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => launch(`/channels/${server.id}/${ch.id}`)}
                        className="flex items-center gap-1.5 rounded-md border border-[var(--b1)] bg-[var(--s0)] px-3 py-1.5 text-xs text-[var(--t2)] transition-all hover:border-[var(--ember)]/40 hover:text-ember"
                      >
                        <Hash size={11} />
                        {ch.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* Auth pages */}
        <Section
          icon={<ExternalLink size={14} className="text-ember" />}
          title="Auth Pages"
          subtitle="Visual-only (no real auth)"
        >
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Login',        href: '/login' },
              { label: 'Register',     href: '/register' },
              { label: 'Verify Email', href: '/verify-email?sent=1' },
              { label: 'Landing page', href: '/' },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--b1)] px-4 py-2 text-sm text-[var(--t2)] transition-all hover:border-[var(--b2)] hover:text-[var(--t0)]"
              >
                {label}
                <ExternalLink size={11} className="opacity-40" />
              </Link>
            ))}
          </div>
        </Section>

        {/* Mock data summary */}
        <Section
          icon={<Database size={14} className="text-ember" />}
          title="Mock Data"
          subtitle="What's loaded in the stores"
        >
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Users',    value: '5' },
              { label: 'Servers',  value: String(MOCK_SERVERS.length) },
              { label: 'Channels', value: String(MOCK_CHANNELS.length) },
              { label: 'Messages', value: 'Loaded per channel' },
              { label: 'Members',  value: '5 in server 1' },
              { label: 'Friends',  value: '2 accepted · 1 pending' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg border border-[var(--b0)] bg-[var(--s2)] p-3">
                <p className="text-xs text-[var(--t3)]">{label}</p>
                <p className="mt-0.5 text-sm font-600 text-[var(--t0)]">{value}</p>
              </div>
            ))}
          </div>
        </Section>

        <p className="text-center text-xs text-[var(--t4)]">
          Dev mode only — data resets on page refresh · No requests to the backend
        </p>
      </div>
    </main>
  )
}

function Section({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="font-display text-sm font-700 text-[var(--t1)]">{title}</h2>
          <p className="text-xs text-[var(--t3)]">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function LaunchCard({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s2)] p-4 text-left transition-all hover:border-ember/30 hover:bg-[var(--ember-dim)] surface-elevated"
    >
      <span className="text-[var(--t3)] transition-colors group-hover:text-ember">{icon}</span>
      <div>
        <p className="text-sm font-600 text-[var(--t1)] group-hover:text-ember">{label}</p>
        <p className="text-xs text-[var(--t3)]">{description}</p>
      </div>
    </button>
  )
}
