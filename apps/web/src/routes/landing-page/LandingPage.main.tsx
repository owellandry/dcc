'use client'

import Link from 'next/link'
import { Cpu, Globe, MessageSquare, Radio, Shield, Sparkles, Users, Zap } from 'lucide-react'
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
    <MotionPage className="app-shell-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
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
          className="h-[620px] w-[620px] rounded-full opacity-[0.06] blur-[120px]"
          style={{ background: 'var(--ember)' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.04, 0.1, 0.04] }}
          transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
        />
      </div>

      <div className="pointer-events-none absolute -left-20 top-12 h-56 w-56 rounded-full bg-[#8f78ff]/20 blur-[90px]" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-52 w-52 rounded-full bg-[var(--ember)]/20 blur-[80px]" />

      <motion.div
        className="relative z-10 w-full max-w-6xl"
        initial="hidden"
        animate="visible"
        variants={listVariants(0.1, 0.08)}
      >
        <motion.div
          className="overflow-hidden rounded-[34px] border border-[var(--b1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[0_34px_90px_rgba(0,0,0,0.45)] backdrop-blur-sm"
          variants={sectionVariants}
        >
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="px-6 pb-7 pt-6 sm:px-8 sm:pb-9 sm:pt-8">
              <motion.div className="flex items-center gap-3" variants={itemVariants}>
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-glow-ember"
                  style={{ background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))' }}
                  animate={{ rotate: [0, 4, -4, 0], scale: [1, 1.04, 1] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                >
                  <MessageSquare size={28} className="text-white" />
                </motion.div>
                <div>
                  <p className="font-display text-3xl font-800 tracking-tight text-[var(--t0)]">dcc</p>
                  <p className="text-sm text-[var(--t3)]">Tu comunidad, con otra vibra</p>
                </div>
              </motion.div>

              <motion.div className="mt-7 max-w-3xl space-y-4" variants={sectionVariants}>
                <h1 className="font-display text-5xl font-800 leading-[0.98] tracking-tight text-[var(--t0)] sm:text-6xl md:text-7xl">
                  Habla, juega y conecta en un espacio que se siente vivo.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--t2)] sm:text-lg">
                  Mensajeria en tiempo real, canales de voz fluidos y servidores organizados en una experiencia moderna, intensa y con estilo.
                </p>
              </motion.div>

              <motion.div className="mt-7 flex flex-wrap items-center gap-3" variants={itemVariants}>
                <motion.div {...interactiveMotion}>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-700 text-white transition-all hover:shadow-glow-ember active:scale-95"
                    style={{ background: 'var(--ember)' }}
                  >
                    <Sparkles size={16} />
                    Empezar gratis
                  </Link>
                </motion.div>
                <motion.div {...interactiveMotion}>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--b1)] px-6 py-3 text-sm font-600 text-[var(--t1)] transition-all hover:border-[var(--b2)] hover:bg-white/[0.04] hover:text-[var(--t0)] active:scale-95"
                  >
                    Iniciar sesion
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div className="mt-7 flex flex-wrap gap-2.5" variants={listVariants(0.08)}>
                {[
                  { icon: <Shield size={14} />, label: 'Privacidad real' },
                  { icon: <Globe size={14} />, label: 'Edge global' },
                  { icon: <Cpu size={14} />, label: 'Backend en Rust' },
                  { icon: <Radio size={14} />, label: 'Voz de baja latencia' },
                ].map(({ icon, label }) => (
                  <motion.span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--b0)] bg-white/[0.03] px-3.5 py-1.5 text-xs font-600 text-[var(--t3)]"
                    variants={itemVariants}
                    {...interactiveMotion}
                  >
                    {icon}
                    {label}
                  </motion.span>
                ))}
              </motion.div>
            </div>

            <div className="border-t border-[var(--b1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.06))] px-6 py-6 sm:px-8 lg:border-l lg:border-t-0">
              <motion.div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1" variants={listVariants(0.08)}>
                {[
                  {
                    icon: <Users size={18} />,
                    title: 'Comunidades activas',
                    text: 'Crea servidores con canales claros y espacios por tema.',
                  },
                  {
                    icon: <Zap size={18} />,
                    title: 'Interfaz rapida',
                    text: 'Navegacion fluida con transiciones suaves en cada vista.',
                  },
                  {
                    icon: <MessageSquare size={18} />,
                    title: 'Conversaciones vivas',
                    text: 'Mensajes, menciones y respuestas listos para tu ritmo diario.',
                  },
                ].map((item) => (
                  <motion.div
                    key={item.title}
                    className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)]/70 p-4"
                    variants={itemVariants}
                    {...interactiveMotion}
                  >
                    <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ember-dim)] text-[var(--ember)]">
                      {item.icon}
                    </div>
                    <p className="font-display text-xl font-700 text-[var(--t0)]">{item.title}</p>
                    <p className="mt-1.5 text-sm leading-6 text-[var(--t3)]">{item.text}</p>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </MotionPage>
  )
}
