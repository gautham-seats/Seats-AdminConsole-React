'use client'

import { Check, ListChecks, Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useApiRead, type ApiError } from '@/shared/api'
import { Checkbox, DelayedLoading, ErrorState, Input } from '@/shared/ui'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/ui/cn'
import { ROW_WINDOW_THRESHOLD, useRowWindow } from '@/shared/ui/use-row-window'
import type {
  AccessProfileEventTypes,
  AccessProfileVisibilityList,
  EventTypeInAccessProfileDto,
  ItemTypeViewModel,
} from '@/types/access-profiles'
import { USERS_FALLBACK_ONLY, type UsersTextKey } from '../index/users-text'
import {
  allEventRows,
  eventHeaderState,
  filterEventTypes,
  findEvent,
  setEventColumn,
  toggleEventColumn,
  type EventColumn,
} from './access-profile-form'

type Text = (key: UsersTextKey) => string

// The Site Access action chip (PermissionStudio), so every tab presses the same button.
// The fixed width is the one difference: it keeps the three event columns in line.
function Toggle({
  on,
  disabled = false,
  label,
  onClick,
  children,
}: {
  on: boolean
  disabled?: boolean
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-[30px] w-24 items-center justify-center gap-2 rounded-lg border px-2.5 text-[11.5px] transition-[transform,background-color,color,border-color,box-shadow] duration-300 ease-premium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        on
          ? 'border-emerald-600/25 bg-emerald-50 font-semibold text-emerald-800 hover:shadow-[0_6px_13px_-8px_rgba(16,122,85,.7)]'
          : 'border-border bg-white font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:shadow-sm',
        'hover:-translate-y-[1.5px]',
        'disabled:pointer-events-none disabled:opacity-40 disabled:hover:translate-y-0',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-3.5 shrink-0 place-items-center rounded-[4px] transition-[background-color,transform] duration-300 ease-premium',
          on ? 'scale-100 bg-emerald-600 text-white' : 'scale-95 bg-slate-200 text-transparent',
        )}
      >
        <Check className="size-2.5" strokeWidth={3.5} />
      </span>
      <span className="truncate">{children}</span>
    </button>
  )
}

// Same field as the Site Access search (PermissionStudio): 32px, page-tinted until focus.
function SearchBox({
  id,
  value,
  onChange,
  label,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <div className="relative max-w-md">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id={id}
        type="search"
        value={value}
        aria-label={label}
        placeholder={label}
        onChange={event => onChange(event.target.value)}
        className="field-bloom h-8 rounded-lg border-input bg-page pr-2.5 pl-8 text-xs shadow-sm transition-colors duration-200 focus-visible:bg-white"
      />
    </div>
  )
}

function useLoaded<T>(key: string, load: (signal: AbortSignal) => Promise<T>, onLoaded: (data: T) => void) {
  const read = useApiRead(key, load)
  const { data } = read
  useEffect(() => {
    if (data !== undefined) onLoaded(data)
  }, [data, onLoaded])
  return read
}

function PanelState({
  status,
  t,
  onRetry,
  error,
  children,
}: {
  status: string
  t: Text
  onRetry: () => void
  error: ApiError | null
  children: ReactNode
}) {
  if (status === 'error')
    return (
      <ErrorState
        message={t('AlertGeneralErrorDefault')}
        retryLabel={t('Refresh')}
        onRetry={onRetry}
        error={error}
      />
    )
  if (status !== 'success')
    return (
      <div className="grid min-h-72 flex-1 place-items-center">
        <DelayedLoading active label={t('Loading')} />
      </div>
    )
  return children
}

type PanelHeadProps = {
  description: string
  selectedCount: number
  total: number
  onAll?: () => void
  onClear?: () => void
  children: ReactNode
}

// The same anatomy on all three visibility tabs: what it controls, how much is on, and the bulk actions.
function PanelHead({ description, selectedCount, total, onAll, onClear, children }: PanelHeadProps) {
  const allOn = total > 0 && selectedCount >= total
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-xs text-muted-foreground">{description}</p>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-brand/[0.08] px-2.5 py-1 text-xs font-semibold text-brand tabular-nums">
            {USERS_FALLBACK_ONLY.selectedOf(selectedCount, total)}
          </span>
          {onAll ? (
            <Button type="button" variant="outline" size="sm" disabled={allOn} onClick={onAll}>
              <ListChecks aria-hidden className="size-4" />
              {USERS_FALLBACK_ONLY.selectAll}
            </Button>
          ) : null}
          {onClear ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedCount === 0}
              onClick={onClear}
            >
              <X aria-hidden className="size-4" />
              {USERS_FALLBACK_ONLY.clearAll}
            </Button>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  )
}

