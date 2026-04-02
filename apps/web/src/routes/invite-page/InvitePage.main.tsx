'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowRight, Globe2, LoaderCircle, Lock, ShieldAlert, UserPlus, Users } from 'lucide-react'
import { ApiRequestError, resolveMediaUrl, serversApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useServersStore } from '@/stores/serversStore'
import type { Server } from '@/lib/types'

type InviteState = 'loading' | 'ready' | 'joining' | 'joined' | 'invalid' | 'error'

export default function InvitePage() {
  const router = useRouter()
  const pathname = usePathname()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const upsertServer = useServersStore((s) => s.upsertServer)
  const code = getInviteCodeFromPath(pathname)

  const [state, setState] = useState<InviteState>('loading')
  const [server, setServer] = useState<Server | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) {
      setState('invalid')
      setError('Invite code not found.')
      return
    }

    if (!isAuthenticated || !user) {
      if (typeof window !== 'undefined') {
        window.location.replace(`/login?invite=${encodeURIComponent(code)}`)
      }
      return
    }

    let cancelled = false
    setState('loading')
    setError(null)

    ;(async () => {
      try {
        const res = await serversApi.getInvite(code)
        if (cancelled) return
        setServer(res.data.server)
        setInviteCode(res.data.inviteCode)
        setState('ready')
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiRequestError && err.status === 401) {
          if (typeof window !== 'undefined') {
            window.location.replace(`/login?invite=${encodeURIComponent(code)}`)
          }
          return
        }
        if (err instanceof ApiRequestError && err.status === 404) {
          setState('invalid')
          setError('This invite is invalid or has expired.')
          return
        }
        setState('error')
        setError(err instanceof ApiRequestError ? err.message : 'Could not load this invite.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [code, isAuthenticated, user])

  const handleJoin = async () => {
    if (!code || state === 'joining') return

    setState('joining')
    setError(null)

    try {
      const res = await serversApi.join(code)
      upsertServer(res.data)
      setState('joined')
      router.push(`/channels/${res.data.id}`)
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        router.replace(`/login?invite=${encodeURIComponent(code)}`)
        return
      }
      if (err instanceof ApiRequestError && err.status === 404) {
        setState('invalid')
        setError('This invite is invalid or has expired.')
        return
      }
      setState('ready')
      setError(err instanceof ApiRequestError ? err.message : 'Could not join this server.')
    }
  }

  const serverInitials = server?.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
    || 'SV'

  return (
    <main className="app-shell-bg relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-[var(--ember)]/10 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-12 right-[14%] h-64 w-64 rounded-full bg-violet-500/10 blur-[90px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
        }}
      />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--b1)] bg-[var(--s1)] shadow-[0_28px_60px_rgba(0,0,0,0.48)]">
        <div className="h-1.5 w-full bg-[linear-gradient(90deg,var(--ember),#ffb38a,#8f78ff)]" />

        <div className="p-8 sm:p-10">
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-ember/30 bg-[var(--ember-dim)] text-ember shadow-[0_0_0_6px_rgba(255,111,66,0.08)]">
              {state === 'invalid' || state === 'error' ? (
                <ShieldAlert size={30} />
              ) : state === 'loading' || state === 'joining' ? (
                <LoaderCircle size={28} className="animate-spin" />
              ) : (
                <UserPlus size={30} />
              )}
            </div>

            <p className="mt-6 text-xs font-700 uppercase tracking-[0.18em] text-[var(--t4)]">
              Server Invite
            </p>

            {(state === 'loading' || state === 'joining') && (
              <>
                <h1 className="mt-2 font-display text-3xl font-800 text-[var(--t0)]">
                  {state === 'loading' ? 'Loading invite...' : 'Joining server...'}
                </h1>
                <p className="mt-3 text-sm text-[var(--t3)]">
                  {state === 'loading'
                    ? 'Checking the invite and loading the server details.'
                    : 'Adding you to the server and preparing your channels.'}
                </p>
              </>
            )}

            {state === 'ready' && server && (
              <>
                <h1 className="mt-2 font-display text-3xl font-800 text-[var(--t0)]">
                  Join {server.name}
                </h1>
                <p className="mt-3 text-sm text-[var(--t3)]">
                  {server.description ?? 'You were invited to this server.'}
                </p>

                <div className="mt-6 w-full overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s2)] text-left">
                  <div className="relative h-28">
                    {server.bannerUrl ? (
                      <img src={resolveMediaUrl(server.bannerUrl)} alt={server.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-[linear-gradient(130deg,rgba(255,111,66,0.75),rgba(143,120,255,0.58),rgba(20,22,30,0.96))]" />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(10,11,16,0.72))]" />
                  </div>

                  <div className="relative px-4 pb-4">
                    <div className="-mt-9 mb-3 flex items-end gap-3">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[var(--s1)] ring-4 ring-[var(--s2)]">
                        {server.iconUrl ? (
                          <img src={resolveMediaUrl(server.iconUrl)} alt={server.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="font-display text-lg font-800 text-[var(--t0)]">{serverInitials}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pb-1">
                        <p className="truncate text-lg font-700 text-[var(--t0)]">{server.name}</p>
                        <p className="text-xs text-[var(--t4)]">comunidad de DCC</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--b1)] bg-[var(--s1)] px-2.5 py-1 text-[11px] font-700 text-[var(--t2)]">
                        <Users size={12} />
                        {server.memberCount} members
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--b1)] bg-[var(--s1)] px-2.5 py-1 text-[11px] font-700 text-[var(--t2)]">
                        {server.isPublic ? <Globe2 size={12} /> : <Lock size={12} />}
                        {server.isPublic ? 'Public' : 'Private'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--b1)] bg-[var(--s1)] px-2.5 py-1 text-[11px] font-700 text-[var(--t2)]">
                        Invite /{inviteCode ?? code}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleJoin}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ember px-5 py-3 text-sm font-700 text-[var(--ember-contrast)] transition-opacity hover:opacity-90"
                >
                  Join server
                  <ArrowRight size={16} />
                </button>
              </>
            )}

            {(state === 'invalid' || state === 'error') && (
              <>
                <h1 className="mt-2 font-display text-3xl font-800 text-[var(--t0)]">
                  {state === 'invalid' ? 'Invite unavailable' : 'Something went wrong'}
                </h1>
                <p className="mt-3 text-sm text-[var(--t3)]">
                  {error ?? 'This invite could not be opened.'}
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/"
                    className="rounded-xl bg-ember px-5 py-3 text-sm font-700 text-[var(--ember-contrast)] transition-opacity hover:opacity-90"
                  >
                    Go home
                  </Link>

                  <Link
                    href="/"
                    className="rounded-xl border border-[var(--b1)] px-5 py-3 text-sm font-600 text-[var(--t2)] transition-colors hover:text-[var(--t0)]"
                  >
                    Back
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function getInviteCodeFromPath(pathname: string | null): string | null {
  if (!pathname) return null

  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'invite') return null

  return parts[1] ?? null
}
