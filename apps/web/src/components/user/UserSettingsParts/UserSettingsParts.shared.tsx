'use client'

import type { ReactNode } from 'react'

export function SettingsNavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-600 transition-colors ${
        active
          ? 'bg-[var(--s2)] text-[var(--t0)]'
          : 'text-[var(--t3)] hover:bg-[var(--s2)] hover:text-[var(--t1)]'
      }`}
    >
      <span className="text-[var(--t4)]">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export function ProfileRow({ label, value, children }: { label: string; value: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">{label}</p>
        <p className="truncate text-sm text-[var(--t1)]">{value}</p>
      </div>
      {children}
    </div>
  )
}

export function SettingBlock({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--s0)] text-[var(--t2)]">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-700 text-[var(--t0)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--t3)]">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">
        {label}
      </span>
      {children}
    </label>
  )
}
