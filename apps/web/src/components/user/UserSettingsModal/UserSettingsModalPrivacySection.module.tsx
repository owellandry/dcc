'use client'

import { Copy, KeyRound, LoaderCircle, Shield, ShieldCheck, Smartphone } from 'lucide-react'
import type { User } from '@/lib/types'
import { Field, SettingBlock } from '../UserSettingsParts'

export type TwoFactorSetupState = null | {
  secret: string
  otpauthUrl: string
  qrCodeDataUrl: string
  accountName: string
  issuer: string
}

interface UserSettingsModalPrivacySectionProps {
  user: User
  currentPassword: string
  newPassword: string
  twoFactorPassword: string
  twoFactorCode: string
  disableTwoFactorCode: string
  twoFactorSetup: TwoFactorSetupState
  backupCodes: string[]
  didCopyBackupCodes: boolean
  isPreparingTwoFactor: boolean
  isEnablingTwoFactor: boolean
  isDisablingTwoFactor: boolean
  onCurrentPasswordChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onTwoFactorPasswordChange: (value: string) => void
  onTwoFactorCodeChange: (value: string) => void
  onDisableTwoFactorCodeChange: (value: string) => void
  onPrepareTwoFactor: () => void
  onEnableTwoFactor: () => void
  onDisableTwoFactor: () => void
  onCopyBackupCodes: () => void
}

