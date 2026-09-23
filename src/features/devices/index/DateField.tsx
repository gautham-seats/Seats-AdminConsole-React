'use client'

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '@/shared/ui/cn'
import { addDays, datePattern, formatDate, monthGrid, parseDate, sameDay } from './date-input'

type DateFieldLabels = {
  label: string
  chooseDate: string
  previousMonth: string
  nextMonth: string
  today: string
}

type DateFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  error: string | null
  disabled: boolean
  labels: DateFieldLabels
  floating?: boolean
  required?: boolean
}

const WEEK_START = new Date(2024, 0, 1)

export function DateField({
  id,
  value,
  onChange,
  onSubmit,
  error,
  disabled,
  labels,
  floating = false,
  required = true,
}: DateFieldProps) {
  const errorId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!floating || !open) return
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [floating, open])
  const [month, setMonth] = useState(() => parseDate(value) ?? new Date())
  const [focusDay, setFocusDay] = useState<Date>(() => parseDate(value) ?? new Date())
  const selected = parseDate(value)
  const today = new Date()

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month),
    [month],
  )
  const weekdays = useMemo(() => {
    const format = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
    return Array.from({ length: 7 }, (_, index) => format.format(addDays(WEEK_START, index)))
  }, [])
  const dayLabel = useMemo(() => new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }), [])

  const openCalendar = () => {
    const start = selected ?? today
    setMonth(start)
    setFocusDay(start)
    setOpen(true)
  }

  const focusDate = (date: Date) => {
    setFocusDay(date)
    setMonth(date)
    requestAnimationFrame(() => document.getElementById(`${id}-day-${formatDate(date)}`)?.focus())
  }

  const pick = (date: Date) => {
    onChange(formatDate(date))
    setOpen(false)
    requestAnimationFrame(() => document.getElementById(id)?.focus())
  }

  const onGridKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (event.key in steps) {
      event.preventDefault()
      focusDate(addDays(focusDay, steps[event.key]))
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      document.getElementById(`${id}-toggle`)?.focus()
    }
  }

  return (
    <div ref={rootRef} className={cn('flex flex-col gap-1.5', floating && 'relative')}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {labels.label}
      </label>
      <div className="flex max-w-72 items-center gap-2">
        <input
          id={id}
          value={value}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="off"
          placeholder={datePattern()}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onSubmit()
            }
          }}
          className="field-bloom h-10 min-w-0 flex-1 rounded-md border border-input bg-white px-3 text-sm tabular-nums shadow-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50 aria-[invalid=true]:border-destructive"
        />
        <button
          id={`${id}-toggle`}
          type="button"
          disabled={disabled}
          aria-label={labels.chooseDate}
          aria-expanded={open}
          aria-controls={`${id}-calendar`}
          onClick={() => (open ? setOpen(false) : openCalendar())}
          className="lift-bloom lift-icon grid size-10 shrink-0 place-items-center rounded-md border border-input bg-white text-slate-700 shadow-sm transition-colors hover:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <CalendarDays aria-hidden className="size-4" />
        </button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
      {open ? (
        <div
          id={`${id}-calendar`}
          role="group"
          aria-label={labels.chooseDate}
          className={cn(
            'w-72 max-w-[calc(100vw-2rem)] animate-menu-in rounded-lg border border-border bg-white p-3 shadow-card-lift motion-reduce:animate-none',
            floating && 'absolute top-full left-0 z-40 mt-1',
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label={labels.previousMonth}
              onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              className="grid size-8 place-items-center rounded-md hover:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <span aria-live="polite" className="text-sm font-semibold">
              {monthLabel}
            </span>
            <button
              type="button"
              aria-label={labels.nextMonth}
              onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              className="grid size-8 place-items-center rounded-md hover:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center" onKeyDown={onGridKey}>
            {weekdays.map(day => (
              <span key={day} aria-hidden className="py-1 text-xs text-muted-foreground">
                {day}
              </span>
            ))}
            {monthGrid(month).map(date => {
              const inMonth = date.getMonth() === month.getMonth()
              const isSelected = selected !== null && sameDay(date, selected)
              const isToday = sameDay(date, today)
              return (
                <button
                  key={date.toISOString()}
                  id={`${id}-day-${formatDate(date)}`}
                  type="button"
                  tabIndex={sameDay(date, focusDay) ? 0 : -1}
                  aria-pressed={isSelected}
                  aria-label={dayLabel.format(date)}
                  onClick={() => pick(date)}
                  className={cn(
                    'h-8 rounded-md text-[13px] tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected ? 'bg-brand font-semibold text-white' : 'hover:bg-page',
                    !inMonth && !isSelected && 'text-slate-500',
                    isToday && !isSelected && 'ring-1 ring-brand/60',
                  )}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => pick(today)}
              className="rounded-md px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {labels.today}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
