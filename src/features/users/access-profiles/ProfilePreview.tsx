'use client'

import { Check, CircleCheck, Eye, Lock, TriangleAlert, X } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { CountUp } from '@/shared/ui/CountUp'
import { cn } from '@/shared/ui/cn'
import { BRIEFING_EN } from './briefing-text'
import { grantedActions, groupByArea, type StudioGroup, type StudioPermission } from './permission-studio'
import { useFlip } from './use-flip'
import { useJustChanged, useTypeIn } from './use-type-in'

export type ProfilePreviewText = {
  title: string
  hint: string
  empty: string
  pages: string
  landingNone: string
  landingOk: (page: string) => string
  landingBlocked: (page: string) => string
}

export type ProfilePreviewProps = {
  groups: readonly StudioGroup[]
  selected: readonly number[]
  focusId: number | null
  landing: { label: string; valid: boolean } | null
  text: ProfilePreviewText
  onToggle?: (actionId: number) => void
  /** Kept mounted while another tab's lens is on screen, so its typing and FLIP state survive. */
  hidden?: boolean
}

type Entry = { area: string; permission: StudioPermission }

// Two columns hold twice the rows in the same height.
const LIST_LIMIT = 8
const CLOSED_LIMIT = 6
const PAGE_LIMIT = 4
const ELLIPSIS = '…'

