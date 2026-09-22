'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUp, ArrowUpDown, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { USERS_ROUTE } from '@/shared/shell/admin-menu'
import { Button, Checkbox, DelayedLoading, ErrorState, type CheckboxState } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { useRowWindow } from '@/shared/ui/use-row-window'
import type { UserListItemDto, UsersSortColumn } from '@/types/users'
import { HEAD_CELL, HEAD_ROUND } from '../list/HeadBackdrop'
import type { UsersList } from './use-users-list'
import { USERS_FALLBACK_ONLY, type UsersTextKey } from './users-text'
import { EmptyState } from '@/shared/ui/EmptyState'
import { ScrollEdges } from '@/shared/ui/ScrollEdges'

type Column = { key: UsersSortColumn; label: UsersTextKey; className: string }

// Index.cshtml:77-107 column order; Access Profile(s) only when the tenant uses personas.
const COLUMNS: readonly Column[] = [
  { key: 'userName', label: 'UserName', className: 'font-medium text-foreground' },
  { key: 'accessProfiles', label: 'AccessProfiles', className: 'max-w-80 truncate text-slate-700' },
  { key: 'emailAddress', label: 'Email', className: 'text-slate-600' },
  { key: 'fullName', label: 'RealName', className: 'text-foreground' },
]

// Index.cshtml:136 row click and :49-52 Add, now served by the React details screen.
export const userDetailsRoute = (id: number) => `${USERS_ROUTE}/${id}`
export const NEW_USER_ROUTE = `${USERS_ROUTE}/new`

type UsersTableProps = {
  list: UsersList
  t: (key: UsersTextKey) => string
}

// swgrid.js:887-890 always adds the row checkboxes (multi-select is on for every list); only Delete is gated.
export function UsersTable({ list, t }: UsersTableProps) {
  const { read, query, selected, lastPage } = list
  const [scrolled, setScrolled] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const page = read.data
  const columns = COLUMNS.filter(
    column => column.key !== 'accessProfiles' || lastPage?.seatsAuthorisationByPersonas,
  )
  const items = page?.items ?? []
  const win = useRowWindow(items.length, scroller)
  const onPage = items.filter(item => selected.has(item.id)).length
  const pageState: CheckboxState = onPage === 0 ? false : onPage === items.length ? true : 'mixed'
  const span = columns.length + 1
  // Nothing to scroll unless rows are on screen: an empty table with two scrollbars makes them fight,
  // because each one appearing steals the space the other was measuring.
  const scrollable = read.status === 'success' && items.length > 0
  // Returned rows are stronger evidence than an inconsistent server total (D-087).
  const showHeader = Boolean(lastPage && lastPage.items.length > 0)

  let body
  if (read.status === 'loading' || read.status === 'idle') {
    body = (
      <tr>
        <td colSpan={span} className="h-80 p-0">
          <DelayedLoading surface="table" active label={t('Loading')} />
        </td>
      </tr>
    )
  } else if (read.status === 'error') {
    body = (
      <tr>
        <td colSpan={span} className="p-8">
          <ErrorState
            variant="panel"
            message={t('AlertGeneralErrorDefault')}
            retryLabel={t('Refresh')}
            onRetry={read.reload}
            error={read.error}
            className="border-0"
          />
        </td>
      </tr>
    )
    // swgrid.js:31-46 renders the rows it was given; totalRowCount only drives paging, and Alpha can return 0 with rows present.
  } else if (!page || items.length === 0) {
    body = (
      <tr>
        <td colSpan={span} className="h-full p-0">
          <EmptyState
            surface="table"
            title={USERS_FALLBACK_ONLY.noItems}
            kind={query.search ? 'results' : 'empty'}
            action={
              query.search ? (
                <Button variant="outline" size="sm" onClick={list.clearSearch}>
                  <X aria-hidden className="size-4" />
                  {USERS_FALLBACK_ONLY.clearSearch}
                </Button>
              ) : null
            }
          />
        </td>
      </tr>
    )
  } else {
    body = items
      .slice(win.start, win.end)
      .map((item, offset) => (
        <UserRow
          key={item.id}
          item={item}
          index={win.start + offset}
          columns={columns}
          checked={selected.has(item.id)}
          onToggle={() => list.toggle(item.id)}
          selectLabel={`${USERS_FALLBACK_ONLY.select} ${item.userName || item.fullName || item.emailAddress || item.id}`}
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
      data-scrolled={scrolled || undefined}
    >
      <ScrollEdges />
      <table
        className={cn('w-full border-separate border-spacing-0 text-sm', HEAD_ROUND, !scrollable && 'h-full')}
        aria-busy={read.status === 'loading'}
      >
        <thead hidden={!showHeader}>
          <tr>
            <th scope="col" className={cn(HEAD_CELL, 'w-11 pl-4', scrolled && 'shadow-press')}>
              {read.status === 'success' && items.length > 0 ? (
                <Checkbox
                  checked={pageState}
                  onCheckedChange={list.togglePage}
                  label={t('SelectAll')}
                  className="relative border-white bg-transparent aria-checked:bg-white aria-checked:text-brand"
                />
              ) : null}
            </th>
            {columns.map(column => {
              const active = query.sortCol === column.key
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={active ? (query.sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={cn(HEAD_CELL, scrolled && 'shadow-press')}
                >
                  <button
                    type="button"
                    onClick={() => list.sortBy(column.key)}
                    className="relative -ml-1.5 inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1 font-medium text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
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

type UserRowProps = {
  item: UserListItemDto
  index: number
  columns: readonly Column[]
  checked: boolean
  onToggle: () => void
  selectLabel: string
}

function UserRow({ item, index, columns, checked, onToggle, selectLabel }: UserRowProps) {
  const router = useRouter()
  const href = userDetailsRoute(item.id)
  return (
    <tr
      aria-selected={checked}
      onClick={() => router.push(href)}
      style={{ animationDelay: `${Math.min(index, 20) * 18}ms` }}
      className={cn(
        'group animate-row-in cursor-pointer transition-[background-color,box-shadow] duration-150 motion-reduce:animate-none',
        checked ? 'bg-primary/[0.07] hover:bg-primary/[0.11]' : 'hover:bg-brand/[0.045]',
        'hover:shadow-[inset_3px_0_0_var(--color-brand)]',
      )}
    >
      {/* swgrid.js:736-741 binds row click before the checkbox cell is added (:882-889). */}
      <td className="border-b border-border py-2.5 pl-4" onClick={event => event.stopPropagation()}>
        <Checkbox checked={checked} onCheckedChange={onToggle} label={selectLabel} />
      </td>
      {columns.map((column, columnIndex) => {
        const value = item[column.key] ?? ''
        const first = columnIndex === 0
        return (
          <td
            key={column.key}
            title={column.key === 'accessProfiles' && value ? value : undefined}
            className={cn('border-b border-border px-2 py-2.5', column.className)}
          >
            {first ? (
              <Link
                href={href}
                // An empty userName would leave this link with no accessible name at all.
                aria-label={value ? undefined : selectLabel}
                onClick={event => event.stopPropagation()}
                className="rounded-sm underline-offset-4 outline-none group-hover:text-brand hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {value}
              </Link>
            ) : (
              value
            )}
          </td>
        )
      })}
    </tr>
  )
}
