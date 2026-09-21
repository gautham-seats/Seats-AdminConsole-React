import type { ApiError, ReadStatus } from '@/shared/api'
import type { ListSort } from './client-list'

export type ListState<T, K extends string> = {
  status: ReadStatus
  error: ApiError | null
  reload: () => void
  rows: readonly T[]
  total: number
  sort: ListSort<K>
  sortBy: (col: K) => void
  draft: string
  setDraft: (value: string) => void
  search: string
  submitSearch: () => void
  // Client lists also filter when the box loses focus after an edit (_ListSearchNavBar.cshtml:5 value binding).
  commitDraft?: () => void
  clearSearch: () => void
  pageIndex: number
  pageSize: number
  setPage: (pageIndex: number) => void
  setPageSize: (pageSize: number) => void
  selected: ReadonlySet<number>
  toggle: (id: number) => void
  togglePage: () => void
  clearSelection: () => void
  afterDelete: () => void
}

export const NO_SELECTION: ReadonlySet<number> = new Set()

// swgrid.js:298-325: ticking the header adds the page rows; unticking clears every selection.
export function togglePageSelection(
  selected: ReadonlySet<number>,
  pageIds: readonly number[],
): ReadonlySet<number> {
  const all = pageIds.length > 0 && pageIds.every(id => selected.has(id))
  return all ? NO_SELECTION : new Set([...selected, ...pageIds])
}

export function toggleId(selected: ReadonlySet<number>, id: number): ReadonlySet<number> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}
