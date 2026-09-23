import { isStale, parseDisplayDate, STALE_AFTER_DAYS, timeAgo } from '../room-devices-api'

const at = (value: string) => {
  const parsed = parseDisplayDate(value)
  if (parsed === null) throw new Error(`unparsed: ${value}`)
  return parsed
}

const DAY = 24 * 60 * 60 * 1000

describe('room device facts', () => {
  it('reads the display date format the grid sends', () => {
    expect(new Date(at('19/08/2026 12:02:00')).getMonth()).toBe(7)
    expect(new Date(at('19/08/2026 12:02:00')).getDate()).toBe(19)
    // A date with no time is still valid; it lands at midnight.
    expect(new Date(at('01/03/2026')).getHours()).toBe(0)
    expect(parseDisplayDate('not a date')).toBeNull()
  })

  it('compares readings as dates, not as text', () => {
    // Text order would put 19/08 after 05/09; the dates say otherwise.
    expect(at('05/09/2026 08:00:00')).toBeGreaterThan(at('19/08/2026 12:02:00'))
  })

  it('describes how long ago a reading was', () => {
    const now = at('23/09/2026 12:00:00')
    expect(timeAgo(now - 30_000, now)).toBe('just now')
    expect(timeAgo(now - 5 * 60_000, now)).toContain('5 minutes')
    expect(timeAgo(now - 3 * DAY, now)).toContain('3 days')
    expect(timeAgo(at('19/08/2026 12:02:00'), now)).toContain('month')
  })

  it('flags a room whose newest reading has gone quiet', () => {
    const now = at('23/09/2026 12:00:00')
    expect(isStale(now - (STALE_AFTER_DAYS - 1) * DAY, now)).toBe(false)
    expect(isStale(now - (STALE_AFTER_DAYS + 1) * DAY, now)).toBe(true)
    expect(isStale(null, now)).toBe(false)
  })
})
