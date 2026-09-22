import type { SortDirection } from '@/features/settings/shared/list-model'
import { cleanSearch } from '@/features/students/shared/student-list'
import { formatShortDate } from '@/shared/i18n/culture'

type NotificationSort = { column: string; direction: SortDirection }

export type NotificationListState = {
  pageIndex: number
  pageSize: number
  sort: NotificationSort
  search: string
}

export const NOTIFICATION_PAGE_SIZE = 100

// swgrid.js:656-668 — paging and sort params always come first.
export function notificationListQuery(state: NotificationListState): Record<string, string> {
  return {
    currentPageIndex: String(state.pageIndex),
    pageSize: String(state.pageSize),
    sortCol: state.sort.column,
    sortDir: state.sort.direction,
    searchFilter: cleanSearch(state.search),
  }
}

const pad = (value: number) => String(value).padStart(2, '0')

// dateTextUtc in swapp.js:2213-2215 uses globalDateFormat, which follows the user's culture. The parts stay
// UTC exactly as legacy read them; only the order and separator come from the culture.
export function formatNotificationDate(value: string | null): string {
  if (!value) return ''
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (match) {
    const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    return `${formatShortDate(day)} ${match[4]}:${match[5]}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const utcDay = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return `${formatShortDate(utcDay)} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

export function canDeleteNotification(row: { userNotificationStatusId: number }): boolean {
  return row.userNotificationStatusId !== 1
}

export function isUnreadNotification(row: { showAsNew: boolean }): boolean {
  return row.showAsNew
}
