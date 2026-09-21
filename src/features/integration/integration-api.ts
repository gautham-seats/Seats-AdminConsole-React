import { api } from '@/shared/api'
import { getLegacyViewHtml } from '@/shared/api/legacy-view'
import type { ExistIntegrationAccountDto } from '@/types/integrations'
import { parseZoomStatus, readZoomAuthUrl } from './integration'

// GET api/IntegrationApi/ZoomTenantLinked, Integration + Access (IntegrationApiController.cs:112-114).
export async function fetchZoomStatus(signal: AbortSignal): Promise<ExistIntegrationAccountDto> {
  return parseZoomStatus(await api.get<unknown>('IntegrationApi/ZoomTenantLinked', { signal }))
}

// The Zoom OAuth URL is built server-side from tenant settings (IntegrationController.cs:22-39).
export async function fetchZoomAuthUrl(signal: AbortSignal): Promise<string | null> {
  return readZoomAuthUrl(await getLegacyViewHtml('Integration/Index', signal))
}
