import type { SortDirection } from '../shared/list-model'

// seats-admin-resource.html:368-381 and seats-grid page sizes.
export const RESOURCE_PAGE_SIZES = [10, 20, 30, 50, 100, 200] as const
export const KEY_MAX_LENGTH = 50
export const SUGGEST_MIN_LENGTH = 2

export type ResourceSortColumn = 'value' | 'key' | 'type'

export type ResourcesQuery = {
  value: string
  type: string
  pageNumber: number
  pageSize: number
  sortCol: ResourceSortColumn | ''
  sortDir: SortDirection | ''
}

export const INITIAL_RESOURCES_QUERY: ResourcesQuery = {
  value: '',
  type: '',
  pageNumber: 0,
  pageSize: 100,
  sortCol: '',
  sortDir: '',
}

// All seven parameters are always sent; cultureName is empty (the server uses the current culture).
export function resourcesParams(query: ResourcesQuery) {
  return {
    value: query.value,
    cultureName: '',
    pageNumber: query.pageNumber,
    pageSize: query.pageSize,
    sortCol: query.sortCol,
    sortDir: query.sortDir,
    type: query.type,
  }
}

export function nextResourceSort(query: ResourcesQuery, column: ResourceSortColumn): ResourcesQuery {
  const direction: SortDirection = query.sortCol === column && query.sortDir === 'asc' ? 'desc' : 'asc'
  // seats-admin-resource.html:526-531: a new sort starts again on page 1.
  return { ...query, sortCol: column, sortDir: direction, pageNumber: 0 }
}

// Suggestions show each distinct text once (GetResourcesByString groups by key).
export function suggestionValues(items: readonly { value: string | null }[]): string[] {
  return [...new Set(items.map(item => item.value ?? '').filter(Boolean))]
}
