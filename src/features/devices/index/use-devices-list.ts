'use client'

import { useCallback, useMemo, useState } from 'react'
import { useApiRead } from '@/shared/api'
import type { DevicesPageDto, DevicesSortColumn } from '@/types/devices'
import { fetchDevicesPage } from './devices-api'
import { EMPTY_FILTERS, type DeviceFilters } from './device-filters'
import { cleanSearch, INITIAL_QUERY, nextSort, queryKey, type DevicesQuery } from './device-query'

const NO_SELECTION: ReadonlySet<number> = new Set()

type Selection = { page: DevicesPageDto | undefined; ids: ReadonlySet<number> }

export function useDevicesList() {
  const [query, setQuery] = useState<DevicesQuery>(INITIAL_QUERY)
  const [searchDraft, setSearchDraft] = useState('')
  const load = useCallback((signal: AbortSignal) => fetchDevicesPage(query, signal), [query])
  const read = useApiRead(queryKey(query), load)
  const { reload } = read

  // The last loaded page stays on screen, dimmed, while the next one loads.
  const [shownPage, setShownPage] = useState<DevicesPageDto | undefined>(undefined)
  if (read.data && read.data !== shownPage) setShownPage(read.data)

  // Every load clears the selection (swgrid.js:700), so a selection belongs to one loaded page.
  const [selection, setSelection] = useState<Selection>({ page: undefined, ids: NO_SELECTION })
  const selected = read.data && selection.page === read.data ? selection.ids : NO_SELECTION

  const apply = useCallback(
    (next: DevicesQuery) => {
      if (queryKey(next) === queryKey(query)) reload()
      else setQuery(next)
    },
    [query, reload],
  )

  // Search box: the text only, with the filters already applied (swgrid.js:369-374 reuses previousQueryStringParams).
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
    (next: DevicesQuery): DevicesQuery => {
      const search = cleanSearch(searchDraft)
      if (search === query.search) return next
      setSearchDraft(search)
      return { ...next, search, pageIndex: 0 }
    },
    [query.search, searchDraft],
  )

  // D-112: every filter reloads on change; legacy held location and battery for a Search button.
  const setFilters = useCallback(
    (filters: DeviceFilters) => apply(withTypedSearch({ ...query, filters, pageIndex: 0 })),
    [apply, query, withTypedSearch],
  )
  const clearAll = useCallback(() => {
    setSearchDraft('')
    apply({ ...query, search: '', filters: EMPTY_FILTERS, pageIndex: 0 })
  }, [apply, query])

  const sortBy = useCallback(
    (column: DevicesSortColumn) => apply(withTypedSearch(nextSort(query, column))),
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

  // swgrid.js:453-456: after a delete, page and search reset and the grid reloads with the same filters.
  const afterDelete = useCallback(() => {
    setSearchDraft('')
    apply({ ...query, pageIndex: 0, search: '' })
  }, [apply, query])

  const selectedItems = useMemo(
    () => (read.data ? read.data.items.filter(item => selected.has(item.id)) : []),
    [read.data, selected],
  )

  return {
    query,
    read,
    shownPage,
    searchDraft,
    setSearchDraft,
    selected,
    selectedItems,
    submitSearch,
    clearSearch,
    setFilters,
    clearAll,
    sortBy,
    setPage,
    setPageSize,
    toggle,
    togglePage,
    clearSelection,
    afterDelete,
  }
}

export type DevicesList = ReturnType<typeof useDevicesList>
