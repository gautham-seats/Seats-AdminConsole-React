'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../cn'
import { cultureDateFormat } from '@/shared/i18n/culture'
import type { DateRangeLabels } from './DateRangeDialog'
import {
  countDays,
  countWeekdays,
  dayOnly,
  isSameDay,
  monthWeeks,
  pickDay,
  plusDays,
  plusMonths,
  quickRanges,
  academicTerms,
  currentAcademicYear,
  type AcademicRange,
  startOfMonth,
} from './studio-dates'

export type StudioPreset = { key: string; label: string; start: Date; end: Date; tone?: string }

export type StudioLabels = {
  quick: string
  academic: string
  thisWeek: string
  thisMonth: string
  lastMonth: string
  day: string
  days: string
  weekday: string
  weekdays: string
  academicYear: string
  autumnTerm: string
  springTerm: string
  summerTerm: string
  pickEnd: string
  hoverHint: string
  rangeReordered: string
  keysHint: string
  jumpHint: string
}

// Fallback words until these keys exist in the resource files.
export const STUDIO_FALLBACK: StudioLabels = {
  quick: 'Quick',
  academic: 'Academic',
  thisWeek: 'This week',
  thisMonth: 'This month',
  lastMonth: 'Last month',
  day: 'day',
  days: 'days',
  academicYear: 'Academic year',
  autumnTerm: 'Autumn term',
  springTerm: 'Spring term',
  summerTerm: 'Summer term',
  weekday: 'weekday',
  weekdays: 'weekdays',
  pickEnd: 'Pick an end date',
  hoverHint: 'Hover to preview',
  rangeReordered: 'Start and end dates were swapped',
  keysHint: 'Arrows move · Enter picks · PgUp/PgDn month · Home today',
  jumpHint: 'Pick a year, then a month',
}

// Names come from the UI culture (D-111); the week stays Monday-first like the Angular picker.
const utcNames = (count: number, at: (index: number) => number, options: Intl.DateTimeFormatOptions) => {
  const format = cultureDateFormat({ ...options, timeZone: 'utc' })
  return Array.from({ length: count }, (_, index) => format.format(new Date(at(index))))
}
const weekNames = (weekday: 'short' | 'long') =>
  utcNames(7, index => Date.UTC(2017, 0, 2 + index), { weekday })
const monthNames = () => utcNames(12, index => Date.UTC(2017, index, 1), { month: 'short' })
const ARROW_KEYS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
const YEAR_PAGE = 12
const TERM_TONES: Record<AcademicRange['kind'], string> = {
  year: 'var(--color-brand)',
  autumn: 'var(--color-term-autumn)',
  spring: 'var(--color-term-spring)',
  summer: 'var(--color-term-summer)',
}
const ELLIPSIS = '…'
const DAY_SHORT = 'd'

type Props = {
  start: Date
  end: Date
  today: Date
  labels: DateRangeLabels
  studioLabels?: Partial<StudioLabels>
  presets?: readonly StudioPreset[]
  // Screens whose legacy page had no quick ranges (Users Activity) pass this.
  hidePresets?: boolean
  formatDate: (date: Date) => string
  onClose: () => void
  onSelect: (start: Date, end: Date) => void
  // Which date the keyboard lands on when the picker opens; the box the user pressed decides.
  initialFocus?: 'start' | 'end'
}

const monthTitle = (month: Date) => cultureDateFormat({ month: 'long', year: 'numeric' }).format(month)

type Jump = { month: 0 | 1; step: 'year' | 'month'; year: number; page: number }

// Same ring as Button.tsx so every control shows a 3:1 focus indicator.
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'

const NAV = cn(
  'grid size-10 place-items-center rounded-xl border border-border bg-white text-slate-600 transition-[border-color,color,translate,box-shadow] duration-300 ease-premium hover:-translate-y-px hover:border-brand/50 hover:text-brand hover:shadow-[0_6px_14px_-8px_rgba(21,102,162,.5)]',
  FOCUS,
)

