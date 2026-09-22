import type {
  ExportStudentClockingBody,
  ExportTo,
  ReadingReportItemDto,
  ReadingsDeviceOptionDto,
  ReadingsQueryParams,
  ReadingsSortColumn,
  ReportPageDto,
  SuspiciousClockingDto,
  SuspiciousQueryParams,
  SuspiciousSortColumn,
} from '@/types/devices'
import type { SortDirection } from '@/types/users'
import { ApiError } from '@/shared/api'
import { getUiCulture } from '@/shared/i18n/culture'
import { addDays, formatDate } from '../index/date-input'

export type ReportQuery<TSort extends string, TFilters> = {
  pageIndex: number
  pageSize: number
  sortCol: TSort
  sortDir: SortDirection
  search: string
  filters: TFilters
}

export type ReadingsFilters = {
  deviceId: number | null
  dateFilter: string
  time: string
  endDate: string
  endTime: string
  includeInactive: boolean
}

export type SuspiciousFilters = { dateFilter: string; endDate: string }

// Both views start on today's date (Index.cshtml:90-91) sorted by 'date' descending, 100 rows per page (swgrid.js:29).
export function initialReadingsQuery(today: Date): ReportQuery<ReadingsSortColumn, ReadingsFilters> {
  const date = formatDate(today)
  return {
    pageIndex: 0,
    pageSize: 100,
    sortCol: 'date',
    sortDir: 'desc',
    search: '',
    filters: {
      deviceId: null,
      dateFilter: date,
      time: '',
      endDate: date,
      endTime: '',
      includeInactive: false,
    },
  }
}

export function initialSuspiciousQuery(today: Date): ReportQuery<SuspiciousSortColumn, SuspiciousFilters> {
  const date = formatDate(today)
  return {
    pageIndex: 0,
    pageSize: 100,
    sortCol: 'date',
    sortDir: 'desc',
    search: '',
    filters: { dateFilter: date, endDate: date },
  }
}

export const READINGS_VIEWS = ['today', 'yesterday', 'last7', 'last30'] as const
export type ReadingsView = (typeof READINGS_VIEWS)[number]

// Views only fill the legacy date filters (D-060); times go back to all day.
function viewRange(view: ReadingsView, today: Date): { dateFilter: string; endDate: string } {
  const end = view === 'yesterday' ? addDays(today, -1) : today
  const offset = { today: 0, yesterday: 0, last7: -6, last30: -29 }[view]
  return { dateFilter: formatDate(addDays(end, offset)), endDate: formatDate(end) }
}

type DateRangeFilters = { dateFilter: string; endDate: string; time?: string; endTime?: string }

export function applyReadingsView<T extends DateRangeFilters>(
  filters: T,
  view: ReadingsView,
  today: Date,
): T {
  const next = { ...filters, ...viewRange(view, today) }
  return filters.time === undefined ? next : { ...next, time: '', endTime: '' }
}

export function matchReadingsView(filters: DateRangeFilters, today: Date): ReadingsView | null {
  if (filters.time || filters.endTime) return null
  return (
    READINGS_VIEWS.find(view => {
      const range = viewRange(view, today)
      return range.dateFilter === filters.dateFilter && range.endDate === filters.endDate
    }) ?? null
  )
}

// swgrid.js:344-350: same column flips direction, a new column starts ascending.
export function nextReportSort<TSort extends string, TFilters>(
  query: ReportQuery<TSort, TFilters>,
  column: TSort,
): ReportQuery<TSort, TFilters> {
  const sortDir: SortDirection = query.sortCol === column && query.sortDir === 'asc' ? 'desc' : 'asc'
  return { ...query, sortCol: column, sortDir, pageIndex: 0 }
}

// swgrid.js:655-668 paging and search, then readingsReportController.js:92-99 filters.
export function toReadingsParams(
  query: ReportQuery<ReadingsSortColumn, ReadingsFilters>,
): ReadingsQueryParams {
  const { filters } = query
  return {
    currentPageIndex: query.pageIndex,
    pageSize: query.pageSize,
    sortCol: query.sortCol,
    sortDir: query.sortDir,
    searchFilter: query.search,
    deviceId: filters.deviceId,
    dateFilter: filters.dateFilter,
    time: filters.time,
    endDate: filters.endDate,
    includeInactive: filters.includeInactive,
    endTime: filters.endTime,
  }
}

