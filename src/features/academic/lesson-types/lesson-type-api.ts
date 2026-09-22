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

// The partial legacy loads for each screen carries the tenant flags (LessonTypeController.cs:17-35).
// An unrecognised response fails the read instead of reporting every flag as off.
export async function fetchLessonTypeFlags(
  view: 'Index' | 'Details',
  signal: AbortSignal,
): Promise<LessonTypeTenantFlags> {
  const flags = readTenantFlags(await getLegacyViewHtml(`LessonType/${view}`, signal))
  if (!flags) throw new Error(`LessonType/${view} did not return the lesson type partial`)
  return flags
}

// POST api/LessonTypeApi/; the server keeps GPS and description from the database (LessonTypeApiController.cs:78-103).
export function saveLessonType(form: LessonTypeForm): Promise<void> {
  return api.post<void>('LessonTypeApi/', { body: toLessonTypePayload(form) })
}
