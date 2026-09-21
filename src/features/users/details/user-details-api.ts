import { api } from '@/shared/api'
import type {
  SecurityLevel,
  SimpleListItemDto,
  UserDetailsViewModel,
  UserDto,
  UserSecurityLevelPermissionDto,
} from '@/types/users'
import { parseLevelPermissions } from './security-levels'
import { parseUserDetails } from './user-form'

// GET api/UserApi/{id}. A new user must still send a segment: swapp.js:466-482 hands the hash tail
// 'Details' to userDetailsController.js:448, which binds id as null and returns the new-user view model.
// With no segment at all the route picks UserApiController.cs:59 instead, a flat list of every user.
export async function fetchUserDetails(
  id: number | null,
  signal: AbortSignal,
): Promise<UserDetailsViewModel> {
  const segment = id !== null && id > 0 ? String(id) : 'Details'
  const raw = await api.get<unknown>(`UserApi/${segment}`, { signal })
  return parseUserDetails(raw)
}

// POST api/UserApi with the full UserDto (swapp.js:530-536).
export function saveUser(user: UserDto): Promise<void> {
  return api.post<void>('UserApi', { body: user })
}

// GET api/UserApi/GetStudentsByCriteria?query= (swapp.js:784-809).
export async function searchStudents(query: string, signal: AbortSignal): Promise<SimpleListItemDto[]> {
  return toSimpleList(await api.get<unknown>('UserApi/GetStudentsByCriteria', { query: { query }, signal }))
}

// GET api/UserSecurityLevelPermissionApi/GetSecurityLevelsByCriteria (UserSecurityLevelPermission/Index.cshtml:25).
export async function searchSecurityLevels(
  securityLevel: SecurityLevel,
  query: string,
  signal: AbortSignal,
): Promise<SimpleListItemDto[]> {
  const raw = await api.get<unknown>('UserSecurityLevelPermissionApi/GetSecurityLevelsByCriteria', {
    query: { securityLevel, query },
    signal,
  })
  return toSimpleList(raw)
}

// GET api/UserSecurityLevelPermissionApi?userId&securityLevel (userSecurityLevelPermissionDetailsController.js:149).
export async function fetchLevelPermissions(
  userId: number,
  securityLevel: SecurityLevel,
  signal: AbortSignal,
): Promise<UserSecurityLevelPermissionDto[]> {
  const raw = await api.get<unknown>('UserSecurityLevelPermissionApi', {
    query: { userId, securityLevel },
    signal,
  })
  return parseLevelPermissions(raw)
}

// POST api/UserApi/SetPassword { id, password } (userDetailsController.js:329-333).
export function setUserPassword(id: number, password: string): Promise<void> {
  return api.post<void>('UserApi/SetPassword', { body: { id, password } })
}

// POST api/UserApi/SendResetPasswordLink with the user name as a JSON string (userDetailsController.js:145-153).
export function sendResetPasswordLink(userName: string): Promise<void> {
  return api.post<void>('UserApi/SendResetPasswordLink', { body: userName })
}

export function toSimpleList(raw: unknown): SimpleListItemDto[] {
  return Array.isArray(raw)
    ? raw.flatMap(item => {
        if (!item || typeof item !== 'object') return []
        const record = item as Record<string, unknown>
        return typeof record.id === 'number'
          ? [
              {
                id: record.id,
                description: typeof record.description === 'string' ? record.description : null,
              },
            ]
          : []
      })
    : []
}
