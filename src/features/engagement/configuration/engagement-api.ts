import { api } from '@/shared/api'
import type { EngagementModelGridItem, ReCalculateBody } from '@/types/engagement'
import { parseModels, toCreateQuery, type AddModelForm } from './engagement-models'

// GET api/engagementApi/GetAllEngagement; legacy sends no paging params (seats-admin-engagement.html:302-304).
export async function fetchEngagementModels(signal: AbortSignal): Promise<EngagementModelGridItem[]> {
  return parseModels(await api.get<unknown>('engagementApi/GetAllEngagement', { signal }))
}

// POST api/engagementApi/createEngagementModel with query params only, Engagement + Add.
export function createEngagementModel(form: AddModelForm): Promise<void> {
  return api.post<void>('engagementApi/createEngagementModel', { query: toCreateQuery(form) })
}

// POST api/engagementApi/SyncStudentsAndReCalculate, Engagement + ReCalculateModel.
export function recalculateModels(body: ReCalculateBody): Promise<void> {
  return api.post<void>('engagementApi/SyncStudentsAndReCalculate', { body })
}
