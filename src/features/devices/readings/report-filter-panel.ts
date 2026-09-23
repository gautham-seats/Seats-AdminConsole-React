import type { FilterPanelLabels, FilterView, FilterViewTone } from '@/shared/ui'
import { DEVICES_FALLBACK_ONLY, type DevicesText } from '../index/devices-text'
import { READINGS_VIEWS, type ReadingsView } from './readings-query'

const VIEW_TONES: Record<ReadingsView, FilterViewTone> = {
  today: 'blue',
  yesterday: 'sky',
  last7: 'emerald',
  last30: 'amber',
}

export function reportPanelLabels(t: DevicesText): FilterPanelLabels {
  return {
    title: t('Filters'),
    views: DEVICES_FALLBACK_ONLY.views,
    reset: DEVICES_FALLBACK_ONLY.reset,
    expand: DEVICES_FALLBACK_ONLY.expand,
    collapse: t('Collapse'),
    activeFilters: DEVICES_FALLBACK_ONLY.activeFilters,
    remove: label => `${DEVICES_FALLBACK_ONLY.remove} ${label}`,
  }
}

// The applied view shows the row count; the others show none so no extra requests are made.
export function reportViews(
  t: DevicesText,
  appliedView: ReadingsView | null,
  total: number | undefined,
): FilterView[] {
  const labels: Record<ReadingsView, string> = {
    today: t('Today'),
    yesterday: DEVICES_FALLBACK_ONLY.yesterday,
    last7: t('Last7Days'),
    last30: t('Last30Days'),
  }
  return READINGS_VIEWS.map(view => ({
    id: view,
    label: labels[view],
    tone: VIEW_TONES[view],
    count: view === appliedView && total !== undefined ? total : null,
  }))
}

export function rangeChipValue(range: {
  dateFilter: string
  endDate: string
  time?: string
  endTime?: string
}): string {
  const dates = `${range.dateFilter} → ${range.endDate}`
  if (range.time === undefined) return dates
  // Saying "All day" twice reads badly, so an unbounded range says it once after the dates.
  if (!range.time && !range.endTime) return `${dates} · ${DEVICES_FALLBACK_ONLY.allDay}`
  const allDay = DEVICES_FALLBACK_ONLY.allDay
  return `${range.dateFilter} ${range.time || allDay} → ${range.endDate} ${range.endTime || allDay}`
}
