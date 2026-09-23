'use client'

import { useState } from 'react'
import { cn } from '@/shared/ui/cn'
import { SHELL } from './BatteryGlyph'
import { BATTERY_CEILING, BATTERY_FLOOR, setBatteryBound, type BatteryRange } from './device-filters'

type BatteryRangeLabels = { title: string; from: string; to: string; adjusted: string }

type Bound = 'min' | 'max'

type BatteryRangeFieldProps = {
  id: string
  range: BatteryRange
  onChange: (range: BatteryRange) => void
  labels: BatteryRangeLabels
}

const DASH = '–'
const PERCENT = '%'

// Smooth low -> medium -> good ramp over the full 0-100 width; the chosen band is a clip window on it.
const BAND =
  'bg-[linear-gradient(90deg,var(--color-battery-low)_0%,var(--color-battery-low)_10%,var(--color-battery-medium)_22%,var(--color-battery-medium)_34%,var(--color-battery-good)_48%,var(--color-battery-good)_100%)]'

const THUMB =
  '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(15,23,42,.12),0_2px_6px_-1px_rgba(15,23,42,.35)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-300 [&::-webkit-slider-thumb]:ease-[cubic-bezier(.3,1.5,.5,1)] [&::-webkit-slider-thumb]:hover:scale-[1.15] active:[&::-webkit-slider-thumb]:scale-[1.15] focus-visible:[&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(21,102,162,.25),0_2px_6px_-1px_rgba(15,23,42,.35)] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_0_0_1px_rgba(15,23,42,.12),0_2px_6px_-1px_rgba(15,23,42,.35)]'

// Picker A (battery.designs.html): a live iPhone battery shows the band, two glass thumbs pick it.
// _IndexFilterRow.cshtml:17-24 semantics stay: 0-100, min <= max, the grid reloads once a bound is committed.
export function BatteryRangeField({ id, range, onChange, labels }: BatteryRangeFieldProps) {
  const [draft, setDraft] = useState<BatteryRange>(range)
  const [seen, setSeen] = useState(range)
  const [moved, setMoved] = useState<{ bound: Bound; value: number } | null>(null)
  // A reset or an outside change replaces the draft (adjust-state-during-render pattern).
  if (seen !== range) {
    setSeen(range)
    setDraft(range)
  }

  const drag = (bound: Bound, raw: number) => setDraft(current => setBatteryBound(current, bound, raw))
  // Reloading on every pixel would hammer the grid, so a bound is committed on release, key-up or blur.
  const commit = (bound: Bound) => {
    if (draft.min === range.min && draft.max === range.max) return
    const other: Bound = bound === 'min' ? 'max' : 'min'
    setMoved(draft[other] !== range[other] ? { bound: other, value: draft[other] } : null)
    onChange(draft)
  }
  const note =
    moved && range.touched && range[moved.bound] === moved.value
      ? `${moved.bound === 'min' ? labels.from : labels.to} ${labels.adjusted}: ${moved.value}`
      : ''

  const slider = (bound: Bound, label: string) => (
    <input
      id={`${id}-${bound}`}
      type="range"
      min={BATTERY_FLOOR}
      max={BATTERY_CEILING}
      step={1}
      value={draft[bound]}
      aria-label={label}
      aria-valuetext={`${draft[bound]}%`}
      onChange={event => drag(bound, Number(event.target.value))}
      onPointerUp={() => commit(bound)}
      onKeyUp={() => commit(bound)}
      onBlur={() => commit(bound)}
      className={cn(
        'pointer-events-none absolute inset-x-0 top-1/2 m-0 h-4 w-full -translate-y-1/2 appearance-none bg-transparent focus-visible:outline-none',
        THUMB,
      )}
    />
  )

  // Same anatomy as the other filter fields: label, then a 40px input-like box.
  return (
    <div role="group" aria-label={labels.title} className="flex min-w-0 flex-col gap-1.5">
      <span className="truncate text-sm font-medium text-foreground">{labels.title}</span>
      <div className="flex h-10 items-center gap-3 rounded-md border border-input bg-white px-3 shadow-sm">
        <span aria-hidden className={cn(SHELL, 'h-3.5 w-7 shrink-0')}>
          <span
            className={cn(
              'absolute inset-0.5 rounded-[2.5px] transition-[clip-path] duration-300 ease-premium',
              BAND,
            )}
            style={{ clipPath: `inset(0 ${100 - draft.max}% 0 ${draft.min}% round 2px)` }}
          />
        </span>
        <div className="relative h-4 min-w-0 flex-1">
          <div className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-900/[.1]" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand transition-[left,width] duration-150"
            style={{
              left: `calc(8px + (100% - 16px) * ${draft.min} / 100)`,
              width: `calc((100% - 16px) * ${draft.max - draft.min} / 100)`,
            }}
          />
          {slider('min', labels.from)}
          {slider('max', labels.to)}
        </div>
        <span className="shrink-0 text-sm font-medium text-foreground tabular-nums">
          {draft.min}
          <span className="mx-0.5 text-muted-foreground">{DASH}</span>
          {draft.max}
          <span className="ml-0.5 text-xs text-muted-foreground">{PERCENT}</span>
        </span>
      </div>
      <p aria-live="polite" className={note ? 'text-xs text-slate-600' : 'sr-only'}>
        {note}
      </p>
    </div>
  )
}
