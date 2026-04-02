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
        setError('Algo salió mal. Por favor intenta de nuevo.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#5865F2] p-4 font-sans selection:bg-[#5865F2] selection:text-white sm:p-0">
      {/* Background illustration (Discord style) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://cdn.discordapp.com/assets/images/128b9d79c6b65313543b.svg')] bg-cover bg-center bg-no-repeat opacity-80 mix-blend-overlay" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[480px] animate-slide-up rounded-md bg-[#313338] p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="mb-2 font-display text-2xl font-600 text-[#F2F3F5]">
            {inviteCode ? 'Inicia sesión para aceptar la invitación' : '¡Hola de nuevo!'}
          </h1>
          <p className="text-[15px] text-[#B5BAC1]">
            ¡Nos alegra verte de nuevo!
          </p>
        </div>

        {/* OAuth buttons (styled like Discord's alternative logins if needed, or kept simple) */}
        <div className="mb-6 flex gap-3">
          <a
            href="/api/auth/oauth/google"
            className="flex flex-1 items-center justify-center gap-2 rounded bg-[#2B2D31] px-4 py-2.5 text-sm font-500 text-[#DBDEE1] transition-colors hover:bg-[#1E1F22] hover:text-white"
          >
            <GoogleIcon />
            Google
          </a>
          <a
            href="/api/auth/oauth/github"
            className="flex flex-1 items-center justify-center gap-2 rounded bg-[#2B2D31] px-4 py-2.5 text-sm font-500 text-[#DBDEE1] transition-colors hover:bg-[#1E1F22] hover:text-white"
          >
            <GithubIcon />
            GitHub
          </a>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#1E1F22]" />
          <span className="text-xs font-600 text-[#B5BAC1]">O</span>
          <div className="h-px flex-1 bg-[#1E1F22]" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-700 uppercase text-[#B5BAC1]">
              Correo electrónico o número de teléfono <span className="text-[#F23F42]">*</span>
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
              className="rounded-[3px] border-none bg-[#1E1F22] p-2.5 text-[#DBDEE1] outline-none transition-colors focus:ring-1 focus:ring-[#00A8FC]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-700 uppercase text-[#B5BAC1]">
              Contraseña <span className="text-[#F23F42]">*</span>
            </label>
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
                className="w-full rounded-[3px] border-none bg-[#1E1F22] p-2.5 pr-10 text-[#DBDEE1] outline-none transition-colors focus:ring-1 focus:ring-[#00A8FC]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B5BAC1] transition-colors hover:text-[#DBDEE1]"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <button type="button" className="mt-1 self-start text-sm font-500 text-[#00A8FC] hover:underline">
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {requiresTwoFactor && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-700 uppercase text-[#B5BAC1]">
                Código de autenticación <span className="text-[#F23F42]">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="rounded-[3px] border-none bg-[#1E1F22] p-2.5 text-[#DBDEE1] outline-none transition-colors focus:ring-1 focus:ring-[#00A8FC]"
                maxLength={32}
                required
              />
            </div>
          )}

          {error && (
            <div className="rounded-[3px] bg-[#F23F42]/10 p-2 text-sm text-[#F23F42]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center rounded-[3px] bg-[#5865F2] py-3 text-sm font-600 text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : requiresTwoFactor ? (
              'Verificar y entrar'
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        <div className="mt-4 text-sm text-[#949BA4]">
          ¿Necesitas una cuenta?{' '}
          <Link
            href={inviteCode ? `/register?invite=${encodeURIComponent(inviteCode)}` : '/register'}
            className="font-500 text-[#00A8FC] hover:underline"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </div>
  )
}

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
