import { api } from '@/shared/api'
import { pageTotal } from '@/shared/api/page-total'
import type {
  ExportStudentClockingBody,
  ReadingReportItemDto,
  ReadingsDeviceOptionDto,
  ReadingsSortColumn,
  ReportPageDto,
  SuspiciousClockingDto,
  SuspiciousSortColumn,
} from '@/types/devices'
import {
  parseReadingsDevices,
  parseReadingsPage,
  parseSuspiciousPage,
  toReadingsParams,
  toSuspiciousParams,
  type ReadingsFilters,
  type ReportQuery,
  type SuspiciousFilters,
} from './readings-query'

// GET api/ReadingsReportApi/GetStudentClockings (ReadingsReportApiController.cs:44-100).
export async function fetchReadingsPage(
  query: ReportQuery<ReadingsSortColumn, ReadingsFilters>,
  signal: AbortSignal,
): Promise<ReportPageDto<ReadingReportItemDto>> {
  const raw = await api.get<unknown>('ReadingsReportApi/GetStudentClockings', {
    query: toReadingsParams(query),
    signal,
  })
  const page = parseReadingsPage(raw)
  return {
    ...page,
    totalRowCount: pageTotal(page.totalRowCount, query.pageIndex, query.pageSize, page.items.length),
  }
}

// GET api/ReadingsReportApi/GetDevices (ReadingsReportApiController.cs:118-132).
export async function fetchReadingsDevices(signal: AbortSignal): Promise<ReadingsDeviceOptionDto[]> {
  return parseReadingsDevices(await api.get<unknown>('ReadingsReportApi/GetDevices', { signal }))
}

// POST api/ReadingsReportApi/Export queues a report (ReadingsReportApiController.cs:102-116).
export function exportReadings(body: ExportStudentClockingBody): Promise<unknown> {
  return api.post<unknown>('ReadingsReportApi/Export', { body })
}

// GET api/SuspiciousReadingsReportApi/GetSuspiciousClockings (SuspiciousReadingsReportApiController.cs:29-61).
export async function fetchSuspiciousPage(
  query: ReportQuery<SuspiciousSortColumn, SuspiciousFilters>,
  signal: AbortSignal,
): Promise<ReportPageDto<SuspiciousClockingDto>> {
  const raw = await api.get<unknown>('SuspiciousReadingsReportApi/GetSuspiciousClockings', {
    query: toSuspiciousParams(query),
    signal,
  })
  const page = parseSuspiciousPage(raw)
  return {
    ...page,
    totalRowCount: pageTotal(page.totalRowCount, query.pageIndex, query.pageSize, page.items.length),
  }
}
