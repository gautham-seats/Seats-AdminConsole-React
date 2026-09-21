'use client'

import { useCallback, useMemo, useState } from 'react'
import { useApiRead } from '@/shared/api'
import type { UsersPageDto, UsersSortColumn } from '@/types/users'
import { fetchUsersPage } from './users-api'
import { cleanSearch, INITIAL_QUERY, nextSort, queryKey, type UsersQuery } from './users-query'

const NO_SELECTION: ReadonlySet<number> = new Set()

type Selection = { page: UsersPageDto | undefined; ids: ReadonlySet<number> }

export function useUsersList() {
  const [query, setQuery] = useState<UsersQuery>(INITIAL_QUERY)
  const [draft, setDraft] = useState('')
  const load = useCallback((signal: AbortSignal) => fetchUsersPage(query, signal), [query])
  const read = useApiRead(queryKey(query), load)
  const { reload } = read

  // Every load clears the selection (swgrid.js:700), so selection belongs to one loaded page.
  const [selection, setSelection] = useState<Selection>({ page: undefined, ids: NO_SELECTION })
  const selected = read.data && selection.page === read.data ? selection.ids : NO_SELECTION

  const apply = useCallback(
    (next: UsersQuery) => {
      if (queryKey(next) === queryKey(query)) reload()
      else setQuery(next)
    },
    [query, reload],
  )

  // The last loaded page keeps the header and columns while a reload runs, like the grid's observables.
  const [lastPage, setLastPage] = useState<UsersPageDto | undefined>(undefined)
  if (read.data && read.data !== lastPage) setLastPage(read.data)

  // swgrid.js:650-653: any reload sends the text in the box and goes to the first page when it changed.
  const withTypedSearch = useCallback(
    (next: UsersQuery): UsersQuery => {
      const search = cleanSearch(draft)
      return search === query.search ? next : { ...next, search, pageIndex: 0 }
    },
    [draft, query.search],
  )

  const submitSearch = useCallback(() => {
    apply({ ...query, search: cleanSearch(draft), pageIndex: 0 })
  }, [apply, draft, query])

  const clearSearch = useCallback(() => {
    setDraft('')
    apply({ ...query, search: '', pageIndex: 0 })
  }, [apply, query])

  const sortBy = useCallback(
    (column: UsersSortColumn) => apply(withTypedSearch(nextSort(query, column))),
    [apply, query, withTypedSearch],
  )
  const setPage = useCallback(
    (pageIndex: number) => apply(withTypedSearch({ ...query, pageIndex })),
    [apply, query, withTypedSearch],
  )
  const setPageSize = useCallback(
    (pageSize: number) => apply(withTypedSearch({ ...query, pageSize, pageIndex: 0 })),
    [apply, query, withTypedSearch],
  )

  const toggle = useCallback(
    (id: number) => {
      if (!read.data) return
      const ids = new Set(selected)
      if (ids.has(id)) ids.delete(id)
      else ids.add(id)
      setSelection({ page: read.data, ids })
    },
    [read.data, selected],
  )

  const togglePage = useCallback(() => {
    if (!read.data) return
    const all = read.data.items.length > 0 && read.data.items.every(item => selected.has(item.id))
    setSelection({ page: read.data, ids: all ? NO_SELECTION : new Set(read.data.items.map(item => item.id)) })
  }, [read.data, selected])

  const clearSelection = useCallback(() => setSelection({ page: read.data, ids: NO_SELECTION }), [read.data])

  // swgrid.js:436-439 and 453-456: after a delete, page and search reset and the grid reloads.
  const afterDelete = useCallback(() => {
    setDraft('')
    apply({ ...query, pageIndex: 0, search: '' })
  }, [apply, query])

  const selectedItems = useMemo(
    () => (read.data ? read.data.items.filter(item => selected.has(item.id)) : []),
    [read.data, selected],
  )

  return {
    query,
    lastPage,
    draft,
    setDraft,
    read,
    selected,
    selectedItems,
    submitSearch,
    clearSearch,
    sortBy,
    setPage,
    setPageSize,
    toggle,
    togglePage,
    clearSelection,
    afterDelete,
  }
}

export type UsersList = ReturnType<typeof useUsersList>
