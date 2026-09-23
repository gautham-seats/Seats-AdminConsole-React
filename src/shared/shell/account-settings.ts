import { api } from '@/shared/api'
import { getLegacyLayoutHtml } from '@/shared/api/legacy-layout'
import { decodeHtmlEntities } from '@/shared/api/session-header'
import { safeHttpUrl } from '@/shared/security/safe-http-url'
import {
  applyHighContrast,
  AUTO_CLOSE_BANNER_COOKIE,
  HIGH_CONTRAST_COOKIE,
  readCookieValue,
} from '@/shared/ui/accessibility-prefs'

// selectLanguageController.js:24.
const CULTURE_COOKIE = '_cultureInfo'
const ACCESSIBILITY_DAYS = 360
const CULTURE_DAYS = 180
const DAY_MS = 24 * 60 * 60 * 1000

// _SelectLanguage.cshtml:17-20 lists exactly these four.
export const LANGUAGE_OPTIONS = [
  { value: 'en-IE', label: 'English - IE' },
  { value: 'en-GB', label: 'English - UK' },
  { value: 'en-US', label: 'English - US' },
  { value: 'en-NZ', label: 'English - NZ' },
] as const

// _ConfigureAccessibility.cshtml:37 hard-codes the SEAtS statement link.
export const SEATS_ACCESSIBILITY_STATEMENT_URL = 'https://www.seatssoftware.com/accessibility-statement/'

const SETTING_KEY = {
  onlineHelpUrl: 'ONLINE_HELP_URL',
  customStatementName: 'CUSTOM_ACCESSIBILITY_STATEMENT_NAME',
  customStatementUrl: 'CUSTOM_ACCESSIBILITY_STATEMENT_URL',
} as const

// Messages hard-coded in _Layout.cshtml options and swapp.js validation rules.
export const ACCOUNT_TEXT = {
  accessibilitySettings: 'Accessibility Settings',
  highContrast: 'High Contrast',
  autoCloseBanner: 'Auto close banner messages',
  seatsStatement: 'SEAtS Accessibility Statement',
  customStatement: 'Custom Accessibility Statement Url',
  changePassword: 'Change Password',
  oldPassword: 'Old Password',
  newPassword: 'New Password',
  confirmPassword: 'Confirm Password',
  changeLanguage: 'Change Language',
  preferredLanguage: 'Preferred Language',
  language: 'Language',
  onlineHelp: 'Online Help',
  yes: 'Yes',
  no: 'No',
  ok: 'Ok',
  save: 'Save',
  oldPasswordRequired: 'Enter your old password.',
  newPasswordRequired: 'Enter a new password.',
  confirmPasswordRequired: 'Confirm your new password.',
  passwordChanged: 'Password was changed successfully.',
  confirmMismatch: 'The confirmation does not match the password.',
  weakPassword:
    'Password must be at least ten characters in length and it must contain at least one uppercase alphabet characters (A–Z), one lowercase alphabet characters (a–z), one digit (0–9) and one non-alphanumeric characters (!$#,%).',
  specialCharacters: 'Special characters are not allowed .',
  saveError: 'There was an error while trying to save the item.',
  safeMode: 'Saving is turned off in this environment (safe mode).',
} as const

function readCookie(
  name: string,
  source = typeof document === 'undefined' ? '' : document.cookie,
): string | null {
  return readCookieValue(name, source)
}

