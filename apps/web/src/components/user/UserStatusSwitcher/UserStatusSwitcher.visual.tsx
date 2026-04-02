'use client'

import { AnimatePresence, interactiveMotion, motion, overlayCardVariants } from '@/lib/motion'
import { getUserDisplayName, getUserHandle } from '@/lib/users/displayName.shared'
import { OfficialMemberTag, hasOfficialMemberBadge } from '@/components/user/Badge'
import { type UserStatusSwitcherVisualProps } from './UserStatusSwitcher.shared'

export function UserStatusSwitcherVisual({
  user,
  status,
  customStatus,
  statusOptions,
  selectedStatusLabel,
  isStatusMenuOpen,
  isSavingStatus,
  statusError,
  statusMenuRef,
  onToggleMenu,
  onUpdateStatus,
}: UserStatusSwitcherVisualProps) {
  const displayName = getUserDisplayName(user)
  return (
    <div className="relative min-w-0 flex-1" ref={statusMenuRef}>
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate text-[15px] font-700 leading-none text-[var(--t0)]">{displayName}</p>
        {hasOfficialMemberBadge({ user }) && <OfficialMemberTag compact className="-translate-y-px" />}
      </div>
      <p className="mt-1 truncate text-[11px] leading-none text-[var(--t4)]">{getUserHandle(user)}</p>
      <motion.button
        type="button"
        onClick={onToggleMenu}
        className="mt-2 truncate text-[12px] capitalize leading-none text-[var(--t3)] transition-colors hover:text-[var(--t1)]"
        disabled={isSavingStatus}
        {...interactiveMotion}
      >
        {customStatus ?? selectedStatusLabel}
      </motion.button>

      <AnimatePresence>
        {isStatusMenuOpen && (
          <motion.div
            className="absolute bottom-[calc(100%+10px)] left-0 z-[80] w-44 rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-1 shadow-[0_16px_32px_rgba(0,0,0,0.4)]"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={overlayCardVariants}
          >
            {statusOptions.map((option) => (
              <motion.button
                key={option.value}
                type="button"
                onClick={() => onUpdateStatus(option.value)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-[var(--t2)] transition-colors hover:bg-[var(--s2)] hover:text-[var(--t0)]"
                disabled={isSavingStatus}
                {...interactiveMotion}
              >
                <span>{option.label}</span>
                {status === option.value && (
                  <span className="text-[10px] text-[var(--online)]">Actual</span>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {statusError && <p className="mt-1 truncate text-[11px] leading-none text-ember">{statusError}</p>}
    </div>
  )
}