// A row the preview pointed at: scroll it into view and ring it until the highlight is cleared.
function useFlashRow(flashId: number | null, onDone: () => void) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (flashId === null) return
    const node = box.current?.querySelector(`[data-row="${flashId}"]`)
    node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const timer = setTimeout(onDone, 1400)
    return () => clearTimeout(timer)
  }, [flashId, onDone])
  return box
}

const FLASH = 'ring-2 ring-brand ring-inset bg-brand/[0.06]'

export type EventVisibilityPanelProps = {
  accessProfileId: number
  selected: readonly EventTypeInAccessProfileDto[]
  load: (signal: AbortSignal) => Promise<AccessProfileEventTypes>
  t: Text
  onLoaded: (selected: EventTypeInAccessProfileDto[]) => void
  onCatalogue: (rows: ItemTypeViewModel[]) => void
  onChange: (selected: EventTypeInAccessProfileDto[]) => void
  flashId: number | null
  onFlashDone: () => void
}

// bower_components/seats-admin-security-event: Event, Details and Comment per timeline item type.
export function EventVisibilityPanel({
  accessProfileId,
  selected,
  load,
  t,
  onLoaded,
  onCatalogue,
  onChange,
  flashId,
  onFlashDone,
}: EventVisibilityPanelProps) {
  const [query, setQuery] = useState('')
  const handleLoaded = useCallback(
    (data: AccessProfileEventTypes) => {
      onLoaded(data.selected)
      // The preview needs the whole catalogue, not just what is ticked.
      onCatalogue(allEventRows(data))
    },
    [onLoaded, onCatalogue],
  )
  const read = useLoaded(`access-profile-events:${accessProfileId}`, load, handleLoaded)
  const types = read.data
  const rows = types ? allEventRows(types) : []
  const header = eventHeaderState(selected, rows.length)
  const shown = types ? filterEventTypes(types, query, t('Events')) : null
  const shownRows = shown ? allEventRows(shown) : []

  const columns: { key: EventColumn; label: string; checked: boolean; disabled: boolean }[] = [
    { key: 'event', label: t('Event'), checked: header.event, disabled: false },
    { key: 'detail', label: t('Details'), checked: header.detail, disabled: header.detailDisabled },
    { key: 'comment', label: t('Comment'), checked: header.comment, disabled: header.detailDisabled },
  ]

  const row = (item: ItemTypeViewModel) => {
    const current = findEvent(selected, item)
    const name = item.description ?? ''
    return (
      <li
        key={`${item.type}:${item.subType}`}
        data-row={item.type * 1000 + item.subType}
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 transition-[background-color,box-shadow] duration-300 last:border-0',
          flashId === item.type * 1000 + item.subType && FLASH,
        )}
      >
        <span className="min-w-0 flex-1 text-[13px] text-foreground">{name}</span>
        <div className="flex gap-1.5">
          {columns.map(column => (
            <Toggle
              key={column.key}
              on={column.key === 'event' ? Boolean(current) : Boolean(current?.[column.key])}
              disabled={column.key !== 'event' && !current}
              label={`${name}: ${column.label}`}
              onClick={() => onChange(toggleEventColumn(selected, item, column.key, accessProfileId))}
            >
              {column.label}
            </Toggle>
          ))}
        </div>
      </li>
    )
  }

  const section = (title: string, items: readonly ItemTypeViewModel[], key: string) =>
    items.length > 0 ? (
      <section key={key} className="flex flex-col gap-1">
        <h3 className="px-1 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
          {title}
        </h3>
        <ul className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-20px_rgba(15,23,42,.3)]">
          {items.map(row)}
        </ul>
      </section>
    ) : null

  const flashBox = useFlashRow(flashId, onFlashDone)

  return (
    <PanelState status={read.status} t={t} onRetry={read.reload} error={read.error}>
      <div className="flex flex-col gap-4" ref={flashBox}>
        <PanelHead
          description={USERS_FALLBACK_ONLY.eventVisibilityHint}
          selectedCount={selected.length}
          total={rows.length}
          onAll={() => onChange(setEventColumn(selected, rows, 'event', true, accessProfileId))}
          onClear={() => onChange([])}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SearchBox id="event-visibility-search" value={query} onChange={setQuery} label={t('Search')} />
            <div className="flex gap-1.5 pr-3">
              {columns.map(column => (
                <label
                  key={column.key}
                  className={cn(
                    'flex w-24 items-center justify-center gap-2 text-[11.5px] font-medium text-slate-700',
                    column.disabled && 'opacity-50',
                  )}
                >
                  <Checkbox
                    checked={column.checked}
                    disabled={column.disabled}
                    onCheckedChange={() =>
                      onChange(
                        setEventColumn(selected, shownRows, column.key, !column.checked, accessProfileId),
                      )
                    }
                    label={column.label}
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </div>
        </PanelHead>
        {rows.length === 0 ? <EmptyState title={USERS_FALLBACK_ONLY.noEventTypes} /> : null}
        {shownRows.length === 0 && rows.length > 0 ? (
          <EmptyState kind="results" title={USERS_FALLBACK_ONLY.noMatches} />
        ) : null}
        {shown ? (
          <>
            {section(t('CaseHistory'), shown.caseSteps, 'case')}
            {shown.general.map(group => section(group.id, group.value, `general:${group.id}`))}
            {section(t('Events'), shown.events, 'events')}
          </>
        ) : null}
      </div>
    </PanelState>
  )
}

export type VisibilityListPanelProps = {
  id: string
  cacheKey: string
  selected: readonly number[]
  load: (signal: AbortSignal) => Promise<AccessProfileVisibilityList>
  t: Text
  onLoaded: (selected: number[]) => void
  onCatalogue: (items: readonly { id: number; description: string | null }[]) => void
  onToggle: (id: number) => void
  onSetAll: (ids: number[]) => void
  description: string
  emptyTitle: string
  flashId: number | null
  onFlashDone: () => void
}

// bower_components/seats-admin-security-event seats-admin-security-case and -workflow: one Access toggle per row.
export function VisibilityListPanel({
  id,
  cacheKey,
  selected,
  load,
  t,
  onLoaded,
  onCatalogue,
  onToggle,
  onSetAll,
  description,
  emptyTitle,
  flashId,
  onFlashDone,
}: VisibilityListPanelProps) {
  const [query, setQuery] = useState('')
  const handleLoaded = useCallback(
    (data: AccessProfileVisibilityList) => {
      onLoaded(data.selected)
      onCatalogue(data.items)
    },
    [onLoaded, onCatalogue],
  )
  const read = useLoaded(cacheKey, load, handleLoaded)
  const items = (read.data?.items ?? []).filter(item =>
    (item.description ?? '').toLowerCase().includes(query.toLowerCase()),
  )
  const scroller = useRef<HTMLDivElement>(null)
  const win = useRowWindow(items.length, scroller)
  const long = items.length > ROW_WINDOW_THRESHOLD
  const all = read.data?.items ?? []
  const flashBox = useFlashRow(flashId, onFlashDone)
  return (
    <PanelState status={read.status} t={t} onRetry={read.reload} error={read.error}>
      <div className="flex flex-col gap-3" ref={flashBox}>
        <PanelHead
          description={description}
          selectedCount={selected.length}
          total={all.length}
          onAll={() => onSetAll(all.map(item => item.id))}
          onClear={() => onSetAll([])}
        >
          <SearchBox id={id} value={query} onChange={setQuery} label={t('Search')} />
        </PanelHead>
        {all.length === 0 ? <EmptyState title={emptyTitle} /> : null}
        {items.length === 0 && all.length > 0 ? (
          <EmptyState kind="results" title={USERS_FALLBACK_ONLY.noMatches} />
        ) : null}
        {/* Long lists scroll inside a capped area and only the visible rows are rendered. */}
        <div
          ref={scroller}
          onScroll={win.onScroll}
          hidden={items.length === 0}
          className={cn(
            'overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-20px_rgba(15,23,42,.3)]',
            long && 'max-h-[32rem] overflow-y-auto',
          )}
        >
          <ul>
            {win.padTop > 0 ? <li aria-hidden style={{ height: win.padTop }} /> : null}
            {items.slice(win.start, win.end).map(item => (
              <li
                key={item.id}
                data-row={item.id}
                className={cn(
                  'flex min-h-11 items-center justify-between gap-3 border-b border-border px-3 py-2 transition-[background-color,box-shadow] duration-300 last:border-0',
                  flashId === item.id && FLASH,
                )}
              >
                <span className="text-[13px] text-foreground">{item.description}</span>
                <Toggle
                  on={selected.includes(item.id)}
                  label={`${item.description ?? ''}: ${t('Access')}`}
                  onClick={() => onToggle(item.id)}
                >
                  {t('Access')}
                </Toggle>
              </li>
            ))}
            {win.padBottom > 0 ? <li aria-hidden style={{ height: win.padBottom }} /> : null}
          </ul>
        </div>
      </div>
    </PanelState>
  )
}
