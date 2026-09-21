import type {
  AuditDetailDto,
  AuditItemDto,
  AuditPageDto,
  AuditParameters,
  AuditSortColumn,
} from '@/types/audit'
import { ApiError } from '@/shared/api'
import { formatShortDate } from '@/shared/i18n/culture'
import { safeHttpUrl } from '@/shared/security/safe-http-url'

export const AUDIT_PAGE_SIZES = [10, 20, 30, 50, 100, 200] as const

// seats-admin-audit.html:141-157 option values; labels are resource keys.
export const SITE_OPTIONS = [
  { value: '', key: 'All' },
  { value: 'admin', key: 'Admin' },
  { value: 'web', key: 'Web' },
] as const

export const TYPE_OPTIONS = [
  { value: '', key: 'All' },
  { value: 'Login', key: 'Logon' },
  { value: 'Page', key: 'Page' },
  { value: 'Action', key: 'Action' },
  { value: 'Cancel', key: 'Cancel' },
] as const

export type DateRange = { from: Date; to: Date }

export type AuditUser = { id: number; name: string }

export type AuditQuery = {
  pageIndex: number
  pageSize: number
  sortCol: AuditSortColumn
  sortDir: 'asc' | 'desc'
  site: string
  type: string
  user: AuditUser | null
  range: DateRange
}

export const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

// seats-admin-audit.html:330-343 defaults, range today to today (:381-382).
export function initialAuditQuery(today: Date): AuditQuery {
  const day = startOfDay(today)
  return {
    pageIndex: 0,
    pageSize: 100,
    sortCol: 'accessDate',
    sortDir: 'desc',
    site: '',
    type: '',
    user: null,
    range: { from: day, to: day },
  }
}

const pad = (value: number) => String(value).padStart(2, '0')

export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

// seats-admin-audit.html:324-328 shows the range in the UI-culture short-date pattern (D-111).
export const formatDisplayDate = (date: Date) => formatShortDate(date)

export const sameDay = (a: Date, b: Date) => toIsoDate(a) === toIsoDate(b)

export const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

// seats-admin-audit.html:555-568 posts the filters object with dates as YYYY-MM-DD.
export function toAuditBody(query: AuditQuery): AuditParameters {
  return {
    pageNumber: query.pageIndex,
    pageSize: query.pageSize,
    sortCol: query.sortCol,
    sortDir: query.sortDir,
    type: query.type,
    user: query.user ? query.user.id : '',
    site: query.site,
    from: toIsoDate(query.range.from),
    to: toIsoDate(query.range.to),
  }
}

export function auditQueryKey(query: AuditQuery): string {
  const body = toAuditBody(query)
  return `audit:${Object.values(body).join(':')}`
}

// seats-grid-sortable-behaviour.html:18-29 ascending first; any sort returns to page 0 (seats-admin-audit.html:523-530).
export function nextAuditSort(query: AuditQuery, column: AuditSortColumn): AuditQuery {
  const sortDir = query.sortCol === column && query.sortDir === 'asc' ? 'desc' : 'asc'
  return { ...query, sortCol: column, sortDir, pageIndex: 0 }
}

// seats-grid-paginator-behaviour.html:48 shows the pager only when there is more than one page of rows.
export const showAuditPager = (total: number, pageSize: number) => total > pageSize

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)

function toDetail(raw: unknown): AuditDetailDto | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  return { auditType: text(record.auditType), detail: text(record.detail) }
}

function toItem(raw: unknown): AuditItemDto | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (typeof record.id !== 'number') return null
  return {
    id: record.id,
    userName: text(record.userName),
    userFullName: text(record.userFullName),
    userId: typeof record.userId === 'number' ? record.userId : 0,
    accessDate: text(record.accessDate),
    auditType: text(record.auditType),
    detail: toDetail(record.detail),
  }
}

export function parseAuditPage(raw: unknown): AuditPageDto {
  const path = 'audit/GetAudit'
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ApiError('parse', path)
  const record = raw as Record<string, unknown>
  if (!Array.isArray(record.items)) throw new ApiError('parse', path)
  const items = record.items.map(toItem)
  if (items.some(item => item === null)) throw new ApiError('parse', path)
  if (typeof record.totalRowCount !== 'number' || !Number.isInteger(record.totalRowCount))
    throw new ApiError('parse', path)
  return { items: items as AuditItemDto[], totalRowCount: Math.max(record.totalRowCount, 0) }
}

