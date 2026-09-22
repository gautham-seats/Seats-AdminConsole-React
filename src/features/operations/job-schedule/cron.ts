// Scripts/thirdParty/jquery-cron.js:146-147: the SEAtS build only offers day, week and month.
export type CronPeriod = 'day' | 'week' | 'month'

export type CronParts = {
  period: CronPeriod
  minute: number
  hour: number
  dayOfMonth: number
  dayOfWeek: number
}

export const CRON_PERIODS: readonly CronPeriod[] = ['day', 'week', 'month']

export const WEEK_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

// jobScheduleDetailsController.js:666: only plain numbers or * open the simple builder.
const SIMPLE_CRON = /^((\d{1,2}|\*)\s){4}(\d{1,2}|\*)$/

export const DEFAULT_CRON_PARTS: CronParts = {
  period: 'day',
  minute: 0,
  hour: 0,
  dayOfMonth: 1,
  dayOfWeek: 0,
}

const inRange = (value: string, min: number, max: number) => {
  const number = Number(value)
  return /^\d{1,2}$/.test(value) && number >= min && number <= max ? number : null
}

// Day, week and month shapes open in the builder; anything else is edited as an advanced expression.
export function parseCron(expression: string | null): CronParts | null {
  const value = (expression ?? '').trim()
  if (!SIMPLE_CRON.test(value)) return null
  const [mi, ho, dom, mon, dow] = value.split(' ')
  const minute = inRange(mi, 0, 59)
  const hour = inRange(ho, 0, 23)
  if (minute === null || hour === null || mon !== '*') return null
  const base = { minute, hour, dayOfMonth: 1, dayOfWeek: 0 }

  if (dom === '*' && dow === '*') return { ...base, period: 'day' }
  if (dom === '*') {
    const dayOfWeek = inRange(dow, 0, 6)
    return dayOfWeek === null ? null : { ...base, period: 'week', dayOfWeek }
  }
  if (dow === '*') {
    const dayOfMonth = inRange(dom, 1, 31)
    return dayOfMonth === null ? null : { ...base, period: 'month', dayOfMonth }
  }
  return null
}

export function buildCron(parts: CronParts): string {
  const { minute, hour, dayOfMonth, dayOfWeek } = parts
  switch (parts.period) {
    case 'day':
      return `${minute} ${hour} * * *`
    case 'week':
      return `${minute} ${hour} * * ${dayOfWeek}`
    case 'month':
      return `${minute} ${hour} ${dayOfMonth} * *`
  }
}

// Switching period keeps the chosen time and day, like the jquery-cron selects.
export function withPeriod(parts: CronParts | null, period: CronPeriod): CronParts {
  return { ...(parts ?? DEFAULT_CRON_PARTS), period }
}

export const pad = (value: number) => String(value).padStart(2, '0')

export function ordinal(day: number): string {
  const tens = day % 100
  if (tens >= 11 && tens <= 13) return `${day}th`
  return `${day}${['th', 'st', 'nd', 'rd'][day % 10] ?? 'th'}`
}

// Only the shape is checked here; JobScheduleApiController.cs:423-424 validates the expression with Cronos.
const CRON_FIELD = /^[\d*?,/\-A-Za-z#]+$/

// Cronos also parses a six-field expression with seconds and the @daily style macros, so neither may be refused here.
const CRON_MACRO = /^@[a-z_]+$/

export function isValidCronExpression(expression: string | null): boolean {
  const value = (expression ?? '').trim()
  if (CRON_MACRO.test(value)) return true
  const fields = value.split(/\s+/)
  return (fields.length === 5 || fields.length === 6) && fields.every(field => CRON_FIELD.test(field))
}

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

const afterDay = (parts: CronParts, after: Date): Date => {
  const next = new Date(after)
  next.setHours(parts.hour, parts.minute, 0, 0)
  if (next <= after) next.setDate(next.getDate() + 1)
  return next
}

const afterWeek = (parts: CronParts, after: Date): Date => {
  const next = new Date(after)
  next.setHours(parts.hour, parts.minute, 0, 0)
  const daysAhead = (parts.dayOfWeek - next.getDay() + 7) % 7
  next.setDate(next.getDate() + (daysAhead === 0 && next <= after ? 7 : daysAhead))
  return next
}

// Months without that day are skipped, as cron does (the 31st never runs in September).
const afterMonth = (parts: CronParts, after: Date): Date | null => {
  let year = after.getFullYear()
  let month = after.getMonth()
  for (let attempt = 0; attempt < 48; attempt += 1) {
    if (parts.dayOfMonth <= daysInMonth(year, month)) {
      const next = new Date(year, month, parts.dayOfMonth, parts.hour, parts.minute, 0, 0)
      if (next > after) return next
    }
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }
  return null
}

const nextRunAfter = (parts: CronParts, after: Date): Date | null => {
  switch (parts.period) {
    case 'day':
      return afterDay(parts, after)
    case 'week':
      return afterWeek(parts, after)
    case 'month':
      return afterMonth(parts, after)
  }
}

// Client-side preview in the browser's time zone for builder shapes only; advanced expressions stay empty.
export function estimateNextCronRuns(expression: string | null, count = 3, from = new Date()): Date[] {
  const parts = parseCron(expression)
  if (!parts) return []
  const runs: Date[] = []
  let cursor = from
  while (runs.length < count) {
    const next = nextRunAfter(parts, cursor)
    if (!next) break
    runs.push(next)
    cursor = next
  }
  return runs
}

export function formatCronRun(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

// prettycron.js:118-132 also describes hourly and every-minute jobs, which the builder cannot show.
function describeSubDaily(expression: string): string | null {
  const value = expression.trim()
  if (!SIMPLE_CRON.test(value)) return null
  const [mi, ho, dom, mon, dow] = value.split(' ')
  if (dom !== '*' || mon !== '*' || dow !== '*') return null
  if (mi === '*' && ho === '*') return 'Every minute'
  if (ho === '*') {
    const minute = inRange(mi, 0, 59)
    if (minute === null) return null
    return minute === 0 ? 'Every hour, on the hour' : `Every hour at ${minute} minutes past`
  }
  if (mi === '*') {
    const hour = inRange(ho, 0, 23)
    return hour === null ? null : `Every minute of the ${pad(hour)}:00 hour`
  }
  return null
}

// Plain-English schedule for the list and builder; unknown shapes show the expression itself.
export function describeCron(expression: string | null): string {
  const parts = parseCron(expression)
  if (!parts) return describeSubDaily(expression ?? '') ?? (expression ?? '').trim()
  const time = `${pad(parts.hour)}:${pad(parts.minute)}`
  switch (parts.period) {
    case 'day':
      return `Every day at ${time}`
    case 'week':
      return `Every ${WEEK_DAYS[parts.dayOfWeek]} at ${time}`
    case 'month':
      return `Every month on the ${ordinal(parts.dayOfMonth)} at ${time}`
  }
}
