'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUp, ArrowUpDown } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { ROOMS_ROUTE } from '@/shared/shell/admin-menu'
import { Checkbox, DelayedLoading, ErrorState, useDelayedFlag, type CheckboxState } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { useRowWindow } from '@/shared/ui/use-row-window'
import type { RoomListItemDto, RoomsSortColumn } from '@/types/devices'
import { DEVICES_FALLBACK_ONLY, type DevicesText, type DevicesTextKey } from '../index/devices-text'
import type { RoomsList } from './use-rooms-list'
import { HEAD_CELL, HEAD_ROUND } from '@/shared/ui/HeadBackdrop'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ScrollEdges } from '@/shared/ui/ScrollEdges'

type Column = {
  key: string
  label: DevicesTextKey
  sort?: RoomsSortColumn
  value: (room: RoomListItemDto) => ReactNode
}

// Views/Room/Index.cshtml:47-58.
const COLUMNS: readonly Column[] = [
  { key: 'externalCode', label: 'RoomCode', sort: 'externalCode', value: room => room.externalCode },
  { key: 'name', label: 'RoomName', sort: 'name', value: room => room.name },
  { key: 'capacity', label: 'RoomCapacity', sort: 'capacity', value: room => room.capacity },
  { key: 'buildingName', label: 'Building', value: room => room.buildingName },
]

// swgrid.js:252-264 row click and Room/Index.cshtml:30 Add open the room details screen.
export const roomDetailsHref = (id: number) => `${ROOMS_ROUTE}/${id}`
export const NEW_ROOM_HREF = `${ROOMS_ROUTE}/new`

const HEAD = cn(HEAD_CELL, 'z-20')
const CELL =
  'border-b border-border bg-white px-3 py-2 align-middle text-slate-700 transition-colors duration-150'

type RoomsTableProps = { list: RoomsList; selectable: boolean; t: DevicesText }

export function RoomsTable({ list, selectable, t }: RoomsTableProps) {
  const router = useRouter()
  const { read, query, selected } = list
  const page = list.shownPage
  const items = page?.items ?? []
  const reloading = read.status === 'loading' || read.status === 'idle'
  const showOverlay = useDelayedFlag(reloading && items.length > 0)
  const onPage = items.filter(item => selected.has(item.id)).length
  const pageState: CheckboxState = onPage === 0 ? false : onPage === items.length ? true : 'mixed'
  const span = COLUMNS.length + (selectable ? 1 : 0)
  const scroller = useRef<HTMLDivElement>(null)
  const win = useRowWindow(items.length, scroller)

  let body: ReactNode
  // Empty tables fill the box instead of scrolling; the box still scrolls so a state never clips at 320px.
  const scrollable = read.status !== 'error' && items.length > 0

  if (read.status === 'error') {
    body = (
      <StateRow span={span}>
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
      <StateRow span={span} className="h-80">
        <DelayedLoading surface="table" active label={t('Loading')} />
      </StateRow>
    )
  } else if (items.length === 0) {
    body = (
      <StateRow span={span}>
        <EmptyState title={DEVICES_FALLBACK_ONLY.noItems} surface="table" />
      </StateRow>
    )
  } else {
    body = items.slice(win.start, win.end).map((room, offset) => {
      const index = win.start + offset
      const checked = selected.has(room.id)
      const href = roomDetailsHref(room.id)
      const tint = checked ? 'bg-sky-50 group-hover:bg-sky-100/80' : 'group-hover:bg-slate-50'
      const name = room.name || room.externalCode || String(room.id)
      return (
        <tr
          key={room.id}
          aria-rowindex={index + 2}
          onClick={() => {
            if (!reloading) router.push(href)
          }}
          style={{ animationDelay: `${Math.min(index, 20) * 18}ms` }}
          className="group animate-row-in cursor-pointer motion-reduce:animate-none"
        >
          {selectable ? (
            <td className={cn(CELL, tint, 'w-11 pl-4')}>
              <Checkbox
                checked={checked}
                onCheckedChange={() => list.toggle(room.id)}
                label={`${DEVICES_FALLBACK_ONLY.select} ${name}`}
              />
            </td>
          ) : null}
          {COLUMNS.map((column, columnIndex) => (
            <td key={column.key} className={cn(CELL, tint, column.key === 'capacity' && 'tabular-nums')}>
              {columnIndex === 0 ? (
                <Link
                  href={href}
                  // An empty room code would leave this link with no accessible name.
                  aria-label={room.externalCode ? undefined : name}
                  onClick={event => event.stopPropagation()}
                  className="rounded-sm text-foreground underline-offset-4 outline-none group-hover:text-brand hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {column.value(room)}
                </Link>
              ) : (
                column.value(room)
              )}
            </td>
          ))}
        </tr>
      )
    })
  }

  const ready = read.status === 'success' && items.length > 0

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
          aria-rowcount={page ? page.totalRowCount + 1 : undefined}
        >
          <thead>
            <tr aria-rowindex={1}>
              {selectable ? (
                <th scope="col" className={cn(HEAD, 'w-11 pl-4')}>
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
              {COLUMNS.map(column => {
                const active = column.sort !== undefined && query.sortCol === column.sort
                const { sort } = column
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active
                        ? query.sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : sort
                          ? 'none'
                          : undefined
                    }
                    className={HEAD}
                  >
                    {sort ? (
                      <button
                        type="button"
                        onClick={() => list.sortBy(sort)}
                        className="-ml-1.5 inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1 font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                      >
                        {t(column.label)}
                        {active ? (
                          <ArrowUp
                            aria-hidden
                            className={cn(
                              'size-3.5 transition-transform duration-300 ease-premium',
                              query.sortDir === 'desc' && 'rotate-180',
                            )}
                          />
                        ) : (
                          <ArrowUpDown aria-hidden className="size-3.5 opacity-50" />
                        )}
                      </button>
                    ) : (
                      t(column.label)
                    )}
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
