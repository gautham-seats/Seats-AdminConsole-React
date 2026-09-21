'use client'

import { useCallback } from 'react'
import { useResources } from '@/shared/resources'

// Keys the legacy page and component request (Integration/Index.cshtml:4, seats-admin-integration.html:90-93).
export const INTEGRATION_TEXT = {
  Integrations: 'Integrations',
  Zoom: 'Zoom',
  Loading: 'Loading',
  Refresh: 'Refresh',
  Collapse: 'Collapse',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
} as const

// Hard-coded in seats-admin-integration.html:159-164 or React-only states.
export const INTEGRATION_FALLBACK_ONLY = {
  zoomLinked: 'Zoom linked',
  zoomLinkedOther: 'Zoom linked with other user',
  notLinked: 'Not linked',
  connect: 'Connect',
  connected: 'Connected',
  zoomSummary: 'Online meetings',
  noAccess: 'You do not have permission to view this page.',
  expand: 'Expand',
  linkUnavailable: 'The Zoom sign-in link could not be loaded.',
  backToIntegrations: 'Back to Integrations',
  zoomCodeMissing: 'No authorization code was provided.',
  zoomReturnsToLegacy:
    'Zoom finishes linking on the old Admin, so this page does not complete the connection. Open Integrations to check whether Zoom is linked.',
} as const

export type IntegrationTextKey = keyof typeof INTEGRATION_TEXT

const KEYS = Object.keys(INTEGRATION_TEXT)

export function useIntegrationText() {
  const { text } = useResources(KEYS)
  return useCallback(
    (key: IntegrationTextKey) => {
      const value = text(key)
      return !value.trim() || value === key ? INTEGRATION_TEXT[key] : value
    },
    [text],
  )
}
