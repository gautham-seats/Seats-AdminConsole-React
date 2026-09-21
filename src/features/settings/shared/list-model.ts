export type SortDirection = 'asc' | 'desc'

export const PAGE_SIZES = [10, 15, 20, 50, 100, 200] as const
export const DEFAULT_PAGE_SIZE = 100
// swgrid.js:825-855 shows the pager only from 10 rows.
export const PAGER_MIN_ROWS = 10

// swgrid.js:369-412: case-insensitive substring over every field except id that is not boolean, object or null.
export function matchesSearch(row: object, search: string): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) return true
  return Object.entries(row).some(([key, value]) => {
    if (key === 'id' || value === null || typeof value === 'boolean' || typeof value === 'object')
      return false
    return String(value).toLowerCase().includes(needle)
  })
}

function compareValues(a: unknown, b: unknown): number {
  const left = a ?? ''
  const right = b ?? ''
  if (typeof left === 'number' && typeof right === 'number') return left - right
  const x = String(left)
  const y = String(right)
  return x < y ? -1 : x > y ? 1 : 0
}

// Same ordering as swgrid.js:335-361 (plain < and >, case-sensitive) but stable for equal values.
export function sortRows<T extends object>(
  rows: readonly T[],
  column: keyof T,
  direction: SortDirection,
): T[] {
  const factor = direction === 'asc' ? 1 : -1
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => compareValues(a.row[column], b.row[column]) * factor || a.index - b.index)
    .map(entry => entry.row)
}

export function pageRows<T>(rows: readonly T[], pageIndex: number, pageSize: number): T[] {
  return rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize)
}

export function nextSortState<K extends string>(
  current: { column: K; direction: SortDirection },
  column: K,
): { column: K; direction: SortDirection } {
  if (current.column !== column) return { column, direction: 'asc' }
  return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
}
