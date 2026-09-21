'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from './cn'

export type TimePickerLabels = { hours: string; minutes: string; empty: string }

// Used only when a caller passes an empty word, so no control is ever nameless.
export const TIME_FALLBACK: TimePickerLabels & { time: string } = {
  hours: 'Hours',
  minutes: 'Minutes',
  empty: 'All day',
  time: 'Time',
}

export type TimePickerProps = {
  id: string
  // Accessible name for the trigger and its panel; the chosen time is read as the description.
  label: string
  value: string
  onChange: (value: string) => void
  // Allowed "HH:mm" values; hours and minutes are built from these.
  options: readonly string[]
  labels: TimePickerLabels
  allowEmpty?: boolean
  align?: 'start' | 'end'
  className?: string
}

const SEPARATOR = ':'
const GAP = 8
const PANEL_WIDTH = 416
const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'))
const QUARTERS = ['00', '15', '30', '45']

const split = (time: string) => {
  const [hour = '', minute = ''] = time.split(':')
  return { hour, minute }
}

export function TimePicker({
  id,
  label: rawLabel,
  value,
  onChange,
  options,
  labels: rawLabels,
  allowEmpty = true,
  align = 'start',
  className,
}: TimePickerProps) {
  const label = rawLabel || TIME_FALLBACK.time
  const labels = {
    hours: rawLabels.hours || TIME_FALLBACK.hours,
    minutes: rawLabels.minutes || TIME_FALLBACK.minutes,
    empty: rawLabels.empty || TIME_FALLBACK.empty,
  }
  const panelId = useId()
  const valueId = `${id}-value`
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const draftRef = useRef(value)

  // Every hour and quarter is shown; ones outside `options` stay visible but disabled.
  const selected = split(draft)
  const minutesFor = (hour: string) =>
    options.filter(option => split(option).hour === hour).map(option => split(option).minute)
  const minutes = [...new Set([...QUARTERS, ...options.map(option => split(option).minute)])].sort()

  const setBoth = (next: string) => {
    draftRef.current = next
    setDraft(next)
  }

  const show = () => {
    setBoth(value)
    setOpen(true)
  }

  // The panel is portalled, so keyboard users are moved into it: the chosen hour, else the first enabled one.
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel || panel.contains(document.activeElement)) return
    const target =
      panel.querySelector<HTMLButtonElement>('button[aria-pressed="true"]:not(:disabled)') ??
      panel.querySelector<HTMLButtonElement>('button:not(:disabled)')
    target?.focus()
  }, [open])

  const close = (commit: string | null, focusTrigger = false) => {
    setOpen(false)
    if (commit !== null && commit !== value) onChange(commit)
    if (focusTrigger) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) close(draftRef.current)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Captured before a parent dialog sees it, so Escape closes the picker alone.
        event.stopPropagation()
        close(draftRef.current, true)
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const buttons = [...panelRef.current.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey, true)
    }
  })

  // The panel lives in a top layer so tables and sticky headers never cover it.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const trigger = triggerRef.current?.getBoundingClientRect()
      if (!trigger) return
      const width = panelRef.current?.offsetWidth ?? PANEL_WIDTH
      const height = panelRef.current?.offsetHeight ?? 0
      const preferred = align === 'end' ? trigger.right - width : trigger.left
      const left = Math.max(GAP, Math.min(preferred, window.innerWidth - width - GAP))
      const below = trigger.bottom + GAP
      const flip = below + height > window.innerHeight - GAP && trigger.top - height - GAP > GAP
      const top = flip ? trigger.top - height - GAP : below
      setPosition(current => (current?.top === top && current.left === left ? current : { top, left }))
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  })

  const pickHour = (hour: string) => {
    const available = minutesFor(hour)
    setBoth(`${hour}:${available.includes(selected.minute) ? selected.minute : available[0]}`)
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-label={label}
        aria-describedby={valueId}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close(draftRef.current) : show())}
        className={cn(
          'group/time flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-white px-3 text-sm text-foreground shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-brand/80 hover:shadow-[0_2px_6px_-2px_rgba(15,23,42,.12)] focus-visible:border-brand focus-visible:shadow-[0_0_0_4px_rgba(21,102,162,.1)] focus-visible:outline-none',
          open && 'border-brand/60 shadow-[0_0_0_4px_rgba(21,102,162,.1)]',
          className,
        )}
      >
        <ClockFace time={open ? draft : value} active={open} />
        <span id={valueId} className={cn('truncate tabular-nums', !value && 'text-slate-600')}>
          {value || labels.empty}
        </span>
      </button>

      {open
        ? createPortal(
            <>
              <div
                aria-hidden
                className="fixed inset-0 z-[55] animate-overlay-in bg-slate-900/25 backdrop-blur-[3px] motion-reduce:animate-none"
              />
              <div
                ref={panelRef}
                style={{ top: position?.top ?? -9999, left: position?.left ?? -9999 }}
                id={panelId}
                data-floating-layer=""

                role="dialog"
                aria-label={label}
                className={cn(
                  'fixed z-[60] w-[26rem] max-w-[calc(100vw-16px)] origin-top animate-[picker-in_380ms_cubic-bezier(0.16,1,0.3,1)_both] rounded-2xl border border-slate-200/80 bg-white p-4 shadow-float motion-reduce:animate-none',
                )}
              >
                <div className="mb-4 flex items-center justify-between rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/70 px-4 py-3 ring-1 ring-inset ring-slate-900/[.04]">
                  <div
                    aria-live="polite"
                    className="flex items-baseline gap-1 text-3xl font-semibold tracking-tight tabular-nums text-foreground"
                  >
                    {draft ? (
                      <>
                        <span key={`h${selected.hour}`} className="animate-rise-in">
                          {selected.hour}
                        </span>
                        <span className="animate-soft-pulse text-slate-500">{SEPARATOR}</span>
                        <span key={`m${selected.minute}`} className="animate-rise-in">
                          {selected.minute}
                        </span>
                      </>
                    ) : (
                      <span className="text-base font-medium text-slate-500">{labels.empty}</span>
                    )}
                  </div>
                  {allowEmpty ? (
                    <button
                      type="button"
                      aria-pressed={!draft}
                      onClick={() => close('', true)}
                      className={cn(
                        'h-8 rounded-full px-3.5 text-xs font-semibold transition-[background-color,color,box-shadow,transform] duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 active:scale-95',
                        draft
                          ? 'bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-foreground hover:shadow'
                          : 'bg-brand text-white shadow-[0_4px_12px_-4px_rgba(21,102,162,.6)]',
                      )}
                    >
                      {labels.empty}
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-4">
                  <div>
                    <p className="mb-2 px-0.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                      {labels.hours}
                    </p>
                    <div
                      role="group"
                      aria-label={labels.hours}
                      className="grid grid-cols-4 gap-1.5 sm:grid-cols-6"
                    >
                      {HOURS.map((hour, index) => (
                        <PickButton
                          key={hour}
                          text={hour}
                          selected={Boolean(draft) && hour === selected.hour}
                          disabled={minutesFor(hour).length === 0}
                          delay={index * 10}
                          onClick={() => pickHour(hour)}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="border-l border-slate-100 pl-4">
                    <p className="mb-2 px-0.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                      {labels.minutes}
                    </p>
                    <div role="group" aria-label={labels.minutes} className="grid gap-1.5">
                      {minutes.map((minute, index) => (
                        <PickButton
                          key={minute}
                          text={`${SEPARATOR}${minute}`}
                          selected={Boolean(draft) && minute === selected.minute}
                          disabled={!selected.hour || !minutesFor(selected.hour).includes(minute)}
                          delay={80 + index * 30}
                          onClick={() => close(`${selected.hour}:${minute}`, true)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  )
}

type PickButtonProps = {
  text: string
  selected: boolean
  disabled?: boolean
  delay: number
  onClick: () => void
}

function PickButton({ text, selected, disabled = false, delay, onClick }: PickButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        'h-9 min-w-12 animate-item-in rounded-lg px-2 text-sm font-medium tabular-nums transition-[background-color,color,box-shadow,transform] duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:pointer-events-none disabled:text-slate-300 motion-reduce:animate-none',
        selected
          ? 'bg-brand text-white shadow-[0_4px_12px_-4px_rgba(21,102,162,.65)]'
          : 'text-slate-600 hover:-translate-y-px hover:bg-slate-100 hover:text-foreground',
      )}
    >
      {text}
    </button>
  )
}

// A small clock whose hands glide to the chosen time.
function ClockFace({ time, active }: { time: string; active: boolean }) {
  const { hour, minute } = split(time)
  const h = Number(hour) || 0
  const m = Number(minute) || 0
  const hourAngle = time ? (h % 12) * 30 + m * 0.5 : 300
  const minuteAngle = time ? m * 6 : 60
  const hand =
    'origin-[12px_12px] transition-transform duration-700 ease-premium motion-reduce:transition-none'
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        'size-4 shrink-0 fill-none stroke-current stroke-2 transition-colors duration-300',
        active ? 'text-brand' : 'text-slate-500 group-hover/time:text-brand',
      )}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9.5" />
      <line
        x1="12"
        y1="12"
        x2="12"
        y2="7.5"
        className={hand}
        style={{ transform: `rotate(${hourAngle}deg)` }}
      />
      <line
        x1="12"
        y1="12"
        x2="12"
        y2="5.5"
        className={hand}
        style={{ transform: `rotate(${minuteAngle}deg)` }}
      />
    </svg>
  )
}
