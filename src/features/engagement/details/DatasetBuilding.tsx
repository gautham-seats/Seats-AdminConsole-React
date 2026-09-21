'use client'

import { Download, RotateCw } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useApiRead } from '@/shared/api'
import { Button, Checkbox, DateRangeField, DelayedLoading, ErrorState } from '@/shared/ui'
import { ButtonSpinner } from '@/shared/ui/Button'
import { cn } from '@/shared/ui/cn'
import { parseShortDate } from '@/shared/i18n/culture'
import { formatDate } from '../configuration/engagement-models'
import { ENGAGEMENT_FALLBACK_ONLY, type EngagementText } from '../engagement-text'
import {
  buildingRequestBody,
  exportDisabled,
  pendingChanges,
  totalStudents,
  type BuildingRequestBody,
  type ModelBuilding,
  type StudentCounts,
} from './building-model'
import { ConstraintRules } from './ConstraintRules'
import { fetchAssessmentOptions, fetchWithdrawalOptions } from './details-api'
import { BUILDING_CATEGORIES, hasConstraint, type SimpleListItem } from './details-model'

export type DatasetBuildingProps = {
  building: ModelBuilding
  withdrawalActive: boolean
  assessmentActive: boolean
  counts: StudentCounts
  /** The request the shown counts came from; null until Calculate has run. */
  appliedRequest: BuildingRequestBody | null
  calculating: boolean
  exporting: boolean
  disabled: boolean
  t: EngagementText
  onChange: (next: ModelBuilding) => void
  onToggleWithdrawal: (on: boolean) => void
  onToggleAssessment: (on: boolean) => void
  onCalculate: () => void
  onExport: () => void
  onInvalid: (message: string) => void
  onDuplicate: () => void
}

const EN = ENGAGEMENT_FALLBACK_ONLY

// Dataset building (seats-admin-engagement-model.html:274-413).
export function DatasetBuilding({
  building,
  withdrawalActive,
  assessmentActive,
  counts,
  appliedRequest,
  calculating,
  exporting,
  disabled,
  t,
  onChange,
  onToggleWithdrawal,
  onToggleAssessment,
  onCalculate,
  onExport,
  onInvalid,
  onDuplicate,
}: DatasetBuildingProps) {
  const request = useMemo(
    () => buildingRequestBody(building, withdrawalActive, assessmentActive),
    [building, withdrawalActive, assessmentActive],
  )
  const waiting = pendingChanges(appliedRequest, request)
  const total = totalStudents(counts, withdrawalActive)
  const noExport = exportDisabled(counts, withdrawalActive)
  const studentsLabel = `${t('Students')}:`

  return (
    <div className="flex flex-col gap-5 px-5 py-5">
      <section aria-label={EN.buildingRules} className="rounded-lg border border-border">
        <ConstraintRules
          constraints={building.constraints}
          disabled={disabled}
          categories={BUILDING_CATEGORIES}
          idPrefix="engagement-building-rule"
          t={t}
          onInvalid={onInvalid}
          onAdd={constraint => {
            if (hasConstraint(building.constraints, constraint)) {
              onDuplicate()
              return
            }
            onChange({ ...building, constraints: [...building.constraints, constraint] })
          }}
          onRemove={index =>
            onChange({
              ...building,
              constraints: building.constraints.filter((_, position) => position !== index),
            })
          }
        />
        <CountRow label={EN.studentsInRules} value={counts.countSectionA} />
      </section>

      <p className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">{EN.and}</p>

      <OptionSection
        id="withdrawal"
        title={EN.withdrawnBetween}
        listLabel={EN.because}
        active={withdrawalActive}
        disabled={disabled}
        start={building.withDrawalStartDate}
        end={building.withDrawalEndDate}
        selected={building.withDrawalReasons}
        count={counts.countSectionB}
        countLabel={EN.studentsWithdrawn}
        t={t}
        load={fetchWithdrawalOptions}
        cacheKey="engagement-withdrawal-options"
        onToggle={onToggleWithdrawal}
        onRange={(start, end) =>
          onChange({ ...building, withDrawalStartDate: start, withDrawalEndDate: end })
        }
        onSelected={selected => onChange({ ...building, withDrawalReasons: selected })}
      />

      <OptionSection
        id="assessment"
        title={EN.assessmentBetween}
        listLabel={EN.ofType}
        active={assessmentActive}
        disabled={disabled}
        // :1388-1390 drops the assessment part unless a withdrawal range is also set.
        hint={assessmentActive && !withdrawalActive ? EN.assessmentNeedsWithdrawal : undefined}
        start={building.assessmentStartDate}
        end={building.assessmentEndDate}
        selected={building.assessmentTypeIds}
        count={counts.countSectionC}
        countLabel={EN.studentsAssessed}
        t={t}
        load={fetchAssessmentOptions}
        cacheKey="engagement-assessment-options"
        onToggle={onToggleAssessment}
        onRange={(start, end) =>
          onChange({ ...building, assessmentStartDate: start, assessmentEndDate: end })
        }
        onSelected={selected => onChange({ ...building, assessmentTypeIds: selected })}
      />

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        <p className="mr-auto flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{studentsLabel}</span>
          <span className="tabular-nums">{total}</span>
        </p>
        <Button
          type="button"
          variant="outline"
          className="relative bg-white"
          disabled={disabled || calculating}
          onClick={onCalculate}
        >
          {calculating ? <ButtonSpinner /> : <RotateCw aria-hidden className="size-4" />}
          {EN.calculate}
          {waiting > 0 ? (
            <span className="ml-1 grid size-5 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white tabular-nums">
              {waiting}
            </span>
          ) : null}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="bg-white"
          disabled={disabled || exporting || noExport}
          title={noExport ? EN.exportNeedsStudents : EN.exportProfileSet}
          onClick={onExport}
        >
          {exporting ? <ButtonSpinner /> : <Download aria-hidden className="size-4" />}
          {EN.exportProfileSet}
        </Button>
      </div>
    </div>
  )
}

