'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUp, ArrowUpDown, X } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Button, Checkbox, DelayedLoading, ErrorState, type CheckboxState } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { useRowWindow } from '@/shared/ui/use-row-window'
import { HEAD_CELL, HEAD_ROUND } from './HeadBackdrop'
import type { ListState } from './list-state'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ScrollEdges } from '@/shared/ui/ScrollEdges'

export type ListColumn<T, K extends string> = {
  key: K
  label: string
  // Name for the sort button when the visible label is empty (an icon column).
  headerName?: string
  className?: string
  render: (item: T) => ReactNode
}

export type RowAction =
  | { kind: 'react'; href: string }
  | { kind: 'legacy'; href: string }
  | { kind: 'message'; message: string }
  | null

export type ListTableText = {
  loading: string
  error: string
  retry: string
  empty: string
  clearSearch: string
  selectAll: string
  select: string
}

type ListTableProps<T extends { id: number }, K extends string> = {
  list: ListState<T, K>
  columns: readonly ListColumn<T, K>[]
  selectable: boolean
  rowName: (item: T) => string
  rowAction?: (item: T) => RowAction
  onMessage?: (message: string) => void
  text: ListTableText
}

const HEAD = HEAD_CELL

export function ListTable<T extends { id: number }, K extends string>({
  list,
  columns,
  selectable,
  rowName,
  rowAction,
  onMessage,
  text,
}: ListTableProps<T, K>) {
  const [scrolled, setScrolled] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const { rows, selected } = list
  const win = useRowWindow(rows.length, scroller)
  const onPage = rows.filter(row => selected.has(row.id)).length
  const pageState: CheckboxState = onPage === 0 ? false : onPage === rows.length ? true : 'mixed'
  const span = columns.length + (selectable ? 1 : 0)

  let body: ReactNode
  // Nothing to scroll unless rows are on screen: an empty table with two scrollbars makes them fight,
  // because each one appearing steals the space the other was measuring.
  const scrollable = list.status === 'success' && rows.length > 0

  if (list.status === 'loading' || list.status === 'idle') {
    body = (
      <tr>
        <td colSpan={span} className="h-80 p-0">
          <DelayedLoading surface="table" active label={text.loading} />
        </td>
      </tr>
    )
  } else if (list.status === 'error') {
    body = (
      <tr>
        <td colSpan={span} className="p-8">
          <ErrorState
            variant="panel"
            message={text.error}
            retryLabel={text.retry}
            onRetry={list.reload}
            error={list.error}
            className="border-0"
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
            title={text.empty}
            kind={list.search ? 'results' : 'empty'}
            action={
              list.search ? (
                <Button variant="outline" size="sm" onClick={list.clearSearch}>
                  <X aria-hidden className="size-4" />
                  {text.clearSearch}
                </Button>
              ) : null
            }
          />
        </td>
      </tr>
    )
  } else {
    body = rows
      .slice(win.start, win.end)
      .map((item, offset) => (
        <ListRow
          key={item.id}
          item={item}
          index={win.start + offset}
          columns={columns}
          selectable={selectable}
          checked={selected.has(item.id)}
          onToggle={() => list.toggle(item.id)}
          selectLabel={`${text.select} ${rowName(item)}`}
          action={rowAction ? rowAction(item) : null}
          onMessage={onMessage}
        />
      ))
  }

  return (
    <div
      ref={scroller}
      className={cn('@container min-h-0 flex-1', scrollable ? 'overflow-auto' : 'overflow-hidden')}
      onScroll={event => {
        setScrolled(event.currentTarget.scrollTop > 0)
        win.onScroll()
      }}
    >
      <ScrollEdges />
      <table
        className={cn('w-full border-separate border-spacing-0 text-sm', HEAD_ROUND, !scrollable && 'h-full')}
        aria-busy={list.status === 'loading'}
      >
        <thead>
          <tr>
            {selectable ? (
              <th scope="col" className={cn(HEAD, 'w-11 pl-4')}>
                {list.status === 'success' && rows.length > 0 ? (
                  <Checkbox
                    checked={pageState}
                    onCheckedChange={list.togglePage}
                    label={text.selectAll}
                    className="relative border-white bg-transparent aria-checked:bg-white aria-checked:text-brand"
                  />
                ) : null}
              </th>
            ) : null}
            {columns.map((column, index) => {
              const active = list.sort.col === column.key
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={active ? (list.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={cn(HEAD, !selectable && index === 0 && 'pl-4', scrolled && 'shadow-press')}
                >
                  <button
                    type="button"
                    onClick={() => list.sortBy(column.key)}
                    aria-label={column.label === '' ? column.headerName : undefined}
                    className="relative -ml-1.5 inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1 font-medium text-white transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
                  >
                    {column.label}
                    {active ? (
                      <ArrowUp
                        aria-hidden
                        className={cn(
                          'size-3.5 transition-transform duration-300 ease-premium',
                          list.sort.dir === 'desc' && 'rotate-180',
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
        <tbody>
          {win.padTop > 0 ? <tr data-row-spacer aria-hidden style={{ height: win.padTop }} /> : null}
          {body}
          {win.padBottom > 0 ? <tr data-row-spacer aria-hidden style={{ height: win.padBottom }} /> : null}
        </tbody>
      </table>
    </div>
  )
}

type ListRowProps<T extends { id: number }, K extends string> = {
  item: T
  index: number
  columns: readonly ListColumn<T, K>[]
  selectable: boolean
  checked: boolean
  onToggle: () => void
  selectLabel: string
  action: RowAction
  onMessage?: (message: string) => void
}

function ListRow<T extends { id: number }, K extends string>({
  item,
  index,
  columns,
  selectable,
  checked,
  onToggle,
  selectLabel,
  action,
  onMessage,
}: ListRowProps<T, K>) {
  const router = useRouter()

  const activate = () => {
    if (!action) return
    if (action.kind === 'react') router.push(action.href)
    else if (action.kind === 'legacy') window.location.assign(action.href)
    else onMessage?.(action.message)
  }

  const primaryClass =
    'rounded-sm text-left underline-offset-4 outline-none group-hover:text-brand hover:underline focus-visible:ring-2 focus-visible:ring-ring'

  const primary = (content: ReactNode) => {
    if (!action) return content
    const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()
    // An empty cell value would leave the row link with no accessible name.
    const label = content === null || content === undefined || content === '' ? selectLabel.trim() : undefined
    if (action.kind === 'react')
      return (
        <Link href={action.href} onClick={stop} aria-label={label} className={primaryClass}>
          {content}
        </Link>
      )
    if (action.kind === 'legacy')
      return (
        <a href={action.href} onClick={stop} aria-label={label} className={primaryClass}>
          {content}
        </a>
      )
    return (
      <button
        type="button"
        aria-label={label}
        onClick={event => {
          stop(event)
          onMessage?.(action.message)
        }}
        className={cn(primaryClass, 'font-[inherit]')}
      >
        {content}
      </button>
    )
  }

  return (
    <tr
      aria-selected={selectable ? checked : undefined}
      onClick={action ? activate : undefined}
      style={{ animationDelay: `${Math.min(index, 20) * 18}ms` }}
      className={cn(
        'group animate-row-in transition-[background-color,box-shadow] duration-150 motion-reduce:animate-none',
        action && 'cursor-pointer hover:shadow-[inset_3px_0_0_var(--color-brand)]',
        checked ? 'bg-primary/[0.07] hover:bg-primary/[0.11]' : 'hover:bg-brand/[0.045]',
      )}
    >
      {selectable ? (
        <td className="border-b border-border py-2.5 pl-4" onClick={event => event.stopPropagation()}>
          <Checkbox checked={checked} onCheckedChange={onToggle} label={selectLabel} />
        </td>
      ) : null}
      {columns.map((column, columnIndex) => (
        <td
          key={column.key}
          className={cn(
            'border-b border-border px-2 py-2.5',
            !selectable && columnIndex === 0 && 'pl-4',
            column.className,
          )}
        >
          {columnIndex === 0 ? primary(column.render(item)) : column.render(item)}
        </td>
      ))}
    </tr>
  )
}
