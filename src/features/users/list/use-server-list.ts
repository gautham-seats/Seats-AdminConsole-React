'use client'

import { useCallback, useState } from 'react'
import { useApiRead } from '@/shared/api'
import type { SortDirection } from '@/types/users'
import { cleanSearch, DEFAULT_PAGE_SIZE } from '../index/users-query'
import { nextListSort, type ListSort } from './client-list'
import { NO_SELECTION, toggleId, togglePageSelection, type ListState } from './list-state'

export type ServerQuery<K extends string> = {
  pageIndex: number
  pageSize: number
  sortCol: K
  sortDir: SortDirection
  search: string
}

type ServerPage<T> = { items: T[]; totalRowCount: number }

type ServerListOptions<T, K extends string> = {
  name: string
  initialSort: ListSort<K>
  fetchPage: (query: ServerQuery<K>, signal: AbortSignal) => Promise<ServerPage<T>>
}

type Selection<T> = { data: ServerPage<T> | undefined; ids: ReadonlySet<number> }

// swgrid.js:655-668 query string for paginationSide 'server'.
export function serverParams<K extends string>(query: ServerQuery<K>) {
  return {
    currentPageIndex: query.pageIndex,
    pageSize: query.pageSize,
    sortCol: query.sortCol,
    sortDir: query.sortDir,
    searchFilter: query.search,
  }
}

const keyOf = <K extends string>(name: string, q: ServerQuery<K>) =>
  `${name}:${q.pageIndex}:${q.pageSize}:${q.sortCol}:${q.sortDir}:${q.search}`

export function useServerList<T extends { id: number }, K extends string>({
  name,
  initialSort,
  fetchPage,
}: ServerListOptions<T, K>): ListState<T, K> {
  const [query, setQuery] = useState<ServerQuery<K>>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    sortCol: initialSort.col,
    sortDir: initialSort.dir,
    search: '',
  })
  const [draft, setDraft] = useState('')
  const load = useCallback((signal: AbortSignal) => fetchPage(query, signal), [fetchPage, query])
  const read = useApiRead(keyOf(name, query), load)
  const { reload } = read
  const [selection, setSelection] = useState<Selection<T>>({ data: undefined, ids: NO_SELECTION })
  const selected = read.data && selection.data === read.data ? selection.ids : NO_SELECTION
  const rows = read.data?.items ?? []

  const apply = useCallback(
    (next: ServerQuery<K>) => {
      if (keyOf(name, next) === keyOf(name, query)) reload()
      else setQuery(next)
    },
    [name, query, reload],
  )

  const submitSearch = useCallback(() => {
    const search = cleanSearch(draft)
    setDraft(search)
    apply({ ...query, search, pageIndex: 0 })
  }, [apply, draft, query])

  const clearSearch = useCallback(() => {
    setDraft('')
    apply({ ...query, search: '', pageIndex: 0 })
  }, [apply, query])

  // swgrid.js:650-653: any reload sends the text in the box and goes to the first page when it changed.
  const withTypedSearch = useCallback(
    (next: ServerQuery<K>): ServerQuery<K> => {
      const search = cleanSearch(draft)
      return search === query.search ? next : { ...next, search, pageIndex: 0 }
    },
    [draft, query.search],
  )

  const sortBy = useCallback(
    (col: K) => {
      const next = nextListSort({ col: query.sortCol, dir: query.sortDir }, col)
      apply(withTypedSearch({ ...query, sortCol: next.col, sortDir: next.dir }))
    },
    [apply, query, withTypedSearch],
  )

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
          (read.data?.items ?? []).map(item => item.id),
        ),
      }),
    [read.data, selected],
  )

  return {
    status: read.status,
    error: read.error,
    reload,
    rows,
    total: read.status === 'success' && read.data ? read.data.totalRowCount : 0,
    sort: { col: query.sortCol, dir: query.sortDir },
    sortBy,
    draft,
    setDraft,
    search: query.search,
    submitSearch,
    clearSearch,
    pageIndex: query.pageIndex,
    pageSize: query.pageSize,
    setPage: pageIndex => apply(withTypedSearch({ ...query, pageIndex })),
    setPageSize: pageSize => apply(withTypedSearch({ ...query, pageSize, pageIndex: 0 })),
    selected,
    toggle,
    togglePage,
    clearSelection: () => setSelection({ data: read.data, ids: NO_SELECTION }),
    afterDelete: () => {
      setDraft('')
      apply({ ...query, pageIndex: 0, search: '' })
    },
  }
}
