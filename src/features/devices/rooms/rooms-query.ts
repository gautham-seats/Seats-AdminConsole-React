import type { RoomListItemDto, RoomsPageDto, RoomsQueryParams, RoomsSortColumn } from '@/types/devices'
import type { SortDirection } from '@/types/users'
import { ApiError } from '@/shared/api'

export type RoomsQuery = {
  pageIndex: number
  pageSize: number
  sortCol: RoomsSortColumn
  sortDir: SortDirection
  search: string
}

// Room/Index.cshtml:76-77 initial sort, swgrid.js:29 default page size.
export const INITIAL_ROOMS_QUERY: RoomsQuery = {
  pageIndex: 0,
  pageSize: 100,
  sortCol: 'externalCode',
  sortDir: 'desc',
  search: '',
}

// swgrid.js:344-350: same column flips direction, a new column starts ascending.
export function nextRoomsSort(query: RoomsQuery, column: RoomsSortColumn): RoomsQuery {
  const sortDir: SortDirection = query.sortCol === column && query.sortDir === 'asc' ? 'desc' : 'asc'
  return { ...query, sortCol: column, sortDir, pageIndex: 0 }
}

// swgrid.js:655-668.
export function toRoomsParams(query: RoomsQuery): RoomsQueryParams {
  return {
    currentPageIndex: query.pageIndex,
    pageSize: query.pageSize,
    sortCol: query.sortCol,
    sortDir: query.sortDir,
    searchFilter: query.search,
  }
}

export const roomsQueryKey = (query: RoomsQuery) => `rooms:${JSON.stringify(toRoomsParams(query))}`

// swgrid.js:421-427 repeats the ids parameter for every selected room.
export function deleteRoomsPath(ids: readonly number[]): string {
  return `RoomApi?${ids.map(id => `ids=${encodeURIComponent(String(id))}`).join('&')}`
}

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const integer = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) ? value : null

function toRoom(raw: unknown): RoomListItemDto | null {
  if (!raw || typeof raw !== 'object') return null
  const item = raw as Record<string, unknown>
  const id = integer(item.id)
  if (id === null) return null
  return {
    id,
    externalCode: text(item.externalCode),
    name: text(item.name),
    capacity: integer(item.capacity),
    buildingName: text(item.buildingName),
  }
}

export function parseRoomsPage(raw: unknown): RoomsPageDto {
  const path = 'RoomApi/GetRooms'
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ApiError('parse', path)
  const page = raw as Record<string, unknown>
  if (!Array.isArray(page.items)) throw new ApiError('parse', path)
  const items = page.items.map(toRoom)
  if (items.some(item => item === null)) throw new ApiError('parse', path)
  const total = integer(page.totalRowCount)
  if (total === null) throw new ApiError('parse', path)
  return { items: items as RoomListItemDto[], totalRowCount: Math.max(total, 0) }
}
