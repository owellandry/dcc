'use client'

import { useState } from 'react'
import type { IconType } from 'react-icons'
import {
  MdArrowDropDown,
  MdBlurOn,
  MdBlock,
  MdGames,
  MdImageSearch,
  MdOutlineOpenInNew,
  MdOutlineShield,
  MdVisibility,
} from 'react-icons/md'

type ContentSocialTab = 'content' | 'connected-games'
type SensitiveLevel = 'mostrar' | 'desenfocar' | 'bloquear'

type SensitiveOption = {
  value: SensitiveLevel
  label: string
  icon: IconType
}

const sensitiveOptions: SensitiveOption[] = [
  { value: 'mostrar', label: 'Mostrar', icon: MdVisibility },
  { value: 'desenfocar', label: 'Desenfocar', icon: MdBlurOn },
  { value: 'bloquear', label: 'Bloquear', icon: MdBlock },
]

function SelectRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: SensitiveLevel
  onChange: (next: SensitiveLevel) => void
}) {
  return (
    <div className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-4">
      <p className="text-sm font-700 text-[var(--t0)]">{label}</p>
      <div className="mt-3 relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as SensitiveLevel)}
          className="h-11 w-full appearance-none rounded-xl border border-[var(--b1)] bg-[var(--s0)] pl-10 pr-9 text-sm text-[var(--t1)] outline-none transition-colors focus:border-[var(--b2)]"
        >
          {sensitiveOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--t4)]">
          {value === 'mostrar' ? <MdVisibility size={16} /> : value === 'desenfocar' ? <MdBlurOn size={16} /> : <MdBlock size={16} />}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--t4)]">
          <MdArrowDropDown size={20} />
        </div>
      </div>
    </div>
  )
}

export function UserSettingsModalContentSocialSection() {
  const [activeTab, setActiveTab] = useState<ContentSocialTab>('content')
  const [friendsDmFilter, setFriendsDmFilter] = useState<SensitiveLevel>('mostrar')
  const [othersDmFilter, setOthersDmFilter] = useState<SensitiveLevel>('bloquear')
  const [graphicFilter, setGraphicFilter] = useState<SensitiveLevel>('desenfocar')
  const [dmSpamFilterEnabled, setDmSpamFilterEnabled] = useState(true)

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-2">
        <div className="inline-flex rounded-xl bg-[var(--s1)] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`rounded-lg px-4 py-2 text-sm font-700 transition-colors ${
              activeTab === 'content'
                ? 'bg-[#5865f2] text-white'
                : 'text-[var(--t3)] hover:bg-[var(--s0)] hover:text-[var(--t1)]'
            }`}
          >
            Contenido
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('connected-games')}
            className={`rounded-lg px-4 py-2 text-sm font-700 transition-colors ${
              activeTab === 'connected-games'
                ? 'bg-[#5865f2] text-white'
                : 'text-[var(--t3)] hover:bg-[var(--s0)] hover:text-[var(--t1)]'
            }`}
          >
            Juegos conectados
          </button>
        </div>
      </div>

      {activeTab === 'content' ? (
        <>
          <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
            <h2 className="text-2xl font-700 text-[var(--t0)]">Contenido</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--t3)]">
              Elige como quieres ver archivos multimedia detectados por los filtros de contenido sensible.
            </p>
            <p className="mt-3 inline-flex items-center gap-1 text-sm font-700 text-[#7aa0ff]">
              Mas informacion disponible proximamente
              <MdOutlineOpenInNew size={14} />
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
            <div className="flex items-center gap-2 text-sm font-700 uppercase tracking-[0.14em] text-[var(--t4)]">
              <MdImageSearch size={15} />
              Filtros de contenido delicado
            </div>
            <div className="mt-4 space-y-3">
              <SelectRow
                label="Mensajes directos de amigos"
                value={friendsDmFilter}
                onChange={setFriendsDmFilter}
              />
              <SelectRow
                label="Mensajes directos de otros usuarios"
                value={othersDmFilter}
                onChange={setOthersDmFilter}
              />
              <SelectRow
                label="Archivo grafico"
                value={graphicFilter}
                onChange={setGraphicFilter}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-700 text-[var(--t0)]">
                  <MdOutlineShield size={16} className="text-[var(--t4)]" />
                  Filtro de spam en mensajes directos
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--t3)]">
                  Envia mensajes potencialmente no deseados a una bandeja de spam separada.
                </p>
                <p className="mt-2 inline-flex items-center gap-1 text-sm font-700 text-[#7aa0ff]">
                  Guia de seguridad disponible proximamente
                  <MdOutlineOpenInNew size={14} />
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={dmSpamFilterEnabled}
                onClick={() => setDmSpamFilterEnabled((current) => !current)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
                  dmSpamFilterEnabled
                    ? 'border-[#5865f2]/70 bg-[#5865f2]'
                    : 'border-[rgba(151,151,159,0.2)] bg-black/20'
                }`}
              >
                <span
                  className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white transition-all ${
                    dmSpamFilterEnabled ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s2)] p-5">
          <div className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-4">
            <p className="flex items-center gap-2 text-sm font-700 text-[var(--t0)]">
              <MdGames size={16} className="text-[var(--t4)]" />
              Juegos conectados
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--t3)]">
              Aqui podras configurar visibilidad, actividad y permisos de tus juegos conectados.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