function CountRow({ label, value }: { label: string; value: number }) {
  const heading = `${label}:`
  return (
    <p className="flex items-center justify-end gap-1.5 border-t border-border px-5 py-2.5 text-sm text-muted-foreground">
      <span className="font-semibold text-foreground">{heading}</span>
      <span className="tabular-nums">{value}</span>
    </p>
  )
}

type OptionSectionProps = {
  id: string
  title: string
  listLabel: string
  active: boolean
  disabled: boolean
  hint?: string
  start: string
  end: string
  selected: readonly number[]
  count: number
  countLabel: string
  t: EngagementText
  cacheKey: string
  load: (signal: AbortSignal) => Promise<SimpleListItem[]>
  onToggle: (on: boolean) => void
  onRange: (start: string, end: string) => void
  onSelected: (selected: number[]) => void
}

// A switch, a date range and a multi-select list, as the withdrawal and assessment blocks both use.
function OptionSection({
  id,
  title,
  listLabel,
  active,
  disabled,
  hint,
  start,
  end,
  selected,
  count,
  countLabel,
  t,
  cacheKey,
  load,
  onToggle,
  onRange,
  onSelected,
}: OptionSectionProps) {
  const loadOptions = useCallback((signal: AbortSignal) => load(signal), [load])
  // The list is only fetched once the section is switched on.
  const options = useApiRead(active ? cacheKey : null, loadOptions)
  const [today] = useState(() => new Date())
  const rangeStart = parseDayText(start) ?? today
  const rangeEnd = parseDayText(end) ?? today

  return (
    <section aria-label={title} className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-slate-50/70 px-5 py-3">
        <Checkbox
          id={`engagement-${id}-active`}
          checked={active}
          label={title}
          disabled={disabled}
          onCheckedChange={() => onToggle(!active)}
        />
        {active ? (
          <DateRangeField
            id={`engagement-${id}-range`}
            start={rangeStart}
            end={rangeEnd}
            formatDate={formatDate}
            onChange={(from, to) => onRange(formatDate(from), formatDate(to))}
            labels={{
              dateRange: t('DateRange'),
              startDate: t('From'),
              endDate: t('To'),
              selectRange: t('SelectRange'),
              today: t('Today'),
              chooseMonthYear: EN.chooseMonthYear,
              previous: t('Previous'),
              next: t('Next'),
              close: EN.close,
              cancel: t('Cancel'),
              last7Days: EN.last7Days,
              last14Days: EN.last14Days,
              last30Days: EN.last30Days,
            }}
          />
        ) : null}
      </div>
      {active ? (
        <div className="flex flex-col gap-2 px-5 py-4">
          {hint ? <p className="text-[13px] text-amber-700">{hint}</p> : null}
          <p className="text-[13px] font-medium text-slate-700">{listLabel}</p>
          {options.status === 'error' ? (
            <ErrorState
              variant="panel"
              message={t('AlertGeneralErrorDefault')}
              retryLabel={t('Refresh')}
              onRetry={options.reload}
              error={options.error}
            />
          ) : options.data === undefined ? (
            <DelayedLoading active label={t('Loading')} className="min-h-24" />
          ) : options.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{EN.noItems}</p>
          ) : (
            <ul
              role="group"
              aria-label={listLabel}
              className="max-h-52 overflow-y-auto rounded-md border border-border"
            >
              {options.data.map(option => {
                const on = selected.includes(option.id)
                return (
                  <li key={option.id} className="border-b border-border/70 last:border-b-0">
                    <Checkbox
                      checked={on}
                      label={option.description ?? ''}
                      disabled={disabled}
                      className={cn(
                        'w-full px-3 py-2 text-sm transition-colors duration-200',
                        on ? 'bg-brand/[0.06] text-foreground' : 'hover:bg-slate-50',
                      )}
                      onCheckedChange={() =>
                        onSelected(
                          on ? selected.filter(value => value !== option.id) : [...selected, option.id],
                        )
                      }
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : null}
      <CountRow label={countLabel} value={count} />
    </section>
  )
}

// Dates travel as short-date text in the UI culture (D-111); anything else is treated as unset.
function parseDayText(value: string): Date | null {
  return parseShortDate(value)
}
