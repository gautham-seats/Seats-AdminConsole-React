'use client'

import { Check, Diamond, Search } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/shared/ui/cn'
import { BRIEFING_EN } from './briefing-text'
import {
  applyLevel,
  countActions,
  countGranted,
  filterPermissions,
  grantedActions,
  groupByArea,
  levelOf,
  levelsFor,
  type PermissionLevel,
  type StudioGroup,
  type StudioPermission,
} from './permission-studio'
import { togglePermission } from './access-profile-form'

type PermissionStudioText = {
  search: string
  levels: Record<PermissionLevel, string>
  noMatches: string
}

export type PermissionStudioProps = {
  groups: readonly StudioGroup[]
  selected: readonly number[]
  label: string
  text: PermissionStudioText
  onChange: (selected: number[]) => void
  onFocus: (permissionId: number) => void
}

// The legacy tree rail beside the permission ledger (AccessProfile/Details.cshtml:76-100).
export function PermissionStudio({
  groups,
  selected,
  label,
  text,
  onChange,
  onFocus,
}: PermissionStudioProps) {
  const [query, setQuery] = useState('')
  const areas = groupByArea(groups)
  const [areaName, setAreaName] = useState(areas[0]?.area ?? '')
  const [activeId, setActiveId] = useState<number | null>(null)
  const ledger = useRef<HTMLDivElement>(null)
  const area = areas.find(item => item.area === areaName) ?? areas[0]
  const active = area?.permissions.find(item => item.id === activeId) ?? null

  // Picking a rail row can happen far down the page, so bring the ledger's top back on screen.
  useEffect(() => {
    if (activeId === null) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    ledger.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' })
  }, [activeId])

  // A rail row lifts that permission to the top of the ledger, the rest follow; it never changes a grant.
  const showPermission = (permissionId: number) => {
    setActiveId(permissionId)
    setQuery('')
    onFocus(permissionId)
  }
  const permissions = active
    ? [active, ...(area?.permissions ?? []).filter(item => item.id !== active.id)]
    : area
      ? filterPermissions(area.permissions, query)
      : []
  const granted = area ? countGranted(area.permissions, selected) : 0
  const total = area ? countActions(area.permissions) : 0
  const meta = `${BRIEFING_EN.shownOf(permissions.length, area?.permissions.length ?? 0)} · ${BRIEFING_EN.grantedOf(granted, total)}`

  // Tab order is grouped by logic: search, then the whole rail, then every permission row in the ledger.
  return (
    <div role="group" aria-label={label} className="grid min-h-0 md:grid-cols-[14.75rem_minmax(0,1fr)]">
      <aside className="border-b border-border p-3 md:border-r md:border-b-0">
        <div className="relative mb-2.5">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={event => {
              setQuery(event.target.value)
              setActiveId(null)
            }}
            placeholder={text.search}
            aria-label={text.search}
            className="field-bloom h-8 w-full rounded-lg border border-input bg-page pr-2.5 pl-8 text-xs shadow-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:bg-white focus-visible:outline-none"
          />
        </div>
        {areas.map(item => {
          const on = item.area === area?.area
          const count = countGranted(item.permissions, selected)
          return (
            <div key={item.key}>
              <button
                type="button"
                aria-current={on}
                onClick={() => {
                  setAreaName(item.area)
                  setActiveId(null)
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium transition-[background-color,color,padding] duration-300 ease-premium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-[.99]',
                  on
                    ? 'bg-brand/[0.08] font-semibold text-brand'
                    : 'text-slate-600 hover:bg-page hover:pl-3.5',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'size-1.5 rounded-[2px] transition-[background-color,transform] duration-500 ease-premium',
                    on ? 'scale-110 rotate-45 bg-brand' : 'bg-slate-300',
                  )}
                />
                {item.area}
                <span className="ml-auto text-[10.5px] tabular-nums">
                  {BRIEFING_EN.count(count, countActions(item.permissions))}
                </span>
              </button>
              {on ? (
                <div className="mt-0.5 mb-2 ml-[1.1rem] grid gap-px border-l border-border pl-3">
                  {item.permissions.map(permission => (
                    <RailRow
                      key={permission.id}
                      permission={permission}
                      selected={selected}
                      active={permission.id === activeId}
                      onSelect={() => showPermission(permission.id)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </aside>

      <div ref={ledger} className="min-w-0 scroll-mt-20 p-3">
        <p className="mb-2 px-1 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
          {meta}
        </p>
        {permissions.length === 0 ? (
          <p className="animate-fade-in rounded-lg bg-page px-4 py-8 text-center text-sm text-muted-foreground">
            {text.noMatches}
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-20px_rgba(15,23,42,.3)]">
            {permissions.map((permission, index) => (
              <PermissionRow
                // A fresh key for the lifted row replays its rise-in, so the jump to the top is visible.
                key={permission.id === activeId ? `top-${permission.id}` : permission.id}
                active={permission.id === activeId}
                permission={permission}
                selected={selected}
                text={text}
                index={index}
                onChange={next => {
                  onChange(next)
                  onFocus(permission.id)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RailRow({
  permission,
  selected,
  active,
  onSelect,
}: {
  permission: StudioPermission
  selected: readonly number[]
  active: boolean
  onSelect: () => void
}) {
  const granted = grantedActions(permission, selected).length
  const percent = Math.round((granted / Math.max(permission.actions.length, 1)) * 100)
  const shut = granted === 0
  return (
    <button
      type="button"
      aria-current={active}
      onClick={onSelect}
      title={`${permission.name} · ${BRIEFING_EN.count(granted, permission.actions.length)}`}
      className={cn(
        'grid grid-cols-[1.125rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        active
          ? 'bg-brand/[0.09] font-semibold text-brand'
          : shut
            ? 'text-rose-700 hover:bg-rose-50'
            : 'text-slate-600 hover:bg-page',
      )}
    >
      <span
        aria-hidden
        className={cn('h-1 overflow-hidden rounded-full', shut ? 'bg-rose-200' : 'bg-slate-200')}
      >
        <span
          className="block h-full rounded-full bg-emerald-600 transition-[width] duration-500 ease-premium"
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="truncate">{permission.name}</span>
      <span className="text-[10px] tabular-nums opacity-70">{granted}</span>
    </button>
  )
}

function PermissionRow({
  active,
  permission,
  selected,
  text,
  index,
  onChange,
}: {
  active: boolean
  permission: StudioPermission
  selected: readonly number[]
  text: PermissionStudioText
  index: number
  onChange: (selected: number[]) => void
}) {
  const granted = grantedActions(permission, selected)
  const percent = Math.round((granted.length / Math.max(permission.actions.length, 1)) * 100)
  const level = levelOf(permission, selected)
  const shut = granted.length === 0
  const countText = shut
    ? `${BRIEFING_EN.count(0, permission.actions.length)} · ${BRIEFING_EN.closed}`
    : BRIEFING_EN.count(granted.length, permission.actions.length)
  return (
    <section
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      className={cn(
        'grid animate-rise-in gap-4 border-b border-border/70 px-4 py-3.5 transition-[background-color,box-shadow] duration-500 last:border-b-0 md:grid-cols-[13.25rem_minmax(0,1fr)] motion-reduce:animate-none',
        active ? 'bg-brand/[0.08] shadow-[inset_4px_0_0_var(--color-brand)]' : 'hover:bg-slate-50/70',
      )}
    >
      <div>
        <p className="text-[13px] leading-tight font-semibold text-foreground">{permission.name}</p>
        <p className="mt-1 flex items-center gap-1.5 text-[10.5px] text-muted-foreground tabular-nums">
          <span
            aria-hidden
            className={cn('h-1 w-8 overflow-hidden rounded-full', shut ? 'bg-rose-200' : 'bg-slate-200')}
          >
            <span
              className="block h-full rounded-full bg-emerald-600 transition-[width] duration-500 ease-premium"
              style={{ width: `${percent}%` }}
            />
          </span>
          {countText}
        </p>
        <LevelControl
          permission={permission}
          level={level}
          selected={selected}
          text={text}
          onChange={onChange}
        />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(10.25rem,1fr))] content-start gap-1.5">
        {permission.actions.map(action => {
          const on = selected.includes(action.id)
          return (
            <button
              key={action.id}
              type="button"
              aria-pressed={on}
              title={action.name}
              onClick={() => onChange(togglePermission(selected, action.id))}
              className={cn(
                'flex h-[30px] items-center gap-2 rounded-lg border px-2.5 text-left text-[11.5px] transition-[transform,background-color,color,border-color,box-shadow] duration-300 ease-premium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                on
                  ? 'border-emerald-600/25 bg-emerald-50 font-semibold text-emerald-800 hover:shadow-[0_6px_13px_-8px_rgba(16,122,85,.7)]'
                  : 'border-border bg-white font-medium text-slate-500 hover:border-slate-300 hover:text-slate-700 hover:shadow-sm',
                'hover:-translate-y-[1.5px]',
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
              <span className="truncate">{action.name}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function LevelControl({
  permission,
  level,
  selected,
  text,
  onChange,
}: {
  permission: StudioPermission
  level: PermissionLevel | null
  selected: readonly number[]
  text: PermissionStudioText
  onChange: (selected: number[]) => void
}) {
  const levels = levelsFor(permission)
  const index = level ? levels.indexOf(level) : -1
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  // Same keys as settings ChoiceGroup: arrows move the choice and focus together.
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, at: number) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0
    if (!step) return
    event.preventDefault()
    const next = (at + step + levels.length) % levels.length
    onChange(applyLevel(permission, selected, levels[next]))
    refs.current[next]?.focus()
  }
  return (
    <>
      <div
        role="radiogroup"
        aria-label={permission.name}
        className="relative mt-2.5 inline-flex rounded-[10px] bg-slate-100 p-[3px]"
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-[3px] bottom-[3px] w-11 rounded-lg transition-[left,opacity,background-color] duration-500 ease-premium motion-reduce:transition-none',
            level === 'none' && 'bg-slate-400',
            level === 'full' && 'bg-gradient-to-b from-amber-400 to-amber-600',
            (level === 'view' || level === 'edit') && 'bg-gradient-to-b from-[#2d84c4] to-brand',
            index < 0 ? 'opacity-0' : 'opacity-100',
          )}
          style={{ left: `${3 + Math.max(index, 0) * 44}px` }}
        />
        {levels.map((item, at) => (
          <button
            key={item}
            ref={element => {
              refs.current[at] = element
            }}
            type="button"
            role="radio"
            aria-checked={level === item}
            tabIndex={at === Math.max(index, 0) ? 0 : -1}
            onClick={() => onChange(applyLevel(permission, selected, item))}
            onKeyDown={event => onKeyDown(event, at)}
            className={cn(
              'relative z-10 h-[25px] w-11 rounded-lg text-[11px] font-semibold transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              level === item ? 'text-white' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {text.levels[item]}
          </button>
        ))}
      </div>
      {level === null ? (
        <p className="mt-1.5 inline-flex animate-fade-in items-center gap-1.5 rounded-full bg-brand/[0.09] px-2 py-0.5 text-[10.5px] font-semibold text-brand">
          <Diamond aria-hidden className="size-2.5 fill-current" />
          {BRIEFING_EN.customMix}
        </p>
      ) : null}
    </>
  )
}
