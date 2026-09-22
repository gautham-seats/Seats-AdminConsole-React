'use client'

import { CalendarClock, Code2 } from 'lucide-react'
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Input } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { NativeSelect } from '@/features/settings/shared/NativeSelect'
import {
  buildCron,
  CRON_PERIODS,
  describeCron,
  isValidCronExpression,
  ordinal,
  pad,
  parseCron,
  WEEK_DAYS,
  withPeriod,
  type CronParts,
  type CronPeriod,
} from './cron'

const EN = {
  every: 'Every',
  at: 'at',
  onThe: 'on the',
  of: 'of',
  on: 'on',
  hour: 'Hour',
  minute: 'Minute',
  dayOfMonth: 'Day of month',
  dayOfWeek: 'Day of week',
  runs: 'Runs',
  none: '-',
  colon: ':',
  period: 'Period',
  periods: { day: 'Day', week: 'Week', month: 'Month' },
  advancedOnly:
    'This schedule can only be edited as an expression. Pick a day, week or month schedule to use the builder.',
} as const

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index)

type ScheduleBuilderProps = {
  id: string
  value: string
  advanced: boolean
  advancedLabel: string
  cronLabel: string
  cronError: string | null
  disabled: boolean
  invalid: boolean
  labelledBy?: string
  onChange: (value: string) => void
  onAdvancedChange: (advanced: boolean, cron?: string) => void
}

