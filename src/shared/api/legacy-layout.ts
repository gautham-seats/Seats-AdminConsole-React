import { LEGACY_ADMIN_BASE } from './config'

// After a failed or token-less answer the layout is not asked again for this long, so an expired session
// costs one page fetch per interval instead of one per API call (SL-02).
export const LAYOUT_RETRY_MS = 30_000

let pending: Promise<string | null> | null = null
let failedAt: number | null = null

// Test seam for the retry interval.
export const layoutClock = { now: () => Date.now() }

async function loadLayout(): Promise<string | null> {
  const response = await fetch(`${LEGACY_ADMIN_BASE}/`, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    // A signed-out session answers with a redirect to the identity provider; following it cross-origin only
    // fails, so the redirect itself is the answer.
    redirect: 'manual',
    headers: { Accept: 'text/html' },
  })
  return response.ok ? response.text() : null
}

function rememberFailure(): void {
  pending = null
  failedAt = layoutClock.now()
}

// One GET of the legacy layout per page load; its HTML carries server-rendered session values.
export function getLegacyLayoutHtml(): Promise<string | null> {
  if (failedAt !== null && layoutClock.now() - failedAt < LAYOUT_RETRY_MS) return Promise.resolve(null)
  if (!pending) {
    pending = loadLayout().then(
      html => {
        if (html === null) rememberFailure()
        else failedAt = null
        return html
      },
      () => {
        rememberFailure()
        return null
      },
    )
  }
  return pending
}

// The fetched page is not usable (no token in it): forget it and wait the retry interval.
export function markLegacyLayoutUnusable(): void {
  rememberFailure()
}

// Forgets the cached page and the retry wait (a token was rejected, or the caller knows the session changed).
export function resetLegacyLayout(): void {
  pending = null
  failedAt = null
}
