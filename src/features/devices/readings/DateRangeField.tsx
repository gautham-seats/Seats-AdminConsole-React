'use client'

import { useEffect } from 'react'
import { DateRangeField as SharedDateRangeField, type DateRangeFieldLabels } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { formatDate, parseDate } from '../index/date-input'
import { DEVICES_FALLBACK_ONLY, type DevicesText } from '../index/devices-text'
import { TIME_OPTIONS } from './readings-query'

export type DateTimeRange = { dateFilter: string; endDate: string; time?: string; endTime?: string }

function devicesRangeLabels(t: DevicesText): DateRangeFieldLabels {
  return {
    dateRange: t('DateRange'),
    startDate: t('StartDate'),
    endDate: t('EndDate'),
    startTime: t('StartTime'),
    endTime: t('EndTime'),
    close: t('Close'),
    cancel: t('Cancel'),
    selectRange: t('SelectRange'),
    chooseMonthYear: DEVICES_FALLBACK_ONLY.chooseMonthYear,
    previous: t('Previous'),
    next: t('Next'),
    today: t('Today'),
    last7Days: t('Last7Days'),
    last14Days: t('Last14Days'),
    last30Days: t('Last30Days'),
    hours: DEVICES_FALLBACK_ONLY.hours,
    minutes: DEVICES_FALLBACK_ONLY.minutes,
    allDay: DEVICES_FALLBACK_ONLY.allDay,
  }
}

// Only a filled start and end time on the same day can be out of order; "HH:mm" compares as text.
export function timeRangeInverted(value: DateTimeRange): boolean {
  const { dateFilter, endDate, time, endTime } = value
  return Boolean(dateFilter && endDate && time && endTime && dateFilter === endDate && endTime <= time)
}

const timeRangeErrorId = (id: string) => `${id}-time-error`

const TIME_SUFFIXES = ['start-time', 'end-time'] as const

type Props<T extends DateTimeRange> = {
  id: string
  value: T
  onChange: (next: T) => void
  t: DevicesText
  className?: string
  // The screen owns "today" so the calendar and the initial filters cannot disagree across midnight.
  today: Date
}

// Legacy filters hold dd/MM/yyyy strings; Readings Report also carries times, Suspicious Readings only dates.
export function DateRangeField<T extends DateTimeRange>({
  id,
  value,
  onChange,
  t,
  className,
  today,
}: Props<T>) {
  const inverted = timeRangeInverted(value)
  // The shared field has no error prop yet, so both time triggers are flagged by id here.
  useEffect(() => {
    for (const suffix of TIME_SUFFIXES) {
      const node = document.getElementById(`${id}-${suffix}`)
      if (!node) continue
      if (inverted) {
        node.setAttribute('aria-invalid', 'true')
        node.setAttribute('aria-describedby', timeRangeErrorId(id))
      } else {
        node.removeAttribute('aria-invalid')
        node.removeAttribute('aria-describedby')
      }
    }
  }, [id, inverted])
  return (
    <SharedDateRangeField
      id={id}
      start={parseDate(value.dateFilter) ?? today}
      end={parseDate(value.endDate) ?? today}
      formatDate={formatDate}
      labels={devicesRangeLabels(t)}
      className={cn(className, '[&_button[aria-invalid=true]]:border-destructive')}
      onChange={(from, to) => onChange({ ...value, dateFilter: formatDate(from), endDate: formatDate(to) })}
      time={
        value.time === undefined
          ? undefined
          : {
              start: value.time,
              end: value.endTime ?? '',
              options: TIME_OPTIONS,
              onChange: (time, endTime) => onChange({ ...value, time, endTime }),
            }
      }
    />
  )
}

// One combined message once all four values are filled; the time pickers point here via aria-describedby.
export function TimeRangeError({
  id,
  value,
  className,
}: {
  id: string
  value: DateTimeRange
  className?: string
}) {
  return timeRangeInverted(value) ? (
    <p
      id={timeRangeErrorId(id)}
      role="alert"
      className={cn('text-xs font-medium text-destructive', className)}
    >
      {DEVICES_FALLBACK_ONLY.endTimeBeforeStart}
    </p>
  ) : null
}
