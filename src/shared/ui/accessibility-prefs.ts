// Accessibility Settings cookies written by the profile menu (configureAccessibilityController.js:70-71).
export const HIGH_CONTRAST_COOKIE = '_accset_hc'
export const AUTO_CLOSE_BANNER_COOKIE = '_accset_acb'

// Keeps a toast timer bar visually still while a message stays open.
export const STILL_TIMER_MS = 86_400_000

const browserCookies = () => (typeof document === 'undefined' ? '' : document.cookie)

export function readCookieValue(name: string, source = browserCookies()): string | null {
  const entry = source
    .split(';')
    .map(part => part.replace(/^ +/, ''))
    .find(part => part.startsWith(`${name}=`))
  return entry === undefined ? null : entry.slice(name.length + 1)
}

// swalert.js:70-88: a missing cookie or the exact text 'true' closes messages by themselves.
export function autoCloseMessages(source = browserCookies()): boolean {
  const value = readCookieValue(AUTO_CLOSE_BANNER_COOKIE, source)
  return value === null || value === 'true'
}

// accessProfileDetailsController.js:471: only the exact text 'true' turns high contrast on.
export function highContrastOn(source = browserCookies()): boolean {
  return readCookieValue(HIGH_CONTRAST_COOKIE, source) === 'true'
}

// tokens.css reads html[data-contrast='high'], so every screen follows one switch.
export function applyHighContrast(): void {
  if (typeof document === 'undefined') return
  if (highContrastOn()) document.documentElement.dataset.contrast = 'high'
  else delete document.documentElement.dataset.contrast
}
