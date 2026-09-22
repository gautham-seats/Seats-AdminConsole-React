'use client'

import { useCallback, useMemo, useState } from 'react'
import { useApiRead } from '@/shared/api'
import type { RoomsPageDto, RoomsSortColumn } from '@/types/devices'
import { fetchRoomsPage } from './rooms-api'
import { cleanSearch } from '../index/device-query'
import { INITIAL_ROOMS_QUERY, nextRoomsSort, roomsQueryKey, type RoomsQuery } from './rooms-query'

const NO_SELECTION: ReadonlySet<number> = new Set()

type Selection = { page: RoomsPageDto | undefined; ids: ReadonlySet<number> }

export function useRoomsList() {
  const [query, setQuery] = useState<RoomsQuery>(INITIAL_ROOMS_QUERY)
  const [searchDraft, setSearchDraft] = useState('')
  const load = useCallback((signal: AbortSignal) => fetchRoomsPage(query, signal), [query])
  const read = useApiRead(roomsQueryKey(query), load)
  const { reload } = read

  const [shownPage, setShownPage] = useState<RoomsPageDto | undefined>(undefined)
  if (read.data && read.data !== shownPage) setShownPage(read.data)

  // Every load clears the selection (swgrid.js:700).
  const [selection, setSelection] = useState<Selection>({ page: undefined, ids: NO_SELECTION })
  const selected = read.data && selection.page === read.data ? selection.ids : NO_SELECTION

  const apply = useCallback(
    (next: RoomsQuery) => {
      if (roomsQueryKey(next) === roomsQueryKey(query)) reload()
      else setQuery(next)
    },
    [query, reload],
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

  // swgrid.js:650-653: every reload re-reads the search box; a changed text also returns to the first page.
  const withTypedSearch = useCallback(
    (next: RoomsQuery): RoomsQuery => {
      const search = cleanSearch(searchDraft)
      if (search === query.search) return next
      setSearchDraft(search)
      return { ...next, search, pageIndex: 0 }
    },
    [query.search, searchDraft],
  )

  const sortBy = useCallback(
    (column: RoomsSortColumn) => apply(withTypedSearch(nextRoomsSort(query, column))),
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

  // swgrid.js:453-456: after a delete, page and search reset and the grid reloads.
  const afterDelete = useCallback(() => {
    setSearchDraft('')
    apply({ ...query, pageIndex: 0, search: '' })
  }, [apply, query])

  const selectedIds = useMemo(
    () => (read.data ? read.data.items.filter(item => selected.has(item.id)).map(item => item.id) : []),
    [read.data, selected],
  )

  return {
    query,
    read,
    shownPage,
    searchDraft,
    setSearchDraft,
    selected,
    selectedIds,
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

export type RoomsList = ReturnType<typeof useRoomsList>
