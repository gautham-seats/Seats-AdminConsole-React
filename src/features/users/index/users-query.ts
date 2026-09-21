import type {
  SortDirection,
  UserListItemDto,
  UsersPageDto,
  UsersQueryParams,
  UsersSortColumn,
} from '@/types/users'
import { ApiError } from '@/shared/api'

export const PAGE_SIZES = [10, 15, 20, 50, 100, 200] as const
export const DEFAULT_PAGE_SIZE = 100
export const PAGER_MIN_ROWS = 10

export type UsersQuery = {
  pageIndex: number
  pageSize: number
  sortCol: UsersSortColumn
  sortDir: SortDirection
  search: string
}

// Index.cshtml:139-140 initial sort, swgrid.js:29 default page size.
export const INITIAL_QUERY: UsersQuery = {
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
  sortCol: 'userName',
  sortDir: 'asc',
  search: '',
}

// swgrid.js:662-667 trims and collapses double spaces before sending.
export function cleanSearch(raw: string): string {
  let value = raw.trim()
  while (value.includes('  ')) value = value.replace('  ', ' ')
  return value
}

// swgrid.js:344-350: same column flips direction, a new column starts ascending.
export function nextSort(query: UsersQuery, column: UsersSortColumn): UsersQuery {
  const sortDir: SortDirection = query.sortCol === column && query.sortDir === 'asc' ? 'desc' : 'asc'
  return { ...query, sortCol: column, sortDir }
}

export function toParams(query: UsersQuery): UsersQueryParams {
  return {
    currentPageIndex: query.pageIndex,
    pageSize: query.pageSize,
    sortCol: query.sortCol,
    sortDir: query.sortDir,
    searchFilter: query.search,
  }
}

export function queryKey(query: UsersQuery): string {
  return `users:${query.pageIndex}:${query.pageSize}:${query.sortCol}:${query.sortDir}:${query.search}`
}

// swgrid.js:421-427 repeats the ids parameter for every selected user.
export function deleteUsersPath(ids: readonly number[]): string {
  return `UserApi?${ids.map(id => `ids=${encodeURIComponent(String(id))}`).join('&')}`
}

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)

function toItem(raw: unknown): UserListItemDto | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  if (typeof record.id !== 'number') return null
  return {
    id: record.id,
    // A user with no userName is still a real row: dropping it would hide an account the count still includes.
    userName: text(record.userName) ?? '',
    emailAddress: text(record.emailAddress),
    fullName: text(record.fullName),
    realName: text(record.realName),
    associatedStudentId: typeof record.associatedStudentId === 'number' ? record.associatedStudentId : null,
    accessProfiles: text(record.accessProfiles),
  }
}

export function parseUsersPage(raw: unknown): UsersPageDto {
  const path = 'UserApi'
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ApiError('parse', path)
  const record = raw as Record<string, unknown>
  if (!Array.isArray(record.items)) throw new ApiError('parse', path)
  const items = record.items.map(toItem)
  if (items.some(item => item === null)) throw new ApiError('parse', path)
  if (typeof record.totalRowCount !== 'number' || !Number.isInteger(record.totalRowCount))
    throw new ApiError('parse', path)
  return {
    items: items as UserListItemDto[],
    totalRowCount: Math.max(record.totalRowCount, 0),
    seatsAuthorisationByPersonas: record.seatsAuthorisationByPersonas === true,
  }
}
