'use client'

import { Cpu } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { toApiError, useApiRead } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import {
  Button,
  FilterPanel,
  Label,
  Pagination,
  sameDraft,
  SearchField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  type FilterChip,
} from '@/shared/ui'
import type { ExportTo, ReadingReportItemDto, ReadingsSortColumn } from '@/types/devices'
import { DevicesGate } from '../DevicesGate'
import { PAGE_SIZES, PAGER_MIN_ROWS } from '../index/device-query'
import { DevicesNotice, type DevicesNoticeState } from '../index/DevicesNotice'
import {
  DEVICES_FALLBACK_ONLY,
  isSilentFailure,
  useDevicesText,
  type DevicesText,
} from '../index/devices-text'
import { ExportMenu } from '../index/ExportMenu'
import { useDevicesSections } from '../use-devices-sections'
import { exportReadings, fetchReadingsDevices, fetchReadingsPage } from './readings-api'
import {
  applyReadingsView,
  formatDateTime,
  initialReadingsQuery,
  matchReadingsView,
  readingsExportBody,
  toReadingsParams,
  type ReadingsView,
} from './readings-query'
import { DateRangeField, TimeRangeError } from './DateRangeField'
import { rangeChipValue, reportPanelLabels, reportViews } from './report-filter-panel'
import { ReportTable, type ReportColumn } from './ReportTable'
import { useReportList } from './use-report-list'
import { CountUp } from '@/shared/ui/CountUp'

const ALL_OPTION = 'all'

export const READINGS_ACCESS = { item: PermissionItem.ReadingsReport, action: PermissionAction.Access }

// readingsReportController.js:84 and swapp.js:558-560 toast timings.
const DURATION = { exportQueued: 6000, exportFailed: 10000 } as const

// ReadingsReport/Index.cshtml:50-68.
function readingsColumns(t: DevicesText): readonly ReportColumn<ReadingReportItemDto, ReadingsSortColumn>[] {
  return [
    { sort: 'date', label: t('Date'), render: item => formatDateTime(item.date), numeric: true },
    { sort: 'roomName', label: t('Room'), render: item => item.roomName, wrap: true },
    {
      sort: 'deviceSerialNumber',
      label: `${t('Device')} ${t('SerialNumber')}`,
      render: item => item.deviceSerialNumber,
    },
    { sort: 'studentNumber', label: t('StudentNo'), render: item => item.studentNumber },
    { sort: 'badgeNumber', label: t('BadgeNumber'), render: item => item.badgeNumber },
    { sort: 'studentName', label: t('Name'), render: item => item.studentName, wrap: true },
    { sort: 'clockingTypeDescription', label: t('Type'), render: item => item.clockingTypeDescription },
  ]
}

export function ReadingsReportScreen() {
  return (
    <DevicesGate permission={READINGS_ACCESS} noAccessText={DEVICES_FALLBACK_ONLY.noReportAccess}>
      <ReadingsWorkspace />
    </DevicesGate>
  )
}

