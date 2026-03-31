'use client'

import { useState } from 'react'
import { ServerSidebar } from '@/components/layout/ServerSidebar'
import { DMSidebar } from '@/components/layout/DMSidebar'
import { UserPanel } from '@/components/user/UserPanel'
import { cn } from '@/lib/cn'
import { Users } from 'lucide-react'

type Tab = 'online' | 'all' | 'pending' | 'blocked' | 'add'

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('online')
  const [addUsername, setAddUsername] = useState('')

  return (
    <div className="app-shell-bg flex h-screen w-screen overflow-hidden">
      <ServerSidebar />
      <DMSidebar />
      <UserPanel />

      <main className="flex flex-1 flex-col overflow-hidden bg-[var(--s3)]">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-4 border-b border-[var(--b0)] px-4 surface-elevated">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[var(--t3)]" />
            <span className="font-display font-700 text-[var(--t0)]">Friends</span>
          </div>

          <div className="h-4 w-px bg-[var(--b1)]" />

          {/* Tabs */}
          <nav className="flex gap-1">
            {(['online', 'all', 'pending', 'blocked'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-500 capitalize transition-colors',
                  tab === t
                    ? 'bg-[var(--b2)] text-[var(--t0)]'
                    : 'text-[var(--t3)] hover:bg-white/[0.04] hover:text-[var(--t1)]'
                )}
              >
                {t}
              </button>
            ))}
          </nav>

          <button
            onClick={() => setTab('add')}
            className="ml-1 rounded-md bg-[var(--online)]/15 px-3 py-1 text-sm font-600 text-[var(--online)] transition-colors hover:bg-[var(--online)]/25"
          >
            Add Friend
          </button>
        </header>

        {/* Content */}
        <div className="scrollable flex-1 px-8 py-6">
          {tab === 'add' ? (
            <AddFriendSection value={addUsername} onChange={setAddUsername} />
          ) : (
            <FriendListSection tab={tab} />
          )}
        </div>
      </main>
    </div>
  )
}

function AddFriendSection({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="max-w-xl">
      <h2 className="font-display text-xl font-700 text-[var(--t0)]">Add a Friend</h2>
      <p className="mt-1 text-sm text-[var(--t3)]">You can add a friend using their DCC username.</p>

      <div className="mt-5 flex gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s4)] px-4 py-3 surface-elevated">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter a username"
          className="flex-1 bg-transparent text-sm text-[var(--t0)] placeholder:text-[var(--t4)] outline-none"
        />
        <button
          disabled={!value.trim()}
          className="rounded-lg bg-volt px-4 py-1.5 text-sm font-600 text-white transition-all hover:bg-volt-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send Request
        </button>
      </div>
    </div>
  )
}

function FriendListSection({ tab }: { tab: Tab }) {
  return (
    <div>
      <p className="sidebar-section-label mb-3">
        {tab === 'online' ? 'Online' : tab === 'pending' ? 'Pending' : tab === 'blocked' ? 'Blocked' : 'All Friends'} — 0
      </p>
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--s2)] surface-elevated">
          <Users size={36} className="text-[var(--t4)]" strokeWidth={1.5} />
        </div>
        <p className="text-[var(--t3)]">
          {tab === 'online'
            ? "No one's online yet"
            : tab === 'pending'
            ? 'No pending requests'
            : tab === 'blocked'
            ? 'Nobody blocked'
            : 'No friends yet — add someone!'}
        </p>
      </div>
    </div>
  )
}
