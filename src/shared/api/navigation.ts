import { clearUserStorage } from '@/shared/storage/user-storage'
import { FORCE_LOGIN_PATH, SIGN_OUT_PATH } from './config'
import { resetLegacyLayout } from './legacy-layout'

// A cancelled navigation (the browser's own "Leave page?" prompt) must not silence every later redirect.
const LATCH_MS = 5000

let redirecting = false
let latchTimer: ReturnType<typeof setTimeout> | null = null
// The legacy layout (token, name, e-mail) belongs to the session being left; other caches may register too.
const beforeRedirect = new Set<() => void>([resetLegacyLayout])

export function onSessionRedirect(callback: () => void): () => void {
  beforeRedirect.add(callback)
  return () => beforeRedirect.delete(callback)
}

// Full navigation to a legacy account page; a seam so tests can watch it (jsdom cannot navigate).
export const sessionNavigation = {
  go: (url: string) => window.location.assign(url),
}

function release(): void {
  redirecting = false
  if (latchTimer) clearTimeout(latchTimer)
  latchTimer = null
}

function assign(url: string): void {
  if (redirecting || typeof window === 'undefined') return
  redirecting = true
  // Whatever the session becomes, caches of the old one (token, name, e-mail) are stale.
  beforeRedirect.forEach(callback => callback())
  latchTimer = setTimeout(release, LATCH_MS)
  sessionNavigation.go(url)
}

// bfcache restores and tab switches after a cancelled navigation arrive with the latch still set.
if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', release)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') release()
  })
}

export function redirectToForceLogin(): void {
  if (typeof window === 'undefined') return
  assign(`${FORCE_LOGIN_PATH}?returnUrl=${encodeURIComponent(window.location.href)}`)
}

export function redirectToSignOut(): void {
  clearUserStorage()
  assign(SIGN_OUT_PATH)
}

export function resetRedirectGuard(): void {
  release()
}
