'use client'

import Link from 'next/link'
import { ArrowUp, ArrowUpDown, FilterX } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { DEVICES_ROUTE } from '@/shared/shell/admin-menu'
import { Button, Checkbox, DelayedLoading, ErrorState, useDelayedFlag, type CheckboxState } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { useRowWindow } from '@/shared/ui/use-row-window'
import type { DeviceListItemDto, DevicesSortColumn } from '@/types/devices'
import { batteryLevel, type BatteryLevel } from './device-query'
import { DEVICES_FALLBACK_ONLY, type DevicesText, type DevicesTextKey } from './devices-text'
import type { DevicesList } from './use-devices-list'
import { HEAD_FILL, HEAD_ROUND } from '@/shared/ui/HeadBackdrop'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ScrollEdges, useScrollEdges } from '@/shared/ui/ScrollEdges'

type Column = {
  key: DevicesSortColumn
  label: DevicesTextKey
  value?: (item: DeviceListItemDto) => string | null
  wrap?: boolean
}

// Views/Device/Index.cshtml:115-127 order; Battery % only with Device.BatteryPercent.Enabled.
const COLUMNS: readonly Column[] = [
  { key: 'description', label: 'Description', value: item => item.description },
  { key: 'isActive', label: 'InService' },
  { key: 'serialNumber', label: 'SerialNumber', value: item => item.serialNumber },
  { key: 'mac', label: 'MacAddress', value: item => item.macAddress },
  { key: 'ip', label: 'IPAddress', value: item => item.ipAddress },
  { key: 'lastHeartBeat', label: 'LastHeartBeat', value: item => item.displayLastHeartBeat },
  { key: 'lastReadDate', label: 'LastReadDate', value: item => item.displayLastReadDate },
  { key: 'room', label: 'Room', value: item => item.roomNames, wrap: true },
  { key: 'assetTag', label: 'AssetTag', value: item => item.assetTag },
  { key: 'building', label: 'Building', value: item => item.buildingNames, wrap: true },
  { key: 'batteryPercent', label: 'BatteryPercent' },
]

const CHECK_WIDTH = 44
// Index.cshtml:154-156 shows a dash when a device reports no battery value.
const NO_BATTERY = '-'

// Index.cshtml:199-205 deviceBatteryColor, via tokens that keep the label readable.
const LEVEL_COLOR: Record<BatteryLevel, string> = {
  good: 'var(--color-battery-good)',
  medium: 'var(--color-battery-medium)',
  low: 'var(--color-battery-low)',
}

const LEVEL_WORD: Record<BatteryLevel, string> = {
  good: DEVICES_FALLBACK_ONLY.batteryGood,
  medium: DEVICES_FALLBACK_ONLY.batteryMedium,
  low: DEVICES_FALLBACK_ONLY.batteryLow,
}

// Index.cshtml:211 row click and :74-77 Add open the device details screen.
export const deviceDetailsHref = (id: number) => `${DEVICES_ROUTE}/${id}`
export const NEW_DEVICE_HREF = `${DEVICES_ROUTE}/new`

type DevicesTableProps = {
  list: DevicesList
  batteryEnabled: boolean
  setupStatus: 'loading' | 'error' | 'success'
  onSetupRetry: () => void
  selectable: boolean
  hasFilters: boolean
  t: DevicesText
}

