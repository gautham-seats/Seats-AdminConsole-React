export const dayOnly = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
export const plusDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
export const isSameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b && dayOnly(a).getTime() === dayOnly(b).getTime()
export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)
export const plusMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1)
// Monday-first index, like the Angular picker's UK locale.
export const mondayIndex = (date: Date) => (date.getDay() + 6) % 7

export function countDays(start: Date, end: Date) {
  return Math.round((dayOnly(end).getTime() - dayOnly(start).getTime()) / 86_400_000) + 1
}

export function countWeekdays(start: Date, end: Date) {
  let total = 0
  for (let day = dayOnly(start); day <= end; day = plusDays(day, 1)) {
    if (day.getDay() !== 0 && day.getDay() !== 6) total++
  }
  return total
}

// Weeks start Monday; the first and last partial weeks are padded with null.
export function monthCells(month: Date): (Date | null)[] {
  const first = startOfMonth(month)
  const size = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = Array.from({ length: mondayIndex(first) }, () => null)
  for (let day = 1; day <= size; day++) cells.push(new Date(first.getFullYear(), first.getMonth(), day))
  return cells
}

// Month cells split into Monday-first weeks; the last week is padded with null to seven cells.
export function monthWeeks(month: Date): (Date | null)[][] {
  const cells = monthCells(month)
  const weeks: (Date | null)[][] = []
  for (let index = 0; index < cells.length; index += 7) {
    const week = cells.slice(index, index + 7)
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

export type QuickRange = { key: string; start: Date; end: Date }

export function quickRanges(today: Date): QuickRange[] {
  const day = dayOnly(today)
  const weekStart = plusDays(day, -mondayIndex(day))
  return [
    { key: 'today', start: day, end: day },
    { key: 'last7Days', start: plusDays(day, -6), end: day },
    { key: 'last14Days', start: plusDays(day, -13), end: day },
    { key: 'last30Days', start: plusDays(day, -29), end: day },
    { key: 'thisWeek', start: weekStart, end: plusDays(weekStart, 6) },
    { key: 'thisMonth', start: startOfMonth(day), end: new Date(day.getFullYear(), day.getMonth() + 1, 0) },
    { key: 'lastMonth', start: plusMonths(day, -1), end: new Date(day.getFullYear(), day.getMonth(), 0) },
  ]
}

export type AcademicRange = {
  key: string
  kind: 'year' | 'autumn' | 'spring' | 'summer'
  name: string
  start: Date
  end: Date
}

const mondayOnOrAfter = (date: Date) => plusDays(date, (8 - date.getDay()) % 7)
const fridayOnOrBefore = (date: Date) => plusDays(date, -((date.getDay() + 2) % 7))

// Standard UK term pattern until tenant college year and term dates are available (GetCollegeYear has names only).
export function academicTerms(year: number): AcademicRange[] {
  const name = `${year}/${String((year + 1) % 100).padStart(2, '0')}`
  const autumn = {
    start: mondayOnOrAfter(new Date(year, 8, 20)),
    end: fridayOnOrBefore(new Date(year, 11, 12)),
  }
  const spring = {
    start: mondayOnOrAfter(new Date(year + 1, 0, 10)),
    end: fridayOnOrBefore(new Date(year + 1, 2, 27)),
  }
  const summer = {
    start: mondayOnOrAfter(new Date(year + 1, 3, 19)),
    end: fridayOnOrBefore(new Date(year + 1, 5, 26)),
  }
  return [
    { key: `year-${year}`, kind: 'year', name, start: autumn.start, end: summer.end },
    { key: `autumn-${year}`, kind: 'autumn', name, ...autumn },
    { key: `spring-${year}`, kind: 'spring', name, ...spring },
    { key: `summer-${year}`, kind: 'summer', name, ...summer },
  ]
}

export const currentAcademicYear = (today: Date) =>
  today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1

// Clicking picks the start, then the end; an earlier second click swaps them.
export function pickDay(range: { start: Date; end: Date | null }, day: Date) {
  if (range.end) return { start: day, end: null }
  return day < range.start ? { start: day, end: range.start } : { start: range.start, end: day }
}
