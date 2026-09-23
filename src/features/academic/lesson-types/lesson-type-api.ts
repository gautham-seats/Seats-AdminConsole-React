import { api } from '@/shared/api'
import { getLegacyViewHtml } from '@/shared/api/legacy-view'
import type { LessonTypeDto, LessonTypeTenantFlags, LessonTypeViewModel } from '@/types/lesson-types'
import {
  parseLessonTypes,
  parseLessonTypeView,
  readTenantFlags,
  toLessonTypePayload,
  type LessonTypeForm,
} from './lesson-type-form'

// GET api/LessonTypeApi/ (LessonTypeApiController.cs:28-46).
export async function fetchLessonTypes(signal: AbortSignal): Promise<LessonTypeDto[]> {
  return parseLessonTypes(await api.get<unknown>('LessonTypeApi/', { signal }))
}

// GET api/LessonTypeApi/{id} with the checkout and scaling options (LessonTypeApiController.cs:48-76).
// Null means no such lesson type; an unreadable body fails the read so the screen offers Retry.
export async function fetchLessonType(id: number, signal: AbortSignal): Promise<LessonTypeViewModel | null> {
  const result = parseLessonTypeView(await api.get<unknown>(`LessonTypeApi/${id}`, { signal }))
  if (result.kind === 'malformed')
    throw new Error(`api/LessonTypeApi/${id} did not return a readable lesson type`)
  return result.kind === 'ok' ? result.view : null
}

// Tenant flags do not change within a session, and the list and edit screens both read them, so the
// first successful read of each partial is kept and the second visit reuses it. A failed read is never
// cached, so Retry re-fetches; concurrent reads of the same view share one request.
const flagsCache = new Map<'Index' | 'Details', LessonTypeTenantFlags>()
const flagsInFlight = new Map<'Index' | 'Details', Promise<LessonTypeTenantFlags>>()

// The partial legacy loads for each screen carries the tenant flags (LessonTypeController.cs:17-35).
// An unrecognised response fails the read instead of reporting every flag as off.
export async function fetchLessonTypeFlags(
  view: 'Index' | 'Details',
  signal: AbortSignal,
): Promise<LessonTypeTenantFlags> {
  const cached = flagsCache.get(view)
  if (cached) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    return cached
  }
  let request = flagsInFlight.get(view)
  if (!request) {
    // No signal on the shared request: one screen unmounting must not cancel the read for the other.
    request = getLegacyViewHtml(`LessonType/${view}`)
      .then(html => {
        const flags = readTenantFlags(html)
        if (!flags) throw new Error(`LessonType/${view} did not return the lesson type partial`)
        flagsCache.set(view, flags)
        return flags
      })
      .finally(() => {
        if (flagsInFlight.get(view) === request) flagsInFlight.delete(view)
      })
    flagsInFlight.set(view, request)
  }
  const flags = await request
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  return flags
}

// The flag cache lives for the page's lifetime; tests reset it so a cached read never crosses a case.
export function clearLessonTypeFlagsCache(): void {
  flagsCache.clear()
  flagsInFlight.clear()
}

// POST api/LessonTypeApi/; the server keeps GPS and description from the database (LessonTypeApiController.cs:78-103).
export function saveLessonType(form: LessonTypeForm): Promise<void> {
  return api.post<void>('LessonTypeApi/', { body: toLessonTypePayload(form) })
}
