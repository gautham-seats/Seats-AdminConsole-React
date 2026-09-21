import {
  formatShortDate,
  getUiCulture,
  parseShortDate,
  firstDayOfWeek,
  resetUiCulture,
  setUiCulture,
  unsupportedUiCulture,
  shortDatePattern,
} from '../culture'

const CHRISTMAS = new Date(2026, 11, 25)

afterEach(resetUiCulture)

describe('ui culture', () => {
  it('starts on en-GB', () => {
    expect(getUiCulture()).toBe('en-GB')
    expect(shortDatePattern()).toBe('dd/MM/yyyy')
    expect(formatShortDate(CHRISTMAS)).toBe('25/12/2026')
  })

  it('follows the culture the resources response is keyed by', () => {
    setUiCulture('en-US')
    expect(shortDatePattern()).toBe('MM/dd/yyyy')
    expect(formatShortDate(CHRISTMAS)).toBe('12/25/2026')
  })

  it('ignores a blank or unsupported culture', () => {
    setUiCulture('')
    setUiCulture('not a culture')
    expect(getUiCulture()).toBe('en-GB')
  })

  it('reads a date back in the same order it writes it', () => {
    for (const culture of ['en-GB', 'en-US']) {
      setUiCulture(culture)
      const text = formatShortDate(CHRISTMAS)
      expect(parseShortDate(text)?.getTime()).toBe(CHRISTMAS.getTime())
      resetUiCulture()
    }
  })

  it('rejects text that is not a full date', () => {
    expect(parseShortDate('')).toBeNull()
    expect(parseShortDate('25/12')).toBeNull()
    expect(parseShortDate('25/12/26')).toBeNull()
    expect(parseShortDate('abc')).toBeNull()
  })

  it('rejects a day that does not exist', () => {
    expect(parseShortDate('31/02/2026')).toBeNull()
    expect(parseShortDate('32/01/2026')).toBeNull()
  })

  it('accepts a leap day', () => {
    expect(parseShortDate('29/02/2028')).not.toBeNull()
    expect(parseShortDate('29/02/2027')).toBeNull()
  })

  it('SL-11 starts the week on Monday for en-GB and Sunday for en-US', () => {
    expect(firstDayOfWeek()).toBe(1)
    setUiCulture('en-US')
    expect(firstDayOfWeek()).toBe(0)
  })

  it('SL-12 remembers an unsupported culture until a supported one arrives', () => {
    setUiCulture('xx-ZZ-nope')
    expect(unsupportedUiCulture()).toBe('xx-ZZ-nope')
    expect(getUiCulture()).toBe('en-GB')
    setUiCulture('en-US')
    expect(unsupportedUiCulture()).toBeNull()
  })
})
