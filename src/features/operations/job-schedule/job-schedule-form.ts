import type { JobDetailsDto, JobScheduleBody, JobScheduleDto } from '@/types/operations'
import { isValidCronExpression } from './cron'

// Seats.Trunk.Contracts ExportTypeEnum / ReportGroupEnum values used by Views/JobSchedule/Details.cshtml.
export const JOB_TYPE = {
  AttendanceExport: 2,
  RoomUtilisation: 4,
  AcademicExport: 5,
  AbsenceExport: 6,
  StudentsExport: 101,
  TimetablesExport: 102,
  LastHeartbeatReport: 103,
  ProcessClockingsMonitorReport: 104,
} as const

const isMonitor = (typeId: number) =>
  typeId === JOB_TYPE.LastHeartbeatReport || typeId === JOB_TYPE.ProcessClockingsMonitorReport

export const showsDateRange = (typeId: number) => typeId !== JOB_TYPE.StudentsExport && !isMonitor(typeId)
export const showsAcademic = (typeId: number) => typeId !== JOB_TYPE.TimetablesExport && !isMonitor(typeId)
export const showsLocation = (typeId: number) => showsAcademic(typeId) && typeId === JOB_TYPE.RoomUtilisation
export const showsAttendance = (typeId: number) => typeId === JOB_TYPE.AttendanceExport
export const showsMonitor = isMonitor

export type LookupField = 'school' | 'course' | 'module' | 'site' | 'building' | 'room'

export const LOOKUPS: readonly { field: LookupField; key: keyof JobScheduleDto; controller: string }[] = [
  { field: 'school', key: 'schoolId', controller: 'School' },
  { field: 'course', key: 'courseId', controller: 'Course' },
  { field: 'module', key: 'moduleId', controller: 'Module' },
  { field: 'site', key: 'siteId', controller: 'Site' },
  { field: 'building', key: 'buildingId', controller: 'Building' },
  { field: 'room', key: 'roomId', controller: 'Room' },
]

// POST body keys in the order ko.toJSON(detail) serialises JobScheduleViewModel fields.
export const JOB_SCHEDULE_BODY_KEYS: readonly (keyof JobScheduleBody)[] = [
  'id',
  'typeId',
  'typeCode',
  'typeName',
  'description',
  'cronExpression',
  'enabled',
  'code',
  'schoolId',
  'courseId',
  'moduleId',
  'siteId',
  'buildingId',
  'roomId',
  'from',
  'to',
  'dateRangeId',
  'jobClass',
  'sendToTutor',
  'comparisonOperator',
  'percentageAttended',
  'emptyEmail',
  'minutes',
  'minutesDefault',
  'recipients',
]

// Number inputs stay text while editing, as the knockout observables did.
export type JobDraft = Omit<JobScheduleDto, 'percentageAttended' | 'minutes'> & {
  percentageAttended: string
  minutes: string
}

export function toJobDraft(detail: JobScheduleDto): JobDraft {
  return {
    ...detail,
    percentageAttended: detail.percentageAttended === null ? '' : String(detail.percentageAttended),
    minutes: detail.minutes === null ? '' : String(detail.minutes),
  }
}

// Knockout's options binding picks the first option when a rendered select has no matching value.
export function withVisibleDefaults(draft: JobDraft, details: JobDetailsDto): JobDraft {
  const next = { ...draft }
  const types = details.jobTypeAvailables ?? []
  if (next.id === 0 && types.length && !types.some(type => type.id === next.typeId)) next.typeId = types[0].id
  const ranges = details.dateRangeAvailables ?? []
  if (showsDateRange(next.typeId) && ranges.length && !ranges.some(range => range.id === next.dateRangeId)) {
    next.dateRangeId = ranges[0].id
  }
  const operators = details.comparisonOperatorAvailables ?? []
  if (
    showsAttendance(next.typeId) &&
    operators.length &&
    !operators.some(operator => String(operator.id) === next.comparisonOperator)
  ) {
    next.comparisonOperator = String(operators[0].id)
  }
  // A field the user can no longer see must not decide the save, so unpostable text goes with its section.
  if (!showsAttendance(next.typeId) && notANumber(next.percentageAttended)) next.percentageAttended = ''
  if (!showsMonitor(next.typeId) && notANumber(next.minutes)) next.minutes = ''
  return next
}

