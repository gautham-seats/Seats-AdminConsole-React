import type {
  SecurityLevel,
  SimpleListItemDto,
  UserSecurityLevelPermissionDto,
  UserSecurityLevelPermissionToProcessDto,
} from '@/types/users'

// Views/User/Details.cshtml:205-270 row order.
export const SECURITY_LEVELS: readonly SecurityLevel[] = [
  'school',
  'course',
  'module',
  'programme',
  'faculty',
  'student',
]

const OWN_CLASSES = 'isOwnClasses'

const OVERVIEW_LIMIT = 40

const asNumberOrNull = (value: unknown): number | null => (typeof value === 'number' ? value : null)
const asText = (value: unknown): string | null => (typeof value === 'string' ? value : null)

function parseLevelPermission(raw: unknown): UserSecurityLevelPermissionDto | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (typeof record.id !== 'number') return null
  return {
    ...record,
    id: record.id,
    userId: asNumberOrNull(record.userId),
    name: asText(record.name),
    userName: asText(record.userName),
    facultyId: asNumberOrNull(record.facultyId),
    schoolId: asNumberOrNull(record.schoolId),
    programmeId: asNumberOrNull(record.programmeId),
    courseId: asNumberOrNull(record.courseId),
    moduleId: asNumberOrNull(record.moduleId),
    studentId: asNumberOrNull(record.studentId),
    isSuperUser: record.isSuperUser === true,
    isOwnClasses: record.isOwnClasses === true,
  }
}

export function parseLevelPermissions(raw: unknown): UserSecurityLevelPermissionDto[] {
  const list =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>).userSecurityLevelPermissions : undefined
  return Array.isArray(list)
    ? list.map(parseLevelPermission).filter((item): item is UserSecurityLevelPermissionDto => item !== null)
    : []
}

export function parseToProcess(raw: unknown): UserSecurityLevelPermissionToProcessDto[] | null {
  if (!Array.isArray(raw)) return null
  return raw.flatMap(entry => {
    if (!entry || typeof entry !== 'object') return []
    const record = entry as Record<string, unknown>
    if (typeof record.securityLevel !== 'string') return []
    const items = Array.isArray(record.userSecurityLevelPermissions)
      ? record.userSecurityLevelPermissions
          .map(parseLevelPermission)
          .filter((item): item is UserSecurityLevelPermissionDto => item !== null)
      : []
    return [{ securityLevel: record.securityLevel, userSecurityLevelPermissions: items }]
  })
}

const levelIdField = (level: SecurityLevel) => `${level}Id` as const

export function findLevelEntry(
  toProcess: readonly UserSecurityLevelPermissionToProcessDto[],
  level: string,
): UserSecurityLevelPermissionToProcessDto | undefined {
  return toProcess.find(entry => entry.securityLevel === level)
}

// userDetailsController.js:418-423 and 213-221: replace the level entry or add it.
export function applyLevel(
  toProcess: readonly UserSecurityLevelPermissionToProcessDto[],
  level: string,
  items: UserSecurityLevelPermissionDto[],
): UserSecurityLevelPermissionToProcessDto[] {
  const entry = { securityLevel: level, userSecurityLevelPermissions: items }
  return findLevelEntry(toProcess, level)
    ? toProcess.map(current => (current.securityLevel === level ? entry : current))
    : [...toProcess, entry]
}

// userDetailsController.js:223-241 keeps lecturer visibility as its own entry, saved last by the API.
export function applyOwnClasses(
  toProcess: readonly UserSecurityLevelPermissionToProcessDto[],
  on: boolean,
  userId: number,
): UserSecurityLevelPermissionToProcessDto[] {
  const items: UserSecurityLevelPermissionDto[] = on
    ? [newPermission(0, userId, null, { isOwnClasses: true })]
    : []
  return applyLevel(toProcess, OWN_CLASSES, items)
}

// userDetailsController.js:424-439: names joined with ";" and cut after 40 characters.
export function summarizeLevel(items: readonly UserSecurityLevelPermissionDto[]): string | null {
  if (items.length === 0) return null
  let overview = ''
  for (const item of items) {
    overview = `${overview}${item.name ?? ''};`
    if (overview.length > OVERVIEW_LIMIT) return `${overview.slice(0, OVERVIEW_LIMIT)}...`
  }
  return overview
}

function newPermission(
  id: number,
  userId: number,
  name: string | null,
  extra: Partial<UserSecurityLevelPermissionDto> = {},
): UserSecurityLevelPermissionDto {
  return {
    id,
    userId,
    name,
    userName: '',
    facultyId: null,
    schoolId: null,
    programmeId: null,
    courseId: null,
    moduleId: null,
    studentId: null,
    isSuperUser: false,
    isOwnClasses: false,
    ...extra,
  }
}

// userSecurityLevelPermissionDetailsController.js:37-66: skip a level already listed; new rows get a negative temporary id.
export function addLevelPermission(
  items: readonly UserSecurityLevelPermissionDto[],
  level: SecurityLevel,
  selection: SimpleListItemDto,
  userId: number,
): UserSecurityLevelPermissionDto[] {
  const field = levelIdField(level)
  if (items.some(item => item[field] === selection.id)) return [...items]
  const lowest = items.reduce((min, item) => Math.min(min, item.id), 0)
  return [...items, newPermission(lowest - 1, userId, selection.description, { [field]: selection.id })]
}

export function removeLevelPermissions(
  items: readonly UserSecurityLevelPermissionDto[],
  ids: ReadonlySet<number>,
): UserSecurityLevelPermissionDto[] {
  return items.filter(item => !ids.has(item.id))
}