// A short briefing on the profile: what it opens, what it allows here, and what stays shut.
export function ProfilePreview({
  groups,
  selected,
  focusId,
  landing,
  text,
  onToggle,
  hidden,
}: ProfilePreviewProps) {
  const entries: Entry[] = groupByArea(groups).flatMap(area =>
    area.permissions.map(permission => ({ area: area.area, permission })),
  )
  const open = entries.filter(entry => grantedActions(entry.permission, selected).length > 0)
  const shut = entries.filter(entry => grantedActions(entry.permission, selected).length === 0)
  const focus = entries.find(entry => entry.permission.id === focusId) ?? open[0] ?? entries[0] ?? null
  const allowed = focus ? grantedActions(focus.permission, selected) : []
  const closed = focus ? focus.permission.actions.filter(action => !selected.includes(action.id)) : []
  const words = allowed
    .slice(0, 3)
    .map(action => action.name.toLowerCase())
    .join(', ')
  const typed = useTypeIn(words)
  const changed = useJustChanged(
    `${focus?.permission.id ?? ''}:${[...selected].sort((a, b) => a - b).join(',')}`,
  )

  return (
    <PreviewShell title={text.title} busy={changed.active} pulse={changed.pulse} hidden={hidden}>
      <p className="mt-1 text-[11.5px] leading-relaxed text-white">{text.hint}</p>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <Kpi value={open.length} label={BRIEFING_EN.pagesOpen} tone="open" />
        <Kpi value={selected.length} label={BRIEFING_EN.thingsAllowed} tone="allowed" />
        <Kpi value={shut.length} label={BRIEFING_EN.pagesClosed} tone="shut" />
      </div>

      {open.length === 0 || !focus ? (
        <p className="mt-3 flex items-center gap-2.5 rounded-xl border border-white/20 bg-slate-950/30 px-3.5 py-4 text-[12.5px] leading-relaxed text-white">
          <Lock aria-hidden className="size-4 shrink-0 text-white" />
          {text.empty}
        </p>
      ) : (
        <>
          <p className="mt-3 rounded-xl border border-white/[0.17] bg-slate-950/30 px-3.5 py-3 text-[14.5px] leading-[1.62] text-white">
            {BRIEFING_EN.onPage}
            <span className="font-semibold text-sky-100">{focus.permission.name}</span>
            {BRIEFING_EN.theyCan}
            <span className="sr-only">{words}</span>
            {/* The actions type themselves in when the page or its grants change, like the nav search. */}
            <span
              aria-hidden
              className="rounded-[2px] bg-[linear-gradient(transparent_60%,rgba(110,231,183,.22)_60%)] px-0.5 font-semibold"
            >
              {typed.text}
              {typed.done ? null : (
                <span className="ml-px inline-block h-[0.95em] w-[2px] translate-y-[2px] animate-pulse rounded-full bg-sky-200" />
              )}
            </span>
            {allowed.length > 3 ? BRIEFING_EN.andMore(allowed.length - 3) : ''}
            {closed.length > 0 ? (
              <s className="text-rose-100 decoration-rose-100/70">{BRIEFING_EN.butClosed(closed.length)}</s>
            ) : (
              BRIEFING_EN.noneClosed
            )}
            {BRIEFING_EN.fullStop}
          </p>

          <PreviewSection
            title={BRIEFING_EN.canDoHere}
            count={allowed.length}
            tone="good"
            items={allowed.slice(0, LIST_LIMIT)}
            more={allowed.length > LIST_LIMIT ? BRIEFING_EN.moreAllowed(allowed.length - LIST_LIMIT) : null}
            empty={BRIEFING_EN.nothingAllowed}
            hint={BRIEFING_EN.remove}
            on
            onToggle={onToggle}
          />

          <PreviewSection
            title={BRIEFING_EN.closedHere}
            count={closed.length}
            tone="bad"
            items={closed.slice(0, CLOSED_LIMIT)}
            more={closed.length > CLOSED_LIMIT ? BRIEFING_EN.moreClosed(closed.length - CLOSED_LIMIT) : null}
            empty={BRIEFING_EN.nothingClosed}
            hint={BRIEFING_EN.allow}
            on={false}
            onToggle={onToggle}
          />
        </>
      )}

      {/* The spacer keeps at least a small gap and pushes the red block down, so the panel fills its column. */}
      <span aria-hidden className="min-h-3 flex-1" />
      {/* Red glass: clearly red, still see-through, so it belongs to the blue panel instead of sitting on it. */}
      <section className="rounded-xl border border-rose-200/45 bg-rose-900/40 bg-[linear-gradient(180deg,rgba(244,63,94,.42),rgba(225,29,72,.26))] p-3 shadow-[0_14px_30px_-18px_rgba(190,18,60,.8),inset_0_1px_0_rgba(255,255,255,.25)] backdrop-blur-md">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold text-white">
          <Lock aria-hidden className="size-3.5" />
          {BRIEFING_EN.neverSee}
          <span className="ml-auto rounded-full bg-rose-950/35 px-2 py-0.5 text-[10px] text-white tabular-nums">
            {shut.length}
          </span>
        </h3>
        <div className="mt-2 grid gap-1">
          {shut.length === 0 ? (
            <p className="px-0.5 py-1 text-[11.5px] text-white">{BRIEFING_EN.nothingShut}</p>
          ) : (
            shut.slice(0, PAGE_LIMIT).map((entry, index) => (
              <div
                key={entry.permission.id}
                style={{ animationDelay: `${index * 45}ms` }}
                className="grid animate-fade-in grid-cols-[1.125rem_minmax(0,1fr)] items-center gap-2.5 rounded-lg bg-rose-950/25 px-2.5 py-1.5 text-[11.5px] text-white ring-1 ring-white/10 motion-reduce:animate-none"
              >
                <span
                  aria-hidden
                  className="grid size-[1.125rem] place-items-center rounded-[5px] bg-white/25 text-white"
                >
                  <X className="size-2.5" strokeWidth={3} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold" title={entry.permission.name}>
                    {entry.permission.name}
                  </span>
                  <span className="block text-[10px] text-white">
                    {BRIEFING_EN.allBlocked(entry.area, entry.permission.actions.length)}
                  </span>
                </span>
              </div>
            ))
          )}
          {shut.length > PAGE_LIMIT ? (
            <p className="px-2.5 pt-1 text-[10.5px] text-white">
              {BRIEFING_EN.morePages(shut.length - PAGE_LIMIT)}
            </p>
          ) : null}
        </div>
      </section>

      <p
        className={cn(
          'mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11.5px] font-medium',
          'text-white',
          !landing && 'bg-slate-950/25',
          landing?.valid && 'bg-emerald-900/55',
          landing && !landing.valid && 'bg-amber-900/60',
        )}
      >
        {landing?.valid ? (
          <CircleCheck aria-hidden className="size-3.5 shrink-0 text-emerald-300" />
        ) : landing ? (
          <TriangleAlert aria-hidden className="size-3.5 shrink-0 text-amber-300" />
        ) : null}
        {landing
          ? landing.valid
            ? text.landingOk(landing.label)
            : text.landingBlocked(landing.label)
          : text.landingNone}
      </p>
      {onToggle ? <p className="mt-2 text-center text-[10.5px] text-white">{BRIEFING_EN.tapHint}</p> : null}
    </PreviewShell>
  )
}

