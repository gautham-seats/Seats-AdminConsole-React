'use client'

import { useState, type KeyboardEvent } from 'react'
import { BATTERY_CEILING, BATTERY_FLOOR, setBatteryBound, type BatteryRange } from './device-filters'

export type BatteryRangeLabels = { title: string; from: string; to: string; adjusted: string }

type Bound = 'min' | 'max'

type BatteryRangeFieldProps = {
  id: string
  range: BatteryRange
  onChange: (range: BatteryRange) => void
  labels: BatteryRangeLabels
}

function BoundInput({
  id,
  label,
  value,
  placeholder,
  onCommit,
}: {
  id: string
  label: string
  value: number
  placeholder: number
  onCommit: (raw: number) => void
}) {
  const [text, setText] = useState<string | null>(null)
  const commit = () => {
    if (text === null) return
    if (text.trim() !== '') onCommit(Number(text))
    setText(null)
  }
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="truncate text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={BATTERY_FLOOR}
        max={BATTERY_CEILING}
        step={1}
        placeholder={String(placeholder)}
        value={text ?? String(value)}
        onChange={event => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          }
        }}
        className="field-bloom h-10 w-full rounded-md border border-input bg-white px-3 text-sm tabular-nums shadow-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      />
    </div>
  )
}

// _IndexFilterRow.cshtml:17-24: two labelled number inputs, placeholders 0 and 100.
export function BatteryRangeField({ id, range, onChange, labels }: BatteryRangeFieldProps) {
  const [moved, setMoved] = useState<{ bound: Bound; value: number } | null>(null)
  const set = (bound: Bound, raw: number) => {
    const next = setBatteryBound(range, bound, raw)
    const other: Bound = bound === 'min' ? 'max' : 'min'
    setMoved(next[other] !== range[other] ? { bound: other, value: next[other] } : null)
    onChange(next)
  }
  // The clamp moves the other bound silently in legacy; say so politely while it still holds.
  const note =
    moved && range.touched && range[moved.bound] === moved.value
      ? `${moved.bound === 'min' ? labels.from : labels.to} ${labels.adjusted}: ${moved.value}`
      : ''
  return (
    <div role="group" aria-label={labels.title} className="grid min-w-0 grid-cols-2 gap-3">
      <BoundInput
        id={`${id}-min`}
        label={labels.from}
        value={range.min}
        placeholder={BATTERY_FLOOR}
        onCommit={raw => set('min', raw)}
      />
      <BoundInput
        id={`${id}-max`}
        label={labels.to}
        value={range.max}
        placeholder={BATTERY_CEILING}
        onCommit={raw => set('max', raw)}
      />
      <p aria-live="polite" className={note ? 'col-span-2 text-xs text-slate-600' : 'sr-only'}>
        {note}
      </p>
    </div>
  )
}
