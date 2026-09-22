import { formatShortDate, parseShortDate, shortDatePattern } from '@/shared/i18n/culture'

// deviceIndexController.js:8 formats with globalDateFormat, which follows the user's UI culture.
export const datePattern = shortDatePattern

export const formatDate = formatShortDate

export const parseDate = parseShortDate

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

// Six Monday-first weeks covering the month of `month`.
export function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, index) => addDays(first, index - offset))
}
