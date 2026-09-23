'use client'

import { ArrowUp, ArrowUpDown, X } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { ApiError, ReadStatus } from '@/shared/api'
import { Button, Checkbox, DelayedLoading, ErrorState, type CheckboxState } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import type { SortDirection } from './list-model'
import { HEAD_CELL, HEAD_ROUND } from '@/shared/ui/HeadBackdrop'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ScrollEdges } from '@/shared/ui/ScrollEdges'
import { useRowWindow } from '@/shared/ui/use-row-window'

export type TableColumn<T> = {
  key: string
  label: string
  sortable?: boolean
  className?: string
  render: (row: T) => ReactNode
}

type RowKey = number | string

type SettingsTableProps<T extends { id: RowKey }> = {
  rows: readonly T[]
  columns: readonly TableColumn<T>[]
  status: ReadStatus
  sort?: { column: string; direction: SortDirection }
  onSort?: (column: string) => void
  selectable: boolean
  selected: ReadonlySet<T['id']>
  onToggle: (id: T['id']) => void
  onTogglePage: () => void
  onOpen?: (row: T) => void
  onRetry: () => void
  error?: ApiError | null
  emptyText: string
  clearSearchLabel?: string
  onClearSearch?: () => void
  text: { loading: string; error: string; retry: string; selectAll: string; select: (row: T) => string }
}

const HEAD = HEAD_CELL

export function SettingsTable<T extends { id: RowKey }>({
  rows,
  columns,
  status,
  sort,
  onSort,
  selectable,
  selected,
  onToggle,
  onTogglePage,
  onOpen,
  onRetry,
  error,
  emptyText,
  clearSearchLabel,
  onClearSearch,
  text,
}: SettingsTableProps<T>) {
  const [scrolled, setScrolled] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const window = useRowWindow(rows.length, scroller)
  const onPage = rows.filter(row => selected.has(row.id)).length
  const pageState: CheckboxState = onPage === 0 ? false : onPage === rows.length ? true : 'mixed'
  const span = columns.length + (selectable ? 1 : 0)

  let body: ReactNode
  // Error and empty states fill the height; the scroller stays overflow-auto so 320px and 200% zoom can still scroll.
  const fillsHeight = status === 'error' || (status === 'success' && rows.length === 0)

  if (status === 'loading' || status === 'idle') {
    body = (
      <tr>
        <td colSpan={span} className="h-full p-0">
          {/* One loader for the whole area, as every other list in the app does. */}
          <DelayedLoading surface="table" active label={text.loading} className="min-h-64" />
        </td>
      </tr>
    )
  } else if (status === 'error') {
    body = (
      <tr>
        <td colSpan={span} className="p-8">
          <ErrorState
            variant="panel"
            message={text.error}
            retryLabel={text.retry}
            onRetry={onRetry}
            error={error}
          />
        </td>
      </tr>
    )
  } else if (rows.length === 0) {
    body = (
      <tr>
        <td colSpan={span} className="h-full p-0">
          <EmptyState
            surface="table"
            title={emptyText}
            kind={onClearSearch ? 'results' : 'empty'}
            className="min-h-64"
            action={
              onClearSearch && clearSearchLabel ? (
                <Button variant="outline" size="sm" onClick={onClearSearch}>
                  <X aria-hidden className="size-4" />
                  {clearSearchLabel}
                </Button>
              ) : null
            }
          />
        </td>
      </tr>
    )
  } else {
    body = rows.slice(window.start, window.end).map((row, offset) => {
      const index = window.start + offset
      const checked = selected.has(row.id)
      const open = onOpen ? () => onOpen(row) : undefined
      return (
        <tr
          key={row.id}
          onClick={open}
          onKeyDown={(event: KeyboardEvent<HTMLTableRowElement>) => {
            if (open && event.key === 'Enter' && event.target === event.currentTarget) open()
          }}
          tabIndex={open ? 0 : undefined}
          style={{ animationDelay: `${Math.min(index, 20) * 18}ms` }}
          className={cn(
            'group animate-row-in transition-[background-color,box-shadow] duration-150 outline-none focus-visible:bg-brand/[0.06] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:animate-none',
            open && 'cursor-pointer hover:shadow-[inset_3px_0_0_var(--color-brand)]',
            checked ? 'bg-primary/[0.07] hover:bg-primary/[0.11]' : 'hover:bg-brand/[0.045]',
          )}
        >
          {selectable ? (
            <td className="w-11 border-b border-border py-2.5 pl-4">
              <Checkbox checked={checked} onCheckedChange={() => onToggle(row.id)} label={text.select(row)} />
            </td>
          ) : null}
          {columns.map((column, columnIndex) => (
            <td
              key={column.key}
              className={cn(
                'border-b border-border px-2 py-2.5 text-slate-700',
                !selectable && columnIndex === 0 && 'pl-4',
                columnIndex === 0 && 'font-medium text-foreground group-hover:text-brand',
                column.className,
              )}
            >
              {column.render(row)}
            </td>
          ))}
        </tr>
      )
    })
  }

  return (
    <div
      ref={scroller}
      className="@container min-h-0 flex-1 scroll-pt-10 overflow-auto"
      onScroll={event => {
        setScrolled(event.currentTarget.scrollTop > 0)
        window.onScroll()
      }}
    >
      <ScrollEdges />
      <table
        className={cn('w-full border-separate border-spacing-0 text-sm', HEAD_ROUND, fillsHeight && 'h-full')}
        aria-busy={status === 'loading'}
      >
        <thead>
          <tr>
            {selectable ? (
              <th scope="col" className={cn(HEAD, 'w-11 pl-4')}>
                {status === 'success' && rows.length > 0 ? (
                  <Checkbox
                    checked={pageState}
                    onCheckedChange={onTogglePage}
                    label={text.selectAll}
                    className="border-white bg-transparent aria-checked:bg-white aria-checked:text-brand"
                  />
                ) : null}
              </th>
            ) : null}
            {columns.map((column, index) => {
              const active = sort?.column === column.key
              const canSort = Boolean(column.sortable && onSort)
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    canSort
                      ? active
                        ? sort?.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                  className={cn(HEAD, !selectable && index === 0 && 'pl-4', scrolled && 'shadow-press')}
                >
                  {canSort ? (
                    <button
                      type="button"
                      onClick={() => onSort?.(column.key)}
                      className="-ml-1.5 inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1 font-medium text-white transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
                    >
                      {column.label}
                      {active ? (
                        <ArrowUp
                          aria-hidden
                          className={cn(
                            'size-3.5 transition-transform duration-300 ease-premium',
                            sort?.direction === 'desc' && 'rotate-180',
                          )}
                        />
                      ) : (
                        <ArrowUpDown aria-hidden className="size-3.5 opacity-50" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {window.padTop > 0 ? <tr data-row-spacer aria-hidden style={{ height: window.padTop }} /> : null}
          {body}
          {window.padBottom > 0 ? (
            <tr data-row-spacer aria-hidden style={{ height: window.padBottom }} />
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
