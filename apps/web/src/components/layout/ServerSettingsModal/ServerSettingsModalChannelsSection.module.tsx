'use client'

import { Folder, Hash, Plus, Save, Shield, Trash2, Volume2 } from 'lucide-react'
import {
  CHANNEL_FONT_OPTIONS,
  CHANNEL_FONT_WEIGHT_OPTIONS,
  getChannelNameTextStyle,
} from '@/lib/channel-appearance/channelAppearance.shared'
import { cn } from '@/lib/cn'
import type { Category, Channel, PermissionOverwrite, Role, ServerMember } from '@/lib/types'
import { CHANNEL_ICON_OPTIONS } from '@/lib/channel-icons/channelIcons.shared'
import { Field, SettingBlock } from '@/components/user/UserSettingsParts'
import { EmptyState, OverwriteEditor, ServerSettingsContentShell } from './ServerSettingsModal.shared'

interface ServerSettingsModalChannelsSectionProps {
  sortedCategories: Category[]
  sortedChannels: Channel[]
  sortedRoles: Role[]
  sortedMembers: ServerMember[]
  selectedCategory: Category | null
  selectedChannel: Channel | null
  canManageChannels: boolean
  canManageRoles: boolean
  sectionBusy: boolean
  createCategoryName: string
  createChannelName: string
  createChannelType: 'text' | 'voice' | 'announcement'
  createChannelCategoryId: string | null
  categoryNameDraft: string
  channelNameDraft: string
  channelTopicDraft: string
  channelCategoryDraft: string | null
  channelIconDraft: string
  channelFontKeyDraft: string
  channelFontWeightDraft: number
  overwriteDrafts: PermissionOverwrite[]
  onSelectionChange: (selection: { kind: 'category' | 'channel'; id: string } | null) => void
  onCreateCategoryNameChange: (value: string) => void
  onCreateChannelNameChange: (value: string) => void
  onCreateChannelTypeChange: (value: 'text' | 'voice' | 'announcement') => void
  onCreateChannelCategoryIdChange: (value: string | null) => void
  onCategoryNameDraftChange: (value: string) => void
  onChannelNameDraftChange: (value: string) => void
  onChannelTopicDraftChange: (value: string) => void
  onChannelCategoryDraftChange: (value: string | null) => void
  onChannelIconDraftChange: (value: string) => void
  onChannelFontKeyDraftChange: (value: string) => void
  onChannelFontWeightDraftChange: (value: number) => void
  onOverwriteDraftsChange: (value: PermissionOverwrite[]) => void
  onCreateCategory: () => void
  onCreateChannel: () => void
  onSaveCategory: () => void
  onDeleteCategory: () => void
  onSaveChannel: () => void
  onDeleteChannel: () => void
  onSaveOverwrites: () => void
}