const PRIMARY =
  'inline-flex h-12 items-center rounded-xl bg-[linear-gradient(180deg,var(--color-studio-primary-light)_0%,var(--color-brand)_55%,var(--color-studio-primary-dark)_100%)] px-6 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.35),0_6px_14px_-6px_rgba(21,102,162,.55)] transition-[translate,filter] duration-300 hover:-translate-y-px hover:brightness-[1.06] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50'

// Academic Studio range picker: presets rail, two-month range calendar, year/month jump and keyboard grid.
export function StudioRangeDialog({
  start: initialStart,
  end: initialEnd,
  today: rawToday,
  labels,
  studioLabels,
  presets = [],
  hidePresets = false,
  formatDate,
  onClose,
  onSelect,
  initialFocus = 'end',
}: Props) {
  const today = dayOnly(rawToday)
  const opensOn = dayOnly(initialFocus === 'start' ? initialStart : initialEnd)
  const words = { ...STUDIO_FALLBACK, ...studioLabels }
  const [range, setRange] = useState<{ start: Date; end: Date | null }>(() => {
    const start = dayOnly(initialStart)
    const end = dayOnly(initialEnd)
    return end < start ? { start: end, end: start } : { start, end }
  })
  const [rangeNotice, setRangeNotice] = useState<string | null>(null)
  const [hover, setHover] = useState<Date | null>(null)
  const [view, setView] = useState(() => startOfMonth(plusMonths(opensOn, -1)))
  const [slide, setSlide] = useState<{ key: number; dir: 'next' | 'prev' }>({ key: 0, dir: 'next' })
  const [focus, setFocus] = useState(opensOn)
  const [jump, setJump] = useState<Jump | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }, [])

  const quickText: Record<string, string> = {
    today: labels.today,
    last7Days: labels.last7Days,
    last14Days: labels.last14Days,
    last30Days: labels.last30Days,
    thisWeek: words.thisWeek,
    thisMonth: words.thisMonth,
    lastMonth: words.lastMonth,
  }
  const quick: StudioPreset[] = quickRanges(today).map(item => ({ ...item, label: quickText[item.key] }))
  const academicLabel = (range: AcademicRange) =>
    range.kind === 'year' ? `${words.academicYear} ${range.name}` : words[`${range.kind}Term`]
  const toPreset = (range: AcademicRange): StudioPreset => ({
    key: range.key,
    label: academicLabel(range),
    start: range.start,
    end: range.end,
    tone: TERM_TONES[range.kind],
  })
  const thisYear = currentAcademicYear(today)
  const academic: StudioPreset[] = [
    ...academicTerms(thisYear).map(toPreset),
    ...presets,
    toPreset(academicTerms(thisYear - 1)[0]),
  ]
  const allPresets = [...quick, ...academic]
  const active = range.end
    ? allPresets.find(p => isSameDay(p.start, range.start) && isSameDay(p.end, range.end))
    : undefined

  const preview =
    !range.end && hover ? (hover < range.start ? [hover, range.start] : [range.start, hover]) : null
  const from = preview ? preview[0] : range.start
  const to = preview ? preview[1] : range.end

  const moveView = (months: number) => {
    setView(current => plusMonths(current, months))
    setSlide(current => ({ key: current.key + 1, dir: months > 0 ? 'next' : 'prev' }))
  }
  const showDay = (day: Date) => {
    const second = plusMonths(view, 1)
    if (day < view) moveView(-1)
    else if (day >= plusMonths(second, 1)) moveView(1)
  }
  const choose = (day: Date) => {
    setRange(current => {
      if (!current.end && day < current.start) setRangeNotice(words.rangeReordered)
      else setRangeNotice(null)
      return pickDay(current, day)
    })
    setHover(null)
    setFocus(day)
  }
  const applyPreset = (preset: StudioPreset) => {
    setRangeNotice(null)
    setRange({ start: dayOnly(preset.start), end: dayOnly(preset.end) })
    setFocus(dayOnly(preset.end))
    setView(startOfMonth(plusMonths(dayOnly(preset.end), -1)))
    setSlide(current => ({ key: current.key + 1, dir: 'next' }))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Only the day grid owns these keys; presets, chips and the jump panel keep their own behaviour.
    if (jump || !(event.target as HTMLElement).dataset.day) return
    let next: Date | null = null
    if (event.key in ARROW_KEYS) next = plusDays(focus, ARROW_KEYS[event.key])
    else if (event.key === 'PageUp' || event.key === 'PageDown') {
      const shifted = new Date(focus.getFullYear(), focus.getMonth() + (event.key === 'PageDown' ? 1 : -1), 1)
      const last = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate()
      next = new Date(shifted.getFullYear(), shifted.getMonth(), Math.min(focus.getDate(), last))
    } else if (event.key === 'Home') next = today
    else if (event.key === 'Enter') {
      event.preventDefault()
      choose(focus)
      return
    }
    if (!next) return
    event.preventDefault()
    setFocus(next)
    if (!range.end) setHover(next)
    showDay(next)
  }

  const days = range.end ? countDays(range.start, range.end) : null
  // Both counts were always plural, so a single day read "1 days · 1 weekdays".
  const dayWord = days === 1 ? words.day : words.days
  const weekdayCount = range.end ? countWeekdays(range.start, range.end) : null
  const weekdayText =
    weekdayCount === null
      ? words.hoverHint
      : `${weekdayCount} ${weekdayCount === 1 ? words.weekday : words.weekdays}`

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={next => {
        if (!next) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-overlay-in bg-slate-950/40 backdrop-blur-[3px] motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onCloseAutoFocus={event => {
            event.preventDefault()
            returnFocus.current?.focus()
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 grid max-h-[92vh] animate-dialog-in grid-cols-1 overflow-y-auto rounded-[18px] border border-border bg-white shadow-[0_40px_80px_-28px_rgba(8,30,55,.45),0_10px_24px_-14px_rgba(21,102,162,.3)] outline-none motion-reduce:animate-none',
            hidePresets
              ? 'w-[min(960px,calc(100vw-32px))]'
              : 'w-[min(1250px,calc(100vw-32px))] md:grid-cols-[288px_1fr]',
          )}
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          <DialogPrimitive.Title className="sr-only">{labels.dateRange}</DialogPrimitive.Title>

          {hidePresets ? null : (
            <aside className="hidden flex-col gap-1.5 overflow-y-auto border-r border-border bg-[linear-gradient(180deg,var(--color-studio-rail-start),var(--color-studio-rail-end))] px-4 py-5 md:flex">
              <RailGroup title={words.quick}>
                {quick.map((preset, index) => (
                  <PresetButton
                    key={preset.key}
                    preset={preset}
                    index={index}
                    active={active?.key === preset.key}
                    dayWord={DAY_SHORT}
                    onClick={() => applyPreset(preset)}
                  />
                ))}
              </RailGroup>
              {academic.length ? (
                <RailGroup title={words.academic}>
                  {academic.map((preset, index) => (
                    <PresetButton
                      key={preset.key}
                      preset={preset}
                      index={quick.length + index}
                      active={active?.key === preset.key}
                      dayWord={DAY_SHORT}
                      onClick={() => applyPreset(preset)}
                    />
                  ))}
                </RailGroup>
              ) : null}
            </aside>
          )}

          <div className="flex min-w-0 flex-col">
            {/* Below md the rail is hidden, so the same presets wrap as chips; tab order follows the visual order. */}
            {hidePresets ? null : (
              <div className="flex flex-col gap-2 border-b border-border/70 px-4 py-3 md:hidden">
                {[
                  { title: words.quick, items: quick },
                  { title: words.academic, items: academic },
                ]
                  .filter(group => group.items.length > 0)
                  .map(group => (
                    <div
                      key={group.title}
                      role="group"
                      aria-label={group.title}
                      className="flex flex-wrap gap-1.5"
                    >
                      {group.items.map(preset => (
                        <button
                          key={preset.key}
                          type="button"
                          aria-pressed={active?.key === preset.key}
                          onClick={() => applyPreset(preset)}
                          className={cn(
                            'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-left text-xs font-medium transition-colors duration-300 ease-premium',
                            active?.key === preset.key
                              ? 'border-brand bg-brand/[0.06] text-foreground'
                              : 'border-border bg-white text-foreground hover:border-brand/50 hover:text-brand',
                            FOCUS,
                          )}
                        >
                          <ToneDot tone={preset.tone} />
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  ))}
              </div>
            )}
            {/* Three columns keep the From/To pair centred on the whole panel, not just the space beside the count. */}
            <div className="grid grid-cols-1 items-center gap-4 border-b border-border/70 px-4 pt-5 pb-4 sm:grid-cols-[1fr_auto_1fr] sm:px-8 sm:pt-7 sm:pb-6">
              <span aria-hidden className="hidden sm:block" />
              <div className="flex min-w-0 flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center sm:gap-3">
                {rangeNotice ? (
                  <p
                    role="status"
                    className="col-span-full text-center text-sm font-medium text-brand sm:col-span-3"
                  >
                    {rangeNotice}
                  </p>
                ) : null}
                <RangeChip label={labels.startDate} value={formatDate(range.start)} on={!!range.end} />
                <span
                  aria-hidden
                  className="grid size-8 shrink-0 rotate-90 place-items-center self-center rounded-full bg-brand/[0.07] text-brand ring-1 ring-brand/15 sm:rotate-0"
                >
                  <ArrowRight className="size-4" />
                </span>
                <RangeChip
                  label={labels.endDate}
                  value={range.end ? formatDate(range.end) : words.pickEnd}
                  on={!range.end}
                />
              </div>
              <div className="flex items-start justify-end gap-3">
                <div className="flex flex-col items-end">
                  <p className="flex items-baseline gap-1.5">
                    <span
                      key={days ?? 'none'}
                      className="inline-block animate-rise-in bg-[linear-gradient(180deg,var(--color-studio-count-start),var(--color-studio-count-end))] bg-clip-text text-[28px] leading-8 font-bold tabular-nums text-transparent drop-shadow-[0_2px_6px_rgba(21,102,162,.25)] motion-reduce:animate-none"
                    >
                      {days ?? ELLIPSIS}
                    </span>
                    <span className="text-sm font-medium text-brand">{dayWord}</span>
                  </p>
                  <p className="text-xs font-medium tabular-nums text-muted-foreground">{weekdayText}</p>
                </div>
                <DialogPrimitive.Close
                  aria-label={labels.close}
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full text-slate-500 transition-[rotate,background-color,color] duration-300 hover:rotate-90 hover:bg-slate-100 hover:text-foreground',
                    FOCUS,
                  )}
                >
                  <X aria-hidden className="size-4" />
                </DialogPrimitive.Close>
              </div>
            </div>

            <div className="relative grid flex-1 grid-cols-1 gap-10 px-4 pb-4 pt-6 sm:grid-cols-2 sm:px-8">
              {[0, 1].map(offset => {
                const month = plusMonths(view, offset)
                return (
                  <div
                    key={`${slide.key}-${offset}`}
                    className={cn(
                      'min-w-0 motion-reduce:animate-none',
                      slide.dir === 'next' ? 'animate-slide-in' : 'animate-fade-in',
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      {offset === 0 ? (
                        <button
                          type="button"
                          aria-label={labels.previous}
                          onClick={() => moveView(-1)}
                          className={NAV}
                        >
                          <ChevronLeft aria-hidden className="size-4" />
                        </button>
                      ) : (
                        <span className="size-10" />
                      )}
                      <button
                        type="button"
                        aria-label={labels.chooseMonthYear}
                        onClick={() =>
                          setJump({
                            month: offset as 0 | 1,
                            step: 'year',
                            year: month.getFullYear(),
                            page: month.getFullYear(),
                          })
                        }
                        className={cn(
                          'group/jump inline-flex min-w-0 items-center gap-1 rounded-lg px-3 py-1.5 text-lg font-semibold text-foreground transition-colors hover:bg-brand/[0.07] hover:text-brand',
                          FOCUS,
                        )}
                      >
                        {monthTitle(month)}
                        <ChevronDown
                          aria-hidden
                          className="size-4 text-slate-500 transition-transform duration-300 group-hover/jump:translate-y-px group-hover/jump:text-brand"
                        />
                      </button>
                      {offset === 1 ? (
                        <button
                          type="button"
                          aria-label={labels.next}
                          onClick={() => moveView(1)}
                          className={NAV}
                        >
                          <ChevronRight aria-hidden className="size-4" />
                        </button>
                      ) : (
                        <span className="size-10" />
                      )}
                    </div>
                    <MonthGrid
                      month={month}
                      today={today}
                      from={from}
                      to={to}
                      isPreview={!!preview}
                      focus={focus}
                      formatDate={formatDate}
                      onPick={choose}
                      onHover={day => {
                        if (!range.end) setHover(day)
                      }}
                    />
                  </div>
                )
              })}

              {jump ? (
                <JumpPanel
                  jump={jump}
                  today={today}
                  hint={words.jumpHint}
                  labels={labels}
                  onChange={setJump}
                  onDone={(year, monthIndex) => {
                    const picked = new Date(year, monthIndex, 1)
                    setView(jump.month === 0 ? picked : plusMonths(picked, -1))
                    setSlide(current => ({ key: current.key + 1, dir: 'next' }))
                    setFocus(picked)
                    setJump(null)
                  }}
                />
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-border bg-[var(--color-studio-footer)] px-4 py-4 sm:px-8">
              <span className="text-sm text-muted-foreground">{words.keysHint}</span>
              <span className="ml-auto" />
              <DialogPrimitive.Close
                className={cn(
                  'inline-flex h-12 items-center rounded-xl border border-border bg-white px-5 text-[15px] font-semibold transition-colors hover:border-brand/50 hover:text-brand',
                  FOCUS,
                )}
              >
                {labels.cancel}
              </DialogPrimitive.Close>
              <button
                type="button"
                disabled={!range.end}
                onClick={() => range.end && onSelect(range.start, range.end)}
                className={PRIMARY}
              >
                {labels.selectRange}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function RailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-3 pb-1.5 pt-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{title}</p>
      {children}
    </div>
  )
}

function PresetButton({
  preset,
  index,
  active,
  dayWord,
  onClick,
}: {
  preset: StudioPreset
  index: number
  active: boolean
  dayWord: string
  onClick: () => void
}) {
  const total = countDays(preset.start, preset.end)
  const count = `${total}${dayWord}`
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ animationDelay: `${index * 35}ms` }}
      className={cn(
        'flex animate-rise-in items-center gap-3 rounded-[11px] px-3 py-2.5 text-left text-[15px] font-medium [animation-fill-mode:both] transition-[background-color,box-shadow,padding,color] duration-[400ms] ease-premium motion-reduce:animate-none',
        FOCUS,
        active
          ? 'bg-white text-foreground shadow-[0_6px_18px_-8px_rgba(15,23,42,.28),inset_0_0_0_1px_var(--color-border)]'
          : 'text-foreground hover:bg-white hover:pl-4 hover:shadow-[0_4px_14px_-8px_rgba(15,23,42,.25),inset_0_0_0_1px_var(--color-border)]',
      )}
    >
      <ToneDot tone={preset.tone} />
      <span className="min-w-0 flex-1 leading-snug">{preset.label}</span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{count}</span>
    </button>
  )
}

// Untoned presets use slate-500 so the glyph keeps 3:1 against the rail.
function ToneDot({ tone }: { tone?: string }) {
  return (
    <span
      aria-hidden
      className={cn('size-2.5 shrink-0 rounded-full', !tone && 'bg-slate-500')}
      style={tone ? { background: tone } : undefined}
    />
  )
}

function RangeChip({ label, value, on }: { label: string; value: string; on: boolean }) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col sm:min-w-[170px] items-center gap-0.5 rounded-xl border px-5 py-2.5 text-center transition-[border-color,box-shadow,background-color] duration-300',
        on
          ? 'border-brand bg-brand/[0.04] shadow-[0_0_0_3px_rgba(21,102,162,.12)]'
          : 'border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,.05)]',
      )}
    >
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="break-words text-lg leading-6 font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </div>
  )
}