type ShellProps = { title: string; busy: boolean; pulse: number; children: ReactNode; hidden?: boolean }

// The glass panel itself: aurora, sheen, scrim and the updated/updating header.
// Every lens renders inside this, so all four tabs share one panel.
export function PreviewShell({ title, busy, pulse, children, hidden }: ShellProps) {
  return (
    <aside
      aria-label={title}
      hidden={hidden}
      className="relative isolate flex h-full flex-col overflow-hidden rounded-2xl bg-[linear-gradient(162deg,#0d3a60_0%,#1566a2_58%,#1a6ea8_100%)] p-4 text-white shadow-[0_30px_60px_-30px_rgba(9,40,64,.85),inset_0_1px_0_rgba(255,255,255,.14)]"
    >
      <span
        aria-hidden
        className="absolute -inset-1/2 -z-10 animate-aurora rounded-full bg-[radial-gradient(closest-side,rgba(86,189,234,.16),transparent_70%)] motion-reduce:animate-none"
      />
      {/* A glossy top light plus the nav bar's diagonal sheen, sweeping every 18s instead of every 2 minutes. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,.12)_0%,rgba(255,255,255,.04)_22%,transparent_42%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 animate-[sheen_18s_600ms_linear_infinite_both] bg-[linear-gradient(112deg,transparent_38%,rgba(255,255,255,.03)_45%,rgba(255,255,255,.12)_50%,rgba(255,255,255,.03)_55%,transparent_62%)] bg-[length:240%_100%] bg-no-repeat motion-reduce:animate-none"
      />
      {/* Light scrim over the glow layers keeps white text at 4.5:1 or more wherever the aurora and sheen pass. */}
      <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-slate-950/16" />

      <header className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.14em] uppercase">
          <Eye aria-hidden className="size-3.5" />
          {title}
        </h2>
        {/* At rest the preview is current, so it reads "updated"; a change briefly reads "updating…". */}
        <span
          key={busy ? `busy-${pulse}` : 'current'}
          className={cn(
            'ml-auto inline-flex animate-fade-in items-center gap-1.5 text-[10px] motion-reduce:animate-none',
            busy ? 'font-semibold text-white' : 'text-white',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'size-1.5 rounded-full motion-reduce:animate-none',
              busy
                ? 'animate-pulse bg-sky-300 shadow-[0_0_8px_rgba(125,211,252,.95)]'
                : 'animate-soft-pulse bg-emerald-300',
            )}
          />
          {busy ? `${BRIEFING_EN.updating}${ELLIPSIS}` : BRIEFING_EN.updated}
        </span>
      </header>
      {children}
    </aside>
  )
}

// Three close cousins of the panel blue: sky for reach, teal for what they can do, rose for what is shut.
// Deep tints, not light ones, so the pale text on them stays above 4.5:1.
const KPI_TONE = {
  open: {
    box: 'border-sky-200/30 bg-gradient-to-br from-sky-900/50 to-sky-800/30',
    value: 'text-sky-50',
    label: 'text-white',
  },
  allowed: {
    box: 'border-teal-200/30 bg-gradient-to-br from-teal-900/50 to-teal-800/30',
    value: 'text-teal-50',
    label: 'text-white',
  },
  shut: {
    box: 'border-rose-200/30 bg-gradient-to-br from-rose-900/50 to-rose-800/30',
    value: 'text-rose-50',
    label: 'text-white',
  },
} as const

