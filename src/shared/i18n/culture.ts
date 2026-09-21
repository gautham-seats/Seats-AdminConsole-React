// The user's UI culture drives every short date, like globalUICulture in _Layout.cshtml:214.
// The server parses dates back with CultureInfo.CurrentUICulture, so the two must agree.

const FALLBACK_CULTURE = 'en-GB'

// A fixed date whose parts are all distinguishable: 3 December 2001.
const SAMPLE = new Date(2001, 11, 3)

type DatePart = 'day' | 'month' | 'year'

export type ShortDateShape = { order: DatePart[]; separator: string; pattern: string }

let uiCulture = FALLBACK_CULTURE
let shape: ShortDateShape | null = null
let unsupported: string | null = null

function isSupported(culture: string): boolean {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([culture]).length > 0
  } catch {
    return false
  }
}

// The resources response is keyed by the culture name, so every screen load refreshes this.
export function setUiCulture(culture: string): void {
  const next = culture.trim()
  if (next === '' || next === uiCulture) return
  if (!isSupported(next)) {
    // The server parses dates in this culture while the app formats them in the fallback; remembered so a
    // screen can show the pattern it really uses instead of failing silently (SL-12).
    unsupported = next
    return
  }
  unsupported = null
  uiCulture = next
  shape = null
}

// The culture the server asked for when the browser could not honour it, else null.
export function unsupportedUiCulture(): string | null {
  return unsupported
}

// 0 = Sunday … 6 = Saturday, from the culture's week rules; Monday when the browser has no week data (SL-11).
export function firstDayOfWeek(): number {
  try {
    const locale = new Intl.Locale(uiCulture) as Intl.Locale & {
      weekInfo?: { firstDay: number }
      getWeekInfo?: () => { firstDay: number }
    }
    const info = locale.getWeekInfo?.() ?? locale.weekInfo
    if (info && info.firstDay >= 1 && info.firstDay <= 7) return info.firstDay % 7
  } catch {
    // fall through to the region rule
  }
  const region = uiCulture.split(/[-_]/)[1]?.toUpperCase()
  return region && SUNDAY_FIRST_REGIONS.has(region) ? 0 : 1
}

const SUNDAY_FIRST_REGIONS = new Set([
  'US',
  'CA',
  'JP',
  'BR',
  'IL',
  'IN',
  'MX',
  'PH',
  'ZA',
  'AU',
  'HK',
  'TW',
  'KR',
])

// Formatter in the UI culture for names and long dates (month, weekday, full date).
export function cultureDateFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(uiCulture, options)
}

export function getUiCulture(): string {
  return uiCulture
}

const LETTER = { day: 'dd', month: 'MM', year: 'yyyy' } as const

function readShape(): ShortDateShape {
  if (shape) return shape
  const parts = new Intl.DateTimeFormat(uiCulture, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    numberingSystem: 'latn',
    calendar: 'gregory',
  }).formatToParts(SAMPLE)
  const order = parts
    .filter(
      (part): part is Intl.DateTimeFormatPart & { type: DatePart } =>
        part.type === 'day' || part.type === 'month' || part.type === 'year',
    )
    .map(part => part.type)
  const literal = parts.find(part => part.type === 'literal')
  const separator = literal ? literal.value.replace(/\s/gu, '') || '/' : '/'
  shape =
    order.length === 3
      ? { order, separator, pattern: order.map(part => LETTER[part]).join(separator) }
      : { order: ['day', 'month', 'year'], separator: '/', pattern: 'dd/MM/yyyy' }
  return shape
}

// The placeholder and the "wrong format" message both show the real pattern.
export function shortDatePattern(): string {
  return readShape().pattern
}

export function formatShortDate(date: Date): string {
  const { order, separator } = readShape()
  const values: Record<DatePart, string> = {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: String(date.getFullYear()),
  }
  return order.map(part => values[part]).join(separator)
}

export function parseShortDate(raw: string): Date | null {
  const { order } = readShape()
  const numbers = raw
    .trim()
    .split(/\D+/u)
    .filter(part => part !== '')
  if (numbers.length !== 3) return null
  const parsed: Record<DatePart, number> = { day: 0, month: 0, year: 0 }
  for (const [index, part] of order.entries()) {
    const value = Number(numbers[index])
    if (!Number.isInteger(value)) return null
    parsed[part] = value
  }
  if (String(parsed.year).length !== 4) return null
  const date = new Date(parsed.year, parsed.month - 1, parsed.day)
  return date.getFullYear() === parsed.year &&
    date.getMonth() === parsed.month - 1 &&
    date.getDate() === parsed.day
    ? date
    : null
}

// Test seam: forget the captured culture between cases.
export function resetUiCulture(): void {
  uiCulture = FALLBACK_CULTURE
  shape = null
  unsupported = null
}
