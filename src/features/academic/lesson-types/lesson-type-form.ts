import type {
  LessonTypeDto,
  LessonTypeSortColumn,
  LessonTypeTenantFlags,
  LessonTypeViewModel,
} from '@/types/lesson-types'

export const LESSON_TYPE_PAGE_SIZES = [10, 15, 20, 50, 100, 200] as const
export const LESSON_TYPE_PAGE_SIZE = 100
export const LESSON_TYPE_PAGER_MIN_ROWS = 10

export type Sort = { col: LessonTypeSortColumn; dir: 'asc' | 'desc' }

// Index.cshtml:158-159.
export const INITIAL_SORT: Sort = { col: 'description', dir: 'asc' }

const text = (value: unknown) => (typeof value === 'string' ? value : null)
const bool = (value: unknown) => value === true
const nullableBool = (value: unknown) => (typeof value === 'boolean' ? value : null)
const nullableInt = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

export function parseLessonType(raw: unknown): LessonTypeDto | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'number') return null
  return {
    id: r.id,
    name: text(r.name),
    description: text(r.description),
    // A cut-off that does not arrive as a number stays null, so the field shows empty and Save is blocked.
    earlyCutoff: nullableInt(r.earlyCutoff),
    lateCutoff: nullableInt(r.lateCutoff),
    absenceCutoff: nullableInt(r.absenceCutoff),
    percentageCutoff: nullableInt(r.percentageCutoff),
    checkoutCutoff: nullableInt(r.checkoutCutoff),
    isAbsenceBasedOnStart: bool(r.isAbsenceBasedOnStart),
    isAttendanceBasedOnCheckout: nullableBool(r.isAttendanceBasedOnCheckout),
    attendanceScaling: nullableInt(r.attendanceScaling),
    isGPSEnabled: bool(r.isGPSEnabled),
    isActive: bool(r.isActive),
    globalId: text(r.globalId),
    isConsecutiveAttendanceUpdate: bool(r.isConsecutiveAttendanceUpdate),
    isAbsenceBasedOnStartCutOff: nullableBool(r.isAbsenceBasedOnStartCutOff),
    isMandatory: nullableBool(r.isMandatory),
  }
}

// swgrid.js:710 binds `responseData == null ? [] : responseData`, so a bare null list is an empty grid,
// never an error. Anything that is not an array lands in the same empty state.
export function parseLessonTypes(raw: unknown): LessonTypeDto[] {
  return Array.isArray(raw)
    ? raw.map(parseLessonType).filter((item): item is LessonTypeDto => item !== null)
    : []
}

const toOptions = (raw: unknown) =>
  Array.isArray(raw)
    ? raw.flatMap(item => {
        const r = item && typeof item === 'object' ? (item as Record<string, unknown>) : null
        return r && typeof r.id === 'number' ? [{ id: r.id, description: text(r.description) }] : []
      })
    : []

export type LessonTypeViewResult =
  { kind: 'ok'; view: LessonTypeViewModel } | { kind: 'notFound' } | { kind: 'malformed' }

// LessonTypeApiController.cs:53-56 answers a missing id with an empty DTO (Id 0) and :71-72 throws 404
// when the record is gone. A body we cannot read is a broken contract, not a missing record.
export function parseLessonTypeView(raw: unknown): LessonTypeViewResult {
  if (!raw || typeof raw !== 'object') return { kind: 'malformed' }
  const r = raw as Record<string, unknown>
  const detail = parseLessonType(r.detail)
  if (!detail) return { kind: 'malformed' }
  if (detail.id <= 0) return { kind: 'notFound' }
  return {
    kind: 'ok',
    view: {
      detail,
      attendanceScalingAvailables: toOptions(r.attendanceScalingAvailables),
      attendanceBasedOnCheckoutAvailables: toOptions(r.attendanceBasedOnCheckoutAvailables),
    },
  }
}

// Both partials print the api url in their init script (Index.cshtml:154, Details.cshtml:142).
const LESSON_TYPE_PARTIAL = /api\/LessonTypeApi/i

