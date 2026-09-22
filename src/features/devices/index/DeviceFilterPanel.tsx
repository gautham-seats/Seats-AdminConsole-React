'use client'

import { Building2, DoorOpen, MapPin, type LucideIcon } from 'lucide-react'
import type { ReadStatus } from '@/shared/api'
import {
  Button,
  FilterPanel,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  type FilterChip,
  type FilterView,
} from '@/shared/ui'
import { BatteryRangeField } from './BatteryRangeField'
import {
  activeFilterKeys,
  clearFilter,
  EMPTY_FILTERS,
  sameFilters,
  selectBuilding,
  selectRoom,
  selectSite,
  type DeviceFilters,
  type FilterKey,
  type LocationOptions,
} from './device-filters'
import { DEVICES_FALLBACK_ONLY, type DevicesText } from './devices-text'

const ALL = 'all'

// Quick views only fill the legacy filters; there is no threshold here that legacy does not have.
const VIEWS = {
  all: { filters: EMPTY_FILTERS, tone: 'blue' },
  inactive: { filters: { ...EMPTY_FILTERS, includeInactive: true }, tone: 'amber' },
} as const

type ViewId = keyof typeof VIEWS

type DeviceFilterPanelProps = {
  filters: DeviceFilters
  search: string
  onChange: (filters: DeviceFilters) => void
  onClearSearch: () => void
  locations: { status: ReadStatus; data: LocationOptions | undefined; reload: () => void }
  batteryEnabled: boolean
  total: number | undefined
  t: DevicesText
}

const nameOf = (
  list: readonly { id: number; description: string | null }[] | undefined,
  id: number | null,
) => (id === null ? '' : (list?.find(item => item.id === id)?.description ?? String(id)))

