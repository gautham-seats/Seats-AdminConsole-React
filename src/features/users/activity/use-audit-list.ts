'use client'

import { useCallback, useState } from 'react'
import { useApiRead } from '@/shared/api'
import type { AuditItemDto, AuditSortColumn } from '@/types/audit'
import type { ListState } from '../list/list-state'
import { NO_SELECTION } from '../list/list-state'
import { fetchAuditPage } from './activity-api'
import {
  auditQueryKey,
  initialAuditQuery,
  type AuditQuery,
  type AuditUser,
  type DateRange,
} from './activity-log'

// seats-admin-audit.html:222-231: the Item and icon headers both sort by auditType.
export type AuditHeader = AuditSortColumn | 'icon'

type SortDir = AuditQuery['sortDir']
type HeaderSort = { header: AuditHeader; orders: Partial<Record<AuditHeader, SortDir>> }

const INITIAL_HEADER_SORT: HeaderSort = { header: 'accessDate', orders: {} }

// seats-grid-sortable-behaviour.html:10-30: each header remembers its own last order and starts ascending.
function nextHeaderSort(sort: HeaderSort, header: AuditHeader): HeaderSort {
  const dir: SortDir = sort.orders[header] === 'asc' ? 'desc' : 'asc'
  return { header, orders: { ...sort.orders, [header]: dir } }
}

const headerColumn = (header: AuditHeader): AuditSortColumn => (header === 'icon' ? 'auditType' : header)

export type AuditList = ListState<AuditItemDto, AuditHeader> & {
  query: AuditQuery
  setSite: (site: string) => void
  setType: (type: string) => void
  setUser: (user: AuditUser | null) => void
  setRange: (range: DateRange) => void
  clean: () => void
}

const noop = () => undefined

// seats-admin-audit.html filters: every change reloads from the first page (the component kept the old page, LB-050).
export function useAuditList(): AuditList {
  const [query, setQuery] = useState<AuditQuery>(() => initialAuditQuery(new Date()))
  const [headerSort, setHeaderSort] = useState<HeaderSort>(INITIAL_HEADER_SORT)
  const load = useCallback((signal: AbortSignal) => fetchAuditPage(query, signal), [query])
  const read = useApiRead(auditQueryKey(query), load)
  const { reload } = read

  const apply = useCallback(
    (next: AuditQuery) => {
      if (auditQueryKey(next) === auditQueryKey(query)) reload()
      else setQuery(next)
    },
    [query, reload],
  )

  const filter = useCallback(
    (patch: Partial<AuditQuery>) => apply({ ...query, ...patch, pageIndex: 0 }),
    [apply, query],
  )

  return {
    status: read.status,
    error: read.error,
    reload,
    rows: read.data?.items ?? [],
    total: read.status === 'success' && read.data ? read.data.totalRowCount : 0,
    sort: { col: headerSort.header, dir: query.sortDir },
    // seats-admin-audit.html:523-530: any sort returns to the first page.
    sortBy: header => {
      const next = nextHeaderSort(headerSort, header)
      setHeaderSort(next)
      apply({ ...query, sortCol: headerColumn(header), sortDir: next.orders[header] ?? 'asc', pageIndex: 0 })
    },
    draft: '',
    setDraft: noop,
    search: '',
    submitSearch: noop,
    clearSearch: noop,
    pageIndex: query.pageIndex,
    pageSize: query.pageSize,
    setPage: pageIndex => apply({ ...query, pageIndex }),
    setPageSize: pageSize => apply({ ...query, pageSize, pageIndex: 0 }),
    selected: NO_SELECTION,
    toggle: noop,
    togglePage: noop,
    clearSelection: noop,
    afterDelete: noop,
    query,
    setSite: site => filter({ site }),
    setType: type => filter({ type }),
    setUser: user => filter({ user }),
    setRange: range => filter({ range }),
    // seats-admin-audit.html:487-516 resets sort, filters, dates and page but keeps the page size and header orders.
    clean: () => {
      setHeaderSort(current => ({ ...current, header: 'accessDate' }))
      apply({ ...initialAuditQuery(new Date()), pageSize: query.pageSize })
    },
  }
}
