'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { FaGoogle, FaGithub } from 'react-icons/fa'
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
    <div className="relative flex min-h-screen items-center justify-center p-4 font-sans selection:bg-[#5865F2] selection:text-white sm:p-0">
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
            <FaGoogle size={16} />
            Google
          </a>
          <a
            href="/api/auth/oauth/github"
            className="flex flex-1 items-center justify-center gap-2 rounded bg-[#2B2D31] px-4 py-2.5 text-sm font-500 text-[#DBDEE1] transition-colors hover:bg-[#1E1F22] hover:text-white"
          >
            <FaGithub size={16} />
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
              Nombre de usuario o correo electrónico <span className="text-[#F23F42]">*</span>
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
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
