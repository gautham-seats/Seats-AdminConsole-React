import { applyHighContrast, autoCloseMessages, highContrastOn, readCookieValue } from '../accessibility-prefs'

const clear = () =>
  ['_accset_hc', '_accset_acb'].forEach(name => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })

beforeEach(() => {
  clear()
  delete document.documentElement.dataset.contrast
})
afterEach(() => jest.useRealTimers())

describe('accessibility preferences', () => {
  it('reads the legacy cookie values exactly', () => {
    expect(autoCloseMessages('')).toBe(true)
    expect(autoCloseMessages('_accset_acb=true')).toBe(true)
    expect(autoCloseMessages('_accset_acb=false')).toBe(false)
    expect(highContrastOn('')).toBe(false)
    expect(highContrastOn('_accset_hc=true')).toBe(true)
  })

  it('switches the whole page to high contrast and back', () => {
    document.cookie = '_accset_hc=true; path=/'
    applyHighContrast()
    expect(document.documentElement.dataset.contrast).toBe('high')
    document.cookie = '_accset_hc=false; path=/'
    applyHighContrast()
    expect(document.documentElement.dataset.contrast).toBeUndefined()
  })
})

describe('SF-27 cookie reader (moved from users/index/banner-cookie)', () => {
  it('reads a value after leading spaces, ignores prefixed names and non-exact values', () => {
    expect(readCookieValue('_accset_acb', 'a=1; _accset_acb=false; b=2')).toBe('false')
    expect(readCookieValue('_accset_acb', 'x_accset_acb=true')).toBeNull()
    expect(readCookieValue('_accset_acb', '')).toBeNull()
    expect(autoCloseMessages('')).toBe(true)
    expect(autoCloseMessages('_accset_acb=true')).toBe(true)
    expect(autoCloseMessages('_accset_acb=false')).toBe(false)
    expect(autoCloseMessages('_accset_acb=True')).toBe(false)
  })
})
