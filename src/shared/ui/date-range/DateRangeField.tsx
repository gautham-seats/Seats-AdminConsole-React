'use client'

import { CalendarDays } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '../cn'
import { TIME_FALLBACK, TimePicker } from '../TimePicker'
import type { DateRangeLabels } from './DateRangeDialog'
import { StudioRangeDialog, type StudioLabels, type StudioPreset } from './StudioRangeDialog'

// Time labels are needed only when the field shows time boxes.
export type DateRangeFieldLabels = DateRangeLabels & {
  startTime?: string
  endTime?: string
  hours?: string
  minutes?: string
  allDay?: string
}

type TimeProps = {
  start: string
  end: string
  options: readonly string[]
  onChange: (start: string, end: string) => void
}

export type DateRangeFieldProps = {
  id: string
  start: Date
  end: Date
  onChange: (start: Date, end: Date) => void
  // Time boxes appear only when a page filters by time too.
  time?: TimeProps
  labels: DateRangeFieldLabels
  formatDate: (date: Date) => string
  className?: string
  // Screens whose legacy page had no quick ranges (Users Activity) hide the presets.
  hidePresets?: boolean
  // Extra Academic presets and word overrides for the picker.
  studio?: { presets?: readonly StudioPreset[]; labels?: Partial<StudioLabels> }
  // Defaults to the browser clock; the tenant time zone is still open as parity item J8.
  today?: Date
}

const BOX =
  'field-bloom group/date flex min-h-10 min-w-0 items-center gap-2 rounded-md border border-input bg-white px-3 py-1.5 text-sm tabular-nums text-foreground shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-brand/80 hover:shadow-[0_2px_6px_-2px_rgba(15,23,42,.12)] focus-visible:border-brand focus-visible:shadow-[0_0_0_4px_rgba(21,102,162,.1)] focus-visible:outline-none'

// Used only when a caller shows time boxes without passing these words.
const TIME_FIELD_FALLBACK = { startTime: 'Start time', endTime: 'End time' }

export function DateRangeField({
  id,
  start,
  end,
  onChange,
  time,
  labels,
  formatDate,
  className,
  hidePresets,
  studio,
  today,
}: DateRangeFieldProps) {
  const [open, setOpen] = useState<'start' | 'end' | null>(null)
  const timeLabels = {
    hours: labels.hours || TIME_FALLBACK.hours,
    minutes: labels.minutes || TIME_FALLBACK.minutes,
    empty: labels.allDay || TIME_FALLBACK.empty,
  }
  const startTimeLabel = labels.startTime || TIME_FIELD_FALLBACK.startTime
  const endTimeLabel = labels.endTime || TIME_FIELD_FALLBACK.endTime

  return (
    <div
      role="group"
      aria-label={labels.dateRange}
      className={cn('grid min-w-0 grid-cols-2 items-end gap-3', className)}
    >
      <DateBox
        id={`${id}-start`}
        label={labels.startDate}
        text={formatDate(start)}
        onOpen={() => setOpen('start')}
      />
      {time ? (
        <Labelled id={`${id}-start-time`} label={startTimeLabel}>
          <TimePicker
            id={`${id}-start-time`}
            label={startTimeLabel}
            value={time.start}
            options={time.options}
            labels={timeLabels}
            onChange={value => time.onChange(value, time.end)}
          />
        </Labelled>
      ) : null}
      <DateBox id={`${id}-end`} label={labels.endDate} text={formatDate(end)} onOpen={() => setOpen('end')} />
      {time ? (
        <Labelled id={`${id}-end-time`} label={endTimeLabel}>
          <TimePicker
            id={`${id}-end-time`}
            label={endTimeLabel}
            value={time.end}
            options={time.options}
            labels={timeLabels}
            align="end"
            onChange={value => time.onChange(time.start, value)}
          />
        </Labelled>
      ) : null}
      {open ? (
        <StudioRangeDialog
          initialFocus={open}
          start={start}
          end={end}
          today={today ?? new Date()}
          labels={labels}
          studioLabels={studio?.labels}
          presets={studio?.presets}
          hidePresets={hidePresets}
          formatDate={formatDate}
          onClose={() => setOpen(null)}
          onSelect={(from, to) => {
            setOpen(null)
            onChange(from, to)
          }}
        />
      ) : null}
    </div>
  )
}

function Labelled({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function DateBox({
  id,
  label,
  text,
  onOpen,
}: {
  id: string
  label: string
  text: string
  onOpen: () => void
}) {
  return (
    <Labelled id={id} label={label}>
      {/* The <label for> is the button's name, so the chosen date is announced as its description. */}
      <button type="button" id={id} aria-describedby={`${id}-value`} onClick={onOpen} className={BOX}>
        <CalendarDays
          aria-hidden
          className="size-4 shrink-0 text-slate-500 transition-[color,transform] duration-300 ease-premium group-hover/date:-rotate-6 group-hover/date:text-brand"
        />
        <span id={`${id}-value`} className="min-w-0 break-words text-left">
          {text}
        </span>
      </button>
    </Labelled>
  )
}
