import { formatShortDate } from '@/shared/i18n/culture'
import type { EngagementModelGridItem, EngagementModelSort, ReCalculateBody } from '@/types/engagement'

export const MODEL_PAGE_SIZES = [10, 20, 30, 50, 100] as const
export const MODEL_PAGE_SIZE = 100
export const INITIAL_MODEL_SORT: EngagementModelSort = { column: 'modelName', dir: 'asc' }

export function parseModels(raw: unknown): EngagementModelGridItem[] {
  const items = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).items : null
  if (!Array.isArray(items)) return []
  return items.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    if (typeof record.id !== 'number') return []
    return [
      {
        id: record.id,
        modelName: typeof record.modelName === 'string' ? record.modelName : null,
        isActive: record.isActive === true,
        lastRun: typeof record.lastRun === 'string' ? record.lastRun : null,
      },
    ]
  })
}

// swgrid.js:139-151 compares with plain < and >, so ordering stays ordinal and case-sensitive, not locale-aware.
const compareText = (a: string | null, b: string | null) => {
  const left = a ?? ''
  const right = b ?? ''
  return left < right ? -1 : left > right ? 1 : 0
}

export function sortModels(
  rows: readonly EngagementModelGridItem[],
  sort: EngagementModelSort,
): EngagementModelGridItem[] {
  const factor = sort.dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) =>
    sort.column === 'isActive'
      ? (Number(a.isActive) - Number(b.isActive)) * factor
      : compareText(a.modelName, b.modelName) * factor,
  )
}

export function nextModelSort(
  current: EngagementModelSort,
  column: EngagementModelSort['column'],
): EngagementModelSort {
  return current.column === column
    ? { column, dir: current.dir === 'asc' ? 'desc' : 'asc' }
    : { column, dir: 'asc' }
}

const pad = (value: number) => String(value).padStart(2, '0')

// The pickers used globalDateFormat (_Layout.cshtml:214) and EngagementApiController.cs:388-392 parses the
// value back with CultureInfo.CurrentUICulture, so this has to follow the user, not a fixed dd/MM/yyyy.
// ReCalculate is a write, so a mis-parsed range would recompute the wrong period.
export function formatDate(date: Date): string {
  return formatShortDate(date)
}

// Legacy shows globalDateFormat + ' hh:mm:ss' (seats-admin-engagement.html:278-280); React uses a 24-hour clock.
export function formatLastRun(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export type AddModelForm = { modelName: string; copy: boolean; modelIdToClone: number | null }

// seats-admin-engagement-crud.html:119-127, 190-193.
export function canSaveModel(form: AddModelForm): boolean {
  return !form.copy || form.modelIdToClone !== null
}

export function toCreateQuery(form: AddModelForm): Record<string, string> {
  return {
    modelName: form.modelName,
    modelIdToClone: form.copy && form.modelIdToClone !== null ? String(form.modelIdToClone) : '',
  }
}

// seats-admin-engagement.html:336-370: "Selected" sends every ticked id, the other option only active ones.
export function toRecalculateBody(
  selected: readonly EngagementModelGridItem[],
  selectAll: boolean,
  reSyncStudents: boolean,
  start: Date,
  end: Date,
): ReCalculateBody {
  const ids = (selectAll ? selected : selected.filter(model => model.isActive)).map(model => model.id)
  return { reSyncStudents, selectAll, startDate: formatDate(start), endDate: formatDate(end), modelIds: ids }
}
