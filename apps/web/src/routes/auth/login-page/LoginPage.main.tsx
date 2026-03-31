'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authApi, serversApi, setAccessToken, usersApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useServersStore } from '@/stores/serversStore'
import { ApiRequestError } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser, setAccessToken: storeSetToken } = useAuthStore()
  const upsertServer = useServersStore((s) => s.upsertServer)
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setInviteCode(searchParams.get('invite'))
  }, [searchParams])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await authApi.login({
        login,
        password,
        ...(requiresTwoFactor ? { twoFactorCode } : {}),
      })
      const data = res.data

      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true)
        setError(null)
        return
      }

      const token = data.accessToken
      if (!token) {
        throw new Error('MISSING_ACCESS_TOKEN')
      }

      setAccessToken(token)
      storeSetToken(token)
      const userRes = await usersApi.me()
      setUser(userRes.data)
      if (inviteCode) {
        const joinRes = await serversApi.join(inviteCode)
        upsertServer(joinRes.data)
        router.replace(`/channels/${joinRes.data.id}`)
        return
      }
      router.replace('/channels/@me')
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="animate-slide-up">
      {/* Card */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s2)] shadow-xl">
        {/* Top accent bar */}
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, var(--ember), transparent)' }} />

        <div className="px-8 pb-8 pt-7">
          {/* Header */}
          <div className="mb-8 flex flex-col items-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shadow-glow-ember"
              style={{ background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white"/>
              </svg>
            </div>
            <div className="text-center">
              <h1 className="font-display text-2xl font-700 text-[var(--t0)]">Welcome back</h1>
              <p className="mt-0.5 text-sm text-[var(--t3)]">
                {inviteCode ? 'Sign in to accept your server invite' : 'Sign in to continue to DCC'}
              </p>
            </div>
          </div>

          {/* OAuth buttons */}
          <div className="mb-6 flex gap-3">
            <a
              href="/api/auth/oauth/google"
              className="group flex flex-1 items-center justify-center gap-2.5 rounded-lg border border-[var(--b1)] bg-[var(--surface-soft)] px-4 py-2.5 text-sm font-500 text-[var(--t1)] transition-all hover:border-[var(--b2)] hover:bg-[var(--surface-soft-hover)] hover:text-[var(--t0)]"
            >
              <GoogleIcon />
              Google
            </a>
            <a
              href="/api/auth/oauth/github"
              className="group flex flex-1 items-center justify-center gap-2.5 rounded-lg border border-[var(--b1)] bg-[var(--surface-soft)] px-4 py-2.5 text-sm font-500 text-[var(--t1)] transition-all hover:border-[var(--b2)] hover:bg-[var(--surface-soft-hover)] hover:text-[var(--t0)]"
            >
              <GithubIcon />
              GitHub
            </a>
          </div>

          {/* Divider */}
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--b0)]" />
            <span className="text-xs text-[var(--t4)]">OR</span>
            <div className="h-px flex-1 bg-[var(--b0)]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Username or email */}
            <div className="group flex flex-col gap-1.5">
              <label className="text-xs font-600 uppercase tracking-wider text-[var(--t3)] transition-colors group-focus-within:text-ember">
                Usuario o email
              </label>
              <input
                type="text"
                autoComplete="username"
                required
                value={login}
                onChange={(e) => {
                  setLogin(e.target.value)
                  setRequiresTwoFactor(false)
                  setTwoFactorCode('')
                }}
                placeholder="tu_usuario o you@example.com"
                className="input-base"
              />
            </div>

            {/* Password */}
            <div className="group flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-600 uppercase tracking-wider text-[var(--t3)] transition-colors group-focus-within:text-ember">
                  Password
                </label>
                <button type="button" className="text-xs text-[var(--t3)] transition-colors hover:text-ember">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setRequiresTwoFactor(false)
                    setTwoFactorCode('')
                  }}
                  placeholder="••••••••"
                  className="input-base pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t4)] transition-colors hover:text-[var(--t3)]"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {requiresTwoFactor && (
              <div className="group flex flex-col gap-1.5">
                <label className="text-xs font-600 uppercase tracking-wider text-[var(--t3)] transition-colors group-focus-within:text-ember">
                  Codigo de autenticacion
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="123456 o codigo de respaldo"
                  className="input-base"
                  maxLength={32}
                  required
                />
                <p className="text-xs text-[var(--t4)]">
                  Escribe el codigo de tu app autenticadora o uno de tus backup codes.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-[var(--dnd)]/20 bg-[var(--dnd)]/10 px-4 py-3 text-sm text-[var(--dnd)]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 4a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 5zm0 6.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75z"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="relative mt-1 flex h-11 items-center justify-center overflow-hidden rounded-lg text-sm font-600 text-[var(--ember-contrast)] transition-all hover:shadow-glow-ember active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))' }}
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                requiresTwoFactor ? 'Verificar y entrar' : 'Sign in'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-[var(--t3)]">
            Don&apos;t have an account?{' '}
            <Link href={inviteCode ? `/register?invite=${encodeURIComponent(inviteCode)}` : '/register'} className="text-ember transition-colors hover:text-ember-300">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