export function ServerSettingsModalChannelsSection({
  sortedCategories,
  sortedChannels,
  sortedRoles,
  sortedMembers,
  selectedCategory,
  selectedChannel,
  canManageChannels,
  canManageRoles,
  sectionBusy,
  createCategoryName,
  createChannelName,
  createChannelType,
  createChannelCategoryId,
  categoryNameDraft,
  channelNameDraft,
  channelTopicDraft,
  channelCategoryDraft,
  channelIconDraft,
  channelFontKeyDraft,
  channelFontWeightDraft,
  overwriteDrafts,
  onSelectionChange,
  onCreateCategoryNameChange,
  onCreateChannelNameChange,
  onCreateChannelTypeChange,
  onCreateChannelCategoryIdChange,
  onCategoryNameDraftChange,
  onChannelNameDraftChange,
  onChannelTopicDraftChange,
  onChannelCategoryDraftChange,
  onChannelIconDraftChange,
  onChannelFontKeyDraftChange,
  onChannelFontWeightDraftChange,
  onOverwriteDraftsChange,
  onCreateCategory,
  onCreateChannel,
  onSaveCategory,
  onDeleteCategory,
  onSaveChannel,
  onDeleteChannel,
  onSaveOverwrites,
}: ServerSettingsModalChannelsSectionProps) {
  return (
    <ServerSettingsContentShell>
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SettingBlock icon={<Folder size={16} />} title="Estructura" description="Categorias y canales del servidor.">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={createCategoryName}
                onChange={(event) => onCreateCategoryNameChange(event.target.value)}
                className="h-10 flex-1 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
                placeholder="Nueva categoria"
              />
              <button
                type="button"
                onClick={onCreateCategory}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--t1)]"
                disabled={!canManageChannels || sectionBusy}
              >
                <Plus size={15} />
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={createChannelName}
                onChange={(event) => onCreateChannelNameChange(event.target.value)}
                className="h-10 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
                placeholder="nuevo-canal"
              />
              <select
                value={createChannelType}
                onChange={(event) => onCreateChannelTypeChange(event.target.value as 'text' | 'voice' | 'announcement')}
                className="h-10 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
              >
                <option value="text">Texto</option>
                <option value="voice">Voz</option>
                <option value="announcement">Anuncio</option>
              </select>
              <select
                value={createChannelCategoryId ?? ''}
                onChange={(event) => onCreateChannelCategoryIdChange(event.target.value || null)}
                className="h-10 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
              >
                <option value="">Sin categoria</option>
                {sortedCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onCreateChannel}
              className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)]"
              disabled={!canManageChannels || sectionBusy}
            >
              <Plus size={14} />
              Crear canal
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {sortedCategories.map((category) => (
              <div key={category.id} className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-3">
                <button
                  type="button"
                  onClick={() => onSelectionChange({ kind: 'category', id: category.id })}
                  className="w-full text-left text-sm font-700 text-[var(--t0)]"
                >
                  {category.name}
                </button>
                <div className="mt-2 space-y-1">
                  {sortedChannels.filter((channel) => channel.categoryId === category.id).map((channel) => (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => onSelectionChange({ kind: 'channel', id: channel.id })}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--t2)] hover:bg-[var(--surface-soft)]"
                    >
                      <StructureChannelIcon channel={channel} />
                      <span className="truncate">{channel.name ?? 'canal'}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SettingBlock>

        <div className="space-y-6">
          {selectedCategory ? (
            <SettingBlock icon={<Folder size={16} />} title="Editar categoria" description="Nombre y overwrites de la categoria.">
              <Field label="Nombre">
                <input
                  value={categoryNameDraft}
                  onChange={(event) => onCategoryNameDraftChange(event.target.value)}
                  className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onSaveCategory}
                  className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)]"
                  disabled={sectionBusy}
                >
                  <Save size={14} />
                  Guardar categoria
                </button>
                <button
                  type="button"
                  onClick={onDeleteCategory}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-4 py-2 text-sm font-700 text-[var(--dnd)]"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              </div>
            </SettingBlock>
          ) : null}

          {selectedChannel ? (
            <SettingBlock icon={<Hash size={16} />} title="Editar canal" description="Nombre, descripcion, categoria, icono y estilo visual.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre">
                  <input
                    value={channelNameDraft}
                    onChange={(event) => onChannelNameDraftChange(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
                  />
                </Field>
                <Field label="Categoria">
                  <select
                    value={channelCategoryDraft ?? ''}
                    onChange={(event) => onChannelCategoryDraftChange(event.target.value || null)}
                    className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
                  >
                    <option value="">Sin categoria</option>
                    {sortedCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Descripcion">
                <textarea
                  value={channelTopicDraft}
                  onChange={(event) => onChannelTopicDraftChange(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 py-2.5 text-sm text-[var(--t1)] outline-none"
                />
              </Field>
              <Field label="Icono">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                  {CHANNEL_ICON_OPTIONS.map((option) => {
                    const Icon = option.icon

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => onChannelIconDraftChange(option.key)}
                        className={cn(
                          'group flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center transition-all',
                          channelIconDraft === option.key
                            ? 'border-[var(--ember)] bg-[var(--ember-dim)] text-[var(--t0)]'
                            : 'border-[var(--b1)] bg-[var(--s2)] text-[var(--t3)] hover:border-[var(--b2)] hover:bg-[var(--surface-soft)] hover:text-[var(--t1)]'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                            channelIconDraft === option.key
                              ? 'bg-[var(--ember)] text-[var(--ember-contrast)]'
                              : 'bg-[var(--s1)] text-[var(--t2)] group-hover:text-[var(--t1)]'
                          )}
                        >
                          <Icon size={18} />
                        </span>
                        <span className="line-clamp-2 text-[11px] font-700 leading-tight">
                          {option.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tipografia">
                  <select
                    value={channelFontKeyDraft}
                    onChange={(event) => onChannelFontKeyDraftChange(event.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
                  >
                    {CHANNEL_FONT_OPTIONS.map((option) => (
                      <option key={option.key} value={option.key}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Peso">
                  <select
                    value={String(channelFontWeightDraft)}
                    onChange={(event) => onChannelFontWeightDraftChange(Number(event.target.value))}
                    className="h-11 w-full rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-3 text-sm text-[var(--t1)] outline-none"
                  >
                    {CHANNEL_FONT_WEIGHT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Vista previa">
                <div className="rounded-2xl border border-[var(--b1)] bg-[var(--s1)] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--t4)]">Canal</p>
                  <p
                    className="mt-2 truncate text-lg text-[var(--t0)]"
                    style={getChannelNameTextStyle({
                      fontKey: channelFontKeyDraft,
                      fontWeight: channelFontWeightDraft,
                    })}
                  >
                    #{channelNameDraft || selectedChannel?.name || 'canal-personalizado'}
                  </p>
                </div>
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onSaveChannel}
                  className="inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)]"
                  disabled={sectionBusy}
                >
                  <Save size={14} />
                  Guardar canal
                </button>
                <button
                  type="button"
                  onClick={onDeleteChannel}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--b1)] bg-[var(--s2)] px-4 py-2 text-sm font-700 text-[var(--dnd)]"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              </div>
            </SettingBlock>
          ) : null}

          {selectedCategory || selectedChannel ? (
            <SettingBlock icon={<Shield size={16} />} title="Overwrites" description="Permisos por rol o miembro para este elemento.">
              <OverwriteEditor
                overwrites={overwriteDrafts}
                roles={sortedRoles}
                members={sortedMembers}
                onChange={onOverwriteDraftsChange}
              />
              <button
                type="button"
                onClick={onSaveOverwrites}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ember px-4 py-2 text-sm font-700 text-[var(--ember-contrast)]"
                disabled={!canManageRoles || sectionBusy}
              >
                <Save size={14} />
                Guardar overwrites
              </button>
            </SettingBlock>
          ) : (
            <EmptyState
              title="Selecciona una categoria o canal"
              description="Aqui puedes ajustar la estructura y los permisos del elemento seleccionado."
            />
          )}
        </div>
      </div>
    </ServerSettingsContentShell>
  )
}

function StructureChannelIcon({ channel }: { channel: Channel }) {
  const matchedOption = CHANNEL_ICON_OPTIONS.find((option) => option.key === channel.iconKey)
  const Icon = matchedOption?.icon ?? (channel.type === 'voice' ? Volume2 : Hash)

  return <Icon size={14} />
}