export function DevicesTable({
  list,
  batteryEnabled,
  setupStatus,
  onSetupRetry,
  selectable,
  hasFilters,
  t,
}: DevicesTableProps) {
  const { read, query, selected } = list
  const columns = COLUMNS.filter(column => column.key !== 'batteryPercent' || batteryEnabled)
  const page = list.shownPage
  const items = page?.items ?? []
  const reloading = read.status === 'loading' || read.status === 'idle'
  const showOverlay = useDelayedFlag(reloading && items.length > 0)
  const onPage = items.filter(item => selected.has(item.id)).length
  const pageState: CheckboxState = onPage === 0 ? false : onPage === items.length ? true : 'mixed'
  const span = columns.length + (selectable ? 1 : 0)
  // Auto table layout can make the checkbox column wider than CHECK_WIDTH, so the second sticky column
  // follows its measured width; a fixed 44px left it a white strip to scroll through.
  const checkCell = useRef<HTMLTableCellElement>(null)
  const measured = useStickyOffset(checkCell)
  const stickyLeft = selectable ? measured : 0
  const scroller = useRef<HTMLDivElement>(null)
  const win = useRowWindow(items.length, scroller)
  // Side shading comes from shared ScrollEdges; the sticky head and column shade from the same state.
  const edges = useScrollEdges(scroller)

  // Empty tables fill the box instead of scrolling; the box still scrolls so a state never clips at 320px.
  const scrollable = setupStatus === 'success' && read.status === 'success' && items.length > 0

  let body
  if (setupStatus === 'error' || read.status === 'error') {
    body = (
      <StateRow span={span}>
        <ErrorState
          variant="panel"
          message={t('AlertGeneralErrorDefault')}
          retryLabel={t('Refresh')}
          onRetry={setupStatus === 'error' ? onSetupRetry : read.reload}
          error={setupStatus === 'error' ? null : read.error}
        />
      </StateRow>
    )
  } else if (setupStatus === 'loading' || (reloading && items.length === 0)) {
    body = (
      <StateRow span={span} className="h-80">
        <DelayedLoading surface="table" active label={t('Loading')} />
      </StateRow>
    )
  } else if (items.length === 0) {
    body = (
      <StateRow span={span}>
        <EmptyState
          surface="table"
          title={DEVICES_FALLBACK_ONLY.noItems}
          action={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={list.clearAll}>
                <FilterX aria-hidden className="size-4" />
                {DEVICES_FALLBACK_ONLY.clearFilters}
              </Button>
            ) : null
          }
        />
      </StateRow>
    )
  } else {
    body = items
      .slice(win.start, win.end)
      .map((item, offset) => (
        <DeviceRow
          key={item.id}
          item={item}
          index={win.start + offset}
          columns={columns}
          selectable={selectable}
          stickyLeft={stickyLeft}
          shadowLeft={edges.left}
          checked={selected.has(item.id)}
          onToggle={() => list.toggle(item.id)}
          t={t}
        />
      ))
  }

  const ready = setupStatus === 'success' && read.status === 'success' && items.length > 0

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        // Scroll padding keeps a focused cell clear of the sticky head and the sticky left columns.
        className={cn(
          '@container min-h-0 flex-1 overflow-auto overscroll-contain scroll-pt-10',
          selectable ? 'scroll-pl-52' : 'scroll-pl-40',
        )}
        onScroll={win.onScroll}
      >
        <ScrollEdges />
        <table
          className={cn(
            'w-full border-separate border-spacing-0 text-sm',
            HEAD_ROUND,
            !scrollable && 'h-full',
          )}
          aria-busy={reloading || setupStatus === 'loading'}
          aria-rowcount={page ? page.totalRowCount + 1 : undefined}
        >
          <thead>
            <tr aria-rowindex={1}>
              {selectable ? (
                <th
                  ref={checkCell}
                  scope="col"
                  style={CHECK_STYLE}
                  className={cn(HEAD, 'left-0 z-30 pl-4', edges.top && HEAD_SHADOW)}
                >
                  {ready ? (
                    <Checkbox
                      checked={pageState}
                      onCheckedChange={list.togglePage}
                      label={t('SelectAll')}
                      className="border-white bg-transparent aria-checked:bg-white aria-checked:text-brand"
                    />
                  ) : null}
                </th>
              ) : null}
              {columns.map((column, index) => {
                const active = query.sortCol === column.key
                const first = index === 0
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (query.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    style={first ? { left: stickyLeft } : undefined}
                    className={cn(
                      HEAD,
                      first && 'z-30',
                      first && !selectable && 'pl-4',
                      edges.top && HEAD_SHADOW,
                      first && edges.left && 'shadow-[8px_0_10px_-8px_rgba(15,23,42,.45)]',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => list.sortBy(column.key)}
                      className="-ml-1.5 inline-flex max-w-full items-center gap-1.5 rounded-sm px-1.5 py-1 font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    >
                      <span>{t(column.label)}</span>
                      {active ? (
                        <ArrowUp
                          aria-hidden
                          className={cn(
                            'size-3 shrink-0 transition-transform duration-300 ease-premium',
                            query.sortDir === 'desc' && 'rotate-180',
                          )}
                        />
                      ) : (
                        <ArrowUpDown aria-hidden className="size-3 shrink-0 opacity-50" />
                      )}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className={cn('transition-opacity duration-200', showOverlay && 'opacity-50')}>
            {win.padTop > 0 ? <tr data-row-spacer aria-hidden style={{ height: win.padTop }} /> : null}
            {body}
            {win.padBottom > 0 ? <tr data-row-spacer aria-hidden style={{ height: win.padBottom }} /> : null}
          </tbody>
        </table>
      </div>
      {showOverlay ? (
        <div className="pointer-events-none absolute inset-x-0 top-10 bottom-0 grid place-items-center">
          <DelayedLoading
            active
            label={t('Loading')}
            className="rounded-2xl border border-border bg-white/95 px-8 py-5 shadow-popover"
          />
        </div>
      ) : null}
    </div>
  )
}

const HEAD = `sticky top-0 z-20 h-10 ${HEAD_FILL} px-2 text-left align-middle text-xs font-medium tracking-[0.02em] whitespace-nowrap text-white transition-shadow duration-300`
const HEAD_SHADOW = 'shadow-press'
const CELL = 'border-b border-border bg-white px-2 py-1.5 align-middle transition-colors duration-150'
const CHECK_STYLE = { width: CHECK_WIDTH, minWidth: CHECK_WIDTH }

// The measured width of the checkbox column. Reading it cannot change it, so there is no resize loop.
function useStickyOffset(cell: RefObject<HTMLTableCellElement | null>): number {
  const [width, setWidth] = useState(CHECK_WIDTH)
  useEffect(() => {
    const node = cell.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const measure = () =>
      setWidth(current => {
        const next = node.getBoundingClientRect().width
        return Math.abs(current - next) < 0.5 ? current : next
      })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [cell])
  return width
}

function StateRow({ span, className, children }: { span: number; className?: string; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={span} className={cn('h-full p-0', className)}>
        <div className="sticky left-0 w-full max-w-[min(100%,72rem)]">{children}</div>
      </td>
    </tr>
  )
}

type DeviceRowProps = {
  item: DeviceListItemDto
  index: number
  columns: readonly Column[]
  selectable: boolean
  stickyLeft: number
  shadowLeft: boolean
  checked: boolean
  onToggle: () => void
  t: DevicesText
}

function DeviceRow({
  item,
  index,
  columns,
  selectable,
  stickyLeft,
  shadowLeft,
  checked,
  onToggle,
  t,
}: DeviceRowProps) {
  const href = deviceDetailsHref(item.id)
  const name = item.description || String(item.id)
  const rowTint = checked ? 'bg-sky-50 group-hover:bg-sky-100/80' : 'group-hover:bg-slate-50'
  // Tab order is visual: the row itself is not focusable; its checkbox then its description link are the stops.
  return (
    <tr
      aria-rowindex={index + 2}
      style={{ animationDelay: `${Math.min(index, 20) * 18}ms` }}
      className="group animate-row-in motion-reduce:animate-none"
    >
      {selectable ? (
        <td style={CHECK_STYLE} className={cn(CELL, rowTint, 'sticky left-0 z-10 pl-4')}>
          <Checkbox
            checked={checked}
            onCheckedChange={onToggle}
            label={`${DEVICES_FALLBACK_ONLY.select} ${name}`}
          />
        </td>
      ) : null}
      {columns.map((column, columnIndex) => {
        const first = columnIndex === 0
        return (
          <td
            key={column.key}
            style={first ? { left: stickyLeft } : undefined}
            className={cn(
              CELL,
              rowTint,
              column.wrap ? 'min-w-40 break-words' : 'whitespace-nowrap',
              // Width 1px makes the sticky column hug its text, so spare width goes to the other columns.
              first && 'w-px',
              first &&
                'sticky z-10 shadow-[inset_3px_0_0_transparent] group-hover:shadow-[inset_3px_0_0_var(--color-brand)]',
              first && !selectable && 'pl-4',
              first && shadowLeft && 'shadow-[8px_0_10px_-8px_rgba(15,23,42,.45)]',
            )}
          >
            <Cell column={column} item={item} href={href} t={t} />
          </td>
        )
      })}
    </tr>
  )
}

function Cell({
  column,
  item,
  href,
  t,
}: {
  column: Column
  item: DeviceListItemDto
  href: string
  t: DevicesText
}) {
  if (column.key === 'isActive') {
    return <span className="text-slate-700">{item.isActive ? t('Yes') : t('No')}</span>
  }
  if (column.key === 'batteryPercent') {
    const percent = item.batteryPercent
    if (percent === null) return <span className="text-muted-foreground">{NO_BATTERY}</span>
    const level = batteryLevel(percent)
    const percentText = `${percent}%`
    // Index.cshtml:7-48 battery shape: 52x20 outline, end cap, fill and centred text.
    return (
      <span
        title={percentText}
        className="relative mr-2 inline-block h-5 w-[52px] rounded-[3px] border-2 border-battery-shell bg-battery-track align-middle after:absolute after:top-1 after:-right-1.5 after:h-2 after:w-1 after:rounded-r-[2px] after:bg-battery-shell after:content-['']"
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 rounded-[1px] transition-[width] duration-500 ease-premium"
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%`, backgroundColor: LEVEL_COLOR[level] }}
        />
        <span className="absolute inset-0 text-center text-[10px] leading-4 font-bold text-battery-label tabular-nums">
          {percentText}
        </span>
        <span className="sr-only">{LEVEL_WORD[level]}</span>
      </span>
    )
  }
  const value = column.value?.(item) ?? ''
  if (column.key === 'description') {
    return (
      <Link
        href={href}
        // An empty description would leave this link with no accessible name.
        aria-label={value ? undefined : `${t('Device')} ${item.id}`}
        title={value.length > 30 ? value : undefined}
        className="block max-w-64 truncate rounded-sm text-foreground underline-offset-4 outline-none group-hover:text-brand hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {value}
      </Link>
    )
  }
  return <span className="text-slate-700">{value}</span>
}