// LessonTypeController.cs:37-57 decides these columns server-side; the rendered partial is the only client source.
// Null when the response is not that partial, so a missing marker is never read as "the flag is off".
export function readTenantFlags(html: string): LessonTypeTenantFlags | null {
  if (!LESSON_TYPE_PARTIAL.test(html)) return null
  return {
    attendanceByDuration: /(?:^|\s)id\s*=\s*["']attendance-scaling(-col)?["']/i.test(html),
    consecutiveAttendanceUpdate:
      /(?:^|\s)id\s*=\s*["'](is-consecutive-attendance-update-col|lesson-type-consecutive-attendance-update)["']/i.test(
        html,
      ),
  }
}

export const parseLessonTypeId = (raw: string) => (/^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null)

// swgrid.js:139-150 compares with < and > (booleans and nulls as text), stable for equal rows.
export function sortLessonTypes(items: readonly LessonTypeDto[], sort: Sort): LessonTypeDto[] {
  const sign = sort.dir === 'desc' ? -1 : 1
  const compare = (a: unknown, b: unknown) => {
    if (typeof a === 'number' && typeof b === 'number') return a - b
    const x = String(a ?? '')
    const y = String(b ?? '')
    return x > y ? 1 : x < y ? -1 : 0
  }
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => sign * compare(a.item[sort.col], b.item[sort.col]) || a.index - b.index)
    .map(entry => entry.item)
}

export const nextSort = (sort: Sort, col: LessonTypeSortColumn): Sort => ({
  col,
  dir: sort.col === col && sort.dir === 'asc' ? 'desc' : 'asc',
})

export type CheckoutKey = 'Disabled' | 'Mandatory' | 'Optional'
export type ScalingKey = 'None' | 'Enabled' | 'OnlyIfAbsent' | 'OnlyIfAttended'

// Index.cshtml:98-106.
export const checkoutKey = (value: boolean | null): CheckoutKey =>
  value === null ? 'Disabled' : value ? 'Mandatory' : 'Optional'

// Index.cshtml:111-123; AttendanceScalingEnum Enabled 1, OnlyIfAbsent 2, OnlyIfAttended 3.
export function scalingKey(value: number | null): ScalingKey {
  if (value === 1) return 'Enabled'
  if (value === 2) return 'OnlyIfAbsent'
  if (value === 3) return 'OnlyIfAttended'
  return 'None'
}

export const NUMBER_FIELDS = [
  'earlyCutoff',
  'lateCutoff',
  'absenceCutoff',
  'checkoutCutoff',
  'percentageCutoff',
] as const
export type NumberField = (typeof NUMBER_FIELDS)[number]

// lessonTypeDetailsController.js:37-52 requires only these three.
export const REQUIRED_FIELDS: readonly NumberField[] = ['earlyCutoff', 'lateCutoff', 'absenceCutoff']

export type LessonTypeForm = Omit<LessonTypeDto, NumberField> & Record<NumberField, string>

// A null cut-off becomes an empty field, as ko.observable(null) rendered one (Details.cshtml:50).
const toField = (value: number | null) => (value === null ? '' : String(value))

export function toLessonTypeForm(detail: LessonTypeDto): LessonTypeForm {
  return {
    ...detail,
    earlyCutoff: toField(detail.earlyCutoff),
    lateCutoff: toField(detail.lateCutoff),
    absenceCutoff: toField(detail.absenceCutoff),
    checkoutCutoff: toField(detail.checkoutCutoff),
    percentageCutoff: toField(detail.percentageCutoff),
  }
}

export type FieldError = 'required' | 'wholeNumber'
export type LessonTypeErrors = Partial<Record<NumberField, FieldError>>

// Required cutoffs as legacy; a typed value must be a whole Int32 because the column is an Int32.
export function validateLessonType(form: LessonTypeForm, visible: readonly NumberField[]): LessonTypeErrors {
  const errors: LessonTypeErrors = {}
  for (const field of visible) {
    const value = form[field].trim()
    if (value === '') {
      if (REQUIRED_FIELDS.includes(field)) errors[field] = 'required'
      continue
    }
    const number = Number(value)
    if (!Number.isInteger(number) || number < -2147483648 || number > 2147483647)
      errors[field] = 'wholeNumber'
  }
  return errors
}

// Null for anything that is not a finite number, so a bad value is never posted as NaN.
const toNumber = (value: string) => {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const number = Number(trimmed)
  return Number.isFinite(number) ? number : null
}

// Posts the whole loaded DTO with the edits (lessonTypeDetailsController.js:18-21); a blank optional cutoff goes as null
// and the server rejects it, as the legacy empty string did.
export function toLessonTypePayload(form: LessonTypeForm) {
  return {
    ...form,
    earlyCutoff: toNumber(form.earlyCutoff),
    lateCutoff: toNumber(form.lateCutoff),
    absenceCutoff: toNumber(form.absenceCutoff),
    checkoutCutoff: toNumber(form.checkoutCutoff),
    percentageCutoff: toNumber(form.percentageCutoff),
  }
}
