import {
  academicTerms,
  currentAcademicYear,
  countDays,
  countWeekdays,
  monthCells,
  monthWeeks,
  pickDay,
  quickRanges,
} from '../studio-dates'

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)

describe('studio dates', () => {
  it('counts days and weekdays inclusively', () => {
    expect(countDays(d(2026, 9, 1), d(2026, 9, 15))).toBe(15)
    expect(countWeekdays(d(2026, 9, 12), d(2026, 9, 18))).toBe(5)
  })

  it('pads months from Monday', () => {
    const cells = monthCells(d(2026, 9, 1))
    expect(cells.slice(0, 2)).toEqual([null, d(2026, 9, 1)])
    expect(cells.at(-1)).toEqual(d(2026, 9, 30))
  })

  it('splits a month into seven-cell weeks padded with blanks', () => {
    const weeks = monthWeeks(d(2026, 9, 1))
    expect(weeks).toHaveLength(5)
    expect(weeks.every(week => week.length === 7)).toBe(true)
    expect(weeks[0][1]).toEqual(d(2026, 9, 1))
    expect(weeks[4].slice(2, 4)).toEqual([d(2026, 9, 30), null])
  })

  it('picks start then end and swaps an earlier end', () => {
    const started = pickDay({ start: d(2026, 9, 1), end: d(2026, 9, 2) }, d(2026, 9, 10))
    expect(started).toEqual({ start: d(2026, 9, 10), end: null })
    expect(pickDay({ start: d(2026, 9, 10), end: null }, d(2026, 9, 3))).toEqual({
      start: d(2026, 9, 3),
      end: d(2026, 9, 10),
    })
  })

  it('builds the academic year and its three terms', () => {
    const [year, autumn, spring, summer] = academicTerms(2026)
    expect(year).toMatchObject({ name: '2026/27', start: d(2026, 9, 21), end: d(2027, 6, 25) })
    expect(countDays(year.start, year.end)).toBe(278)
    expect([autumn.start, autumn.end]).toEqual([d(2026, 9, 21), d(2026, 12, 11)])
    expect([spring.start, spring.end]).toEqual([d(2027, 1, 11), d(2027, 3, 26)])
    expect([summer.start, summer.end]).toEqual([d(2027, 4, 19), d(2027, 6, 25)])
    expect(currentAcademicYear(d(2026, 9, 15))).toBe(2026)
    expect(currentAcademicYear(d(2026, 8, 31))).toBe(2025)
  })

  it('builds quick ranges ending today', () => {
    const ranges = quickRanges(d(2026, 9, 15))
    expect(ranges.find(r => r.key === 'last7Days')?.start).toEqual(d(2026, 9, 9))
    expect(ranges.find(r => r.key === 'thisWeek')?.start).toEqual(d(2026, 9, 14))
    expect(ranges.find(r => r.key === 'lastMonth')).toEqual({
      key: 'lastMonth',
      start: d(2026, 8, 1),
      end: d(2026, 8, 31),
    })
  })
})
