import { api, ApiError } from '@/shared/api'
import { pageEnvelope } from '@/shared/api/page-total'
import { formatShortDate } from '@/shared/i18n/culture'
import type {
  DeveloperKeysPageDto,
  DeveloperKeysSortColumn,
  UserDeveloperKeyDto,
} from '@/types/developer-keys'
import { deleteIdsPath } from '../list/client-list'
import { serverParams, type ServerQuery } from '../list/use-server-list'

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)

// Only the listed fields are copied; the developer key value in the response is dropped here.
function toItem(raw: unknown): UserDeveloperKeyDto | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'number') return null
  return {
    id: r.id,
    userId: typeof r.userId === 'number' ? r.userId : 0,
    userName: text(r.userName),
    fullName: text(r.fullName),
    expiryDate: text(r.expiryDate),
  }
}

export function parseDeveloperKeysPage(raw: unknown): DeveloperKeysPageDto {
  const page = pageEnvelope(raw, 'DeveloperKeyApi')
  const items = page.items.map(toItem)
  if (items.some(item => item === null)) throw new ApiError('parse', 'DeveloperKeyApi')
  return { items: items as UserDeveloperKeyDto[], totalRowCount: page.totalRowCount }
}

// DeveloperKeyApiController.cs:31 passes a 1-based page on; legacy sent the 0-based index, so pages 1 and 2 matched.
function developerKeysParams(query: ServerQuery<DeveloperKeysSortColumn>) {
  return { ...serverParams(query), currentPageIndex: query.pageIndex + 1 }
}

// GET api/DeveloperKeyApi with server paging (DeveloperKey/Index.cshtml:73-81, DeveloperKeyApiController.cs:28-41).
export async function fetchDeveloperKeysPage(
  query: ServerQuery<DeveloperKeysSortColumn>,
  signal: AbortSignal,
): Promise<DeveloperKeysPageDto> {
  return parseDeveloperKeysPage(
    await api.get<unknown>('DeveloperKeyApi', { query: developerKeysParams(query), signal }),
  )
}

// DELETE api/DeveloperKeyApi?ids=… (DeveloperKeyApiController.cs:43-71).
export function deleteDeveloperKeys(ids: readonly number[]): Promise<void> {
  return api.delete<void>(deleteIdsPath('DeveloperKeyApi', ids))
}

const DATE_PARTS = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/

// swapp.js:2195-2204 dateText: the wall-clock value in the UI-culture short-date layout (_Layout.cshtml:212-215, D-111).
export function formatExpiryDate(value: string | null): string {
  if (!value) return ''
  const parts = DATE_PARTS.exec(value)
  if (!parts) return ''
  const [, year, month, day, hour, minute, second] = parts
  const date = formatShortDate(new Date(Number(year), Number(month) - 1, Number(day)))
  return `${date} ${hour}:${minute}:${second}`
}
