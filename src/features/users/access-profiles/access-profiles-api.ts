import { api } from '@/shared/api'
import type { AccessProfileSimpleItemDto } from '@/types/access-profiles'
import { deleteIdsPath } from '../list/client-list'

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)

// AccessProfileApiController.cs:102-106 returns null instead of an empty list when nothing is found.
export function parseAccessProfiles(raw: unknown): AccessProfileSimpleItemDto[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(entry => {
    if (!entry || typeof entry !== 'object') return []
    const record = entry as Record<string, unknown>
    if (typeof record.id !== 'number') return []
    return [
      {
        id: record.id,
        description: text(record.description),
        isEnabled: record.isEnabled === true,
        globalId: text(record.globalId),
        visible: record.visible === true,
      },
    ]
  })
}

// GET api/AccessProfileApi (AccessProfile/Index.cshtml:80, AccessProfileApiController.cs:97-98).
export async function fetchAccessProfiles(signal: AbortSignal): Promise<AccessProfileSimpleItemDto[]> {
  return parseAccessProfiles(await api.get<unknown>('AccessProfileApi', { signal }))
}

// DELETE api/AccessProfileApi?ids=… (AccessProfileApiController.cs:306-323).
export function deleteAccessProfiles(ids: readonly number[]): Promise<void> {
  return api.delete<void>(deleteIdsPath('AccessProfileApi', ids))
}