export function DeviceFilterPanel({
  filters,
  search,
  onChange,
  onClearSearch,
  locations,
  batteryEnabled,
  total,
  t,
}: DeviceFilterPanelProps) {
  const options = locations.data
  const viewIds = Object.keys(VIEWS) as ViewId[]
  const activeView = viewIds.find(id => sameFilters(VIEWS[id].filters, filters)) ?? null
  const viewLabels: Record<ViewId, string> = {
    all: t('All'),
    inactive: t('IncludeInactiveDevices'),
  }
  const views: FilterView[] = viewIds.map(id => ({
    id,
    label: viewLabels[id],
    tone: VIEWS[id].tone,
    count: id === activeView ? (total ?? null) : null,
  }))

  const chipText = (key: FilterKey): { label: string; value: string } => {
    switch (key) {
      case 'inactive':
        return { label: t('IncludeInactiveDevices'), value: t('Yes') }
      case 'site':
        return { label: t('Site'), value: nameOf(options?.sites, filters.siteId) }
      case 'building':
        return { label: t('Building'), value: nameOf(options?.buildings, filters.buildingId) }
      case 'room':
        return { label: t('Room'), value: nameOf(options?.rooms, filters.roomId) }
      case 'battery':
        return { label: t('BatteryPercent'), value: `${filters.battery.min}–${filters.battery.max}` }
    }
  }
  const chips: FilterChip[] = [
    ...(search ? [{ id: 'search', label: t('Search'), value: search, onRemove: onClearSearch }] : []),
    ...activeFilterKeys(filters)
      .filter(key => key !== 'battery' || batteryEnabled)
      .map(key => ({ id: key, ...chipText(key), onRemove: () => onChange(clearFilter(filters, key)) })),
  ]

  // The server already scopes these to the chosen site and building, so no client-side narrowing.
  const buildings = options?.buildings ?? []
  const rooms = options?.rooms ?? []
  const disabled = locations.status !== 'success' || !options

  // Tab order is visual: views, then Site, Building, Room, Battery and the out-of-service switch.
  return (
    <FilterPanel
      labels={{
        title: t('Filters'),
        views: DEVICES_FALLBACK_ONLY.views,
        reset: DEVICES_FALLBACK_ONLY.reset,
        expand: DEVICES_FALLBACK_ONLY.expand,
        collapse: t('Collapse'),
        activeFilters: DEVICES_FALLBACK_ONLY.activeFilters,
        remove: label => `${DEVICES_FALLBACK_ONLY.remove} ${label}`,
      }}
      views={views}
      activeView={activeView}
      onViewChange={id => onChange(VIEWS[id as ViewId].filters)}
      chips={chips}
      canReset={!sameFilters(filters, EMPTY_FILTERS)}
      onReset={() => onChange(EMPTY_FILTERS)}
      gridClassName={
        batteryEnabled
          ? '@[40rem]:grid-cols-3 @[72rem]:grid-cols-[repeat(3,minmax(0,1fr))_minmax(14rem,18rem)_auto]'
          : '@[40rem]:grid-cols-3 @[72rem]:grid-cols-[repeat(3,minmax(0,1fr))_auto]'
      }
    >
      <LocationSelect
        id="devices-site"
        label={t('Site')}
        icon={MapPin}
        value={filters.siteId}
        items={options?.sites ?? []}
        allLabel={`[${t('All')}]`}
        disabled={disabled}
        onChange={id => onChange(selectSite(filters, id))}
      />
      <LocationSelect
        id="devices-building"
        label={t('Building')}
        icon={Building2}
        value={filters.buildingId}
        items={buildings}
        allLabel={`[${t('All')}]`}
        disabled={disabled}
        onChange={id => options && onChange(selectBuilding(filters, id, options))}
      />
      <LocationSelect
        id="devices-room"
        label={t('Room')}
        icon={DoorOpen}
        value={filters.roomId}
        items={rooms}
        allLabel={`[${t('All')}]`}
        disabled={disabled}
        onChange={id => options && onChange(selectRoom(filters, id, options))}
      />
      {batteryEnabled ? (
        <BatteryRangeField
          id="devices-battery"
          range={filters.battery}
          onChange={battery => onChange({ ...filters, battery })}
          labels={{
            title: t('BatteryPercent'),
            from: `${t('BatteryPercent')} (${t('From')})`,
            to: `${t('BatteryPercent')} (${t('To')})`,
            adjusted: DEVICES_FALLBACK_ONLY.batteryAdjusted,
          }}
        />
      ) : null}
      <div className="flex min-w-0 items-center">
        <label
          htmlFor="devices-include-inactive"
          className="flex h-10 cursor-pointer items-center gap-3 text-sm text-foreground"
        >
          <Switch
            id="devices-include-inactive"
            checked={filters.includeInactive}
            onCheckedChange={includeInactive => onChange({ ...filters, includeInactive })}
            label={t('IncludeInactiveDevices')}
          />
          {t('IncludeInactiveDevices')}
        </label>
      </div>
      {locations.status === 'error' ? (
        <div
          role="alert"
          className="col-span-full flex items-center gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          {DEVICES_FALLBACK_ONLY.locationsError}
          <Button variant="outline" size="sm" className="h-7 bg-white" onClick={locations.reload}>
            {t('Refresh')}
          </Button>
        </div>
      ) : null}
    </FilterPanel>
  )
}

type LocationSelectProps = {
  id: string
  label: string
  icon: LucideIcon
  value: number | null
  items: readonly { id: number; description: string | null }[]
  allLabel: string
  disabled: boolean
  onChange: (id: number | null) => void
}

function LocationSelect({
  id,
  label,
  icon: Icon,
  value,
  items,
  allLabel,
  disabled,
  onChange,
}: LocationSelectProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <Select
        value={value === null ? ALL : String(value)}
        onValueChange={next => onChange(next === ALL ? null : Number(next))}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="group/loc h-10 bg-white">
          <span className="flex min-w-0 items-center gap-2">
            <Icon
              aria-hidden
              className="size-4 shrink-0 text-slate-500 transition-[color,transform] duration-300 ease-premium group-hover/loc:scale-110 group-hover/loc:text-brand"
            />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {items.map(item => (
            <SelectItem key={item.id} value={String(item.id)}>
              {item.description ?? String(item.id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
