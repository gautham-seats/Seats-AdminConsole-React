import type { SettingDto } from '@/types/settings'
import {
  brandingFieldErrors,
  buildSettingsPayload,
  contrastGrade,
  contrastRatio,
  decodeHtmlText,
  encodeHtmlText,
  indexSettings,
  initialValues,
  isLegacyUrl,
  LOAD_KEYS,
  logoFileName,
  openableUrl,
  previewColor,
  specificMessageKey,
  toColorInputValue,
  validateBranding,
  type BrandingValues,
} from '../settings-form'

const NBSP = String.fromCharCode(160)

function setting(id: number, key: string, value: string | null): SettingDto {
  return { id, key, value, description: null }
}

const LOADED = [
  setting(1, 'ONLINE_HELP_URL', 'https://help.example.com'),
  setting(2, 'MENU_BACKGROUND_COLOR', '#1566a2'),
  setting(3, 'MENU_CUSTOM_LOGO', 'logo.png'),
  setting(4, 'CUSTOM_ACCESSIBILITY_STATEMENT_NAME', 'Terms &amp; access'),
  setting(5, 'CUSTOM_ACCESSIBILITY_STATEMENT_URL', 'https://example.com/a11y'),
  setting(6, 'TABLE_BACKGROUND_COLOR', null),
  setting(7, 'TABLE_HEADER_TEXT_COLOR', '#ffffff'),
]

const values = (overrides: Partial<BrandingValues> = {}): BrandingValues => ({
  ...initialValues(indexSettings(LOADED)),
  ...overrides,
})

describe('settings load', () => {
  it('requests the seven keys in legacy order', () => {
    expect(LOAD_KEYS).toEqual([
      'ONLINE_HELP_URL',
      'MENU_BACKGROUND_COLOR',
      'MENU_CUSTOM_LOGO',
      'CUSTOM_ACCESSIBILITY_STATEMENT_NAME',
      'CUSTOM_ACCESSIBILITY_STATEMENT_URL',
      'TABLE_BACKGROUND_COLOR',
      'TABLE_HEADER_TEXT_COLOR',
    ])
  })

  it('indexes by key, ignores unknown keys and shows null as empty', () => {
    const index = indexSettings([...LOADED, setting(9, 'OTHER', 'x')])
    expect(index.menuCustomLogo?.id).toBe(3)
    expect(initialValues(index).tableBackgroundColor).toBe('')
    expect(initialValues(index).customAccessibilityStatementName).toBe('Terms & access')
    expect(indexSettings(null)).toEqual({})
  })
})

describe('html text encoding', () => {
  it('matches jQuery text().html() output and round-trips', () => {
    const raw = `a & b <c> d${NBSP}e "f"`
    expect(encodeHtmlText(raw)).toBe('a &amp; b &lt;c&gt; d&nbsp;e "f"')
    expect(decodeHtmlText(encodeHtmlText(raw))).toBe(raw)
  })
})

describe('validateBranding', () => {
  it('uses the legacy loose URL pattern', () => {
    expect(isLegacyUrl('help.example.com')).toBe(true)
    expect(isLegacyUrl('see www.site.org now')).toBe(true)
    expect(isLegacyUrl('not a url')).toBe(false)
  })

  it('checks help URL, then the name and URL pair, then the statement URL', () => {
    expect(validateBranding(values())).toBeNull()
    expect(validateBranding(values({ onlineHelpUrl: 'nope', customAccessibilityStatementName: '' }))).toEqual(
      {
        field: 'onlineHelpUrl',
        messageKey: 'OnlineHelpUrlValidationMessage',
      },
    )
    expect(validateBranding(values({ customAccessibilityStatementName: '' }))).toEqual({
      field: 'customAccessibilityStatementName',
      messageKey: 'RequiredMessage',
    })
    expect(validateBranding(values({ customAccessibilityStatementUrl: '' }))).toEqual({
      field: 'customAccessibilityStatementUrl',
      messageKey: 'RequiredMessage',
    })
    expect(validateBranding(values({ customAccessibilityStatementUrl: 'bad' }))).toEqual({
      field: 'customAccessibilityStatementUrl',
      messageKey: 'OnlineHelpUrlValidationMessage',
    })
    expect(
      validateBranding(
        values({
          onlineHelpUrl: '',
          customAccessibilityStatementName: '',
          customAccessibilityStatementUrl: '',
        }),
      ),
    ).toBeNull()
  })
})

