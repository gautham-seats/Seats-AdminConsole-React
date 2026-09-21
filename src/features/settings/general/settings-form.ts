import type { SettingDto, SettingUpdateDto } from '@/types/settings'

// SettingKeyEnum values passed to the component by Views/Settings/Index.cshtml:44-52.
export const SETTING_KEYS = {
  onlineHelpUrl: 'ONLINE_HELP_URL',
  menuBackgroundColor: 'MENU_BACKGROUND_COLOR',
  menuCustomLogo: 'MENU_CUSTOM_LOGO',
  customAccessibilityStatementName: 'CUSTOM_ACCESSIBILITY_STATEMENT_NAME',
  customAccessibilityStatementUrl: 'CUSTOM_ACCESSIBILITY_STATEMENT_URL',
  tableBackgroundColor: 'TABLE_BACKGROUND_COLOR',
  tableHeaderTextColor: 'TABLE_HEADER_TEXT_COLOR',
} as const

export type SettingField = keyof typeof SETTING_KEYS
export type BrandingField = Exclude<SettingField, 'menuCustomLogo'>
export type BrandingValues = Record<BrandingField, string>
export type SettingsIndex = Partial<Record<SettingField, SettingDto>>

// Colours Admin uses when a colour setting is empty (legacy only overrides when a value exists, _Layout.cshtml:258).
export const DEFAULT_COLOURS = {
  menuBackgroundColor: '#1566a2',
  tableBackgroundColor: '#1566a2',
  tableHeaderTextColor: '#ffffff',
} as const

export type ColourField = keyof typeof DEFAULT_COLOURS

// Web address safe to open in a new tab; only http and https are allowed.
export function openableUrl(value: string): string | null {
  const text = value.trim()
  if (!text || !isLegacyUrl(text)) return null
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text)
  try {
    const url = new URL(hasScheme ? text : `https://${text}`)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

export const LOGO_CONTAINER = 'menu-logo-attachments'

// Request body order of _urlSettingsChanged (seats-admin-setting-color.html:347).
export const LOAD_KEYS: readonly string[] = [
  SETTING_KEYS.onlineHelpUrl,
  SETTING_KEYS.menuBackgroundColor,
  SETTING_KEYS.menuCustomLogo,
  SETTING_KEYS.customAccessibilityStatementName,
  SETTING_KEYS.customAccessibilityStatementUrl,
  SETTING_KEYS.tableBackgroundColor,
  SETTING_KEYS.tableHeaderTextColor,
]

// Save body order (seats-admin-setting-color.html:399).
const SAVE_ORDER: readonly BrandingField[] = [
  'onlineHelpUrl',
  'menuBackgroundColor',
  'customAccessibilityStatementUrl',
  'customAccessibilityStatementName',
  'tableBackgroundColor',
  'tableHeaderTextColor',
]

export const BRANDING_FIELDS: readonly BrandingField[] = [
  'onlineHelpUrl',
  'menuBackgroundColor',
  'tableBackgroundColor',
  'tableHeaderTextColor',
  'customAccessibilityStatementName',
  'customAccessibilityStatementUrl',
]

const FIELD_BY_KEY = new Map(Object.entries(SETTING_KEYS).map(([field, key]) => [key, field as SettingField]))

export function indexSettings(settings: readonly SettingDto[] | null | undefined): SettingsIndex {
  const index: SettingsIndex = {}
  for (const setting of settings ?? []) {
    const field = FIELD_BY_KEY.get(setting.key as (typeof SETTING_KEYS)[SettingField])
    if (field) index[field] = setting
  }
  return index
}

const NBSP = String.fromCharCode(160)
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&nbsp;': NBSP }

// Same output as legacy $('<div>').text(value).html().
export function encodeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replaceAll(NBSP, '&nbsp;')
}

export function decodeHtmlText(value: string): string {
  return value.replace(/&(amp|lt|gt|nbsp);/g, entity => ENTITIES[entity] ?? entity)
}

export function initialValues(index: SettingsIndex): BrandingValues {
  const values = {} as BrandingValues
  for (const field of BRANDING_FIELDS) {
    const raw = index[field]?.value ?? ''
    values[field] = field === 'customAccessibilityStatementName' ? decodeHtmlText(raw) : raw
  }
  return values
}

const URL_PATTERN =
  /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/

// Legacy _validateUrl: the pattern may match anywhere in the text.
export function isLegacyUrl(value: string): boolean {
  return URL_PATTERN.test(value)
}

export type ValidationFailure = {
  field: BrandingField
  messageKey: 'OnlineHelpUrlValidationMessage' | 'RequiredMessage'
}