function MonthGrid({
  month,
  today,
  from,
  to,
  isPreview,
  focus,
  formatDate,
  onPick,
  onHover,
}: {
  month: Date
  today: Date
  from: Date
  to: Date | null
  isPreview: boolean
  focus: Date
  formatDate: (date: Date) => string
  onPick: (day: Date) => void
  onHover: (day: Date) => void
}) {
  const longNames = weekNames('long')
  return (
    <div role="grid" aria-label={monthTitle(month)} className="flex flex-col gap-y-0.5">
      <div role="row" className="grid grid-cols-7">
        {weekNames('short').map((name, index) => (
          <div
            key={name}
            role="columnheader"
            aria-label={longNames[index]}
            className="py-2 text-center text-xs font-bold uppercase tracking-[0.06em] text-slate-500"
          >
            {name}
          </div>
        ))}
      </div>
      {monthWeeks(month).map((week, row) => (
        <div key={row} role="row" className="grid grid-cols-7">
          {week.map((day, index) => {
            if (!day) return <div key={`blank-${index}`} role="gridcell" />
            const isStart = isSameDay(day, from)
            const isEnd = isSameDay(day, to)
            const inside = !!to && day > from && day < to
            const weekend = day.getDay() === 0 || day.getDay() === 6
            const edge = isStart || isEnd
            return (
              <button
                key={day.getTime()}
                type="button"
                role="gridcell"
                data-day="true"
                aria-selected={edge || inside}
                aria-label={formatDate(day)}
                tabIndex={isSameDay(day, focus) ? 0 : -1}
                ref={node => {
                  if (
                    node &&
                    isSameDay(day, focus) &&
                    node.ownerDocument.activeElement?.hasAttribute('data-day')
                  )
                    node.focus()
                }}
                onClick={() => onPick(day)}
                onMouseEnter={() => onHover(day)}
                className={cn(
                  'group/day relative isolate grid h-12 place-items-center text-[15px] font-medium tabular-nums outline-none',
                  weekend && !edge && !inside ? 'text-slate-500' : 'text-foreground',
                  (inside || (edge && to && !isSameDay(from, to))) &&
                    'before:absolute before:inset-y-[3px] before:-z-10 before:content-[""]',
                  inside && 'before:inset-x-0',
                  isStart && to && !isSameDay(from, to) && 'before:left-1/2 before:right-0',
                  isEnd && !isSameDay(from, to) && 'before:left-0 before:right-1/2',
                  isPreview
                    ? 'before:bg-[repeating-linear-gradient(135deg,rgba(21,102,162,.08)_0_6px,rgba(21,102,162,.15)_6px_12px)]'
                    : 'before:bg-brand/[0.09]',
                )}
              >
                <span
                  className={cn(
                    'grid size-8 place-items-center rounded-full transition-[background-color,color,transform,box-shadow] duration-300 ease-[cubic-bezier(.3,1.6,.5,1)] sm:size-11',
                    edge
                      ? 'animate-[badge-in_380ms_cubic-bezier(.3,1.6,.5,1)] bg-linear-145 from-sky-700 to-brand text-white shadow-[0_6px_14px_-5px_rgba(21,102,162,.65)] motion-reduce:animate-none'
                      : 'group-hover/day:scale-110 group-hover/day:bg-brand/10 group-hover/day:text-brand',
                    !edge &&
                      isSameDay(day, today) &&
                      'font-bold text-brand shadow-[inset_0_0_0_1.5px_var(--color-brand)]',
                    'group-focus-visible/day:ring-2 group-focus-visible/day:ring-ring',
                  )}
                >
                  {day.getDate()}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function JumpPanel({
  jump,
  today,
  hint,
  labels,
  onChange,
  onDone,
}: {
  jump: Jump
  today: Date
  hint: string
  labels: DateRangeLabels
  onChange: (jump: Jump | null) => void
  onDone: (year: number, month: number) => void
}) {
  const firstYear = jump.page - (jump.page % YEAR_PAGE)
  const years = Array.from({ length: YEAR_PAGE }, (_, i) => firstYear + i)
  const title = jump.step === 'year' ? `${years[0]} – ${years[YEAR_PAGE - 1]}` : `${jump.year}`
  const CELL = cn(
    'animate-rise-in rounded-xl py-3.5 text-sm font-semibold tabular-nums [animation-fill-mode:both] transition-[background-color,color,translate,box-shadow] duration-300 ease-premium hover:-translate-y-0.5 hover:bg-brand/[0.08] hover:text-brand motion-reduce:animate-none',
    FOCUS,
  )
  return (
    // Top-pinned so the height comes from the years themselves; pinning both edges inherited the day
    // view's six-row height and left a white band above and below the grid.
    <div className="absolute inset-x-6 top-2 z-10 flex animate-field-in flex-col rounded-2xl border border-border bg-white/95 p-5 shadow-[0_24px_48px_-20px_rgba(8,30,55,.35)] backdrop-blur-md motion-reduce:animate-none">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label={labels.previous}
          onClick={() =>
            onChange(
              jump.step === 'year'
                ? { ...jump, page: jump.page - YEAR_PAGE }
                : { ...jump, year: jump.year - 1 },
            )
          }
          className={NAV}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...jump, step: 'year', page: jump.year })}
          className={cn(
            'rounded-lg px-2 py-1 text-base font-semibold tabular-nums hover:bg-brand/[0.07] hover:text-brand',
            FOCUS,
          )}
        >
          {title}
        </button>
        <button
          type="button"
          aria-label={labels.next}
          onClick={() =>
            onChange(
              jump.step === 'year'
                ? { ...jump, page: jump.page + YEAR_PAGE }
                : { ...jump, year: jump.year + 1 },
            )
          }
          className={NAV}
        >
          <ChevronRight aria-hidden className="size-4" />
        </button>
        <span className="text-xs text-muted-foreground">{hint}</span>
        <button
          type="button"
          aria-label={labels.close}
          onClick={() => onChange(null)}
          className={cn(
            'ml-auto grid size-8 place-items-center rounded-full text-slate-500 transition-[rotate,background-color] duration-300 hover:rotate-90 hover:bg-slate-100',
            FOCUS,
          )}
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {jump.step === 'year'
          ? years.map((year, i) => (
              <button
                key={year}
                type="button"
                style={{ animationDelay: `${i * 25}ms` }}
                onClick={() => onChange({ ...jump, step: 'month', year })}
                className={cn(
                  CELL,
                  year === jump.year &&
                    'bg-brand text-white shadow-[0_8px_18px_-8px_rgba(21,102,162,.6)] hover:bg-brand hover:text-white',
                  year === today.getFullYear() &&
                    year !== jump.year &&
                    'shadow-[inset_0_0_0_1.5px_var(--color-brand)] text-brand',
                )}
              >
                {year}
              </button>
            ))
          : monthNames().map((name, i) => (
              <button
                key={name}
                type="button"
                style={{ animationDelay: `${i * 25}ms` }}
                onClick={() => onDone(jump.year, i)}
                className={cn(
                  CELL,
                  jump.year === today.getFullYear() &&
                    i === today.getMonth() &&
                    'shadow-[inset_0_0_0_1.5px_var(--color-brand)] text-brand',
                )}
              >
                {name}
              </button>
            ))}
      </div>
    </div>
  )
}
