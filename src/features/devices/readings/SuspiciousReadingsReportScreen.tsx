'use client'

import { useState } from 'react'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { FilterPanel, sameDraft } from '@/shared/ui'
import type { SuspiciousClockingDto, SuspiciousSortColumn } from '@/types/devices'
import { DevicesGate } from '../DevicesGate'
import { PAGER_MIN_ROWS } from '../index/device-query'
import { DEVICES_FALLBACK_ONLY, useDevicesText, type DevicesText } from '../index/devices-text'
import { useDevicesSections } from '../use-devices-sections'
import { fetchSuspiciousPage } from './readings-api'
import { DateRangeField } from './DateRangeField'
import {
  applyReadingsView,
  formatDateTime,
  initialSuspiciousQuery,
  matchReadingsView,
  toSuspiciousParams,
  type ReadingsView,
} from './readings-query'
import { rangeChipValue, reportPanelLabels, reportViews } from './report-filter-panel'
import { READINGS_ACCESS, ReportPager } from './ReadingsReportScreen'
import { ReportTable, type ReportColumn } from './ReportTable'
import { useReportList } from './use-report-list'
import { CountUp } from '@/shared/ui/CountUp'

const LABELS = DEVICES_FALLBACK_ONLY

// SuspiciousReadingsReport/Index.cshtml:34-55; legacy hard-codes these English headers.
const COLUMNS: readonly ReportColumn<SuspiciousClockingDto, SuspiciousSortColumn>[] = [
  { sort: 'reason', label: LABELS.reason, render: item => item.reason, wrap: true },
  { sort: 'clockingId', label: LABELS.readingId, render: item => item.clockingId },
  {
    sort: 'createdDate',
    label: LABELS.createdDate,
    render: item => formatDateTime(item.createdDate),
    numeric: true,
  },
  {
    sort: 'clockingDate',
    label: LABELS.readingDate,
    render: item => formatDateTime(item.clockingDate),
    numeric: true,
  },
  { sort: 'classId', label: LABELS.classId, render: item => item.classId },
  {
    sort: 'allocationStartDateTime',
    label: LABELS.classStart,
    render: item => formatDateTime(item.allocationStartDateTime),
    numeric: true,
  },
  {
    sort: 'allocationEndDateTime',
    label: LABELS.classEnd,
    render: item => formatDateTime(item.allocationEndDateTime),
    numeric: true,
  },
  { sort: 'deviceId', label: LABELS.deviceColumn, render: item => item.deviceId },
  { sort: 'studentNumber', label: LABELS.studentNumber, render: item => item.studentNumber },
]

export function SuspiciousReadingsReportScreen() {
  return (
    <DevicesGate permission={READINGS_ACCESS} noAccessText={DEVICES_FALLBACK_ONLY.noReportAccess}>
      <SuspiciousWorkspace />
    </DevicesGate>
  )
}

function SuspiciousWorkspace() {
  const t: DevicesText = useDevicesText()
  const sections = useDevicesSections()
  const [today] = useState(() => new Date())
  const list = useReportList({
    name: 'suspicious-readings',
    initial: () => initialSuspiciousQuery(today),
    toParams: toSuspiciousParams,
    fetchPage: fetchSuspiciousPage,
  })
  const [initialFilters] = useState(() => initialSuspiciousQuery(today).filters)
  const filters = list.query.filters
  const appliedView = matchReadingsView(filters, today)
  const page = list.read.status === 'success' ? list.read.data : undefined
  const totalText = page ? `${t('Total')} ${page.totalRowCount}` : ''

  return (
    <AreaWorkspace
      areaLabel={t('Devices')}
      sections={sections}
      activeId="suspicious-readings-report"
      title={DEVICES_FALLBACK_ONLY.suspiciousReadingsReport}
      collapseLabel={t('Collapse')}
      expandLabel={DEVICES_FALLBACK_ONLY.expand}
      meta={
        page ? (
          <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand">
            <CountUp text={totalText} />
          </span>
        ) : null
      }
    >
      {/* Tab order is visual: views, then the date range. */}
      <FilterPanel
        labels={reportPanelLabels(t)}
        views={reportViews(t, appliedView, page?.totalRowCount)}
        activeView={appliedView}
        onViewChange={view => list.setFilters(applyReadingsView(filters, view as ReadingsView, today))}
        chips={[{ id: 'range', label: t('DateRange'), value: rangeChipValue(filters) }]}
        canReset={!sameDraft(filters, initialFilters)}
        onReset={() => list.setFilters(initialFilters)}
        gridClassName="@[40rem]:grid-cols-[minmax(0,32rem)]"
      >
        <DateRangeField
          id="suspicious-range"
          value={filters}
          onChange={list.setFilters}
          t={t}
          today={today}
        />
      </FilterPanel>

      <section
        aria-label={DEVICES_FALLBACK_ONLY.suspiciousReadingsReport}
        className="flex min-h-[28rem] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm"
      >
        <ReportTable
          columns={COLUMNS}
          read={list.read}
          shownPage={list.shownPage}
          sortCol={list.query.sortCol}
          sortDir={list.query.sortDir}
          onSort={list.sortBy}
          rowKey={(item, index) => `${item.clockingId ?? ''}:${item.reason ?? ''}:${index}`}
          t={t}
        />
        {page && page.totalRowCount >= PAGER_MIN_ROWS ? (
          <ReportPager list={list} total={page.totalRowCount} t={t} />
        ) : null}
      </section>
    </AreaWorkspace>
  )
}