// Checks and messages in legacy order (seats-admin-setting-color.html:382-394).
export function validateBranding(values: BrandingValues): ValidationFailure | null {
  const name = values.customAccessibilityStatementName
  const url = values.customAccessibilityStatementUrl
  if (values.onlineHelpUrl && !isLegacyUrl(values.onlineHelpUrl)) {
    return { field: 'onlineHelpUrl', messageKey: 'OnlineHelpUrlValidationMessage' }
  }
  if (url && !name) return { field: 'customAccessibilityStatementName', messageKey: 'RequiredMessage' }
  if (name && !url) return { field: 'customAccessibilityStatementUrl', messageKey: 'RequiredMessage' }
  if (url && !isLegacyUrl(url))
    return { field: 'customAccessibilityStatementUrl', messageKey: 'OnlineHelpUrlValidationMessage' }
  return null
}

// Every failing field at once, so each input shows its own error and clears as soon as it is valid.
export function brandingFieldErrors(values: BrandingValues): ValidationFailure[] {
  const name = values.customAccessibilityStatementName
  const url = values.customAccessibilityStatementUrl
  const failures: ValidationFailure[] = []
  if (values.onlineHelpUrl && !isLegacyUrl(values.onlineHelpUrl)) {
    failures.push({ field: 'onlineHelpUrl', messageKey: 'OnlineHelpUrlValidationMessage' })
  }
  if (url && !name)
    failures.push({ field: 'customAccessibilityStatementName', messageKey: 'RequiredMessage' })
  if (name && !url) failures.push({ field: 'customAccessibilityStatementUrl', messageKey: 'RequiredMessage' })
  if (url && !isLegacyUrl(url)) {
    failures.push({ field: 'customAccessibilityStatementUrl', messageKey: 'OnlineHelpUrlValidationMessage' })
  }
  return failures
}

// A required statement field gets a message naming what to enter instead of the generic legacy text.
export function specificMessageKey(
  failure: ValidationFailure,
): 'statementNameRequired' | 'statementUrlRequired' | null {
  if (failure.messageKey !== 'RequiredMessage') return null
  if (failure.field === 'customAccessibilityStatementName') return 'statementNameRequired'
  if (failure.field === 'customAccessibilityStatementUrl') return 'statementUrlRequired'
  return null
}

export function buildSettingsPayload(index: SettingsIndex, values: BrandingValues): SettingUpdateDto[] {
  const initial = initialValues(index)
  return SAVE_ORDER.flatMap(field => {
    const setting = index[field]
    if (!setting) return []
    const text = values[field]
    const untouchedNull = setting.value === null && text === initial[field]
    const value = untouchedNull
      ? null
      : field === 'customAccessibilityStatementName' && text
        ? encodeHtmlText(text)
        : text
    return [{ id: setting.id, value, key: setting.key }]
  })
}

