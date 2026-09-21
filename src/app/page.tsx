'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { landingEntry, legacyHref } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { DelayedLoading, ErrorState } from '@/shared/ui'
import { ERROR_KIND_FALLBACK_ONLY } from '@/shared/ui/ErrorState'

const EN = {
  loading: 'Loading',
  error: 'There was an error while processing your request.',
  retry: 'Refresh',
} as const

// Opens the same landing page as the legacy Admin: Users, or the first menu entry the user can see.
export default function HomePage() {
  const router = useRouter()
  const { status, error, profile, reload } = useProfile()

  useEffect(() => {
    if (status !== 'success') return
    const entry = landingEntry(profile)
    if (!entry) return
    if (entry.reactRoute) router.replace(entry.reactRoute)
    else window.location.assign(legacyHref(entry.legacyRoute))
  }, [status, profile, router])

  if (status === 'error') {
    return (
      <div className="grid flex-1 place-items-center p-6">
        <ErrorState
          variant="page"
          headingLevel={1}
          message={EN.error}
          retryLabel={EN.retry}
          onRetry={reload}
          error={error}
        />
      </div>
    )
  }
  // A signed-in user with no permitted screen gets the not-authorised state, never a blank page.
  if (status === 'success' && landingEntry(profile) === null) {
    return (
      <div className="grid flex-1 place-items-center p-6">
        <ErrorState
          variant="page"
          headingLevel={1}
          message={ERROR_KIND_FALLBACK_ONLY.notAuthorised.message}
          stateLabel={ERROR_KIND_FALLBACK_ONLY.notAuthorised.stateLabel}
          glyph="permission"
        />
      </div>
    )
  }
  return (
    <div className="grid flex-1 place-items-center">
      <h1 className="sr-only">{EN.loading}</h1>
      <DelayedLoading active variant="page" label={EN.loading} />
    </div>
  )
}
