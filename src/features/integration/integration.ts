import type { ExistIntegrationAccountDto, ZoomLinkState } from '@/types/integrations'

export function parseZoomStatus(raw: unknown): ExistIntegrationAccountDto {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return { exist: record.exist === true, sameUser: record.sameUser !== false }
}

// seats-admin-integration.html:149-166: not linked, linked by this user, linked by someone else.
export function zoomLinkState(status: ExistIntegrationAccountDto | null): ZoomLinkState {
  if (!status?.exist) return 'notLinked'
  return status.sameUser ? 'linkedByMe' : 'linkedByOther'
}

// Integration/Index.cshtml:14 writes ViewBag.IntegrationUrl into the page; only an https URL is followed.
export function readZoomAuthUrl(html: string): string | null {
  const match = /scope\.urlIntegrateZoom\s*=\s*'([^']*)'/.exec(html)
  if (!match) return null
  const href = match[1].replace(/&amp;/g, '&')
  try {
    // Return the server's string as-is; URL.toString() would re-encode redirect_uri (D-121).
    return new URL(href).protocol === 'https:' ? href : null
  } catch {
    return null
  }
}