export function Kpi({ value, label, tone }: { value: number; label: string; tone: keyof typeof KPI_TONE }) {
  const style = KPI_TONE[tone]
  return (
    <div
      className={cn('rounded-xl border px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,.14)]', style.box)}
    >
      <p className={cn('text-[21px] leading-[1.15] font-semibold tabular-nums', style.value)}>
        <CountUp text={String(value)} />
      </p>
      <p className={cn('mt-px text-[10px] leading-snug', style.label)}>{label}</p>
    </div>
  )
}

type Action = { id: number; name: string }

// More than this many rows and the list splits into two columns, filling the left one first.
const ONE_COLUMN_MAX = 3

export function PreviewSection({
  title,
  count,
  tone,
  items,
  more,
  empty,
  hint,
  on,
  onToggle,
}: {
  title: string
  count: number
  tone: 'good' | 'bad'
  items: readonly Action[]
  more: string | null
  empty: string
  hint: string
  on: boolean
  onToggle?: (actionId: number) => void
}) {
  const list = useRef<HTMLDivElement>(null)
  const twoColumns = items.length > ONE_COLUMN_MAX
  useFlip(list, items.map(item => item.id).join(','))
  return (
    <section className="mt-3">
      <h3 className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-white">
        {title}
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] tabular-nums',
            tone === 'good' ? 'bg-emerald-900/55 text-emerald-50' : 'bg-rose-900/55 text-rose-50',
          )}
        >
          {count}
        </span>
      </h3>
      {items.length === 0 ? (
        <Note text={empty} />
      ) : (
        <div
          ref={list}
          // Column-first flow: rows are set to half the items, so the left column fills before the right.
          className={cn('grid gap-1', twoColumns && 'grid-flow-col grid-cols-2 gap-x-1.5')}
          style={
            twoColumns ? { gridTemplateRows: `repeat(${Math.ceil(items.length / 2)}, auto)` } : undefined
          }
        >
          {items.map((action, index) => (
            <Line
              key={action.id}
              flipKey={String(action.id)}
              name={action.name}
              hint={hint}
              index={index}
              on={on}
              compact={twoColumns}
              onClick={onToggle ? () => onToggle(action.id) : undefined}
            />
          ))}
        </div>
      )}
      {more ? <More text={more} /> : null}
    </section>
  )
}

function Line({
  flipKey,
  name,
  hint,
  index,
  on,
  compact,
  onClick,
}: {
  flipKey: string
  name: string
  hint: string
  index: number
  on: boolean
  compact: boolean
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick, 'aria-pressed': on } : {})}
      data-flip={flipKey}
      title={`${name} (${hint})`}
      style={{ animationDelay: `${index * 45}ms` }}
      className={cn(
        'group grid w-full min-w-0 animate-fade-in items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-[background-color,transform] duration-300 ease-premium motion-reduce:animate-none',
        compact ? 'grid-cols-[1.125rem_minmax(0,1fr)] gap-2 px-2' : 'grid-cols-[1.125rem_minmax(0,1fr)_auto]',
        onClick &&
          'hover:translate-x-0.5 hover:bg-slate-950/20 focus-visible:bg-slate-950/20 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none active:scale-[.99]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-[1.125rem] place-items-center rounded-full',
          on ? 'bg-emerald-300 text-emerald-950' : 'bg-rose-950/40 text-rose-100 ring-1 ring-rose-200/60',
        )}
      >
        {on ? <Check className="size-2.5" strokeWidth={3.5} /> : <X className="size-2.5" strokeWidth={3} />}
      </span>
      <span className="truncate text-white">{name}</span>
      {compact ? null : (
        <span className="text-[9.5px] text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          {hint}
        </span>
      )}
    </Tag>
  )
}

const More = ({ text }: { text: string }) => <p className="pt-0.5 pl-2.5 text-[10.5px] text-white">{text}</p>

const Note = ({ text }: { text: string }) => <p className="px-2.5 py-1.5 text-[11.5px] text-white">{text}</p>
