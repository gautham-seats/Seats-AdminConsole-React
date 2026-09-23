import type { DeviceListItemDto } from '@/types/devices'
import { EMPTY_FILTERS } from '../index/device-filters'
import { INITIAL_QUERY } from '../index/device-query'
import { fetchDevicesPage } from '../index/devices-api'

export type RoomDevices = {
  items: DeviceListItemDto[]
  total: number
  activeCount: number
  // The newest reading across the room's devices, already formatted by the server.
  lastReading: string | null
  lastReadingAt: number | null
  // The device most likely to need attention first.
  lowestBattery: number | null
}

// Every device assigned to this room, including inactive ones, so the count matches what the room holds.
const ROOM_PAGE_SIZE = 200

// The devices grid already filters by roomId (DeviceApiController.cs:47-64), so the room reuses that call.
export async function fetchRoomDevices(roomId: number, signal: AbortSignal): Promise<RoomDevices> {
  const page = await fetchDevicesPage(
    {
      ...INITIAL_QUERY,
      pageSize: ROOM_PAGE_SIZE,
      filters: { ...EMPTY_FILTERS, roomId, includeInactive: true },
    },
    signal,
  )
  const newest = newestReading(page.items)
  return {
    items: page.items,
    total: page.totalRowCount,
    activeCount: page.items.filter(item => item.isActive).length,
    lastReading: newest?.text ?? null,
    lastReadingAt: newest?.at ?? null,
    lowestBattery: lowestBattery(page.items),
  }
}

// displayLastReadDate is "dd/MM/yyyy HH:mm:ss" text, so it is compared as a date, not as a string.
function newestReading(items: readonly DeviceListItemDto[]): { at: number; text: string } | null {
  let best: { at: number; text: string } | null = null
  for (const item of items) {
    const text = item.displayLastReadDate
    if (!text) continue
    const at = parseDisplayDate(text)
    if (at === null) continue
    if (!best || at > best.at) best = { at, text }
  }
  return best
}

function lowestBattery(items: readonly DeviceListItemDto[]): number | null {
  let lowest: number | null = null
  for (const item of items) {
    const percent = item.batteryPercent
    if (percent === null) continue
    if (lowest === null || percent < lowest) lowest = percent
  }
  return lowest
}

const DISPLAY_DATE = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/

export function parseDisplayDate(value: string): number | null {
  const match = DISPLAY_DATE.exec(value.trim())
  if (!match) return null
  const [, day, month, year, hour, minute, second] = match
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour ?? 0),
    Number(minute ?? 0),
    Number(second ?? 0),
  ).getTime()
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// "12 minutes ago", "5 weeks ago" — the exact stamp stays beside it, so this only has to give the sense of it.
export function timeAgo(at: number, now: number): string {
  const elapsed = now - at
  if (elapsed < MINUTE) return 'just now'
  const format = (value: number, unit: Intl.RelativeTimeFormatUnit) =>
    new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' }).format(-Math.round(value), unit)
  if (elapsed < HOUR) return format(elapsed / MINUTE, 'minute')
  if (elapsed < DAY) return format(elapsed / HOUR, 'hour')
  if (elapsed < 7 * DAY) return format(elapsed / DAY, 'day')
  if (elapsed < 30 * DAY) return format(elapsed / (7 * DAY), 'week')
  if (elapsed < 365 * DAY) return format(elapsed / (30 * DAY), 'month')
  return format(elapsed / (365 * DAY), 'year')
}

// A room whose newest reading is older than this is worth flagging on sight.
export const STALE_AFTER_DAYS = 14

export function isStale(at: number | null, now: number): boolean {
  return at !== null && now - at > STALE_AFTER_DAYS * DAY
}
