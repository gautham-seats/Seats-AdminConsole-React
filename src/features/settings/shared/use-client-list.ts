'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  DEFAULT_PAGE_SIZE,
  matchesSearch,
  nextSortState,
  pageRows,
  sortRows,
  type SortDirection,
} from './list-model'

type Sort = { column: string; direction: SortDirection }

// swgrid.js client grid: search, sort and paging in the browser; selection kept across pages.
export function useClientList<T extends { id: number }>(data: readonly T[] | undefined, initialSort: Sort) {
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>(initialSort)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE)
  const [selection, setSelection] = useState<{ source: readonly T[] | undefined; ids: ReadonlySet<number> }>({
    source: undefined,
    ids: new Set(),
  })

  const filtered = useMemo(() => {
    const rows = (data ?? []).filter(row => matchesSearch(row, search))
    return sortRows(rows, sort.column as keyof T, sort.direction)
  }, [data, search, sort])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(pageIndex, pages - 1)
  const visible = useMemo(() => pageRows(filtered, safePage, pageSize), [filtered, safePage, pageSize])

  // Every reload clears the selection (swgrid.js:700).
  const selected = selection.source === data ? selection.ids : new Set<number>()
  const setSelected = useCallback((ids: ReadonlySet<number>) => setSelection({ source: data, ids }), [data])

  const submitSearch = () => {
    setSearch(draft)
    setPageIndex(0)
    setSelected(new Set())
  }
  const clearSearch = () => {
    setDraft('')
    setSearch('')
    setPageIndex(0)
    setSelected(new Set())
  }
  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }
  const togglePage = () => {
    const allOnPage = visible.length > 0 && visible.every(row => selected.has(row.id))
    const next = new Set(selected)
    for (const row of visible) {
      if (allOnPage) next.delete(row.id)
      else next.add(row.id)
    }
    setSelected(next)
  }
  // swgrid.js:436-456: after a delete the page and search reset.
  const resetAfterDelete = () => {
    setDraft('')
    setSearch('')
    setPageIndex(0)
  }

  return {
    draft,
    setDraft,
    search,
    submitSearch,
    clearSearch,
    sort,
    sortBy: (column: string) => setSort(current => nextSortState(current, column)),
    pageIndex: safePage,
    setPage: setPageIndex,
    pageSize,
    setPageSize: (size: number) => {
      setPageSizeState(size)
      setPageIndex(0)
    },
    filtered,
    visible,
    selected,
    toggle,
    togglePage,
    clearSelection: () => setSelected(new Set()),
    resetAfterDelete,
  }
}

export type ClientList<T extends { id: number }> = ReturnType<typeof useClientList<T>>
