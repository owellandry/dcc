'use client'

'use client'

import { MotionPage, motion } from '@/lib/motion'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell-bg relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-40 -top-40 h-96 w-96 rounded-full opacity-[0.06] blur-[100px]"
          style={{ background: 'var(--ember)' }}
          animate={{
            x: [0, 44, -18, 0],
            y: [0, 36, 58, 0],
            scale: [1, 1.1, 0.92, 1],
          }}
          transition={{ repeat: Infinity, duration: 12, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full opacity-[0.06] blur-[100px]"
          style={{ background: 'var(--volt)' }}
          animate={{
            x: [0, -52, 30, 0],
            y: [0, -28, -58, 0],
            scale: [1, 1.06, 0.95, 1],
          }}
          transition={{ repeat: Infinity, duration: 14, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.03] blur-[80px]"
          style={{ background: 'var(--ember)' }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.03, 0.05, 0.03] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
        />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <MotionPage className="relative z-10 w-full max-w-md px-4">
        {children}
      </MotionPage>
    </div>
  )
}
