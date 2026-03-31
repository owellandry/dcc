'use client'

import type { ReactNode } from 'react'
import { UserSettingsModalContentSocialSection } from './UserSettingsModalContentSocialSection.module'
import { UserSettingsModalConnectionsSection } from './UserSettingsModalConnectionsSection.module'
import { UserSettingsModalNotificationsSection } from './UserSettingsModalNotificationsSection.module'

export type UserSettingsPlaceholderView =
  | 'content-social'
  | 'connections'
  | 'notifications'
  | 'subscriptions'
  | 'billing'

export const userSettingsPlaceholderModules: Record<UserSettingsPlaceholderView, ReactNode> = {
  'content-social': (
    <UserSettingsModalContentSocialSection />
  ),
  connections: (
    <UserSettingsModalConnectionsSection />
  ),
  notifications: (
    <UserSettingsModalNotificationsSection />
  ),
  subscriptions: (
    <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
      <div className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-4 text-sm text-[var(--t2)]">
        Aqui veras informacion de suscripcion y plan actual.
      </div>
    </div>
  ),
  billing: (
    <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
      <div className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-4 text-sm text-[var(--t2)]">
        Aqui veras historial y metodos de facturacion.
      </div>
    </div>
  ),
}
