import type { SortDirection } from '@/types/users'

export type SortValue = string | number | null | undefined

export type ListSort<K extends string> = { col: K; dir: SortDirection }

// swgrid.js:344-350: the same column flips direction, a new column starts ascending.
export function nextListSort<K extends string>(sort: ListSort<K>, col: K): ListSort<K> {
  return { col, dir: sort.col === col && sort.dir === 'asc' ? 'desc' : 'asc' }
}

// swgrid.js:120-135 keeps rows where any searched field contains the text, ignoring case.
export function searchItems<T>(items: readonly T[], search: string, fields: readonly (keyof T)[]): T[] {
  const needle = search.toLowerCase()
  if (!needle) return [...items]
  return items.filter(item =>
    fields.some(field => {
      const value = item[field]
      return value !== null && value !== undefined && String(value).toLowerCase().includes(needle)
    }),
  )
}

// swgrid.js:139-150 compares raw values with < and >, treating null as empty text.
export function legacyCompare(left: SortValue, right: SortValue): number {
  const a = left ?? ''
  const b = right ?? ''
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const x = String(a)
  const y = String(b)
  return x > y ? 1 : x < y ? -1 : 0
}

export function sortItems<T, K extends string>(
  items: readonly T[],
  sort: ListSort<K>,
  valueOf: (item: T, col: K) => SortValue,
): T[] {
  const sign = sort.dir === 'desc' ? -1 : 1
  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        sign * legacyCompare(valueOf(a.item, sort.col), valueOf(b.item, sort.col)) || a.index - b.index,
    )
    .map(entry => entry.item)
}

export function pageItems<T>(items: readonly T[], pageIndex: number, pageSize: number): T[] {
  const start = pageIndex * pageSize
  return items.slice(start, start + pageSize)
}

// swgrid.js:421-432 repeats the ids parameter for every selected row.
export function deleteIdsPath(controller: string, ids: readonly number[]): string {
  return `${controller}?${ids.map(id => `ids=${encodeURIComponent(String(id))}`).join('&')}`
}