describe('brandingFieldErrors', () => {
  it('reports every failing field at once with a specific key for required statement fields', () => {
    const failures = brandingFieldErrors(
      values({ onlineHelpUrl: 'nope', customAccessibilityStatementName: '' }),
    )
    expect(failures.map(failure => failure.field)).toEqual([
      'onlineHelpUrl',
      'customAccessibilityStatementName',
    ])
    expect(failures.map(specificMessageKey)).toEqual([null, 'statementNameRequired'])
    expect(
      specificMessageKey({ field: 'customAccessibilityStatementUrl', messageKey: 'RequiredMessage' }),
    ).toBe('statementUrlRequired')
    expect(brandingFieldErrors(values())).toEqual([])
  })
})

describe('buildSettingsPayload', () => {
  it('sends id, value and key in the legacy save order without the logo', () => {
    const payload = buildSettingsPayload(indexSettings(LOADED), values({ menuBackgroundColor: '#e91e63' }))
    expect(payload.map(item => item.key)).toEqual([
      'ONLINE_HELP_URL',
      'MENU_BACKGROUND_COLOR',
      'CUSTOM_ACCESSIBILITY_STATEMENT_URL',
      'CUSTOM_ACCESSIBILITY_STATEMENT_NAME',
      'TABLE_BACKGROUND_COLOR',
      'TABLE_HEADER_TEXT_COLOR',
    ])
    expect(payload[1]).toEqual({ id: 2, value: '#e91e63', key: 'MENU_BACKGROUND_COLOR' })
  })

  it('keeps untouched nulls, encodes the statement name once and skips missing settings', () => {
    const index = indexSettings(LOADED.filter(item => item.key !== 'ONLINE_HELP_URL'))
    const payload = buildSettingsPayload(index, values())
    expect(payload).toHaveLength(5)
    expect(payload.find(item => item.id === 6)?.value).toBeNull()
    expect(payload.find(item => item.id === 4)?.value).toBe('Terms &amp; access')
    expect(
      buildSettingsPayload(index, values({ tableBackgroundColor: '' })).find(item => item.id === 6)?.value,
    ).toBeNull()
  })
})

describe('logo and colour helpers', () => {
  it('strips the container prefix and quotes from the upload result', () => {
    expect(logoFileName('menu-logo-attachments/abc-logo.png')).toBe('abc-logo.png')
    expect(logoFileName('"menu-logo-attachments/abc.png"')).toBe('abc.png')
  })

  it('measures WCAG contrast for hex colours only', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21)
    expect(contrastRatio('#fff', '#1566a2')).toBeGreaterThan(4.5)
    expect(contrastRatio('white', '#000')).toBeNull()
  })

  it('opens only http and https web addresses', () => {
    expect(openableUrl('https://help.example.com/page')).toBe('https://help.example.com/page')
    expect(openableUrl('help.example.com')).toBe('https://help.example.com/')
    expect(openableUrl('javascript:alert(1)//x.com')).toBeNull()
    expect(openableUrl('not a url')).toBeNull()
    expect(openableUrl('')).toBeNull()
  })

  it('grades contrast with the WCAG thresholds', () => {
    expect(contrastGrade(21).label).toBe('AAA')
    expect(contrastGrade(5.3)).toEqual({ label: 'AA', tone: 'ok' })
    expect(contrastGrade(3.2)).toEqual({ label: 'AA Large', tone: 'warn' })
    expect(contrastGrade(1.5)).toEqual({ label: 'Fail', tone: 'bad' })
  })

  it('normalises colours for the preview and the native picker', () => {
    expect(previewColor('', '#111111')).toBe('#111111')
    expect(previewColor('abc', '#111111')).toBe('#abc')
    expect(previewColor('not-a-colour', '#111111')).toBe('#111111')
    expect(toColorInputValue('#abc')).toBe('#aabbcc')
    expect(toColorInputValue('red')).toBe('#000000')
  })
})