export function UserSettingsModalPrivacySection({
  user,
  currentPassword,
  newPassword,
  twoFactorPassword,
  twoFactorCode,
  disableTwoFactorCode,
  twoFactorSetup,
  backupCodes,
  didCopyBackupCodes,
  isPreparingTwoFactor,
  isEnablingTwoFactor,
  isDisablingTwoFactor,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onTwoFactorPasswordChange,
  onTwoFactorCodeChange,
  onDisableTwoFactorCodeChange,
  onPrepareTwoFactor,
  onEnableTwoFactor,
  onDisableTwoFactor,
  onCopyBackupCodes,
}: UserSettingsModalPrivacySectionProps) {
  return (
    <SettingBlock
      icon={<Shield size={16} />}
      title="Seguridad"
      description="Protege tu cuenta con contrasena y autenticacion en dos pasos."
    >
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s1)] p-4">
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--ember), transparent)' }} />
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--b1)] bg-[var(--s2)] px-3 py-1 text-[11px] font-700 uppercase tracking-[0.14em] text-[var(--t3)]">
            <KeyRound size={13} />
            Contrasena
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Contrasena actual">
              <input
                value={currentPassword}
                onChange={(event) => onCurrentPasswordChange(event.target.value)}
                className="input-base h-11 rounded-xl bg-[var(--s2)] px-3 text-sm"
                type="password"
                autoComplete="current-password"
              />
            </Field>
            <Field label="Nueva contrasena">
              <input
                value={newPassword}
                onChange={(event) => onNewPasswordChange(event.target.value)}
                className="input-base h-11 rounded-xl bg-[var(--s2)] px-3 text-sm"
                type="password"
                autoComplete="new-password"
              />
            </Field>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[var(--b1)] bg-[var(--s1)] p-5">
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--ember), transparent)' }} />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--b1)] bg-[var(--s2)] px-3 py-1 text-xs font-700 uppercase tracking-[0.14em] text-[var(--t3)]">
                <ShieldCheck size={14} />
                2FA
              </div>
              <h3 className="mt-3 text-base font-700 text-[var(--t0)]">
                Autenticacion en dos factores
              </h3>
              <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--t3)]">
                Usa una app como Google Authenticator, 1Password o Authy para pedir un codigo extra al iniciar sesion.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!user.twoFactorEnabled && !twoFactorSetup) {
                  onPrepareTwoFactor()
                }
              }}
              className={`self-start rounded-full border px-3 py-1 text-xs font-700 transition-opacity disabled:cursor-default ${
                user.twoFactorEnabled
                  ? 'border-[var(--online)]/30 bg-[var(--online)]/15 text-[var(--online)]'
                  : 'border-[var(--b1)] bg-white/6 text-[var(--t3)]'
              }`}
              disabled={user.twoFactorEnabled || Boolean(twoFactorSetup) || isPreparingTwoFactor}
            >
              {user.twoFactorEnabled ? 'Activo' : 'Desactivado'}
            </button>
          </div>

          <div className="mt-5 grid gap-4 border-t border-[var(--b1)] pt-5 lg:grid-cols-[1fr_0.92fr]">
            <div className="space-y-4">
              <Field label="Confirmar con tu contrasena">
                <div className="relative">
                  <KeyRound size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t4)]" />
                  <input
                    value={twoFactorPassword}
                    onChange={(event) => onTwoFactorPasswordChange(event.target.value)}
                    className="input-base h-11 rounded-xl bg-[var(--s2)] pl-10 pr-3 text-sm"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Necesaria para cuentas con password"
                  />
                </div>
                <p className="mt-1 text-[11px] text-[var(--t4)]">
                  Si tu cuenta viene de OAuth y no tiene password local, puedes dejar este campo vacio.
                </p>
              </Field>

              {!user.twoFactorEnabled && !twoFactorSetup && (
                <button
                  type="button"
                  onClick={onPrepareTwoFactor}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-700 text-white shadow-glow-ember transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))' }}
                  disabled={isPreparingTwoFactor}
                >
                  {isPreparingTwoFactor ? <LoaderCircle size={14} className="animate-spin" /> : <Smartphone size={16} />}
                  Preparar 2FA
                </button>
              )}

              {user.twoFactorEnabled && (
                <>
                  <Field label="Codigo actual o backup code">
                    <input
                      value={disableTwoFactorCode}
                      onChange={(event) => onDisableTwoFactorCodeChange(event.target.value)}
                      className="input-base h-11 rounded-xl bg-[var(--s2)] px-3 text-sm"
                      placeholder="123456 o XXXX-XXXX"
                      autoComplete="one-time-code"
                    />
                  </Field>

                  <button
                    type="button"
                    onClick={onDisableTwoFactor}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--dnd)]/10 px-4 py-2.5 text-sm font-700 text-[var(--dnd)] transition-colors hover:bg-[var(--dnd)]/15 disabled:opacity-60"
                    disabled={isDisablingTwoFactor}
                  >
                    {isDisablingTwoFactor ? <LoaderCircle size={14} className="animate-spin" /> : <Shield size={16} />}
                    Desactivar 2FA
                  </button>
                </>
              )}
            </div>

            <div className="space-y-4">
              {twoFactorSetup ? (
                <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-4">
                  <p className="text-xs font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Paso 1</p>
                  <p className="mt-2 text-sm text-[var(--t2)]">
                    Escanea este QR con tu app autenticadora.
                  </p>
                  <div className="mt-4 flex items-center justify-center rounded-2xl bg-white p-4">
                    <img
                      src={twoFactorSetup.qrCodeDataUrl}
                      alt="Codigo QR para autenticacion en dos factores"
                      className="h-44 w-44 rounded-xl object-contain"
                    />
                  </div>
                  <div className="mt-4 rounded-xl border border-[var(--b1)] bg-[var(--s0)] px-3 py-3">
                    <p className="text-[11px] font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Clave manual</p>
                    <p className="mt-2 break-all font-mono text-sm text-[var(--t1)]">{twoFactorSetup.secret}</p>
                  </div>

                  <div className="mt-4">
                    <Field label="Paso 2: confirma el codigo">
                      <input
                        value={twoFactorCode}
                        onChange={(event) => onTwoFactorCodeChange(event.target.value)}
                        className="input-base h-11 rounded-xl bg-[var(--s0)] px-3 text-sm"
                        placeholder="123456"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                      />
                    </Field>
                  </div>

                  <button
                    type="button"
                    onClick={onEnableTwoFactor}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-700 text-white shadow-glow-ember transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, var(--ember), var(--ember-hover))' }}
                    disabled={isEnablingTwoFactor}
                  >
                    {isEnablingTwoFactor ? <LoaderCircle size={14} className="animate-spin" /> : <ShieldCheck size={16} />}
                    Activar 2FA
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-4">
                  <p className="text-xs font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Estado</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--t2)]">
                    {user.twoFactorEnabled
                      ? 'Tu cuenta ya exige un codigo adicional al iniciar sesion.'
                      : 'Todavia no hay una segunda capa de seguridad activa en esta cuenta.'}
                  </p>
                </div>
              )}

              {backupCodes.length > 0 && (
                <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-700 uppercase tracking-[0.16em] text-[var(--t4)]">Backup codes</p>
                      <p className="mt-2 text-sm text-[var(--t2)]">
                        Guardalos ahora. Cada codigo sirve una sola vez.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onCopyBackupCodes}
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s0)] px-3 py-2 text-sm font-700 text-[var(--t2)] transition-colors hover:text-[var(--t0)]"
                    >
                      <Copy size={14} />
                      {didCopyBackupCodes ? 'Copiados' : 'Copiar'}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {backupCodes.map((code) => (
                      <div key={code} className="rounded-xl border border-[var(--b1)] bg-[var(--s0)] px-3 py-2 font-mono text-sm text-[var(--t1)]">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SettingBlock>
  )
}