// _Layout.cshtml:439-449 createCookie: path=/ with an expiry in days.
export function writeCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * DAY_MS).toUTCString()
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax${secure}`
}

export type AccessibilityChoice = { highContrast: string; autoCloseBanner: string }

// configureAccessibilityController.js:30-36: a missing cookie means High Contrast No, Auto close Yes.
export function readAccessibility(source?: string): AccessibilityChoice {
  return {
    highContrast: readCookie(HIGH_CONTRAST_COOKIE, source) ?? 'false',
    autoCloseBanner: readCookie(AUTO_CLOSE_BANNER_COOKIE, source) ?? 'true',
  }
}

export function saveAccessibility(choice: AccessibilityChoice): void {
  writeCookie(HIGH_CONTRAST_COOKIE, choice.highContrast, ACCESSIBILITY_DAYS)
  writeCookie(AUTO_CLOSE_BANNER_COOKIE, choice.autoCloseBanner, ACCESSIBILITY_DAYS)
  applyHighContrast()
}

export function saveCulture(culture: string): void {
  writeCookie(CULTURE_COOKIE, culture, CULTURE_DAYS)
}

type SettingDto = { key?: string | null; value?: string | null }

// configureAccessibilityController.js:41-67: both name and url must be set to show the link.
export async function fetchCustomStatement(
  signal: AbortSignal,
): Promise<{ name: string; url: string } | null> {
  const settings = await api.post<SettingDto[] | null>('SettingsApi/GetSettingByKeys', {
    body: [SETTING_KEY.customStatementUrl, SETTING_KEY.customStatementName],
    signal,
  })
  const find = (key: string) => settings?.find(item => item.key === key)?.value ?? ''
  const name = find(SETTING_KEY.customStatementName)
  // The setting is admin-typed text, so only an http(s) URL may become a link.
  const url = safeHttpUrl(find(SETTING_KEY.customStatementUrl))
  return name !== '' && url !== null ? { name, url } : null
}

// The top bar and the sidebar each mount an AccountMenu; the second shares the first one's request.
let helpUrlInFlight: Promise<string | null> | null = null

// _Layout.cshtml:358-360 binds the Online Help href to this setting's value.
export async function fetchOnlineHelpUrl(signal: AbortSignal): Promise<string | null> {
  if (!helpUrlInFlight) {
    // No signal on the shared request: one menu unmounting must not cancel the answer for the other.
    helpUrlInFlight = api
      .get<SettingDto | null>(`SettingsApi/${SETTING_KEY.onlineHelpUrl}`)
      // Admin-typed text becomes a menu link, so only an http(s) URL may be followed (same rule as the statement).
      .then(setting => safeHttpUrl(setting?.value))
      .finally(() => {
        helpUrlInFlight = null
      })
  }
  const url = await helpUrlInFlight
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  return url
}

// selectLanguageController.js:24-37: the cookie first, otherwise the server's UI culture.
export async function fetchCurrentCulture(signal: AbortSignal): Promise<string> {
  const cookie = readCookie(CULTURE_COOKIE)
  if (cookie) return cookie
  const setting = await api.get<SettingDto | null>('SettingsApi/CultureInfo', { signal })
  return setting?.value ?? ''
}

export type PasswordAccount = { canChangePassword: boolean; userName: string }

// _LoginPartial.cshtml:86-94 renders changePassContainer only for SEAtS sign-in; _Layout.cshtml:419 carries userName.
export function extractPasswordAccount(html: string): PasswordAccount {
  return {
    canChangePassword: html.includes('id="changePassContainer"'),
    userName: decodeHtmlEntities(/userName:\s*'([^']*)'/.exec(html)?.[1] ?? ''),
  }
}

export async function loadPasswordAccount(): Promise<PasswordAccount> {
  const html = await getLegacyLayoutHtml()
  return html === null ? { canChangePassword: false, userName: '' } : extractPasswordAccount(html)
}

export type PasswordForm = { oldPassword: string; newPassword: string; confirmPassword: string }
export type PasswordErrors = Partial<Record<keyof PasswordForm, string>>

// swapp.js:2574-2618 and :2642-2646 plus changePasswordController.js:28-58, checked in the same order.
export function validatePassword(form: PasswordForm, userName: string): PasswordErrors {
  const errors: PasswordErrors = {}
  const special = (value: string) => /[<>]/.test(value)
  if (!form.oldPassword) errors.oldPassword = ACCOUNT_TEXT.oldPasswordRequired
  else if (special(form.oldPassword)) errors.oldPassword = ACCOUNT_TEXT.specialCharacters
  const value = form.newPassword
  if (!value) errors.newPassword = ACCOUNT_TEXT.newPasswordRequired
  else if (
    value.length < 10 ||
    !/[A-Z]/.test(value) ||
    !/[a-z]/.test(value) ||
    !/\d/.test(value) ||
    !/[^a-zA-Z0-9]/.test(value) ||
    (userName !== '' && value.includes(userName))
  )
    errors.newPassword = ACCOUNT_TEXT.weakPassword
  else if (special(value)) errors.newPassword = ACCOUNT_TEXT.specialCharacters
  // Requirements 8.2: the mismatch rule shows only once both boxes have a value.
  if (!form.confirmPassword) errors.confirmPassword = ACCOUNT_TEXT.confirmPasswordRequired
  else if (form.confirmPassword !== form.newPassword) errors.confirmPassword = ACCOUNT_TEXT.confirmMismatch
  else if (special(form.confirmPassword)) errors.confirmPassword = ACCOUNT_TEXT.specialCharacters
  return errors
}

// POST api/UserApi/ChangePassword (UserApiController.cs:581-610); ko.toJSON also sends userName and confirmPassword.
export function changePassword(form: PasswordForm, userName: string): Promise<unknown> {
  return api.post<unknown>('UserApi/ChangePassword', { body: { userName, ...form } })
}