const notANumber = (value: string) => {
  const trimmed = value.trim()
  return trimmed !== '' && !Number.isFinite(Number(trimmed))
}

// Lookup search URLs from jobScheduleDetailsController.js:585-616; academic lists filter each other.
export function lookupQuery(field: LookupField, draft: JobDraft, query: string): Record<string, string> {
  const id = (value: number | null) => (value === null ? '' : String(value))
  switch (field) {
    case 'school':
      return { query, courseId: id(draft.courseId), moduleId: id(draft.moduleId) }
    case 'course':
      return { query, schoolId: id(draft.schoolId), moduleId: id(draft.moduleId) }
    case 'module':
      return { query, schoolId: id(draft.schoolId), courseId: id(draft.courseId) }
    default:
      return { query }
  }
}

// jobScheduleDetailsController.js:507, with the legacy {1, 3} typo corrected (LB-051).
const EMAIL =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

const TEXT_FIELDS = ['description', 'cronExpression', 'percentageAttended', 'minutes', 'recipients'] as const

export type JobErrorField = (typeof TEXT_FIELDS)[number]
export type JobErrorKind = 'special' | 'email' | 'cron' | 'required' | 'range' | 'number'

export type JobError = { field: JobErrorField; kind: JobErrorKind }

// swapp.js:2642 rejects < and >; JobScheduleApiController.cs:423-424 validates cron with Cronos.
export function validateJob(draft: JobDraft): JobError | null {
  for (const field of TEXT_FIELDS) {
    if (/[<>]/.test(draft[field] ?? '')) return { field, kind: 'special' }
  }

  const cron = (draft.cronExpression ?? '').trim()
  if (!cron) return { field: 'cronExpression', kind: 'required' }
  if (!isValidCronExpression(cron)) return { field: 'cronExpression', kind: 'cron' }

  if (showsAttendance(draft.typeId)) {
    const percentage = draft.percentageAttended.trim()
    if (percentage && !Number.isFinite(Number(percentage)))
      return { field: 'percentageAttended', kind: 'number' }
  }

  if (showsMonitor(draft.typeId)) {
    if (draft.recipients?.trim()) {
      if (draft.recipients.split(',').some(email => !EMAIL.test(email.trim()))) {
        return { field: 'recipients', kind: 'email' }
      }
    }
    const minutes = draft.minutes.trim()
    if (minutes) {
      const value = Number(minutes)
      if (!Number.isInteger(value) || value < 1 || value > 60) return { field: 'minutes', kind: 'range' }
    }
  }

  return null
}

const numberOrNull = (value: string): number | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const number = Number(trimmed)
  return Number.isFinite(number) ? number : null
}

// Body of POST JobScheduleApi/: JobScheduleViewModel fields only; hidden fields keep their values as legacy did.
export function toJobBody(draft: JobDraft): JobScheduleBody {
  return {
    id: draft.id,
    typeId: draft.typeId,
    typeCode: draft.typeCode,
    typeName: draft.typeName,
    description: draft.description,
    cronExpression: draft.cronExpression,
    enabled: draft.enabled,
    code: draft.code,
    schoolId: draft.schoolId,
    courseId: draft.courseId,
    moduleId: draft.moduleId,
    siteId: draft.siteId,
    buildingId: draft.buildingId,
    roomId: draft.roomId,
    from: draft.from,
    to: draft.to,
    dateRangeId: draft.dateRangeId,
    jobClass: draft.jobClass,
    sendToTutor: draft.sendToTutor,
    comparisonOperator: draft.comparisonOperator,
    percentageAttended: numberOrNull(draft.percentageAttended),
    emptyEmail: draft.emptyEmail,
    minutes: numberOrNull(draft.minutes),
    minutesDefault: draft.minutesDefault,
    recipients: draft.recipients,
  }
}
