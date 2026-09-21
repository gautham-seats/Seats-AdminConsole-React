import { ApiError } from '@/shared/api'
import { pageEnvelope } from '@/shared/api/page-total'
import type {
  CalculationPeriodDto,
  EngagementHistoryBody,
  EngagementHistoryView,
  EngagementMessageDto,
  EngagementStatsItem,
  EngagementStudentScoreItem,
} from '@/types/engagement-history'
import { parseShortDate } from '@/shared/i18n/culture'
import { formatDate } from '../configuration/engagement-models'

// seats-admin-engagement-history.html:288-322 status values and :345-363 select options.
export const HISTORY_STATUSES = ['Error', 'Finished', 'Idle', 'Loading', 'Persisting', 'Processing'] as const
export const REFRESH_INTERVALS = [10000, 15000, 20000, 30000, 60000, 120000, 300000] as const
export const SORT_OPTIONS = [
  'periodnumber-desc',
  'periodnumber-asc',
  'calculated-desc',
  'calculated-asc',
] as const
export const HISTORY_PAGE_SIZES = [10, 20, 30, 50, 100] as const
export const HISTORY_PAGE_SIZE = 100
// ExportToEnum (HistoryIndex.cshtml:41-42): Pdf 0, Csv 1, as in Devices and Activity. Legacy shows both (D-097).
export const EXPORT_TO_PDF = 0
export const EXPORT_TO_CSV = 1

export type SortOption = (typeof SORT_OPTIONS)[number]
export type StudentPick = { id: number; label: string }

export type HistoryFilters = {
  isTrainingPeriod: '' | 'true' | 'false'
  start: string
  end: string
  modelIds: number[]
  nodeIds: number[]
  status: string[]
  containing: string
  student: StudentPick | null
  sort: SortOption
}

export type HistoryQuery = {
  view: EngagementHistoryView
  filters: HistoryFilters
  pageIndex: number
  pageSize: number
}

// First load and Clear send raw periodStart/periodEnd (seats-admin-engagement-history.html:830-831,1058-1059).
export function periodFilters(period: CalculationPeriodDto | null, today: Date): HistoryFilters {
  const fallback = formatDate(today)
  return {
    isTrainingPeriod: '',
    start: period?.periodStart ?? fallback,
    end: period?.periodEnd ?? fallback,
    modelIds: [],
    nodeIds: [],
    status: [],
    containing: '',
    student: null,
    sort: 'periodnumber-desc',
  }
}

// Display dates follow the UI culture (D-111); an unreadable value falls back to today.
export function parseDisplayDate(value: string): Date {
  return parseShortDate(value) ?? new Date()
}

export function parseFilterDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  return parseDisplayDate(value)
}

// seats-admin-engagement-history.html:865,908: the count is requested while none is known; page 0 always asks.
export const wantsTotal = (pageIndex: number, known: number | null) =>
  pageIndex === 0 || known === null || known === 0

// _returnStatsParams / _returnStudentScoreParams (seats-admin-engagement-history.html:859-921).
export function toHistoryBody(
  { view, filters, pageIndex, pageSize }: HistoryQuery,
  returnTotalCount: boolean = pageIndex === 0,
): EngagementHistoryBody {
  const [sortField, sortOrder] = filters.sort.split('-')
  const base: EngagementHistoryBody = {
    returnTotalCount,
    pageNumber: pageIndex,
    pageSize,
    sortField,
    sortOrder,
    isTrainingPeriod: filters.isTrainingPeriod,
    startDatePeriod: filters.start,
    endDatePeriod: filters.end,
    modelIds: filters.modelIds,
    nodeIds: filters.nodeIds,
    status: filters.status,
  }
  return view === 'Stats'
    ? { ...base, containing: filters.containing }
    : { ...base, studentIds: [filters.student?.id ?? ''] }
}

// _getExportAjaxActive (seats-admin-engagement-history.html:1175-1202).
export function toExportBody(query: HistoryQuery, exportTo: number) {
  return {
    ...toHistoryBody(query),
    returnTotalCount: true,
    exportTo,
    userId: '',
    userCultureInfo: '',
    userNotificationId: '',
  }
}

const num = (value: unknown) => (typeof value === 'number' ? value : null)
const str = (value: unknown) => (typeof value === 'string' ? value : null)

function message(value: unknown): EngagementMessageDto | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  return { messages: str(record.messages), count: num(record.count) ?? 0 }
}

function base(record: Record<string, unknown>) {
  return {
    period: str(record.period),
    calculated: str(record.calculated),
    training: record.training === true,
    model: str(record.model),
    node: str(record.node),
    status: str(record.status),
    instances: num(record.instances),
    min: num(record.min),
    max: num(record.max),
    mean: num(record.mean),
    sd: num(record.sd),
  }
}

export type HistoryPage<T> = { items: T[]; totalRowCount: number }

function records(raw: unknown): { rows: Record<string, unknown>[]; total: number } {
  const page = pageEnvelope(raw, 'engagementApi/history')
  const rows = page.items.filter(
    (item): item is Record<string, unknown> => !!item && typeof item === 'object',
  )
  if (rows.length !== page.items.length) throw new ApiError('parse', 'engagementApi/history')
  return { rows, total: Math.max(page.totalRowCount, rows.length) }
}

export function parseStatsPage(raw: unknown): HistoryPage<EngagementStatsItem> {
  const { rows, total } = records(raw)
  return {
    items: rows.map(row => ({
      ...base(row),
      errors: message(row.errors),
      warnings: message(row.warnings),
      messages: message(row.messages),
    })),
    totalRowCount: total,
  }
}

export function parseStudentScorePage(raw: unknown): HistoryPage<EngagementStudentScoreItem> {
  const { rows, total } = records(raw)
  return {
    items: rows.map(row => ({
      ...base(row),
      studentId: num(row.studentId) ?? 0,
      r: num(row.r),
      z: num(row.z),
      dr: num(row.dr),
      dz: num(row.dz),
      zdz: num(row.zdz),
      p: num(row.p),
    })),
    totalRowCount: total,
  }
}

// Messages arrive as a JSON array string; legacy injected them as HTML, React shows text.
export function parseMessageList(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.map(item => (typeof item === 'string' ? item : JSON.stringify(item)))
      : []
  } catch {
    return []
  }
}

// _addElipse: numbers longer than six characters are cut, the full value stays in the tooltip.
export function shortNumber(value: number | null): string {
  if (value === null) return ''
  const text = String(value)
  return text.length > 6 ? `${text.slice(0, 6)}...` : text
}

export function formatCalculated(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
