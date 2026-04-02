'use client'

import { AlertTriangle, X } from 'lucide-react'
import { AppModalShell } from '@/components/ui/AppModalShell.main'

interface Props {
  open: boolean
  url: string | null
  onCancel: () => void
  onContinue: () => void
}

export function ExternalNavigationModal({ open, url, onCancel, onContinue }: Props) {
  return (
    <AppModalShell
      open={open}
      onClose={onCancel}
      panelClassName="flex h-[min(92vh,680px)] w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--b1)] bg-[var(--s3)] shadow-[var(--panel-shadow)]"
      overlayClassName="z-[160]"
    >
      <div className="hidden w-[320px] shrink-0 border-r border-[var(--b1)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--ember)_12%,var(--s1)_88%),var(--s1))] p-6 lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
            <AlertTriangle size={20} />
          </span>
          <div>
            <p className="font-display font-700 text-[18px] text-[var(--t0)]">Navegacion externa</p>
            <p className="text-sm text-[var(--t3)]">Confirmacion de seguridad</p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="bg-[var(--s0)]/50 rounded-2xl border border-[var(--b1)] p-4">
            <p className="font-700 text-xs uppercase tracking-[0.18em] text-[var(--t3)]">
              Importante
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--t2)]">
              Estas a punto de abrir un enlace fuera de la app. Revisa el dominio antes de
              continuar.
            </p>
          </div>

          <div className="bg-[var(--s0)]/40 rounded-2xl border border-[var(--b1)] p-4">
            <p className="font-700 text-xs uppercase tracking-[0.18em] text-[var(--t3)]">Consejo</p>
            <p className="mt-2 text-sm leading-6 text-[var(--t2)]">
              Si no reconoces la direccion o no esperabas este enlace, cancela la accion.
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-[var(--b1)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 lg:hidden">
              <AlertTriangle size={18} />
            </span>
            <div>
              <p className="font-display font-700 text-[18px] text-[var(--t0)]">
                Vas a salir de la app
              </p>
              <p className="mt-1 text-sm text-[var(--t3)]">
                Confirma antes de abrir el enlace externo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--t3)] transition-colors hover:bg-[var(--s2)] hover:text-[var(--t1)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="scrollable flex-1 p-5 sm:p-6">
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-center">
            <div className="rounded-[28px] border border-[var(--b1)] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--s2)_92%,white_8%),var(--s1))] p-6 sm:p-8">
              <p className="font-700 text-xs uppercase tracking-[0.22em] text-[var(--t3)]">
                Enlace externo
              </p>
              <h2 className="font-display font-800 mt-3 text-3xl tracking-tight text-[var(--t0)] sm:text-4xl">
                Revisa este destino antes de continuar
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--t2)] sm:text-[15px]">
                Por seguridad, DCC te avisa cuando un enlace intenta abrir una pagina fuera de la
                aplicacion. Si confias en el sitio, puedes continuar.
              </p>

              {url && (
                <div className="mt-6 rounded-2xl border border-[var(--b1)] bg-[var(--s0)] px-4 py-4">
                  <p className="font-700 mb-2 text-xs uppercase tracking-[0.18em] text-[var(--t3)]">
                    Destino
                  </p>
                  <p className="break-all text-sm leading-6 text-[var(--t1)]">{url}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[var(--b1)] px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            className="font-600 rounded-xl border border-[var(--b1)] px-4 py-2.5 text-sm text-[var(--t2)] transition-colors hover:border-[var(--b2)] hover:bg-[var(--s2)] hover:text-[var(--t1)]"
          >
            Quedarme aqui
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="font-700 rounded-xl bg-amber-500 px-4 py-2.5 text-sm text-[#1f1400] transition-colors hover:bg-amber-400"
          >
            Continuar al enlace
          </button>
        </div>
      </div>
    </AppModalShell>
  )
}
