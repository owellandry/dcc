'use client'

import { useState } from 'react'
import { ChevronDown, Headphones, Mic, MicOff, Settings, VolumeX } from 'lucide-react'
import { cn } from '@/lib/cn'
import { interactiveMotion, motion } from '@/lib/motion'
import { UserAvatar } from '../UserAvatar'
import {
  UserDecorationBackdrop,
  useUserDecorationPresentation,
} from '../UserDecorationBackdrop.module'
import { UserSettingsModal } from '../UserSettingsModal'
import { AppearanceThemeWorkspace } from '../UserSettingsModal/AppearanceThemeWorkspace.main'
import { UserStatusSwitcher } from '../UserStatusSwitcher'
import { UserPanelAudioOptionsPanel } from './UserPanelAudioOptionsPanel.module'
import { type PanelButtonProps, type UserPanelVisualProps } from './UserPanel.shared'

export function UserPanelVisual({
  user,
  isSettingsOpen,
  settingsInitialView,
  isThemeWorkspaceOpen,
  isMicMuted,
  isHeadphonesMuted,
  onToggleMic,
  onToggleHeadphones,
  onOpenSettings,
  onCloseSettings,
  onOpenThemeWorkspace,
  onCloseThemeWorkspace,
  onBackToAppearanceSettings,
}: UserPanelVisualProps) {
  if (!user) return null
  const [openAudioPanel, setOpenAudioPanel] = useState<'input' | 'output' | null>(null)
  const [inputVolume, setInputVolume] = useState(100)
  const [outputVolume, setOutputVolume] = useState(100)
  const [selectedInputDevice, setSelectedInputDevice] = useState('Default')
  const [selectedOutputDevice, setSelectedOutputDevice] = useState('Predeterminado')
  const [selectedInputProfile, setSelectedInputProfile] = useState('Personalizar')
  const [selectedOutputProfile, setSelectedOutputProfile] = useState('Balanceado')
  const decorationPresentation = useUserDecorationPresentation(user.avatarDecorationUrl)
  const hasDecoration = Boolean(decorationPresentation)

  return (
    <>
      <motion.div
        className={cn(
          'fixed bottom-0 left-0 z-[160] h-[70px] w-[380px] max-w-[100vw] overflow-visible rounded-tr-2xl border border-[var(--b1)] bg-[var(--s0)]',
          hasDecoration &&
            decorationPresentation?.tone === 'dark' &&
            'border-white/20 bg-[rgba(214,226,255,0.18)] shadow-[0_14px_32px_rgba(46,66,112,0.16)]',
          hasDecoration &&
            decorationPresentation?.tone === 'light' &&
            'border-white/10 bg-[rgba(17,24,40,0.86)] shadow-[0_14px_32px_rgba(3,8,16,0.34)]'
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
      >
        <UserDecorationBackdrop
          src={user.avatarDecorationUrl}
          {...(decorationPresentation ? { presentation: decorationPresentation } : {})}
        />
        <div className="relative z-10 flex h-full items-center gap-2 px-2.5">
          <UserAvatar user={user} size={36} showStatus />
          <UserStatusSwitcher user={user} decorationTone={decorationPresentation?.tone ?? null} />

          <div className="flex items-center gap-1.5">
            <AudioSplitButton
              title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
              active={isMicMuted}
              defaultIcon={<Mic size={18} />}
              activeIcon={<MicOff size={18} />}
              onToggle={() => {
                setOpenAudioPanel(null)
                onToggleMic()
              }}
              onOpenOptions={() =>
                setOpenAudioPanel((current) => (current === 'input' ? null : 'input'))
              }
              panel={
                <UserPanelAudioOptionsPanel
                  open={openAudioPanel === 'input'}
                  mode="input"
                  currentDevice={selectedInputDevice}
                  currentProfile={selectedInputProfile}
                  volume={inputVolume}
                  onVolumeChange={setInputVolume}
                  onSelectDevice={() => {
                    setSelectedInputDevice((current) =>
                      current === 'Default' ? 'MicrÃ³fono USB' : 'Default'
                    )
                  }}
                  onSelectProfile={() => {
                    setSelectedInputProfile((current) =>
                      current === 'Personalizar' ? 'NÃ­tido' : 'Personalizar'
                    )
                  }}
                  onOpenVoiceSettings={() => {
                    setOpenAudioPanel(null)
                    onOpenSettings('devices')
                  }}
                  onClose={() => setOpenAudioPanel(null)}
                />
              }
            />
            <AudioSplitButton
              title={isHeadphonesMuted ? 'Undeafen' : 'Deafen'}
              active={isHeadphonesMuted}
              defaultIcon={<Headphones size={18} />}
              activeIcon={<VolumeX size={18} />}
              onToggle={() => {
                setOpenAudioPanel(null)
                onToggleHeadphones()
              }}
              onOpenOptions={() =>
                setOpenAudioPanel((current) => (current === 'output' ? null : 'output'))
              }
              panel={
                <UserPanelAudioOptionsPanel
                  open={openAudioPanel === 'output'}
                  mode="output"
                  currentDevice={selectedOutputDevice}
                  currentProfile={selectedOutputProfile}
                  volume={outputVolume}
                  onVolumeChange={setOutputVolume}
                  onSelectDevice={() => {
                    setSelectedOutputDevice((current) =>
                      current === 'Predeterminado' ? 'AudÃ­fonos Bluetooth' : 'Predeterminado'
                    )
                  }}
                  onSelectProfile={() => {
                    setSelectedOutputProfile((current) =>
                      current === 'Balanceado' ? 'Gaming' : 'Balanceado'
                    )
                  }}
                  onOpenVoiceSettings={() => {
                    setOpenAudioPanel(null)
                    onOpenSettings('devices')
                  }}
                  onClose={() => setOpenAudioPanel(null)}
                />
              }
            />
            <PanelButton
              title="User settings"
              icon={<Settings size={20} />}
              onClick={() => {
                setOpenAudioPanel(null)
                onOpenSettings()
              }}
            />
          </div>
        </div>
      </motion.div>

      <UserSettingsModal
        open={isSettingsOpen}
        onClose={onCloseSettings}
        initialView={settingsInitialView}
        onOpenThemeWorkspace={onOpenThemeWorkspace}
      />
      <AppearanceThemeWorkspace
        open={isThemeWorkspaceOpen}
        onClose={onCloseThemeWorkspace}
        onBackToSettings={onBackToAppearanceSettings}
      />
    </>
  )
}

function AudioSplitButton({
  title,
  active,
  defaultIcon,
  activeIcon,
  onToggle,
  onOpenOptions,
  panel,
}: {
  title: string
  active: boolean
  defaultIcon: React.ReactNode
  activeIcon: React.ReactNode
  onToggle: () => void
  onOpenOptions: () => void
  panel?: React.ReactNode
}) {
  return (
    <div data-tooltip={title} data-tooltip-position="top" className="relative">
      <div
        className={`flex h-9 overflow-hidden rounded-xl border transition-colors ${
          active
            ? 'border-[var(--b1)] bg-[var(--s1)]'
            : 'border-transparent bg-[var(--s2)] hover:border-[var(--b1)]'
        }`}
      >
        <motion.button
          type="button"
          aria-pressed={active}
          onClick={onToggle}
          className={`flex h-9 w-9 items-center justify-center transition-colors ${
            active
              ? 'bg-[var(--s0)] text-[var(--t1)] hover:bg-[var(--s0)]'
              : 'text-[var(--t3)] hover:bg-[var(--surface-soft-hover)] hover:text-[var(--t1)]'
          }`}
          {...interactiveMotion}
        >
          {active ? activeIcon : defaultIcon}
        </motion.button>

        <motion.button
          type="button"
          aria-label="Open audio options"
          onClick={onOpenOptions}
          className={`flex h-9 w-5 items-center justify-center border-l transition-colors ${
            active
              ? 'border-[var(--b1)] bg-[var(--s0)] text-[var(--t1)] hover:bg-[var(--s0)]'
              : 'border-[var(--b1)] text-[var(--t3)] hover:bg-[var(--surface-soft-hover)] hover:text-[var(--t1)]'
          }`}
          {...interactiveMotion}
        >
          <ChevronDown size={12} />
        </motion.button>
      </div>
      {panel}
    </div>
  )
}

function PanelButton({ icon, title, active = false, onClick }: PanelButtonProps) {
  return (
    <motion.button
      data-tooltip={title}
      data-tooltip-position="top"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
        active
          ? 'border-[var(--ember)]/35 bg-[var(--ember-dim)] text-[var(--ember)]'
          : 'border-transparent bg-[var(--s2)] text-[var(--t2)] hover:border-[var(--b1)] hover:bg-[var(--s1)] hover:text-[var(--t0)]'
      }`}
      {...interactiveMotion}
    >
      {icon}
    </motion.button>
  )
}
