import { api } from '@/shared/api'
import type { LookupOption } from '@/shared/ui'
import type {
  CalculationPeriodDto,
  EngagementStatsItem,
  EngagementStudentScoreItem,
} from '@/types/engagement-history'
import { parseModels } from '../configuration/engagement-models'
import {
  parseStatsPage,
  parseStudentScorePage,
  toExportBody,
  toHistoryBody,
  type HistoryPage,
  type HistoryQuery,
} from './history-query'

// GET api/EngagementApi/GetCurrentCalculationPeriod sets the starting dates (seats-admin-engagement-history.html:824-840).
export async function fetchCalculationPeriod(signal: AbortSignal): Promise<CalculationPeriodDto> {
  const raw = await api.get<unknown>('EngagementApi/GetCurrentCalculationPeriod', { signal })
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    periodStart: typeof record.periodStart === 'string' ? record.periodStart : null,
    periodEnd: typeof record.periodEnd === 'string' ? record.periodEnd : null,
  }
}

export async function fetchHistoryModels(signal: AbortSignal): Promise<LookupOption[]> {
  const models = parseModels(await api.get<unknown>('engagementApi/GetAllEngagement', { signal }))
  return models.map(model => ({ id: model.id, label: model.modelName ?? '' }))
}

export async function fetchHistoryNodes(signal: AbortSignal): Promise<LookupOption[]> {
  const raw = await api.get<unknown>('engagementApi/GetNodes', { signal })
  if (!Array.isArray(raw)) return []
  return raw.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    return typeof record.id === 'number'
      ? [{ id: record.id, label: typeof record.description === 'string' ? record.description : '' }]
      : []
  })
}

// GET api/engagementApi/getStudentsByName?query= (min 2 characters).
export async function searchHistoryStudents(query: string, signal: AbortSignal): Promise<LookupOption[]> {
  const raw = await api.get<unknown>('engagementApi/getStudentsByName', { query: { query }, signal })
  if (!Array.isArray(raw)) return []
  return raw.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    return typeof record.id === 'number'
      ? [{ id: record.id, label: typeof record.description === 'string' ? record.description : '' }]
      : []
  })
}

// POST getEngagementStats / getEngagementStudentScore; both are reads (docs/decisions.md D-062).
export async function fetchStats(
  query: HistoryQuery,
  signal: AbortSignal,
  returnTotalCount?: boolean,
): Promise<HistoryPage<EngagementStatsItem>> {
  return parseStatsPage(
    await api.post<unknown>('engagementApi/getEngagementStats', {
      body: toHistoryBody(query, returnTotalCount),
      signal,
    }),
  )
}

export async function fetchStudentScores(
  query: HistoryQuery,
  signal: AbortSignal,
  returnTotalCount?: boolean,
): Promise<HistoryPage<EngagementStudentScoreItem>> {
  return parseStudentScorePage(
    await api.post<unknown>('engagementApi/getEngagementStudentScore', {
      body: toHistoryBody(query, returnTotalCount),
      signal,
    }),
  )
}

// POST ExportEngagementStats / ExportEngagementStudentScore queue a report job.
export function exportHistory(query: HistoryQuery, exportTo: number): Promise<void> {
  const path =
    query.view === 'Stats'
      ? 'engagementApi/ExportEngagementStats'
      : 'engagementApi/ExportEngagementStudentScore'
  return api.post<void>(path, { body: toExportBody(query, exportTo) })
}
