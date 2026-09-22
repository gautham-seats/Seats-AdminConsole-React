'use client'

import { ArrowUp, ArrowUpDown } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import type { ApiRead } from '@/shared/api'
import { DelayedLoading, ErrorState, useDelayedFlag } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { useRowWindow } from '@/shared/ui/use-row-window'
import type { ReportPageDto } from '@/types/devices'
import type { SortDirection } from '@/types/users'
import { DEVICES_FALLBACK_ONLY, type DevicesText } from '../index/devices-text'
import { HEAD_FILL, HEAD_ROUND } from '@/shared/ui/HeadBackdrop'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ScrollEdges } from '@/shared/ui/ScrollEdges'

export type ReportColumn<TItem, TSort extends string> = {
  sort: TSort
  label: string
  render: (item: TItem) => ReactNode
  numeric?: boolean
  wrap?: boolean
}

type ReportTableProps<TItem, TSort extends string> = {
  columns: readonly ReportColumn<TItem, TSort>[]
  read: ApiRead<ReportPageDto<TItem>>
  shownPage: ReportPageDto<TItem> | undefined
  sortCol: TSort
  sortDir: SortDirection
  onSort: (column: TSort) => void
  rowKey: (item: TItem, index: number) => string
  t: DevicesText
}

const HEAD = `sticky top-0 z-20 h-10 ${HEAD_FILL} px-3 text-left align-middle text-xs font-medium tracking-[0.02em] whitespace-nowrap text-white`
const CELL =
  'border-b border-border bg-white px-3 py-2 align-middle text-slate-700 transition-colors duration-150 group-hover:bg-slate-50'

// Read-only report grid: rows are not selectable or clickable (Index.cshtml:60 cursor default).
export function ReportTable<TItem, TSort extends string>({
  columns,
  read,
  shownPage,
  sortCol,
  sortDir,
  onSort,
  rowKey,
  t,
}: ReportTableProps<TItem, TSort>) {
  const items = shownPage?.items ?? []
  const reloading = read.status === 'loading' || read.status === 'idle'
  const showOverlay = useDelayedFlag(reloading && items.length > 0)
  const scroller = useRef<HTMLDivElement>(null)
  const win = useRowWindow(items.length, scroller)

  // Empty tables fill the box instead of scrolling; the box still scrolls so a state never clips at 320px.
  const scrollable = read.status !== 'error' && items.length > 0

  let body: ReactNode
  if (read.status === 'error') {
    body = (
      <StateRow span={columns.length}>
        <ErrorState
          variant="panel"
          message={t('AlertGeneralErrorDefault')}
          retryLabel={t('Refresh')}
          onRetry={read.reload}
          error={read.error}
          className="border-0"
        />
      </StateRow>
    )
  } else if (reloading && items.length === 0) {
    body = (
      <StateRow span={columns.length} className="h-80">
        <DelayedLoading surface="table" active label={t('Loading')} />
      </StateRow>
    )
  } else if (items.length === 0) {
    body = (
      <StateRow span={columns.length}>
        <EmptyState title={DEVICES_FALLBACK_ONLY.noItems} />
      </StateRow>
    )
  } else {
    body = items.slice(win.start, win.end).map((item, offset) => (
      <tr
        key={rowKey(item, win.start + offset)}
        aria-rowindex={win.start + offset + 2}
        style={{ animationDelay: `${Math.min(win.start + offset, 20) * 18}ms` }}
        className="group animate-row-in motion-reduce:animate-none"
      >
        {columns.map(column => (
          <td
            key={column.sort}
            className={cn(
              CELL,
              column.numeric && 'tabular-nums',
              column.wrap ? 'min-w-40 break-words' : 'whitespace-nowrap',
            )}
          >
            {column.render(item)}
          </td>
        ))}
      </tr>
    ))
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        onScroll={win.onScroll}
        className="@container min-h-0 flex-1 overflow-auto overscroll-contain scroll-pt-10"
      >
        <ScrollEdges />
        <table
          className={cn(
            'w-full border-separate border-spacing-0 text-sm',
            HEAD_ROUND,
            !scrollable && 'h-full',
          )}
          aria-busy={reloading}
          aria-rowcount={shownPage ? shownPage.totalRowCount + 1 : undefined}
        >
          <thead>
            <tr aria-rowindex={1}>
              {columns.map(column => {
                const active = sortCol === column.sort
                return (
                  <th
                    key={column.sort}
                    scope="col"
                    aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={HEAD}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(column.sort)}
                      className="-ml-1.5 inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1 font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    >
                      {column.label}
                      {active ? (
                        <ArrowUp
                          aria-hidden
                          className={cn(
                            'size-3.5 transition-transform duration-300 ease-premium',
                            sortDir === 'desc' && 'rotate-180',
                          )}
                        />
                      ) : (
                        <ArrowUpDown aria-hidden className="size-3.5 opacity-50" />
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

function StateRow({ span, className, children }: { span: number; className?: string; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={span} className={cn('h-full p-0', className)}>
        {children}
      </td>
    </tr>
  )
}
