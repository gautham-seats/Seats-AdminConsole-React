'use client'

import { useCallback, useMemo, useState } from 'react'
import { useApiRead } from '@/shared/api'
import { DEFAULT_PAGE_SIZE } from '../index/users-query'
import { nextListSort, pageItems, searchItems, sortItems, type ListSort, type SortValue } from './client-list'
import { NO_SELECTION, toggleId, togglePageSelection, type ListState } from './list-state'

type ClientListOptions<T, K extends string> = {
  key: string
  load: (signal: AbortSignal) => Promise<T[]>
  initialSort: ListSort<K>
  searchFields: readonly (keyof T)[]
  valueOf: (item: T, col: K) => SortValue
}

type Selection<T> = { data: T[] | undefined; ids: ReadonlySet<number> }

// Lists the legacy grid pages in the browser (paginationSide 'client', swgrid.js:9, 111-159).
export function useClientList<T extends { id: number }, K extends string>({
  key,
  load,
  initialSort,
  searchFields,
  valueOf,
}: ClientListOptions<T, K>): ListState<T, K> {
  const read = useApiRead(key, load)
  const { reload } = read
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(initialSort)
  const [pageIndex, setPage] = useState(0)
  const [pageSize, setSize] = useState(DEFAULT_PAGE_SIZE)
  const [selection, setSelection] = useState<Selection<T>>({ data: undefined, ids: NO_SELECTION })

  // Every load clears the selection (swgrid.js:700), so it belongs to one loaded response.
  const selected = read.data && selection.data === read.data ? selection.ids : NO_SELECTION

  const filtered = useMemo(
    () => sortItems(searchItems(read.data ?? [], search, searchFields), sort, valueOf),
    [read.data, search, searchFields, sort, valueOf],
  )
  const rows = useMemo(() => pageItems(filtered, pageIndex, pageSize), [filtered, pageIndex, pageSize])

  // swgrid.js:369-374: a search returns to the first page and clears the selection.
  const applySearch = useCallback(
    (value: string) => {
      setDraft(value)
      setSearch(value)
      setPage(0)
      setSelection({ data: read.data, ids: NO_SELECTION })
    },
    [read.data],
  )

  // swgrid.js:120-136 matches the typed text as is, without trimming.
  const submitSearch = useCallback(() => applySearch(draft), [applySearch, draft])
  const commitDraft = useCallback(() => {
    if (draft !== search) applySearch(draft)
  }, [applySearch, draft, search])
  const clearSearch = useCallback(() => applySearch(''), [applySearch])
  const sortBy = useCallback((col: K) => setSort(current => nextListSort(current, col)), [])
  const setPageSize = useCallback((size: number) => {
    setSize(size)
    setPage(0)
  }, [])

  const toggle = useCallback(
    (id: number) => setSelection({ data: read.data, ids: toggleId(selected, id) }),
    [read.data, selected],
  )
  const togglePage = useCallback(
    () =>
      setSelection({
        data: read.data,
        ids: togglePageSelection(
          selected,
          rows.map(row => row.id),
        ),
      }),
    [read.data, rows, selected],
  )
  const clearSelection = useCallback(() => setSelection({ data: read.data, ids: NO_SELECTION }), [read.data])

  // swgrid.js:453-457: after a delete, page and search reset and the grid reloads.
  const afterDelete = useCallback(() => {
    setDraft('')
    setSearch('')
    setPage(0)
    reload()
  }, [reload])

  return {
    status: read.status,
    error: read.error,
    reload,
    rows,
    total: filtered.length,
    sort,
    sortBy,
    draft,
    setDraft,
    search,
    submitSearch,
    commitDraft,
    clearSearch,
    pageIndex,
    pageSize,
    setPage,
    setPageSize,
    selected,
    toggle,
    togglePage,
    clearSelection,
    afterDelete,
  }
}
