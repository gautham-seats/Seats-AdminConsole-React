'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, type LucideIcon } from 'lucide-react'
import { useRef } from 'react'
import { cn } from './cn'

export type PaginationLabels = {
  itemsPerPage: string
  of: string
  first: string
  previous: string
  next: string
  last: string
  // Name of the navigation landmark; falls back to `itemsPerPage`'s sibling text, the range.
  pagination?: string
}

export type PaginationProps = {
  id: string
  pageIndex: number
  pageSize: number
  total: number
  pageSizes: readonly number[]
  labels: PaginationLabels
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageLabel?: (page: number) => string
  className?: string
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

// swgrid.js:172-190: up to five 1-based page numbers around the current page.
export function visiblePages(pageIndex: number, pages: number): number[] {
  const selected = pageIndex + 1
  let start = selected - 2
  let end = selected + 2
  if (selected <= 3) {
    start = 1
    end = Math.min(pages, 5)
  } else if (pages - selected <= 3) {
    start = Math.max(1, pages - 4)
    end = pages
  }
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)
}

function PageButton({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: LucideIcon
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // Stays focusable when it cannot act, so a press that lands on the last page never drops focus to body.
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className="lift-chip grid size-8 place-items-center rounded-md text-foreground transition-[background-color,transform] duration-150 hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:cursor-default aria-disabled:opacity-40 aria-disabled:hover:bg-transparent aria-disabled:active:scale-100"
    >
      <Icon aria-hidden className="size-4" />
    </button>
  )
}

// Marks the rows above the pager so the next page fades in softly; nothing moves, so no scrollbar jumps.
function swapPage(pager: HTMLElement | null, change: () => void) {
  const surface = pager?.previousElementSibling as HTMLElement | null
  change()
  if (!surface) return
  delete surface.dataset.pageSwap
  void surface.offsetWidth
  surface.dataset.pageSwap = 'on'
  window.setTimeout(() => {
    if (surface.dataset.pageSwap === 'on') delete surface.dataset.pageSwap
  }, 900)
}

export function Pagination({
  id,
  pageIndex,
  pageSize,
  total,
  pageSizes,
  labels,
  onPageChange,
  onPageSizeChange,
  pageLabel,
  className,
}: PaginationProps) {
  const pages = pageCount(total, pageSize)
  // A total that shrank under the reader (a poll, a filter) must not print "501–250 of 250" (SL-20).
  const current = Math.min(Math.max(pageIndex, 0), pages - 1)
  const from = total === 0 ? 0 : current * pageSize + 1
  const to = Math.min((current + 1) * pageSize, total)
  const range = `${from}–${to} ${labels.of} ${total}`
  const position = `${current + 1} ${labels.of} ${pages}`
  const first = current === 0
  const last = current >= pages - 1
  const pager = useRef<HTMLElement>(null)
  const go = (next: number) => swapPage(pager.current, () => onPageChange(next))
  return (
    <nav
      ref={pager}
      aria-label={labels.pagination ?? range}
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border bg-white px-4 py-2.5 text-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
        <label htmlFor={id}>{labels.itemsPerPage}</label>
        <select
          id={id}
          value={pageSize}
          onChange={event => {
            const size = Number(event.target.value)
            swapPage(pager.current, () => onPageSizeChange(size))
          }}
          className="field-bloom h-8 cursor-pointer rounded-md border border-input bg-white px-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {pageSizes.map(size => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span aria-live="polite" className="tabular-nums">
          {range}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-2 hidden tabular-nums text-muted-foreground sm:inline">{position}</span>
        <PageButton icon={ChevronsLeft} label={labels.first} disabled={first} onClick={() => go(0)} />
        <PageButton
          icon={ChevronLeft}
          label={labels.previous}
          disabled={first}
          onClick={() => go(current - 1)}
        />
        {pageLabel
          ? visiblePages(current, pages).map(page => {
              const isCurrent = page === current + 1
              return (
                <button
                  key={page}
                  type="button"
                  aria-label={pageLabel(page)}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={() => {
                    if (!isCurrent) go(page - 1)
                  }}
                  className={cn(
                    'lift-chip hidden h-8 min-w-8 place-items-center sm:grid rounded-md px-2 tabular-nums transition-[background-color,color,transform] duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isCurrent ? 'bg-brand font-semibold text-white' : 'text-foreground hover:bg-muted',
                  )}
                >
                  {page}
                </button>
              )
            })
          : null}
        <PageButton icon={ChevronRight} label={labels.next} disabled={last} onClick={() => go(current + 1)} />
        <PageButton icon={ChevronsRight} label={labels.last} disabled={last} onClick={() => go(pages - 1)} />
      </div>
    </nav>
  )
}