export type AuditItemKey = 'SeatsPageview' | 'SeatsAction' | 'SeatsCancel' | 'SeatsLogon'

// seats-admin-audit.html:442-444.
export function auditItemKey(auditType: string | null): AuditItemKey {
  if (auditType === 'Page') return 'SeatsPageview'
  if (auditType === 'Action') return 'SeatsAction'
  if (auditType === 'Cancel') return 'SeatsCancel'
  return 'SeatsLogon'
}

type Json = Record<string, unknown>

function parseJson(raw: string | null): Json | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Json) : null
  } catch {
    return null
  }
}

const str = (value: unknown) => (value === null || value === undefined ? '' : String(value))
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
const trimHash = (path: unknown) => str(path).replace('#/', '')

export type DetailText = { AdminSite: string; WebSite: string; DefaultPage: string }

export function minutesBetween(start: unknown, end: unknown): number {
  const from = new Date(str(start)).getTime()
  const to = new Date(str(end)).getTime()
  return Math.round((to - from) / 60000)
}

// seats-admin-audit.html:389-431 builds the Detail column text from the stored JSON.
export function describeAuditDetail(detail: AuditDetailDto | null, labels: DetailText): string {
  const object = parseJson(detail?.detail ?? null)
  if (!detail || !object) return ''
  const type = detail.auditType
  if (type === 'Login') return object.site === 'admin' ? labels.AdminSite : labels.WebSite
  if (type === 'Action' || type === 'Cancel') {
    const action = str(object.action).toUpperCase()
    const extra = object.extra && typeof object.extra === 'object' ? (object.extra as Json) : null
    if (extra) {
      switch (extra.type) {
        case 'ROOM':
          return `${action}  Room ${str(extra.roomCode)} - ${str(extra.roomName)}`
        case 'DEVICE':
          return `${action}  Device ${str(extra.serial)}`
        case 'DEVICE-ROOM':
          return `${action} room ${str(extra.roomCode)} - ${str(extra.roomName)} ${action === 'DELETED' ? 'from' : 'to'} device ${str(extra.serial)}`
        case 'LECTURE':
          return `${action}  lecture ${str(extra.lecture)}`
        case 'STUDENTSCHEDULE':
          return `${action}  lecture ${str(extra.lecture)}  student ${str(extra.student)}${extra.removeType ? ` removeType ${str(extra.removeType)}` : ''}${extra.module ? ` module ${str(extra.module)}` : ''}`
        case 'QR-OPENED':
          return `${action} type ${str(extra.qr)} lecture ${str(extra.timetableId)}${extra.roomId ? ` room ${str(extra.roomId)}` : ''} duration ${minutesBetween(extra.start, extra.end)} minutes`
        case 'ATTACHMENT':
          return `${action} ${str(extra.detail)} ${extra.student === null || extra.student === undefined ? 'N/A' : str(extra.student)} - attachment ${str(extra.attachement)}`
        default:
          break
      }
    }
    const room = object.room ? `Room: ${str(object.room)} ` : ''
    return `(${action}) ${room}/${capitalize(trimHash(object.path))}`
  }
  const path = str(object.path)
  if (/^https?/i.test(path)) return path
  if (path === '#') return `${labels.DefaultPage}  (${str(object.site).toUpperCase()})`
  return `/${capitalize(trimHash(path))}`
}

// seats-admin-audit.html:445-451 and 483-486; only absolute http(s) links are kept (docs/specs/users/audit.md, class C).
export function auditDetailLink(detail: AuditDetailDto | null): string | null {
  const object = parseJson(detail?.detail ?? null)
  if (!detail || !object || typeof object.url !== 'string') return null
  if (detail.auditType === 'Action') {
    const extra = object.extra && typeof object.extra === 'object' ? (object.extra as Json) : null
    if (!extra || !(extra.type === 'DEVICE-ROOM' || str(object.action).toUpperCase() !== 'DELETED'))
      return null
  }
  return safeHttpUrl(object.url)
}
