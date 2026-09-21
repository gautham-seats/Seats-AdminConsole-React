import { api } from '@/shared/api'
import { pageTotal } from '@/shared/api/page-total'
import type { AuditPageDto } from '@/types/audit'
import type { SimpleListItemDto } from '@/types/users'
import { toSimpleList } from '../details/user-details-api'
import { parseAuditPage, toAuditBody, type AuditQuery } from './activity-log'

// POST api/audit/GetAudit is read only (AuditController.cs:116-167); see docs/decisions.md D-050.
export async function fetchAuditPage(query: AuditQuery, signal: AbortSignal): Promise<AuditPageDto> {
  const raw = await api.post<unknown>('audit/GetAudit', { body: toAuditBody(query), signal })
  const page = parseAuditPage(raw)
  return {
    ...page,
    totalRowCount: pageTotal(page.totalRowCount, query.pageIndex, query.pageSize, page.items.length),
  }
}

// GET api/Audit/GetUser?query= returns at most ten users as { id, description } (AuditController.cs:199-211).
export async function searchAuditUsers(query: string, signal: AbortSignal): Promise<SimpleListItemDto[]> {
  return toSimpleList(await api.get<unknown>('Audit/GetUser', { query: { query }, signal }))
}

// POST api/audit/Export queues a report (AuditController.cs:170-197); ExportToEnum Pdf 0, Csv 1.
export function exportAudit(query: AuditQuery, exportTo: 0 | 1): Promise<void> {
  return api.post<void>('audit/Export', { body: { ...toAuditBody(query), exportTo } })
}
