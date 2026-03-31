'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export default function VerifyEmailPage() {
  const params = useSearchParams()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [queryState, setQueryState] = useState({
    sent: false,
    token: null as string | null,
    email: null as string | null,
    devVerificationUrl: null as string | null,
    inviteCode: null as string | null,
  })

  const [resent, setResent] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    setQueryState({
      sent: params.get('sent') === '1',
      token: params.get('token'),
      email: params.get('email'),
      devVerificationUrl: params.get('devVerificationUrl'),
      inviteCode: params.get('invite'),
    })
  }, [params])

  const { sent, token, email, devVerificationUrl, inviteCode } = queryState

  const loginHref = inviteCode ? `/login?invite=${encodeURIComponent(inviteCode)}` : '/login'

  const handleResend = async () => {
    setIsResending(true)
    setResendError(null)
    try {
      await authApi.resendVerification()
      setResent(true)
    } catch {
      setResendError('Resend currently requires an authenticated session.')
    } finally {
      setIsResending(false)
    }
  }

  if (token) {
    return <VerifyingState token={token} loginHref={loginHref} />
  }

  return (
    <div className="animate-slide-up">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s2)] shadow-xl">
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, var(--online), transparent)' }} />

        <div className="flex flex-col items-center px-8 pb-8 pt-7 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--online)]/20 bg-[var(--online)]/10">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--online)" strokeWidth="1.5">
              <path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" />
            </svg>
          </div>

          <h1 className="font-display text-2xl font-700 text-[var(--t0)]">Check your email</h1>
          <p className="mt-2 max-w-sm text-sm text-[var(--t3)]">
            {sent
              ? "We've sent you a verification link. Click it to activate your account."
              : 'A verification link has been sent to your email address.'}
          </p>

          {email && (
            <p className="mt-2 text-xs text-[var(--t4)]">
              Pending address: <span className="text-[var(--t2)]">{email}</span>
            </p>
          )}

          {inviteCode && (
            <p className="mt-2 text-xs text-ember">
              Your server invite will continue after you sign in.
            </p>
          )}

          <div className="mt-6 w-full rounded-xl border border-[var(--b0)] bg-[var(--s0)] p-4 text-left">
            <p className="mb-2 text-xs font-600 uppercase tracking-wider text-[var(--t3)]">Next steps</p>
            <ol className="space-y-2 text-sm text-[var(--t2)]">
              {['Open your email inbox', 'Look for an email from DCC', 'Click the verification link'].map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--ember-dim)] text-[10px] font-700 text-ember">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {devVerificationUrl && (
            <div className="mt-4 w-full rounded-xl border border-ember/20 bg-ember/10 p-4 text-left">
              <p className="text-xs font-600 uppercase tracking-wider text-ember">Local development</p>
              <p className="mt-2 text-sm text-[var(--t2)]">
                SMTP is not configured, so the verification link is available here for local testing.
              </p>
              <a
                href={devVerificationUrl}
                className="mt-3 inline-flex rounded-lg bg-ember px-4 py-2 text-sm font-600 text-[var(--ember-contrast)] transition-all hover:shadow-glow-ember"
              >
                Open verification link
              </a>
            </div>
          )}

          {!resent && isAuthenticated ? (
            <button
              onClick={handleResend}
              disabled={isResending}
              className="mt-5 text-sm text-[var(--t3)] transition-colors hover:text-ember disabled:opacity-50"
            >
              {isResending ? 'Sending...' : "Didn't receive it? Resend email"}
            </button>
          ) : resent ? (
            <p className="mt-5 text-sm text-[var(--online)]">Email resent successfully!</p>
          ) : (
            <p className="mt-5 text-sm text-[var(--t4)]">Resend is available after signing in.</p>
          )}

          {resendError && <p className="mt-3 text-sm text-[var(--dnd)]">{resendError}</p>}

          <Link href={loginHref} className="mt-4 text-xs text-[var(--t4)] transition-colors hover:text-[var(--t3)]">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

function VerifyingState({ token, loginHref }: { token: string; loginHref: string }) {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')

  useEffect(() => {
    let mounted = true

    authApi.verifyEmail(token)
      .then(() => {
        if (mounted) setStatus('success')
      })
      .catch(() => {
        if (mounted) setStatus('error')
      })

    return () => {
      mounted = false
    }
  }, [token])

  return (
    <div className="animate-slide-up">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s2)] shadow-xl">
        <div className="flex flex-col items-center px-8 py-12 text-center">
          {status === 'verifying' && (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-ember/20 border-t-ember" />
              <p className="mt-4 text-sm text-[var(--t3)]">Verifying your email...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--online)]/10 text-[var(--online)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="mt-4 font-display text-xl font-700 text-[var(--t0)]">Email verified!</h2>
              <p className="mt-1 text-sm text-[var(--t3)]">Your account is now active.</p>
              <Link
                href={loginHref}
                className="mt-5 rounded-lg px-6 py-2.5 text-sm font-600 text-[var(--ember-contrast)] transition-all hover:shadow-glow-ember"
                style={{ background: 'var(--ember)' }}
              >
                Sign in
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--dnd)]/10 text-[var(--dnd)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h2 className="mt-4 font-display text-xl font-700 text-[var(--t0)]">Link expired</h2>
              <p className="mt-1 text-sm text-[var(--t3)]">This verification link has expired or already been used.</p>
              <Link href={loginHref} className="mt-5 text-sm text-ember transition-colors hover:text-ember-300">
                Request a new link
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