function ReadingsWorkspace() {
  const t = useDevicesText()
  const sections = useDevicesSections()
  const [today] = useState(() => new Date())
  const list = useReportList({
    name: 'readings',
    initial: () => initialReadingsQuery(today),
    toParams: toReadingsParams,
    fetchPage: fetchReadingsPage,
  })
  const devices = useApiRead('readings-devices', fetchReadingsDevices)
  const [exporting, setExporting] = useState<ExportTo | null>(null)
  const [notice, setNotice] = useState<DevicesNoticeState | null>(null)
  const inFlight = useRef(false)
  const dismissNotice = useCallback(() => setNotice(null), [])
  const [initialFilters] = useState(() => initialReadingsQuery(today).filters)
  const filters = list.query.filters
  const applied = filters
  const appliedView = matchReadingsView(applied, today)
  const deviceName = devices.data?.find(device => device.id === applied.deviceId)?.serialNumber
  const chips: FilterChip[] = [
    ...(applied.deviceId !== null
      ? [
          {
            id: 'device',
            label: t('Device'),
            value: deviceName ?? String(applied.deviceId),
            onRemove: () => list.setFilter('deviceId', null),
          },
        ]
      : []),
    {
      id: 'range',
      label: t('DateRange'),
      value: rangeChipValue(applied),
    },
    ...(applied.includeInactive
      ? [
          {
            id: 'inactive',
            label: t('IncludeInactiveDevices'),
            value: t('Yes'),
            onRemove: () => list.setFilter('includeInactive', false),
          },
        ]
      : []),
  ]

  const startExport = async (exportTo: ExportTo) => {
    if (inFlight.current) return
    inFlight.current = true
    setExporting(exportTo)
    try {
      await exportReadings(readingsExportBody(list.query, exportTo))
      setNotice({
        id: Date.now(),
        tone: 'info',
        message: t('ReportProcessing'),
        durationMs: DURATION.exportQueued,
      })
    } catch (error) {
      const failure = toApiError(error)
      if (!isSilentFailure(failure)) {
        const message =
          failure.kind === 'auth'
            ? DEVICES_FALLBACK_ONLY.notAuthorised
            : failure.kind === 'blocked'
              ? DEVICES_FALLBACK_ONLY.safeMode
              : failure.kind === 'http' && failure.serverMessage
                ? failure.serverMessage
                : t('AlertSaveErrorDefault')
        setNotice({ id: Date.now(), tone: 'error', message, durationMs: DURATION.exportFailed })
      }
    } finally {
      inFlight.current = false
      setExporting(null)
    }
  }

  const page = list.read.status === 'success' ? list.read.data : undefined
  const totalText = page ? `${t('Total')} ${page.totalRowCount}` : ''
  // _IndexHeaderFilter.cshtml:32 optionsCaption '[All]'.
  const allDevices = `[${t('All')}]`

  return (
    <AreaWorkspace
      areaLabel={t('Devices')}
      sections={sections}
      activeId="readings-report"
      title={t('ReadingsReport')}
      collapseLabel={t('Collapse')}
      expandLabel={DEVICES_FALLBACK_ONLY.expand}
      meta={
        page ? (
          <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand">
            <CountUp text={totalText} />
          </span>
        ) : null
      }
      actions={<ExportMenu pending={exporting} onExport={exportTo => void startExport(exportTo)} t={t} />}
    >
      <DevicesNotice notice={notice} onDismiss={dismissNotice} dismissLabel={t('Close')} />

      <FilterPanel
        labels={reportPanelLabels(t)}
        views={reportViews(t, appliedView, page?.totalRowCount)}
        activeView={appliedView}
        onViewChange={view => list.setFilters(applyReadingsView(filters, view as ReadingsView, today))}
        chips={chips}
        canReset={!sameDraft(filters, initialFilters)}
        onReset={() => list.setFilters(initialFilters)}
        gridClassName="@[40rem]:grid-cols-[minmax(12rem,20rem)_minmax(0,1fr)] @[72rem]:grid-cols-[minmax(11rem,15rem)_minmax(0,1fr)_auto]"
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Label htmlFor="readings-device" className="text-sm font-medium text-foreground">
              {t('Device')}
            </Label>
            {devices.status === 'error' ? (
              <span role="alert" className="flex min-w-0 items-center gap-2 text-xs text-red-900">
                {DEVICES_FALLBACK_ONLY.devicesListError}
                <Button variant="outline" size="sm" className="h-6 bg-white px-2" onClick={devices.reload}>
                  {t('Refresh')}
                </Button>
              </span>
            ) : null}
          </div>
          <Select
            value={filters.deviceId === null ? ALL_OPTION : String(filters.deviceId)}
            onValueChange={value => list.setFilter('deviceId', value === ALL_OPTION ? null : Number(value))}
          >
            <SelectTrigger id="readings-device" className="group/device h-10 bg-white">
              <span className="flex min-w-0 items-center gap-2">
                <Cpu
                  aria-hidden
                  className="size-4 shrink-0 text-slate-500 transition-[color,transform] duration-300 ease-premium group-hover/device:scale-110 group-hover/device:text-brand"
                />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_OPTION}>{allDevices}</SelectItem>
              {(devices.data ?? []).map(device => (
                <SelectItem key={device.id} value={String(device.id)}>
                  {device.serialNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Tab order is grouped by logic (device, dates, switch); order-last only moves the range to its own row. */}
        <DateRangeField
          id="readings-range"
          value={{
            dateFilter: filters.dateFilter,
            time: filters.time,
            endDate: filters.endDate,
            endTime: filters.endTime,
          }}
          onChange={range => list.setFilters({ ...filters, ...range })}
          t={t}
          today={today}
          className="@[40rem]:order-last @[40rem]:col-span-2 @[40rem]:grid-cols-4 @[72rem]:order-none @[72rem]:col-span-1"
        />
        <div className="flex h-full items-end">
          <label
            htmlFor="readings-include-inactive"
            className="flex h-10 cursor-pointer items-center gap-3 text-sm text-foreground"
          >
            <Switch
              id="readings-include-inactive"
              checked={filters.includeInactive}
              onCheckedChange={value => list.setFilter('includeInactive', value)}
              label={t('IncludeInactiveDevices')}
            />
            {t('IncludeInactiveDevices')}
          </label>
        </div>
        <TimeRangeError
          id="readings-range"
          value={filters}
          className="col-span-full @[40rem]:order-last @[72rem]:order-none"
        />
      </FilterPanel>

      <section
        aria-label={t('ReadingsReport')}
        className="flex min-h-[28rem] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm"
      >
        <div className="flex min-h-[3.25rem] flex-wrap items-center gap-3 border-b border-border px-3 py-2">
          <SearchField
            id="readings-search"
            value={list.searchDraft}
            onValueChange={list.setSearchDraft}
            onSubmit={list.submitSearch}
            onClear={list.clearSearch}
            placeholder={`${t('Search')}...`}
            submitLabel={t('Search')}
            clearLabel={DEVICES_FALLBACK_ONLY.clearSearch}
            showClear={Boolean(list.searchDraft || list.query.search)}
          />
        </div>
        <ReportTable
          columns={readingsColumns(t)}
          read={list.read}
          shownPage={list.shownPage}
          sortCol={list.query.sortCol}
          sortDir={list.query.sortDir}
          onSort={list.sortBy}
          rowKey={(item, index) =>
            `${item.date ?? ''}:${item.badgeNumber ?? ''}:${item.deviceSerialNumber ?? ''}:${index}`
          }
          t={t}
        />
        {page && page.totalRowCount >= PAGER_MIN_ROWS ? (
          <ReportPager list={list} total={page.totalRowCount} t={t} />
        ) : null}
      </section>
    </AreaWorkspace>
  )
}

type PagerList = {
  query: { pageIndex: number; pageSize: number }
  setPage: (pageIndex: number) => void
  setPageSize: (pageSize: number) => void
}

export function ReportPager({ list, total, t }: { list: PagerList; total: number; t: DevicesText }) {
  return (
    <Pagination
      id="report-page-size"
      pageIndex={list.query.pageIndex}
      pageSize={list.query.pageSize}
      total={total}
      pageSizes={PAGE_SIZES}
      onPageChange={list.setPage}
      onPageSizeChange={list.setPageSize}
      pageLabel={pageNumber => `${DEVICES_FALLBACK_ONLY.page} ${pageNumber}`}
      labels={{
        itemsPerPage: t('NumberOfItemsPerPage'),
        of: t('Of'),
        first: DEVICES_FALLBACK_ONLY.first,
        previous: t('Previous'),
        next: t('Next'),
        last: DEVICES_FALLBACK_ONLY.last,
      }}
    />
  )
}
