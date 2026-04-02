'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { ApiRequestError, authApi, serversApi, setAccessToken, usersApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useServersStore } from '@/stores/serversStore'

interface FieldError {
  username?: string
  email?: string
  password?: string
}

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser, setAccessToken: storeSetToken } = useAuthStore()
  const upsertServer = useServersStore((s) => s.upsertServer)
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldError>({})

  useEffect(() => {
    setInviteCode(searchParams.get('invite'))
  }, [searchParams])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsLoading(true)

    try {
      await authApi.register({ username, email, password })

      const loginRes = await authApi.login({ login: email, password })
      const token = loginRes.data.accessToken

      if (!token || loginRes.data.requiresTwoFactor) {
        throw new Error('REGISTER_AUTO_LOGIN_FAILED')
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
        if (err.details?.length) {
          const fe: FieldError = {}
          for (const d of err.details) {
            if (d.field === 'username') fe.username = d.message
            else if (d.field === 'email') fe.email = d.message
            else if (d.field === 'password') fe.password = d.message
          }
          setFieldErrors(fe)
        } else {
          setError(err.message)
        }
      } else {
        setError('Cuenta creada, pero falló el inicio de sesión automático. Por favor inicia sesión manualmente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#5865F2] p-4 font-sans selection:bg-[#5865F2] selection:text-white sm:p-0">
      {/* Background illustration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://cdn.discordapp.com/assets/images/128b9d79c6b65313543b.svg')] bg-cover bg-center bg-no-repeat opacity-80 mix-blend-overlay" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[480px] animate-slide-up rounded-md bg-[#313338] p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-600 text-[#F2F3F5]">
            Crear una cuenta
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-700 uppercase text-[#B5BAC1]">
              Correo electrónico <span className="text-[#F23F42]">*</span>
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`rounded-[3px] border-none bg-[#1E1F22] p-2.5 text-[#DBDEE1] outline-none transition-colors focus:ring-1 focus:ring-[#00A8FC] ${fieldErrors.email ? 'ring-1 ring-[#F23F42]' : ''}`}
            />
            {fieldErrors.email && (
              <span className="text-xs italic text-[#F23F42]">{fieldErrors.email}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-700 uppercase text-[#B5BAC1]">
              Nombre de usuario <span className="text-[#F23F42]">*</span>
            </label>
            <input
              type="text"
              autoComplete="username"
              required
              minLength={2}
              maxLength={32}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
              className={`rounded-[3px] border-none bg-[#1E1F22] p-2.5 text-[#DBDEE1] outline-none transition-colors focus:ring-1 focus:ring-[#00A8FC] ${fieldErrors.username ? 'ring-1 ring-[#F23F42]' : ''}`}
            />
            {fieldErrors.username && (
              <span className="text-xs italic text-[#F23F42]">{fieldErrors.username}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-700 uppercase text-[#B5BAC1]">
              Contraseña <span className="text-[#F23F42]">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-[3px] border-none bg-[#1E1F22] p-2.5 pr-10 text-[#DBDEE1] outline-none transition-colors focus:ring-1 focus:ring-[#00A8FC] ${fieldErrors.password ? 'ring-1 ring-[#F23F42]' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B5BAC1] transition-colors hover:text-[#DBDEE1]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="text-xs italic text-[#F23F42]">{fieldErrors.password}</span>
            )}
          </div>

          {error && (
            <div className="rounded-[3px] bg-[#F23F42]/10 p-2 text-sm text-[#F23F42]">
              {error}
            </div>
          )}

          <div className="mt-1 text-xs text-[#949BA4]">
            Al registrarte, aceptas nuestros{' '}
            <Link href="#" className="text-[#00A8FC] hover:underline">Términos de servicio</Link> y la{' '}
            <Link href="#" className="text-[#00A8FC] hover:underline">Política de privacidad</Link>.
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center rounded-[3px] bg-[#5865F2] py-3 text-sm font-600 text-white transition-colors hover:bg-[#4752C4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              'Continuar'
            )}
          </button>
        </form>

        <div className="mt-4 text-sm text-[#949BA4]">
          <Link
            href={inviteCode ? `/login?invite=${encodeURIComponent(inviteCode)}` : '/login'}
            className="font-500 text-[#00A8FC] hover:underline"
          >
            ¿Ya tienes una cuenta?
          </Link>
        </div>
      </div>
    </div>
  )
}
