'use client'

import { AnimatePresence, interactiveMotion, motion, overlayCardVariants } from '@/lib/motion'
import { getUserDisplayName } from '@/lib/users/displayName.shared'
import { OfficialMemberTag, hasOfficialMemberBadge } from '@/components/user/Badge'
import { getUserDecorationToneColors } from '../UserDecorationBackdrop.module'
import { type UserStatusSwitcherVisualProps } from './UserStatusSwitcher.shared'

export function UserStatusSwitcherVisual({
  user,
  decorationTone,
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
  const decorationColors = decorationTone ? getUserDecorationToneColors(decorationTone) : null
  return (
    <div className="relative min-w-0 flex-1" ref={statusMenuRef}>
      <div className="flex min-w-0 items-center gap-2">
        <p
          className="font-700 truncate text-[15px] leading-none text-[var(--t0)]"
          style={decorationColors ? { color: decorationColors.title } : undefined}
        >
          {displayName}
        </p>
        {hasOfficialMemberBadge({ user }) && (
          <OfficialMemberTag compact className="-translate-y-px" />
        )}
      </div>
      <motion.button
        type="button"
        onClick={onToggleMenu}
        className="mt-2 truncate text-[12px] capitalize leading-none text-[var(--t3)] transition-opacity hover:opacity-90"
        disabled={isSavingStatus}
        {...(decorationColors ? { style: { color: decorationColors.subtitleStrong } } : {})}
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

      {statusError && (
        <p className="text-ember mt-1 truncate text-[11px] leading-none">{statusError}</p>
      )}
    </div>
  )
}