// POST api/image returns "menu-logo-attachments/<stored name>"; legacy keeps only the name.
export function logoFileName(uploadResult: unknown): string {
  return String(uploadResult ?? '')
    .replace(`${LOGO_CONTAINER}/`, '')
    .replace(/['"]+/g, '')
}

// Changed fields whose setting the server did not return; legacy could not save these either (LB-009).
export function unsavableFields(
  index: SettingsIndex,
  values: BrandingValues,
  baseline: BrandingValues,
): BrandingField[] {
  return BRANDING_FIELDS.filter(field => !index[field] && values[field] !== baseline[field])
}

export function sameValues(a: BrandingValues, b: BrandingValues): boolean {
  return BRANDING_FIELDS.every(field => a[field] === b[field])
}

function parseHex(value: string): [number, number, number] | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
  if (!match) return null
  const hex = match[1].length === 3 ? [...match[1]].map(c => c + c).join('') : match[1]
  return [0, 2, 4].map(start => parseInt(hex.slice(start, start + 2), 16)) as [number, number, number]
}

export function toColorInputValue(value: string): string {
  const rgb = parseHex(value)
  return rgb ? `#${rgb.map(part => part.toString(16).padStart(2, '0')).join('')}` : '#000000'
}

function luminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map(part => {
    const channel = part / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

// WCAG 2 contrast ratio; only hex colours can be measured.
export function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseHex(foreground)
  const bg = parseHex(background)
  if (!fg || !bg) return null
  const [light, dark] = [luminance(fg), luminance(bg)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

export type ContrastGrade = { label: 'AAA' | 'AA' | 'AA Large' | 'Fail'; tone: 'ok' | 'warn' | 'bad' }

// WCAG 2 thresholds: 7 AAA, 4.5 AA, 3 AA for large text.
export function contrastGrade(ratio: number): ContrastGrade {
  if (ratio >= 7) return { label: 'AAA', tone: 'ok' }
  if (ratio >= 4.5) return { label: 'AA', tone: 'ok' }
  if (ratio >= 3) return { label: 'AA Large', tone: 'warn' }
  return { label: 'Fail', tone: 'bad' }
}

export function previewColor(value: string, fallback: string): string {
  const text = value.trim()
  if (!text) return fallback
  if (parseHex(text)) return text.startsWith('#') ? text : `#${text}`
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('color', text))
    return text
  return fallback
}

// paper-swatch-picker default colorList: 18 Material hues, 10 shades each.
export const SWATCH_COLUMNS: readonly (readonly string[])[] = [
  [
    '#ffebee',
    '#ffcdd2',
    '#ef9a9a',
    '#e57373',
    '#ef5350',
    '#f44336',
    '#e53935',
    '#d32f2f',
    '#c62828',
    '#b71c1c',
  ],
  [
    '#fce4ec',
    '#f8bbd0',
    '#f48fb1',
    '#f06292',
    '#ec407a',
    '#e91e63',
    '#d81b60',
    '#c2185b',
    '#ad1457',
    '#880e4f',
  ],
  [
    '#f3e5f5',
    '#e1bee7',
    '#ce93d8',
    '#ba68c8',
    '#ab47bc',
    '#9c27b0',
    '#8e24aa',
    '#7b1fa2',
    '#6a1b9a',
    '#4a148c',
  ],
  [
    '#ede7f6',
    '#d1c4e9',
    '#b39ddb',
    '#9575cd',
    '#7e57c2',
    '#673ab7',
    '#5e35b1',
    '#512da8',
    '#4527a0',
    '#311b92',
  ],
  [
    '#e8eaf6',
    '#c5cae9',
    '#9fa8da',
    '#7986cb',
    '#5c6bc0',
    '#3f51b5',
    '#3949ab',
    '#303f9f',
    '#283593',
    '#1a237e',
  ],
  [
    '#e3f2fd',
    '#bbdefb',
    '#90caf9',
    '#64b5f6',
    '#42a5f5',
    '#2196f3',
    '#1e88e5',
    '#1976d2',
    '#1565c0',
    '#0d47a1',
  ],
  [
    '#e1f5fe',
    '#b3e5fc',
    '#81d4fa',
    '#4fc3f7',
    '#29b6f6',
    '#03a9f4',
    '#039be5',
    '#0288d1',
    '#0277bd',
    '#01579b',
  ],
  [
    '#e0f7fa',
    '#b2ebf2',
    '#80deea',
    '#4dd0e1',
    '#26c6da',
    '#00bcd4',
    '#00acc1',
    '#0097a7',
    '#00838f',
    '#006064',
  ],
  [
    '#e0f2f1',
    '#b2dfdb',
    '#80cbc4',
    '#4db6ac',
    '#26a69a',
    '#009688',
    '#00897b',
    '#00796b',
    '#00695c',
    '#004d40',
  ],
  [
    '#e8f5e9',
    '#c8e6c9',
    '#a5d6a7',
    '#81c784',
    '#66bb6a',
    '#4caf50',
    '#43a047',
    '#388e3c',
    '#2e7d32',
    '#1b5e20',
  ],
  [
    '#f1f8e9',
    '#dcedc8',
    '#c5e1a5',
    '#aed581',
    '#9ccc65',
    '#8bc34a',
    '#7cb342',
    '#689f38',
    '#558b2f',
    '#33691e',
  ],
  [
    '#f9fbe7',
    '#f0f4c3',
    '#e6ee9c',
    '#dce775',
    '#d4e157',
    '#cddc39',
    '#c0ca33',
    '#afb42b',
    '#9e9d24',
    '#827717',
  ],
  [
    '#fffde7',
    '#fff9c4',
    '#fff59d',
    '#fff176',
    '#ffee58',
    '#ffeb3b',
    '#fdd835',
    '#fbc02d',
    '#f9a825',
    '#f57f17',
  ],
  [
    '#fff8e1',
    '#ffecb3',
    '#ffe082',
    '#ffd54f',
    '#ffca28',
    '#ffc107',
    '#ffb300',
    '#ffa000',
    '#ff8f00',
    '#ff6f00',
  ],
  [
    '#fff3e0',
    '#ffe0b2',
    '#ffcc80',
    '#ffb74d',
    '#ffa726',
    '#ff9800',
    '#fb8c00',
    '#f57c00',
    '#ef6c00',
    '#e65100',
  ],
  [
    '#fbe9e7',
    '#ffccbc',
    '#ffab91',
    '#ff8a65',
    '#ff7043',
    '#ff5722',
    '#f4511e',
    '#e64a19',
    '#d84315',
    '#bf360c',
  ],
  [
    '#efebe9',
    '#d7ccc8',
    '#bcaaa4',
    '#a1887f',
    '#8d6e63',
    '#795548',
    '#6d4c41',
    '#5d4037',
    '#4e342e',
    '#3e2723',
  ],
  [
    '#fafafa',
    '#f5f5f5',
    '#eeeeee',
    '#e0e0e0',
    '#bdbdbd',
    '#9e9e9e',
    '#757575',
    '#616161',
    '#424242',
    '#212121',
  ],
]
