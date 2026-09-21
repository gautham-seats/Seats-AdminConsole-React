'use client'

import { Check, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useApiRead, type ApiError } from '@/shared/api'
import { Checkbox, DelayedLoading, ErrorState, Input } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { ROW_WINDOW_THRESHOLD, useRowWindow } from '@/shared/ui/use-row-window'
import type {
  AccessProfileEventTypes,
  AccessProfileVisibilityList,
  EventTypeInAccessProfileDto,
  ItemTypeViewModel,
} from '@/types/access-profiles'
import type { UsersTextKey } from '../index/users-text'
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
        'lift-chip inline-flex w-24 items-center justify-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
        on
          ? 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800'
          : 'border-border bg-white text-slate-700 hover:bg-page',
      )}
    >
      {on ? <Check aria-hidden className="size-3" /> : null}
      {children}
    </button>
  )
}

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
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id={id}
        type="search"
        value={value}
        aria-label={label}
        placeholder={label}
        onChange={event => onChange(event.target.value)}
        className="h-9 bg-white pl-9"
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

export type EventVisibilityPanelProps = {
  accessProfileId: number
  selected: readonly EventTypeInAccessProfileDto[]
  load: (signal: AbortSignal) => Promise<AccessProfileEventTypes>
  t: Text
  onLoaded: (selected: EventTypeInAccessProfileDto[]) => void
  onChange: (selected: EventTypeInAccessProfileDto[]) => void
}

// bower_components/seats-admin-security-event: Event, Details and Comment per timeline item type.
export function EventVisibilityPanel({
  accessProfileId,
  selected,
  load,
  t,
  onLoaded,
  onChange,
}: EventVisibilityPanelProps) {
  const [query, setQuery] = useState('')
  const handleLoaded = useCallback((data: AccessProfileEventTypes) => onLoaded(data.selected), [onLoaded])
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
        className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-0"
      >
        <span className="min-w-0 flex-1 text-sm text-foreground">{name}</span>
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
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
        <ul className="rounded-md border border-border bg-white">{items.map(row)}</ul>
      </section>
    ) : null

  return (
    <PanelState status={read.status} t={t} onRetry={read.reload} error={read.error}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SearchBox id="event-visibility-search" value={query} onChange={setQuery} label={t('Search')} />
          <div className="flex gap-1.5 pr-3">
            {columns.map(column => (
              <label
                key={column.key}
                className={cn(
                  'flex w-24 items-center justify-center gap-2 text-xs font-medium text-slate-700',
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
  onToggle: (id: number) => void
}

// bower_components/seats-admin-security-event seats-admin-security-case and -workflow: one Access toggle per row.
export function VisibilityListPanel({
  id,
  cacheKey,
  selected,
  load,
  t,
  onLoaded,
  onToggle,
}: VisibilityListPanelProps) {
  const [query, setQuery] = useState('')
  const handleLoaded = useCallback((data: AccessProfileVisibilityList) => onLoaded(data.selected), [onLoaded])
  const read = useLoaded(cacheKey, load, handleLoaded)
  const items = (read.data?.items ?? []).filter(item =>
    (item.description ?? '').toLowerCase().includes(query.toLowerCase()),
  )
  const scroller = useRef<HTMLDivElement>(null)
  const win = useRowWindow(items.length, scroller)
  const long = items.length > ROW_WINDOW_THRESHOLD
  return (
    <PanelState status={read.status} t={t} onRetry={read.reload} error={read.error}>
      <div className="flex flex-col gap-3">
        <SearchBox id={id} value={query} onChange={setQuery} label={t('Search')} />
        {/* Long lists scroll inside a capped area and only the visible rows are rendered. */}
        <div
          ref={scroller}
          onScroll={win.onScroll}
          className={cn('rounded-md border border-border bg-white', long && 'max-h-[32rem] overflow-y-auto')}
        >
          <ul>
            {win.padTop > 0 ? <li aria-hidden style={{ height: win.padTop }} /> : null}
            {items.slice(win.start, win.end).map(item => (
              <li
                key={item.id}
                className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-0"
              >
                <span className="text-sm text-foreground">{item.description}</span>
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
