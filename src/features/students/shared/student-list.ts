import type { SortDirection } from '@/features/settings/shared/list-model'
import { formatShortDate } from '@/shared/i18n/culture'

export type ServerSort = { column: string; direction: SortDirection }

export type ServerListState = {
  pageIndex: number
  pageSize: number
  sort: ServerSort
  search: string
}

export const STUDENT_PAGE_SIZE = 100

// swgrid.js:662-668 trims the search and collapses repeated spaces before sending it.
export function cleanSearch(value: string): string {
  return value.trim().replace(/ {2,}/g, ' ')
}

// swgrid.js:656-668: paging, sort and search always go first, extra filters after.
export function serverListQuery(
  state: ServerListState,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    currentPageIndex: String(state.pageIndex),
    pageSize: String(state.pageSize),
    sortCol: state.sort.column,
    sortDir: state.sort.direction,
    searchFilter: cleanSearch(state.search),
    ...extra,
  }
}

// index.cshtml:74-75 renders {0:d} in the user's UI culture and StudentDeleteApiController.cs:339,345 parses
// it back with CultureInfo.CurrentUICulture, so the format must follow the user, never a fixed dd/MM/yyyy.
export function toCultureDate(date: Date): string {
  return formatShortDate(date)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  next.setDate(next.getDate() + days)
  return next
}

// swapp.js onlyDateText: globalDateFormat (dd/MM/yyyy in en-GB), not moment L / Intl medium.
export function formatDate(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return toCultureDate(date)
}

// Whole days from today to the date; negative when it has passed.
export function daysUntil(value: string | null, today: Date): number | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const end = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((end - start) / 86_400_000)
}
