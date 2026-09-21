import { safeHttpUrl } from '../safe-http-url'

describe('safeHttpUrl', () => {
  it('passes ordinary web links', () => {
    expect(safeHttpUrl('https://example.test/report.csv')).toBe('https://example.test/report.csv')
    expect(safeHttpUrl('http://example.test/a?b=1')).toBe('http://example.test/a?b=1')
  })

  it('refuses anything that is not plain http(s)', () => {
    for (const value of [
      'javascript:alert(1)',
      ' JAVASCRIPT:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '//example.test/x',
      'mailto:a@example.test',
      '',
      null,
      42,
    ]) {
      expect(safeHttpUrl(value)).toBeNull()
    }
  })

  it('refuses a link carrying a user name and password', () => {
    expect(safeHttpUrl('https://user:pass@evil.test/file')).toBeNull()
    expect(safeHttpUrl('https://user@evil.test/file')).toBeNull()
  })
})
