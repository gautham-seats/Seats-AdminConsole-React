import { ApiError } from './errors'

// A page can only prove rows exist; an empty page proves nothing, so the server total stands.
// Clamping an empty page would invent rows and strand the reader past the last page (audit H-03/M-04).
export function pageTotal(
  serverTotal: number,
  pageIndex: number,
  pageSize: number,
  rowCount: number,
): number {
  if (rowCount === 0) return serverTotal
  return Math.max(serverTotal, pageIndex * pageSize + rowCount)
}

type PageEnvelope<T> = { items: T[]; totalRowCount: number }

// A successful response that is not a page is a broken answer, not an empty list: screens that
// accepted anything showed "no items" for a failure, or threw while mapping (audit H-02).
export function pageEnvelope<T = unknown>(raw: unknown, path: string): PageEnvelope<T> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ApiError('parse', path)
  const record = raw as Record<string, unknown>
  if (!Array.isArray(record.items)) throw new ApiError('parse', path)
  if (typeof record.totalRowCount !== 'number' || !Number.isInteger(record.totalRowCount))
    throw new ApiError('parse', path)
  // The rows keep the caller's type; each screen still checks the fields it reads.
  return { items: record.items as T[], totalRowCount: Math.max(record.totalRowCount, 0) }
}
