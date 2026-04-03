'use client'

import { useState, type DragEvent } from 'react'
import { Folder, Hash, Plus, Save, Shield, Trash2, Volume2 } from 'lucide-react'
import {
  CHANNEL_FONT_OPTIONS,
  CHANNEL_FONT_WEIGHT_OPTIONS,
  getChannelNameTextStyle,
} from '@/lib/channel-appearance/channelAppearance.shared'
import { cn } from '@/lib/cn'
import type { Category, Channel, PermissionOverwrite, Role, ServerMember } from '@/lib/types'
import { CHANNEL_ICON_OPTIONS } from '@/lib/channel-icons/channelIcons.shared'
import { ServerStructureDragHandle } from '@/components/layout/ServerStructureDragHandle'
import { Field, SettingBlock } from '@/components/user/UserSettingsParts'
import { EmptyState, OverwriteEditor, ServerSettingsContentShell } from './ServerSettingsModal.shared'

type StructureModalDropTarget =
  | { kind: 'channel'; channelId: string; placement: 'before' | 'after' }
  | { kind: 'channel-list'; categoryId: string | null }
  | { kind: 'category'; categoryId: string; placement: 'before' | 'after' }

type StructureModalDragItem =
  | { kind: 'channel'; id: string }
  | { kind: 'category'; id: string }

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
  isReorderingStructure: boolean
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
  onMoveChannel: (
    draggedChannelId: string,
    target:
      | { kind: 'channel'; channelId: string; placement: 'before' | 'after' }
      | { kind: 'category'; categoryId: string | null }
  ) => void
  onMoveCategory: (
    draggedCategoryId: string,
    target: { categoryId: string; placement: 'before' | 'after' }
  ) => void
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
  isReorderingStructure,
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
  onMoveChannel,
  onMoveCategory,
  onCreateCategory,
  onCreateChannel,
  onSaveCategory,
  onDeleteCategory,
  onSaveChannel,
  onDeleteChannel,
  onSaveOverwrites,
}: ServerSettingsModalChannelsSectionProps) {
  const [dragItem, setDragItem] = useState<StructureModalDragItem | null>(null)
  const [dropTarget, setDropTarget] = useState<StructureModalDropTarget | null>(null)
  const uncategorizedChannels = sortedChannels.filter((channel) => channel.categoryId === null)

  const clearDragState = () => {
    setDragItem(null)
    setDropTarget(null)
  }

  const handleChannelDragStart = (event: DragEvent<HTMLButtonElement>, channelId: string) => {
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', channelId)
    setDragItem({ kind: 'channel', id: channelId })
    setDropTarget(null)
  }

  const handleCategoryDragStart = (event: DragEvent<HTMLButtonElement>, categoryId: string) => {
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', categoryId)
    setDragItem({ kind: 'category', id: categoryId })
    setDropTarget(null)
  }

  return (
    <ServerSettingsContentShell>
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SettingBlock icon={<Folder size={16} />} title="Estructura" description="Categorias y canales del servidor.">
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={createCategoryName}
                onChange={(event) => onCreateCategoryNameChange(event.target.value)}
                className="input-base h-10 flex-1 rounded-xl bg-[var(--s2)] px-3 text-sm"
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
                className="input-base h-10 rounded-xl bg-[var(--s2)] px-3 text-sm"
                placeholder="nuevo-canal"
              />
              <select
                value={createChannelType}
                onChange={(event) => onCreateChannelTypeChange(event.target.value as 'text' | 'voice' | 'announcement')}
                className="input-base h-10 rounded-xl bg-[var(--s2)] px-3 text-sm"
              >
                <option value="text">Texto</option>
                <option value="voice">Voz</option>
                <option value="announcement">Anuncio</option>
              </select>
              <select
                value={createChannelCategoryId ?? ''}
                onChange={(event) => onCreateChannelCategoryIdChange(event.target.value || null)}
                className="input-base h-10 rounded-xl bg-[var(--s2)] px-3 text-sm"
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
            {canManageChannels && dragItem?.kind === 'channel' ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault()
                  setDropTarget({ kind: 'channel-list', categoryId: null })
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  if (dragItem.kind !== 'channel') return
                  onMoveChannel(dragItem.id, { kind: 'category', categoryId: null })
                  clearDragState()
                }}
                className={cn(
                  'rounded-xl border border-dashed px-3 py-3 text-center text-[11px] font-700 uppercase tracking-[0.12em] transition-colors',
                  dropTarget?.kind === 'channel-list' && dropTarget.categoryId === null
                    ? 'border-[var(--ember)] bg-[var(--ember)]/10 text-[var(--ember)]'
                    : 'border-[var(--b1)] bg-[var(--s2)] text-[var(--t4)]'
                )}
              >
                Soltar aqui para dejarlo sin categoria
              </div>
            ) : null}

            {uncategorizedChannels.length > 0 ? (
              <div className="rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-3">
                <p className="text-[11px] font-700 uppercase tracking-[0.12em] text-[var(--t4)]">
                  Sin categoria
                </p>
                <div className="mt-2 space-y-1">
                  {uncategorizedChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className={cn(
                        'rounded-lg transition-opacity',
                        dragItem?.kind === 'channel' && dragItem.id === channel.id ? 'opacity-40' : '',
                        dropTarget?.kind === 'channel' &&
                          dropTarget.channelId === channel.id &&
                          dropTarget.placement === 'before'
                          ? 'border-t-2 border-[var(--ember)] pt-1'
                          : '',
                        dropTarget?.kind === 'channel' &&
                          dropTarget.channelId === channel.id &&
                          dropTarget.placement === 'after'
                          ? 'border-b-2 border-[var(--ember)] pb-1'
                          : ''
                      )}
                      onDragOver={(event) => {
                        if (dragItem?.kind !== 'channel') return
                        event.preventDefault()
                        setDropTarget({
                          kind: 'channel',
                          channelId: channel.id,
                          placement: getDropPlacement(event),
                        })
                      }}
                      onDrop={(event) => {
                        if (dragItem?.kind !== 'channel') return
                        event.preventDefault()
                        onMoveChannel(dragItem.id, {
                          kind: 'channel',
                          channelId: channel.id,
                          placement: getDropPlacement(event),
                        })
                        clearDragState()
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {canManageChannels ? (
                          <ServerStructureDragHandle
                            label={`Arrastrar canal ${channel.name ?? 'canal'}`}
                            disabled={isReorderingStructure || sectionBusy}
                            className={cn(
                              'h-7 w-7',
                              dragItem?.kind === 'channel' && dragItem.id === channel.id
                                ? 'bg-[var(--ember)]/12 text-[var(--ember)]'
                                : ''
                            )}
                            onDragStart={(event) => handleChannelDragStart(event, channel.id)}
                            onDragEnd={clearDragState}
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onSelectionChange({ kind: 'channel', id: channel.id })}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--t2)] hover:bg-[var(--surface-soft)]"
                        >
                          <StructureChannelIcon channel={channel} />
                          <span className="truncate">{channel.name ?? 'canal'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {sortedCategories.map((category) => (
              <div
                key={category.id}
                className={cn(
                  'rounded-xl border border-[var(--b1)] bg-[var(--s1)] p-3 transition-colors',
                  dropTarget?.kind === 'channel-list' && dropTarget.categoryId === category.id
                    ? 'border-[var(--ember)] bg-[var(--ember)]/6'
                    : '',
                  dropTarget?.kind === 'category' && dropTarget.categoryId === category.id
                    ? 'ring-1 ring-[var(--ember)]/50'
                    : ''
                )}
              >
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-lg',
                    dropTarget?.kind === 'category' &&
                      dropTarget.categoryId === category.id &&
                      dropTarget.placement === 'before'
                      ? 'before:absolute before:-mt-3 before:h-0.5 before:w-[calc(100%-24px)] before:rounded-full before:bg-[var(--ember)]'
                      : '',
                    dropTarget?.kind === 'category' &&
                      dropTarget.categoryId === category.id &&
                      dropTarget.placement === 'after'
                      ? 'after:absolute after:mt-10 after:h-0.5 after:w-[calc(100%-24px)] after:rounded-full after:bg-[var(--ember)]'
                      : ''
                  )}
                >
                  {canManageChannels ? (
                    <ServerStructureDragHandle
                      label={`Arrastrar categoria ${category.name}`}
                      disabled={isReorderingStructure || sectionBusy}
                      className={cn(
                        'h-8 w-8',
                        dragItem?.kind === 'category' && dragItem.id === category.id
                          ? 'bg-[var(--ember)]/12 text-[var(--ember)]'
                          : ''
                      )}
                      onDragStart={(event) => handleCategoryDragStart(event, category.id)}
                      onDragEnd={clearDragState}
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onSelectionChange({ kind: 'category', id: category.id })}
                    onDragOver={(event) => {
                      if (!dragItem) return
                      event.preventDefault()
                      if (dragItem.kind === 'channel') {
                        setDropTarget({ kind: 'channel-list', categoryId: category.id })
                        return
                      }
                      setDropTarget({
                        kind: 'category',
                        categoryId: category.id,
                        placement: getDropPlacement(event),
                      })
                    }}
                    onDrop={(event) => {
                      if (!dragItem) return
                      event.preventDefault()
                      if (dragItem.kind === 'channel') {
                        onMoveChannel(dragItem.id, { kind: 'category', categoryId: category.id })
                      } else {
                        onMoveCategory(dragItem.id, {
                          categoryId: category.id,
                          placement: getDropPlacement(event),
                        })
                      }
                      clearDragState()
                    }}
                    className="w-full text-left text-sm font-700 text-[var(--t0)]"
                  >
                    {category.name}
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  {sortedChannels.filter((channel) => channel.categoryId === category.id).map((channel) => (
                    <div
                      key={channel.id}
                      className={cn(
                        'rounded-lg transition-opacity',
                        dragItem?.kind === 'channel' && dragItem.id === channel.id ? 'opacity-40' : '',
                        dropTarget?.kind === 'channel' &&
                          dropTarget.channelId === channel.id &&
                          dropTarget.placement === 'before'
                          ? 'border-t-2 border-[var(--ember)] pt-1'
                          : '',
                        dropTarget?.kind === 'channel' &&
                          dropTarget.channelId === channel.id &&
                          dropTarget.placement === 'after'
                          ? 'border-b-2 border-[var(--ember)] pb-1'
                          : ''
                      )}
                      onDragOver={(event) => {
                        if (dragItem?.kind !== 'channel') return
                        event.preventDefault()
                        setDropTarget({
                          kind: 'channel',
                          channelId: channel.id,
                          placement: getDropPlacement(event),
                        })
                      }}
                      onDrop={(event) => {
                        if (dragItem?.kind !== 'channel') return
                        event.preventDefault()
                        onMoveChannel(dragItem.id, {
                          kind: 'channel',
                          channelId: channel.id,
                          placement: getDropPlacement(event),
                        })
                        clearDragState()
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {canManageChannels ? (
                          <ServerStructureDragHandle
                            label={`Arrastrar canal ${channel.name ?? 'canal'}`}
                            disabled={isReorderingStructure || sectionBusy}
                            className={cn(
                              'h-7 w-7',
                              dragItem?.kind === 'channel' && dragItem.id === channel.id
                                ? 'bg-[var(--ember)]/12 text-[var(--ember)]'
                                : ''
                            )}
                            onDragStart={(event) => handleChannelDragStart(event, channel.id)}
                            onDragEnd={clearDragState}
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onSelectionChange({ kind: 'channel', id: channel.id })}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--t2)] hover:bg-[var(--surface-soft)]"
                        >
                          <StructureChannelIcon channel={channel} />
                          <span className="truncate">{channel.name ?? 'canal'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {dragItem?.kind === 'channel' &&
                  sortedChannels.every((channel) => channel.categoryId !== category.id) ? (
                    <div
                      onDragOver={(event) => {
                        event.preventDefault()
                        setDropTarget({ kind: 'channel-list', categoryId: category.id })
                      }}
                      onDrop={(event) => {
                        event.preventDefault()
                        if (dragItem.kind !== 'channel') return
                        onMoveChannel(dragItem.id, { kind: 'category', categoryId: category.id })
                        clearDragState()
                      }}
                      className={cn(
                        'rounded-lg border border-dashed px-3 py-2 text-center text-[11px] font-700 uppercase tracking-[0.12em] transition-colors',
                        dropTarget?.kind === 'channel-list' && dropTarget.categoryId === category.id
                          ? 'border-[var(--ember)] bg-[var(--ember)]/10 text-[var(--ember)]'
                          : 'border-[var(--b1)] bg-[var(--s2)] text-[var(--t4)]'
                      )}
                    >
                      Soltar canal aqui
                    </div>
                  ) : null}
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
                  className="input-base h-11 rounded-xl bg-[var(--s2)] px-3 text-sm"
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
                    className="input-base h-11 rounded-xl bg-[var(--s2)] px-3 text-sm"
                  />
                </Field>
                <Field label="Categoria">
                  <select
                    value={channelCategoryDraft ?? ''}
                    onChange={(event) => onChannelCategoryDraftChange(event.target.value || null)}
                    className="input-base h-11 rounded-xl bg-[var(--s2)] px-3 text-sm"
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
                  className="input-base min-h-[112px] resize-y rounded-xl bg-[var(--s2)] px-3 py-2.5 text-sm"
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
                          'group/channel-icon flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-center transition-all',
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
                              : 'bg-[var(--s1)] text-[var(--t2)] group-hover/channel-icon:text-[var(--t1)]'
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
                    className="input-base h-11 rounded-xl bg-[var(--s2)] px-3 text-sm"
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
                    className="input-base h-11 rounded-xl bg-[var(--s2)] px-3 text-sm"
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

function getDropPlacement(event: DragEvent<HTMLElement>) {
  const bounds = event.currentTarget.getBoundingClientRect()
  return event.clientY <= bounds.top + bounds.height / 2 ? 'before' : 'after'
}

function StructureChannelIcon({ channel }: { channel: Channel }) {
  const matchedOption = CHANNEL_ICON_OPTIONS.find((option) => option.key === channel.iconKey)
  const Icon = matchedOption?.icon ?? (channel.type === 'voice' ? Volume2 : Hash)

  return <Icon size={14} />
}
