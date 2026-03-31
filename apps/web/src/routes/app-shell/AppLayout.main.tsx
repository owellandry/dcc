'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { useServersStore } from '@/stores/serversStore'
import { useWebSocket } from '@/hooks/useWebSocket'
import { authApi, serversApi, setAccessToken, usersApi } from '@/lib/api'
import { isMockSession } from '@/lib/mock-init'
import { MotionPage, motion } from '@/lib/motion'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading, setUser, logout, setLoading, setAccessToken: storeSetToken } = useAuthStore()
  const setServers = useServersStore((s) => s.setServers)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      // Dev mode: stores already hydrated by /dev page — skip real auth
      if (isMockSession()) {
        setLoading(false)
        setReady(true)
        return
      }

      setLoading(true)
      try {
        const res = await authApi.refresh()
        const token = res?.data?.accessToken

        if (!token) {
          logout()
          router.replace('/login')
          return
        }

        setAccessToken(token)
        storeSetToken(token)
        const userRes = await usersApi.me()
        setUser(userRes.data)
      } catch {
        logout()
        router.replace('/login')
        return
      }
      // Non-fatal: load server list so sidebar icons appear immediately on any page
      // (WebSocket READY will also set this, but WS is slower to connect)
      serversApi.list().then((res) => setServers(res.data)).catch(() => undefined)
      setReady(true)
    }

    init()

    const handler = () => {
      logout()
      router.replace('/login')
    }
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  // WS only in real mode
  useWebSocket()

  if (!ready || isLoading) {
    return (
      <MotionPage className="app-shell-bg flex h-screen w-screen items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="flex h-12 w-12 items-center justify-center rounded-xl shadow-glow-ember"
            style={{ background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))' }}
            animate={{ scale: [1, 1.06, 1], rotate: [0, 2, -2, 0] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="white"/>
            </svg>
          </motion.div>
          <div className="h-0.5 w-32 overflow-hidden rounded-full bg-[var(--s3)]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--ember), var(--ember-hover))' }}
              animate={{
                width: ['0%', '60%', '0%'],
                marginLeft: ['0%', '20%', '100%'],
              }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </MotionPage>
    )
  }

  if (!isAuthenticated) return null

  return <MotionPage className="contents">{children}</MotionPage>
}
