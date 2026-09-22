import type {
  DeviceBuildingOptionDto,
  DeviceListItemDto,
  DeviceRoomOptionDto,
  DevicesPageDto,
  DevicesQueryParams,
  DevicesSortColumn,
  ExportDeviceReportBody,
  ExportTo,
} from '@/types/devices'
import type { SimpleListItemDto, SortDirection } from '@/types/users'
import { ApiError } from '@/shared/api'
import { EMPTY_FILTERS, type DeviceFilters, type LocationOptions } from './device-filters'

export const PAGE_SIZES = [10, 15, 20, 50, 100, 200] as const
export const DEFAULT_PAGE_SIZE = 100
export const PAGER_MIN_ROWS = 10

// Seats.Trunk.Contracts ExportToEnum.
export const EXPORT_TO = { pdf: 0, csv: 1 } as const satisfies Record<string, ExportTo>

export type DevicesQuery = {
  pageIndex: number
  pageSize: number
  sortCol: DevicesSortColumn
  sortDir: SortDirection
  search: string
  filters: DeviceFilters
}

// Index.cshtml:214-215 initial sort, swgrid.js:29 default page size.
export const INITIAL_QUERY: DevicesQuery = {
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
  sortCol: 'description',
  sortDir: 'desc',
  search: '',
  filters: EMPTY_FILTERS,
}

// swgrid.js:662-667 trims and collapses double spaces before sending.
export function cleanSearch(raw: string): string {
  let value = raw.trim()
  while (value.includes('  ')) value = value.replace('  ', ' ')
  return value
}

// swgrid.js:344-350: same column flips direction, a new column starts ascending.
export function nextSort(query: DevicesQuery, column: DevicesSortColumn): DevicesQuery {
  const sortDir: SortDirection = query.sortCol === column && query.sortDir === 'asc' ? 'desc' : 'asc'
  return { ...query, sortCol: column, sortDir, pageIndex: 0 }
}

// swgrid.js:656-668 paging and search, then deviceIndexController.js:321-346 filters (optional ones only when set).
export function toParams(query: DevicesQuery): DevicesQueryParams {
  const { filters } = query
  const params: DevicesQueryParams = {
    currentPageIndex: query.pageIndex,
    pageSize: query.pageSize,
    sortCol: query.sortCol,
    sortDir: query.sortDir,
    searchFilter: query.search,
    includeInactive: filters.includeInactive,
  }
  if (filters.battery.touched) {
    params.batteryPercentMin = filters.battery.min
    params.batteryPercentMax = filters.battery.max
  }
  if (filters.siteId !== null) params.siteId = filters.siteId
  if (filters.buildingId !== null) params.buildingId = filters.buildingId
  if (filters.roomId !== null) params.roomId = filters.roomId
  return params
}

export function queryKey(query: DevicesQuery): string {
  return `devices:${JSON.stringify(toParams(query))}`
}

// Export uses the applied search, filters and sort, so the report matches the grid on screen.
export function exportBody(query: DevicesQuery, exportTo: ExportTo): ExportDeviceReportBody {
  const { filters } = query
  return {
    searchString: query.search,
    includeInactive: filters.includeInactive,
    exportTo,
    sortField: query.sortCol,
    sortOrder: query.sortDir,
    batteryPercentMin: filters.battery.touched ? filters.battery.min : '',
    batteryPercentMax: filters.battery.touched ? filters.battery.max : '',
    siteId: filters.siteId,
    buildingId: filters.buildingId,
    roomId: filters.roomId,
  }
}

// swgrid.js:421-427 repeats the ids parameter for every selected device.
export function deleteDevicesPath(ids: readonly number[]): string {
  return `DeviceApi?${ids.map(id => `ids=${encodeURIComponent(String(id))}`).join('&')}`
}

export type BatteryLevel = 'good' | 'medium' | 'low'

// Index.cshtml:199-205 thresholds.
export function batteryLevel(percent: number): BatteryLevel {
  if (percent > 40) return 'good'
  if (percent > 15) return 'medium'
  return 'low'
}

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const integer = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) ? value : null
const record = (raw: unknown): Record<string, unknown> | null =>
  raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null

function toDevice(raw: unknown): DeviceListItemDto | null {
  const item = record(raw)
  const id = item ? integer(item.id) : null
  if (!item || id === null) return null
  return {
    id,
    description: text(item.description),
    isActive: item.isActive === true,
    serialNumber: text(item.serialNumber),
    macAddress: text(item.macAddress),
    ipAddress: text(item.ipAddress),
    displayLastHeartBeat: text(item.displayLastHeartBeat),
    displayLastReadDate: text(item.displayLastReadDate),
    roomNames: text(item.roomNames),
    assetTag: text(item.assetTag),
    buildingNames: text(item.buildingNames),
    batteryPercent: integer(item.batteryPercent),
  }
}

const isPresent = <T>(value: T | null): value is T => value !== null

export function parseDevicesPage(raw: unknown): DevicesPageDto {
  const path = 'DeviceApi/GetDevices'
  const page = record(raw)
  if (!page || !Array.isArray(page.items)) throw new ApiError('parse', path)
  const items = page.items.map(toDevice)
  if (items.some(item => item === null)) throw new ApiError('parse', path)
  const total = integer(page.totalRowCount)
  if (total === null) throw new ApiError('parse', path)
  return { items: items as DeviceListItemDto[], totalRowCount: Math.max(total, 0) }
}

function list<T>(raw: unknown, map: (item: Record<string, unknown>, id: number) => T): T[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(entry => {
      const item = record(entry)
      const id = item ? integer(item.id) : null
      return item && id !== null ? map(item, id) : null
    })
    .filter(isPresent)
}

// DeviceApiController.cs:69-103 option lists, each fetched for its own parent (deviceIndexController.js:167-177).
export function parseSiteOptions(raw: unknown): SimpleListItemDto[] {
  return list<SimpleListItemDto>(raw, (item, id) => ({ id, description: text(item.description) }))
}

export function parseBuildingOptions(raw: unknown): DeviceBuildingOptionDto[] {
  return list<DeviceBuildingOptionDto | null>(raw, (item, id) => {
    const siteId = integer(item.siteId)
    return siteId === null ? null : { id, description: text(item.description), siteId }
  }).filter(isPresent)
}

export function parseRoomOptions(raw: unknown): DeviceRoomOptionDto[] {
  return list<DeviceRoomOptionDto>(raw, (item, id) => ({
    id,
    description: text(item.description),
    buildingId: integer(item.buildingId),
  }))
}

export function parseLocationOptions(sites: unknown, buildings: unknown, rooms: unknown): LocationOptions {
  return {
    sites: parseSiteOptions(sites),
    buildings: parseBuildingOptions(buildings),
    rooms: parseRoomOptions(rooms),
  }
}
