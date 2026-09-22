'use client'

import { Clock } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { datePattern, parseDate } from '../index/date-input'
import { DateField } from '../index/DateField'
import { DEVICES_FALLBACK_ONLY, invalidDateText, type DevicesText } from '../index/devices-text'
import { TIME_OPTIONS } from './readings-query'

export const ALL_OPTION = 'all'

export function FilterCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="relative z-10 grid grid-cols-1 items-start gap-x-4 gap-y-3 rounded-lg border border-border bg-white px-4 py-3.5 shadow-sm sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]"
    >
      {children}
    </section>
  )
}

type DateFilterProps = {
  id: string
  label: string
  value: string
  onApply: (value: string) => void
  t: DevicesText
}

// The legacy picker only ever emits a full date (ReadingsReport/Index.cshtml:106-110), so only valid dates apply.
export function DateFilter({ id, label, value, onApply, t }: DateFilterProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? value
  const invalid = draft !== null && draft.length >= datePattern().length && parseDate(draft) === null

  const change = (next: string) => {
    if (parseDate(next)) {
      setDraft(null)
      if (next !== value) onApply(next)
    } else {
      setDraft(next)
    }
  }

  return (
    <DateField
      id={id}
      value={text}
      onChange={change}
      onSubmit={() => {
        if (draft !== null && !parseDate(draft)) setDraft(null)
      }}
      error={invalid ? invalidDateText(datePattern()) : null}
      disabled={false}
      floating
      required={false}
      labels={{
        label,
        chooseDate: DEVICES_FALLBACK_ONLY.chooseDate,
        previousMonth: t('Previous'),
        nextMonth: t('Next'),
        today: t('Today'),
      }}
    />
  )
}

type TimeFilterProps = { id: string; label: string; value: string; onApply: (value: string) => void }

// timeOptions select with an "[all day]" caption (_IndexHeaderFilter.cshtml:53, :78).
export function TimeFilter({ id, label, value, onApply }: TimeFilterProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <Select value={value || ALL_OPTION} onValueChange={next => onApply(next === ALL_OPTION ? '' : next)}>
        <SelectTrigger id={id} className="h-10 bg-white">
          <span className="flex min-w-0 items-center gap-2">
            <Clock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_OPTION}>{DEVICES_FALLBACK_ONLY.allDay}</SelectItem>
          {TIME_OPTIONS.map(time => (
            <SelectItem key={time} value={time} className="tabular-nums">
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