// suspiciousReadingsReportController.js:92-95 sends only the two dates.
export function toSuspiciousParams(
  query: ReportQuery<SuspiciousSortColumn, SuspiciousFilters>,
): SuspiciousQueryParams {
  return {
    currentPageIndex: query.pageIndex,
    pageSize: query.pageSize,
    sortCol: query.sortCol,
    sortDir: query.sortDir,
    searchFilter: query.search,
    dateFilter: query.filters.dateFilter,
    endDate: query.filters.endDate,
  }
}

// readingsReportController.js:66-78, using the applied search and filters so the file matches the grid.
export function readingsExportBody(
  query: ReportQuery<ReadingsSortColumn, ReadingsFilters>,
  exportTo: ExportTo,
): ExportStudentClockingBody {
  const { filters } = query
  return {
    deviceId: filters.deviceId ?? '',
    dateFilter: filters.dateFilter,
    time: filters.time,
    endDate: filters.endDate,
    endTime: filters.endTime,
    includeInactive: filters.includeInactive,
    searchFilter: query.search,
    exportTo,
    sortColumn: query.sortCol,
    sortDirection: query.sortDir,
  }
}

// _IndexHeaderFilter.cshtml:53 timeOptions 07:00 to 23:00 every 15 minutes (swapp.js:1753-1780).
export const TIME_OPTIONS: readonly string[] = Array.from({ length: 65 }, (_, index) => {
  const minutes = 7 * 60 + index * 15
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/

// _Layout.cshtml:310-313: globalTimeWithSecondsFormat is hh:mm:ss A for en-US and HH:mm:ss for every other culture.
export function formatTimeWithSeconds(hour: string, minute: string, second: string): string {
  if (getUiCulture() !== 'en-US') return `${hour}:${minute}:${second}`
  const hours = Number(hour)
  return `${String(hours % 12 || 12).padStart(2, '0')}:${minute}:${second} ${hours < 12 ? 'AM' : 'PM'}`
}

// swapp.js:2195-2205 dateText: the server value read as local wall time, shown as date plus the culture time.
export function formatDateTime(value: string | null): string {
  const match = value ? DATE_TIME.exec(value) : null
  if (!match) return ''
  const [, year, month, day, hour, minute, second] = match
  const date = formatDate(new Date(Number(year), Number(month) - 1, Number(day)))
  return `${date} ${formatTimeWithSeconds(hour, minute, second)}`
}

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const integer = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) ? value : null
const record = (raw: unknown): Record<string, unknown> | null =>
  raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null

function parsePage<T>(
  raw: unknown,
  path: string,
  map: (item: Record<string, unknown>) => T,
  keyField: string,
): ReportPageDto<T> {
  const page = record(raw)
  if (!page || !Array.isArray(page.items)) throw new ApiError('parse', path)
  const records = page.items.map(record)
  if (records.some(item => item === null || text(item[keyField]) === null)) throw new ApiError('parse', path)
  const items = (records as Record<string, unknown>[]).map(map)
  const total = integer(page.totalRowCount)
  if (total === null) throw new ApiError('parse', path)
  return { items, totalRowCount: Math.max(total, 0) }
}

export const parseReadingsPage = (raw: unknown): ReportPageDto<ReadingReportItemDto> =>
  parsePage(
    raw,
    'ReadingsReportApi/GetStudentClockings',
    item => ({
      date: text(item.date),
      roomName: text(item.roomName),
      deviceSerialNumber: text(item.deviceSerialNumber),
      studentNumber: text(item.studentNumber),
      badgeNumber: text(item.badgeNumber),
      studentName: text(item.studentName),
      clockingTypeDescription: text(item.clockingTypeDescription),
    }),
    'date',
  )

export const parseSuspiciousPage = (raw: unknown): ReportPageDto<SuspiciousClockingDto> =>
  parsePage(
    raw,
    'SuspiciousReadingsReportApi/GetSuspiciousClockings',
    item => ({
      clockingId: text(item.clockingId),
      reason: text(item.reason),
      clockingDate: text(item.clockingDate),
      createdDate: text(item.createdDate),
      studentNumber: text(item.studentNumber),
      classId: text(item.classId),
      allocationStartDateTime: text(item.allocationStartDateTime),
      allocationEndDateTime: text(item.allocationEndDateTime),
      deviceId: text(item.deviceId),
    }),
    'clockingId',
  )

// ReadingsReportApiController.cs:118-132.
export function parseReadingsDevices(raw: unknown): ReadingsDeviceOptionDto[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(entry => {
    const item = record(entry)
    const id = item ? integer(item.id) : null
    return item && id !== null ? [{ id, serialNumber: text(item.serialNumber) }] : []
  })
}
