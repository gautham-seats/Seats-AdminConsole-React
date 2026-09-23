'use client'

import { CircleDot, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/ui/cn'
import { LESSON_TYPE_FALLBACK_ONLY as EN } from './lesson-type-text'

const fill = (template: string, value: string | number) =>
  template.replace('{n}', String(value)).replace('{value}', String(value))

const num = (raw: string) => {
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}

export type SummaryInput = {
  early: string
  late: string
  absence: string
  percentage: string
  checkoutCutoff: string
  absenceBasedOnStart: boolean
  isActive: boolean
  gpsEnabled: boolean
  checkout: boolean | null
  showCheckout: boolean
  scalingLabel: string | null
  consecutive: boolean
  showConsecutive: boolean
}

/**
 * Turns the stored cut-off numbers into the rules they produce. The field labels say what a
 * number is called; they never say what it does to a student's attendance, which is the one
 * thing an administrator editing this screen needs to be sure of before saving.
 */
export function buildMeaning(v: SummaryInput): string[] {
  const lines: string[] = []
  const early = num(v.early)
  const late = num(v.late)
  const absence = num(v.absence)
  const percentage = num(v.percentage)
  const checkoutCutoff = num(v.checkoutCutoff)

  lines.push(early === null ? EN.meaningEarlyUnset : fill(EN.meaningEarly, early))
  lines.push(late === null ? EN.meaningLateUnset : fill(EN.meaningLate, late))
  lines.push(
    absence === null
      ? EN.meaningAbsenceUnset
      : fill(v.absenceBasedOnStart ? EN.meaningAbsenceStart : EN.meaningAbsenceEnd, absence),
  )
  // 0% is not a minimum, and a 0-minute check-out window is not a window: both read as unset.
  lines.push(
    percentage === null || percentage === 0
      ? EN.meaningPercentageUnset
      : fill(EN.meaningPercentage, percentage),
  )

  if (v.showCheckout) {
    lines.push(
      v.checkout === null
        ? EN.meaningCheckoutDisabled
        : v.checkout
          ? EN.meaningCheckoutMandatory
          : EN.meaningCheckoutOptional,
    )
    if (v.checkout !== null && checkoutCutoff !== null && checkoutCutoff !== 0) {
      lines.push(fill(EN.meaningCheckoutCutoff, checkoutCutoff))
    }
  }

  // GPS, scaling, consecutive and active are plain values, and the All settings list below
  // already states them. Repeating them as sentences only made the panel taller than the screen.
  return lines
}

export function MeaningList({ lines }: { lines: readonly string[] }) {
  return (
    <section className="flex flex-col gap-1 border-t border-border pt-2.5">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
        <Info aria-hidden className="size-3.5" />
        {EN.meaning}
      </h3>
      <ul className="flex flex-col gap-1">
        {lines.map(line => (
          <li key={line} className="flex gap-1.5 text-[12.5px] leading-[1.35] text-slate-700">
            <CircleDot aria-hidden className="mt-[3px] size-2.5 shrink-0 text-brand/60" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export type SummaryRow = { label: string; value: ReactNode; muted?: boolean }

// Two columns with short labels: one column of full resource labels wrapped on every other row
// and made the panel taller than the viewport, which is the one thing this panel must never be.
export function AllSettingsList({ rows }: { rows: readonly SummaryRow[] }) {
  return (
    <section className="flex flex-col gap-1 border-t border-border pt-2.5">
      <h3 className="text-[11px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
        {EN.allSettings}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        {rows.map(row => (
          <div key={row.label} className="flex min-w-0 items-baseline justify-between gap-2">
            <dt className="truncate text-[12px] text-slate-500">{row.label}</dt>
            <dd
              className={cn(
                'shrink-0 text-[12px] font-semibold tabular-nums',
                row.muted ? 'text-slate-400' : 'text-slate-800',
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