// jquery-cron replacement: period chips and time selects, with the raw expression behind Advance.
export function ScheduleBuilder({
  id,
  value,
  advanced,
  advancedLabel,
  cronLabel,
  cronError,
  disabled,
  invalid,
  labelledBy,
  onChange,
  onAdvancedChange,
}: ScheduleBuilderProps) {
  const periodRefs = useRef<(HTMLButtonElement | null)[]>([])
  const fallback = withPeriod(null, 'day')
  const [draftParts, setDraftParts] = useState<CronParts>(() => parseCron(value) ?? fallback)
  const parts = useMemo(
    () => (advanced ? draftParts : (parseCron(value) ?? draftParts)),
    [advanced, draftParts, value],
  )

  const change = (next: CronParts) => {
    setDraftParts(next)
    onChange(buildCron(next))
  }
  const set = (field: keyof Omit<CronParts, 'period'>) => (event: { target: { value: string } }) =>
    change({ ...parts, [field]: Number(event.target.value) })

  const select = (
    field: keyof Omit<CronParts, 'period'>,
    label: string,
    options: readonly (readonly [number, string])[],
  ) => (
    <NativeSelect
      id={`${id}-${field}`}
      aria-label={label}
      value={parts[field]}
      disabled={disabled}
      onChange={set(field)}
      className="w-auto min-w-[4.75rem]"
    >
      {options.map(([optionValue, text]) => (
        <option key={optionValue} value={optionValue}>
          {text}
        </option>
      ))}
    </NativeSelect>
  )

  const time = (
    <>
      <span>{EN.at}</span>
      {select(
        'hour',
        EN.hour,
        range(0, 23).map(hour => [hour, pad(hour)] as const),
      )}
      <span aria-hidden className="-mx-1 font-semibold text-slate-500">
        {EN.colon}
      </span>
      {select(
        'minute',
        EN.minute,
        range(0, 59).map(minute => [minute, pad(minute)] as const),
      )}
    </>
  )
  const day = select(
    'dayOfMonth',
    EN.dayOfMonth,
    range(1, 31).map(dom => [dom, ordinal(dom)] as const),
  )

  const periodIndex = Math.max(0, CRON_PERIODS.indexOf(parts.period))
  // Same arrow-key handling as ChoiceGroup: arrows select and focus the next period.
  const onPeriodKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0
    if (!step) return
    event.preventDefault()
    const next = (index + step + CRON_PERIODS.length) % CRON_PERIODS.length
    change(withPeriod(parts, CRON_PERIODS[next]))
    periodRefs.current[next]?.focus()
  }

  const liveInvalid = advanced && value.trim() !== '' && !isValidCronExpression(value)
  const showCronError = invalid || liveInvalid
  // Leaving Advance on an expression the builder cannot show would silently replace the schedule.
  const lockedToAdvance = advanced && value.trim() !== '' && parseCron(value) === null

  return (
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors duration-200 motion-reduce:transition-none',
          showCronError ? 'border-destructive/40 bg-red-50/60' : 'border-brand/15 bg-brand/[0.04]',
        )}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-brand shadow-sm ring-1 ring-brand/15">
          <CalendarClock aria-hidden className="size-4" />
        </span>
        <div className="min-w-0" aria-live="polite">
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{EN.runs}</p>
          <p
            key={value}
            className="animate-fade-in text-sm font-semibold break-words text-slate-800 motion-reduce:animate-none"
          >
            {describeCron(value) || EN.none}
          </p>
        </div>
        <code className="ml-auto rounded-md bg-white px-2 py-1 font-mono text-xs text-slate-600 shadow-sm ring-1 ring-border tabular-nums">
          {value || EN.none}
        </code>
      </div>

      <div className="grid transition-[grid-template-rows,opacity] duration-200 ease-premium motion-reduce:transition-none">
        <div className="overflow-hidden">
          {advanced ? (
            <div className="animate-rise-in motion-reduce:animate-none">
              <label
                htmlFor={`${id}-expression`}
                className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-700"
              >
                <Code2 aria-hidden className="size-3.5 text-brand/70" />
                {cronLabel}
              </label>
              <Input
                id={`${id}-expression`}
                value={value}
                disabled={disabled}
                aria-invalid={showCronError || undefined}
                aria-describedby={showCronError ? `${id}-expression-error` : undefined}
                onChange={event => onChange(event.target.value)}
                className="h-9 w-full bg-white font-mono tabular-nums"
              />
              {showCronError && cronError ? (
                <p
                  id={`${id}-expression-error`}
                  className="mt-1.5 animate-fade-in text-xs font-medium text-destructive motion-reduce:animate-none"
                >
                  {cronError}
                </p>
              ) : null}
              {lockedToAdvance && !showCronError ? (
                <p className="mt-1.5 text-xs text-slate-500">{EN.advancedOnly}</p>
              ) : null}
            </div>
          ) : (
            <div className="flex animate-rise-in flex-col gap-3 motion-reduce:animate-none">
              {showCronError && cronError ? (
                <p
                  id={`${id}-expression-error`}
                  className="animate-fade-in text-xs font-medium text-destructive motion-reduce:animate-none"
                >
                  {cronError}
                </p>
              ) : null}
              <div
                id={id}
                tabIndex={-1}
                role="radiogroup"
                aria-label={labelledBy ? undefined : EN.period}
                aria-labelledby={labelledBy}
                aria-describedby={showCronError && cronError ? `${id}-expression-error` : undefined}
                className="flex flex-wrap gap-1.5 outline-none"
              >
                {CRON_PERIODS.map((period: CronPeriod, index) => {
                  const checked = parts.period === period
                  return (
                    <button
                      key={period}
                      ref={element => {
                        periodRefs.current[index] = element
                      }}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      tabIndex={index === periodIndex ? 0 : -1}
                      disabled={disabled}
                      onClick={() => change(withPeriod(parts, period))}
                      onKeyDown={event => onPeriodKeyDown(event, index)}
                      className={cn(
                        'lift-chip h-8 rounded-full border px-3.5 text-[13px] font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100',
                        checked
                          ? 'border-brand bg-brand text-white shadow-[0_6px_14px_-8px_rgba(21,102,162,.8)]'
                          : 'border-border bg-white text-slate-600 hover:border-brand/40 hover:text-brand',
                      )}
                    >
                      {EN.periods[period]}
                    </button>
                  )
                })}
              </div>
              <div
                key={parts.period}
                className="flex animate-fade-in flex-wrap items-center gap-2 text-sm text-slate-600 motion-reduce:animate-none"
              >
                <span className="font-semibold text-slate-800">{EN.every}</span>
                <span className="font-semibold text-slate-800 lowercase">{EN.periods[parts.period]}</span>
                {parts.period === 'day' ? time : null}
                {parts.period === 'week' ? (
                  <>
                    <span>{EN.on}</span>
                    {select(
                      'dayOfWeek',
                      EN.dayOfWeek,
                      WEEK_DAYS.map((name, index) => [index, name] as const),
                    )}
                    {time}
                  </>
                ) : null}
                {parts.period === 'month' ? (
                  <>
                    <span>{EN.onThe}</span>
                    {day}
                    {time}
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-600">
        <input
          id={`${id}-advance`}
          type="checkbox"
          checked={advanced}
          disabled={disabled || lockedToAdvance}
          aria-describedby={lockedToAdvance ? `${id}-expression` : undefined}
          onChange={event => {
            const next = event.target.checked
            if (!next) {
              const parsed = parseCron(value)
              if (!parsed && value.trim() !== '') return
              const nextParts = parsed ?? parts
              if (parsed) setDraftParts(parsed)
              onAdvancedChange(false, buildCron(nextParts))
              return
            }
            onAdvancedChange(true)
          }}
          className="size-4 rounded-sm accent-[var(--color-brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        {advancedLabel}
      </label>
    </div>
  )
}
