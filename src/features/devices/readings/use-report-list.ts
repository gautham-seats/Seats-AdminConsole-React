'use client'

import { useCallback, useState } from 'react'
import { useApiRead } from '@/shared/api'
import type { ReportPageDto } from '@/types/devices'
import { cleanSearch } from '../index/device-query'
import { nextReportSort, type ReportQuery } from './readings-query'

type ReportListOptions<TSort extends string, TFilters, TItem> = {
  name: string
  initial: () => ReportQuery<TSort, TFilters>
  toParams: (query: ReportQuery<TSort, TFilters>) => object
  fetchPage: (query: ReportQuery<TSort, TFilters>, signal: AbortSignal) => Promise<ReportPageDto<TItem>>
}

// Legacy reloads on every filter change from page 0 (readingsReportController.js:111-138).
export function useReportList<TSort extends string, TFilters, TItem>({
  name,
  initial,
  toParams,
  fetchPage,
}: ReportListOptions<TSort, TFilters, TItem>) {
  const [query, setQuery] = useState(initial)
  const [searchDraft, setSearchDraft] = useState('')
  const key = `${name}:${JSON.stringify(toParams(query))}`
  const load = useCallback((signal: AbortSignal) => fetchPage(query, signal), [fetchPage, query])
  const read = useApiRead(key, load)
  const { reload } = read

  const [shownPage, setShownPage] = useState<ReportPageDto<TItem> | undefined>(undefined)
  if (read.data && read.data !== shownPage) setShownPage(read.data)

  const apply = useCallback(
    (next: ReportQuery<TSort, TFilters>) => {
      if (JSON.stringify(toParams(next)) === JSON.stringify(toParams(query))) reload()
      else setQuery(next)
    },
    [query, reload, toParams],
  )

  // swgrid.js:650-653: every reload re-reads the search box; a changed text also returns to the first page.
  const withTypedSearch = useCallback(
    (next: ReportQuery<TSort, TFilters>): ReportQuery<TSort, TFilters> => {
      const search = cleanSearch(searchDraft)
      if (search === query.search) return next
      setSearchDraft(search)
      return { ...next, search, pageIndex: 0 }
    },
    [query.search, searchDraft],
  )

  const setFilter = useCallback(
    <K extends keyof TFilters>(field: K, value: TFilters[K]) =>
      apply(withTypedSearch({ ...query, filters: { ...query.filters, [field]: value }, pageIndex: 0 })),
    [apply, query, withTypedSearch],
  )

  const setFilters = useCallback(
    (filters: TFilters) => apply(withTypedSearch({ ...query, filters, pageIndex: 0 })),
    [apply, query, withTypedSearch],
  )

  const submitSearch = useCallback(() => {
    const search = cleanSearch(searchDraft)
    setSearchDraft(search)
    apply({ ...query, search, pageIndex: 0 })
  }, [apply, query, searchDraft])

  const clearSearch = useCallback(() => {
    setSearchDraft('')
    apply({ ...query, search: '', pageIndex: 0 })
  }, [apply, query])

  return {
    query,
    read,
    shownPage,
    searchDraft,
    setSearchDraft,
    setFilter,
    setFilters,
    submitSearch,
    clearSearch,
    sortBy: useCallback(
      (column: TSort) => apply(withTypedSearch(nextReportSort(query, column))),
      [apply, query, withTypedSearch],
    ),
    setPage: useCallback(
      (pageIndex: number) => apply(withTypedSearch({ ...query, pageIndex })),
      [apply, query, withTypedSearch],
    ),
    setPageSize: useCallback(
      (pageSize: number) => apply(withTypedSearch({ ...query, pageSize, pageIndex: 0 })),
      [apply, query, withTypedSearch],
    ),
  }
}
