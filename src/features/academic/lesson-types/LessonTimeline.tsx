'use client'

import { cn } from '@/shared/ui/cn'

type Labels = {
  start: string
  end: string
  early: string
  late: string
  absence: string
  minutes: string
  incomplete: string
}

type LessonTimelineProps = {
  early: string
  late: string
  absence: string
  basedOnStart: boolean
  labels: Labels
}

const minutesOf = (value: string) => {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  return Number(trimmed)
}

// Display only: places the cut-offs around the lesson start so the numbers are easy to read; nothing here is saved.
export function LessonTimeline({ early, late, absence, basedOnStart, labels }: LessonTimelineProps) {
  const earlyMin = minutesOf(early)
  const lateMin = minutesOf(late)
  const absenceMin = minutesOf(absence)

  if (earlyMin === null || lateMin === null || absenceMin === null) {
    return <p className="text-sm text-slate-500">{labels.incomplete}</p>
  }

  const before = Math.max(earlyMin, 1)
  const after = Math.max(lateMin, basedOnStart ? absenceMin : 0, 1)
  const span = before + after
  const at = (offset: number) => `${((before + offset) / span) * 100}%`

  const endText = [absenceMin, labels.minutes, '·', labels.end].join(' ')
  const signed = (offset: number, value: number) =>
    [offset < 0 ? '−' : '+', value, ' ', labels.minutes].join('')
  const markers = [
    {
      key: 'early',
      offset: -earlyMin,
      label: labels.early,
      value: earlyMin,
      display: signed(-earlyMin, earlyMin),
      tone: 'bg-emerald-500',
      text: 'text-emerald-700',
    },
    {
      key: 'late',
      offset: lateMin,
      label: labels.late,
      value: lateMin,
      display: signed(lateMin, lateMin),
      tone: 'bg-amber-500',
      text: 'text-amber-700',
    },
    ...(basedOnStart
      ? [
          {
            key: 'absence',
            offset: absenceMin,
            label: labels.absence,
            value: absenceMin,
            display: signed(absenceMin, absenceMin),
            tone: 'bg-red-500',
            text: 'text-red-700',
          },
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <div className="relative h-10">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="absolute inset-y-0 bg-emerald-400/60 transition-[left,width] duration-500 ease-premium motion-reduce:transition-none"
            style={{ left: at(-earlyMin), width: `${(earlyMin / span) * 100}%` }}
          />
          <div
            className="absolute inset-y-0 bg-amber-400/60 transition-[left,width] duration-500 ease-premium motion-reduce:transition-none"
            style={{ left: at(0), width: `${(lateMin / span) * 100}%` }}
          />
          {basedOnStart && absenceMin > lateMin ? (
            <div
              className="absolute inset-y-0 bg-red-400/50 transition-[left,width] duration-500 ease-premium motion-reduce:transition-none"
              style={{ left: at(lateMin), width: `${((absenceMin - lateMin) / span) * 100}%` }}
            />
          ) : null}
        </div>
        <span
          aria-hidden
          className="absolute top-1/2 h-6 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-800 transition-[left] duration-500 ease-premium motion-reduce:transition-none"
          style={{ left: at(0) }}
        />
        {markers.map(marker => (
          <span
            key={marker.key}
            aria-hidden
            className={cn(
              'absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white shadow-sm transition-[left] duration-500 ease-premium motion-reduce:transition-none',
              marker.tone,
            )}
            style={{ left: at(marker.offset) }}
          />
        ))}
      </div>
      <p className="text-center text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
        {labels.start}
      </p>
      <ul className="flex flex-col gap-1.5 text-sm">
        {markers.map(marker => (
          <li key={marker.key} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600">
              <span aria-hidden className={cn('size-2 rounded-full', marker.tone)} />
              {marker.label}
            </span>
            <span className={cn('font-semibold tabular-nums', marker.text)}>{marker.display}</span>
          </li>
        ))}
        {!basedOnStart ? (
          <li className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600">
              <span aria-hidden className="size-2 rounded-full bg-red-500" />
              {labels.absence}
            </span>
            <span className="font-semibold text-red-700 tabular-nums">{endText}</span>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
