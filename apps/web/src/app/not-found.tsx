import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="app-shell-bg flex min-h-screen flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-1">
        <p className="font-mono text-8xl font-700 text-ember opacity-30">404</p>
        <h1 className="font-display text-2xl font-700 text-[var(--t0)]">Page not found</h1>
        <p className="text-sm text-[var(--t3)]">This page wandered off somewhere.</p>
      </div>
      <Link
        href="/"
        className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-600 text-white transition-all hover:shadow-glow-ember active:scale-95"
        style={{ background: 'var(--ember)' }}
      >
        <ArrowLeft size={16} />
        Go home
      </Link>
    </div>
  )
}
