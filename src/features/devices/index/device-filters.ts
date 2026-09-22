import type { DeviceBuildingOptionDto, DeviceRoomOptionDto } from '@/types/devices'
import type { SimpleListItemDto } from '@/types/users'

export type LocationOptions = {
  sites: SimpleListItemDto[]
  buildings: DeviceBuildingOptionDto[]
  rooms: DeviceRoomOptionDto[]
}

export type BatteryRange = { min: number; max: number; touched: boolean }

export type DeviceFilters = {
  includeInactive: boolean
  siteId: number | null
  buildingId: number | null
  roomId: number | null
  battery: BatteryRange
}

export type FilterKey = 'inactive' | 'site' | 'building' | 'room' | 'battery'

export const BATTERY_FLOOR = 0
export const BATTERY_CEILING = 100

const UNTOUCHED_BATTERY: BatteryRange = { min: BATTERY_FLOOR, max: BATTERY_CEILING, touched: false }

// deviceIndexController.js:73 and :97-109 defaults.
export const EMPTY_FILTERS: DeviceFilters = {
  includeInactive: false,
  siteId: null,
  buildingId: null,
  roomId: null,
  battery: UNTOUCHED_BATTERY,
}

// deviceIndexController.js:185-191: a site change clears building and room.
export function selectSite(filters: DeviceFilters, siteId: number | null): DeviceFilters {
  return { ...filters, siteId, buildingId: null, roomId: null }
}

// deviceIndexController.js:192-207: a building back-fills its site and clears room.
export function selectBuilding(
  filters: DeviceFilters,
  buildingId: number | null,
  options: LocationOptions,
): DeviceFilters {
  if (buildingId === null) return { ...filters, buildingId: null, roomId: null }
  const building = options.buildings.find(item => item.id === buildingId)
  // An unknown building leaves the site as it was (deviceIndexController.js:195-203 only changes it on a match).
  return { ...filters, siteId: building ? building.siteId : filters.siteId, buildingId, roomId: null }
}

// deviceIndexController.js:208-233: a room back-fills its building and site.
export function selectRoom(
  filters: DeviceFilters,
  roomId: number | null,
  options: LocationOptions,
): DeviceFilters {
  if (roomId === null) return { ...filters, roomId: null }
  const room = options.rooms.find(item => item.id === roomId)
  // A room with no building leaves site and building alone (deviceIndexController.js:212 returns early).
  if (!room || room.buildingId === null) return { ...filters, roomId }
  const building = options.buildings.find(item => item.id === room.buildingId)
  return {
    ...filters,
    siteId: building ? building.siteId : filters.siteId,
    buildingId: room.buildingId,
    roomId,
  }
}

export function clampPercent(value: number): number {
  return Math.min(BATTERY_CEILING, Math.max(BATTERY_FLOOR, Math.round(value)))
}

// One clamp for deviceIndexController.js:111-165: keep 0-100 and move the other bound so min <= max.
export function setBatteryBound(range: BatteryRange, bound: 'min' | 'max', raw: number): BatteryRange {
  if (!Number.isFinite(raw)) return range
  const value = clampPercent(raw)
  return bound === 'min'
    ? { min: value, max: Math.max(range.max, value), touched: true }
    : { min: Math.min(range.min, value), max: value, touched: true }
}

export function resetBattery(filters: DeviceFilters): DeviceFilters {
  return { ...filters, battery: UNTOUCHED_BATTERY }
}

export function sameFilters(a: DeviceFilters, b: DeviceFilters): boolean {
  return (
    a.includeInactive === b.includeInactive &&
    a.siteId === b.siteId &&
    a.buildingId === b.buildingId &&
    a.roomId === b.roomId &&
    a.battery.touched === b.battery.touched &&
    (!a.battery.touched || (a.battery.min === b.battery.min && a.battery.max === b.battery.max))
  )
}

export function clearFilter(filters: DeviceFilters, key: FilterKey): DeviceFilters {
  switch (key) {
    case 'inactive':
      return { ...filters, includeInactive: false }
    case 'site':
      return selectSite(filters, null)
    case 'building':
      return { ...filters, buildingId: null, roomId: null }
    case 'room':
      return { ...filters, roomId: null }
    case 'battery':
      return resetBattery(filters)
  }
}

export function activeFilterKeys(filters: DeviceFilters): FilterKey[] {
  const keys: FilterKey[] = []
  if (filters.includeInactive) keys.push('inactive')
  if (filters.siteId !== null) keys.push('site')
  if (filters.buildingId !== null) keys.push('building')
  if (filters.roomId !== null) keys.push('room')
  if (filters.battery.touched) keys.push('battery')
  return keys
}
