'use client'

'use client'

import Link from 'next/link'
import { Cpu, Globe, MessageSquare, Shield } from 'lucide-react'
import {
  MotionPage,
  interactiveMotion,
  itemVariants,
  listVariants,
  motion,
  sectionVariants,
} from '@/lib/motion'

export default function LandingPage() {
  return (
    <MotionPage className="app-shell-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
        animate={{ opacity: [0.02, 0.04, 0.02] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut' }}
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <motion.div
          className="h-[600px] w-[600px] rounded-full opacity-[0.05] blur-[120px]"
          style={{ background: 'var(--ember)' }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.04, 0.08, 0.04] }}
          transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 px-6 text-center"
        initial="hidden"
        animate="visible"
        variants={listVariants(0.1, 0.08)}
      >
        <motion.div className="flex items-center gap-3" variants={itemVariants}>
          <motion.div
            className="flex h-12 w-12 items-center justify-center rounded-xl shadow-glow-ember"
            style={{ background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))' }}
            animate={{ rotate: [0, 4, -4, 0], scale: [1, 1.04, 1] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          >
            <MessageSquare size={24} className="text-white" />
          </motion.div>
          <span className="font-display text-3xl font-800 tracking-tight text-[var(--t0)]">dcc</span>
        </motion.div>

        <motion.div className="max-w-2xl space-y-4" variants={sectionVariants}>
          <h1 className="font-display text-5xl font-800 leading-none tracking-tight text-[var(--t0)] md:text-7xl">
            Talk to your{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, var(--ember), #ffb38a)' }}
            >
              people.
            </span>
          </h1>
          <p className="text-lg text-[var(--t2)]">
            Real-time chat, organized servers, voice channels, everything you need, nothing you do not.
          </p>
        </motion.div>

        <motion.div className="flex flex-wrap items-center justify-center gap-3" variants={itemVariants}>
          <motion.div {...interactiveMotion}>
            <Link
              href="/register"
              className="rounded-lg px-6 py-3 text-sm font-600 text-white transition-all hover:shadow-glow-ember active:scale-95"
              style={{ background: 'var(--ember)' }}
            >
              Get started free
            </Link>
          </motion.div>
          <motion.div {...interactiveMotion}>
            <Link
              href="/login"
              className="rounded-lg border border-[var(--b1)] px-6 py-3 text-sm font-500 text-[var(--t1)] transition-all hover:border-[var(--b2)] hover:text-[var(--t0)] active:scale-95"
            >
              Sign in
            </Link>
          </motion.div>
        </motion.div>

        <motion.div className="flex flex-wrap justify-center gap-3 pt-2" variants={listVariants(0.08)}>
          {[
            { icon: <Shield size={14} />, label: 'End-to-end encrypted' },
            { icon: <Globe size={14} />, label: 'Cloudflare edge' },
            { icon: <Cpu size={14} />, label: 'Rust backend' },
          ].map(({ icon, label }) => (
            <motion.span
              key={label}
              className="flex items-center gap-1.5 rounded-full border border-[var(--b0)] bg-white/[0.03] px-3 py-1 text-xs text-[var(--t3)]"
              variants={itemVariants}
              {...interactiveMotion}
            >
              {icon}
              {label}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </MotionPage>
  )
}
