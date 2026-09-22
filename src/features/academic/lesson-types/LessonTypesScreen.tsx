'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUp, ArrowUpDown, Check, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useApiRead } from '@/shared/api'
import { LESSON_TYPES_ROUTE } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { DelayedLoading, ErrorState, Pagination } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { useRowWindow } from '@/shared/ui/use-row-window'
import type { LessonTypeDto, LessonTypeSortColumn } from '@/types/lesson-types'
import { fetchLessonTypeFlags, fetchLessonTypes } from './lesson-type-api'
import {
  checkoutKey,
  INITIAL_SORT,
  LESSON_TYPE_PAGE_SIZE,
  LESSON_TYPE_PAGE_SIZES,
  LESSON_TYPE_PAGER_MIN_ROWS,
  nextSort,
  scalingKey,
  sortLessonTypes,
  type Sort,
} from './lesson-type-form'
import {
  LESSON_TYPE_CHECKOUT,
  LESSON_TYPE_CONSECUTIVE,
  LessonTypeGate,
  LessonTypeNoticeBar,
  LessonTypeWorkspace,
  clearLessonTypeFlash,
  peekLessonTypeFlash,
  type LessonTypeNotice,
} from './LessonTypeFrame'
import { LESSON_TYPE_FALLBACK_ONLY, useLessonTypeText, type LessonTypeTextKey } from './lesson-type-text'
import { EmptyState } from '@/shared/ui/EmptyState'
import { CountUp } from '@/shared/ui/CountUp'
import { ScrollEdges } from '@/shared/ui/ScrollEdges'
import { HEAD_FILL, HEAD_ROUND } from '@/shared/ui/HeadBackdrop'

type Column = {
  key: LessonTypeSortColumn
  label: LessonTypeTextKey
  align?: 'center' | 'right'
  render: (item: LessonTypeDto) => ReactNode
}

const HEAD = `sticky top-0 z-10 h-10 ${HEAD_FILL} px-2 align-middle text-xs font-medium tracking-[0.02em] whitespace-nowrap text-white transition-shadow duration-300`

const FLAGS_NOTICE_ID = -1
const FLAGS_NOTICE_MS = 6000

export function LessonTypesScreen() {
  return (
    <LessonTypeGate>
      <LessonTypesList />
    </LessonTypeGate>
  )
}

function Flag({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return (
    <span
      role="img"
      aria-label={on ? yes : no}
      className={cn(
        'inline-grid size-6 place-items-center rounded-full transition-colors',
        on ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-slate-100 text-slate-500',
      )}
    >
      {on ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
    </span>
  )
}

// A cut-off the server did not send leaves the cell empty, as the legacy text binding did.
function Amount({ value, unit, gap }: { value: number | null; unit: string; gap: string }) {
  if (value === null) return null
  return (
    <span className="tabular-nums">
      {value}
      <span className={cn(gap, 'text-xs text-slate-500')}>{unit}</span>
    </span>
  )
}

function Pill({ tone, children }: { tone: 'neutral' | 'strong' | 'muted'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tone === 'strong' && 'bg-slate-900 text-white',
        tone === 'neutral' && 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
        tone === 'muted' && 'text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}

function LessonTypesList() {
  const t = useLessonTypeText()
  const router = useRouter()
  const profile = useProfile()
  const list = useApiRead('lesson-types', fetchLessonTypes)
  const flags = useApiRead('lesson-type-flags:Index', signal => fetchLessonTypeFlags('Index', signal))
  const [sort, setSort] = useState<Sort>(INITIAL_SORT)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(LESSON_TYPE_PAGE_SIZE)
  const [scrolled, setScrolled] = useState(false)
  const [notice, setNotice] = useState<LessonTypeNotice | null>(peekLessonTypeFlash)
  const dismiss = useCallback(() => setNotice(null), [])
  const [flagsNoticeDone, setFlagsNoticeDone] = useState(false)
  const dismissFlagsNotice = useCallback(() => setFlagsNoticeDone(true), [])
  // Kept stable while the read stays failed, so its auto-dismiss timer is not restarted every render.
  const flagsNotice = useMemo<LessonTypeNotice | null>(
    () =>
      flags.status === 'error' && !flagsNoticeDone
        ? {
            id: FLAGS_NOTICE_ID,
            tone: 'info',
            message: LESSON_TYPE_FALLBACK_ONLY.flagsFailed,
            duration: FLAGS_NOTICE_MS,
          }
        : null,
    [flags.status, flagsNoticeDone],
  )

  useEffect(() => clearLessonTypeFlash(), [])

  const canCheckout = profile.can(LESSON_TYPE_CHECKOUT)
  const canConsecutive = profile.can(LESSON_TYPE_CONSECUTIVE)
  const tenant = flags.data

  // Index.cshtml:24-72 column order, with the server-side and security-bound conditions.
  const columns = useMemo<Column[]>(() => {
    const all: (Column | false)[] = [
      {
        key: 'name',
        label: 'Name',
        render: item => (
          <Link
            href={`${LESSON_TYPES_ROUTE}/${item.id}`}
            // An empty name would leave this link with no accessible name.
            aria-label={item.name ? undefined : `${t('LessonType')} ${item.id}`}
            onClick={event => event.stopPropagation()}
            className="rounded-sm font-medium text-foreground underline-offset-4 outline-none group-hover:text-brand hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {item.name}
          </Link>
        ),
      },
      {
        key: 'description',
        label: 'Description',
        render: item => <span className="text-slate-700">{item.description}</span>,
      },
      {
        key: 'earlyCutoff',
        label: 'EarlyCutoff',
        align: 'right',
        render: item => (
          <Amount value={item.earlyCutoff} unit={LESSON_TYPE_FALLBACK_ONLY.minutesUnit} gap="ml-1" />
        ),
      },
      {
        key: 'lateCutoff',
        label: 'LateCutoff',
        align: 'right',
        render: item => (
          <Amount value={item.lateCutoff} unit={LESSON_TYPE_FALLBACK_ONLY.minutesUnit} gap="ml-1" />
        ),
      },
      {
        key: 'absenceCutoff',
        label: 'AbsenceCutoff',
        align: 'right',
        render: item => (
          <Amount value={item.absenceCutoff} unit={LESSON_TYPE_FALLBACK_ONLY.minutesUnit} gap="ml-1" />
        ),
      },
      canCheckout && {
        key: 'checkoutCutoff',
        label: 'CheckoutCutoff',
        align: 'right',
        render: item => (
          <Amount value={item.checkoutCutoff} unit={LESSON_TYPE_FALLBACK_ONLY.minutesUnit} gap="ml-1" />
        ),
      },
      {
        key: 'percentageCutoff',
        label: 'PercentageCutoff',
        align: 'right',
        render: item => (
          <Amount value={item.percentageCutoff} unit={LESSON_TYPE_FALLBACK_ONLY.percentUnit} gap="ml-0.5" />
        ),
      },
      {
        key: 'isAbsenceBasedOnStart',
        label: 'IsAbsenceBasedOnStart',
        align: 'center',
        render: item => <Flag on={item.isAbsenceBasedOnStart} yes={t('Yes')} no={t('No')} />,
      },
      canCheckout && {
        key: 'isAttendanceBasedOnCheckout',
        label: 'IsAttendanceBasedOnCheckout',
        render: item => {
          const key = checkoutKey(item.isAttendanceBasedOnCheckout)
          return (
            <Pill tone={key === 'Mandatory' ? 'strong' : key === 'Optional' ? 'neutral' : 'muted'}>
              {t(key)}
            </Pill>
          )
        },
      },
      tenant?.attendanceByDuration === true && {
        key: 'attendanceScaling',
        label: 'AttendanceScaling',
        render: item => {
          const key = scalingKey(item.attendanceScaling)
          return <Pill tone={key === 'None' ? 'muted' : 'neutral'}>{t(key)}</Pill>
        },
      },
      tenant?.consecutiveAttendanceUpdate === true &&
        canConsecutive && {
          key: 'isConsecutiveAttendanceUpdate',
          label: 'ConsecutiveAttendanceUpdate',
          align: 'center',
          render: item => <Flag on={item.isConsecutiveAttendanceUpdate} yes={t('Yes')} no={t('No')} />,
        },
      {
        key: 'isActive',
        label: 'IsActive',
        align: 'center',
        render: item => <Flag on={item.isActive} yes={t('Yes')} no={t('No')} />,
      },
    ]
    return all.filter((column): column is Column => column !== false)
  }, [t, canCheckout, canConsecutive, tenant])

  // Only the lesson types failing is an error; a failed flag read just hides its two columns.
  const flagsSettled = flags.status === 'success' || flags.status === 'error'
  const status =
    list.status === 'error' ? 'error' : list.status === 'success' && flagsSettled ? 'success' : 'loading'
  const rows = useMemo(() => sortLessonTypes(list.data ?? [], sort), [list.data, sort])
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(pageIndex, pages - 1)
  const visible = rows.slice(page * pageSize, (page + 1) * pageSize)
  const scroller = useRef<HTMLDivElement>(null)
  const win = useRowWindow(visible.length, scroller)
  // Empty tables fill the box instead of scrolling; the box still scrolls so a state never clips at 320px.
  const scrollable = status === 'success' && rows.length > 0
  const totalText = `${t('Total')} ${rows.length}`

  const retry = () => {
    if (list.status === 'error') list.reload()
    if (flags.status === 'error') flags.reload()
  }

  let body: ReactNode
  if (status === 'loading') {
    body = (
      <tr>
        <td colSpan={columns.length} className="h-80 p-0">
          <DelayedLoading surface="table" active label={t('Loading')} />
        </td>
      </tr>
    )
  } else if (status === 'error') {
    body = (
      <tr>
        <td colSpan={columns.length} className="p-8">
          <ErrorState
            variant="panel"
            message={t('AlertGeneralErrorDefault')}
            retryLabel={t('Refresh')}
            onRetry={retry}
            error={list.error ?? flags.error}
          />
        </td>
      </tr>
    )
  } else if (rows.length === 0) {
    body = (
      <tr>
        <td colSpan={columns.length} className="h-full p-0">
          <EmptyState title={LESSON_TYPE_FALLBACK_ONLY.noItems} />
        </td>
      </tr>
    )
  } else {
    body = visible.slice(win.start, win.end).map((item, offset) => {
      const index = win.start + offset
      return (
        <tr
          key={item.id}
          onClick={() => router.push(`${LESSON_TYPES_ROUTE}/${item.id}`)}
          style={{ animationDelay: `${Math.min(index, 20) * 18}ms` }}
          className={cn(
            'group animate-row-in cursor-pointer transition-[background-color,box-shadow] duration-150 hover:bg-brand/[0.045] hover:shadow-[inset_3px_0_0_var(--color-brand)] motion-reduce:animate-none',
            !item.isActive && 'text-muted-foreground',
          )}
        >
          {columns.map((column, columnIndex) => (
            <td
              key={column.key}
              className={cn(
                'border-b border-border px-2 py-2.5 whitespace-nowrap',
                columnIndex === 0 && 'pl-4',
                column.align === 'right' && 'text-right',
                column.align === 'center' && 'text-center',
              )}
            >
              {column.render(item)}
            </td>
          ))}
        </tr>
      )
    })
  }

  return (
    <LessonTypeWorkspace
      title={t('LessonType')}
      meta={
        status === 'success' ? (
          <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-brand">
            <CountUp text={totalText} />
          </span>
        ) : null
      }
    >
      <LessonTypeNoticeBar notice={notice} onDismiss={dismiss} dismissLabel={t('Cancel')} />
      <LessonTypeNoticeBar notice={flagsNotice} onDismiss={dismissFlagsNotice} dismissLabel={t('Cancel')} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm">
        {/* Rows open with a click; the name link in each row is the keyboard route. */}
        <div
          ref={scroller}
          className="@container min-h-0 flex-1 scroll-pt-10 overflow-auto"
          onScroll={event => {
            setScrolled(event.currentTarget.scrollTop > 0)
            win.onScroll()
          }}
        >
          <ScrollEdges />
          <table
            className={cn(
              'w-full border-separate border-spacing-0 text-sm',
              HEAD_ROUND,
              !scrollable && 'h-full',
            )}
            aria-busy={status === 'loading'}
          >
            <thead>
              <tr>
                {columns.map((column, index) => {
                  const active = sort.col === column.key
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={cn(
                        HEAD,
                        index === 0 && 'pl-4',
                        column.align === 'right'
                          ? 'text-right'
                          : column.align === 'center'
                            ? 'text-center'
                            : 'text-left',
                        scrolled && 'shadow-press',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSort(current => nextSort(current, column.key))
                          setPageIndex(0)
                        }}
                        className="-mx-1.5 inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1 font-medium text-white transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
                      >
                        {t(column.label)}
                        {active ? (
                          <ArrowUp
                            aria-hidden
                            className={cn(
                              'size-3.5 transition-transform duration-300 ease-premium',
                              sort.dir === 'desc' && 'rotate-180',
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
              {win.padBottom > 0 ? (
                <tr data-row-spacer aria-hidden style={{ height: win.padBottom }} />
              ) : null}
            </tbody>
          </table>
        </div>
        {status === 'success' && rows.length >= LESSON_TYPE_PAGER_MIN_ROWS ? (
          <Pagination
            id="lesson-types-page-size"
            pageIndex={page}
            pageSize={pageSize}
            total={rows.length}
            pageSizes={LESSON_TYPE_PAGE_SIZES}
            onPageChange={setPageIndex}
            onPageSizeChange={size => {
              setPageSize(size)
              setPageIndex(0)
            }}
            labels={{
              itemsPerPage: t('NumberOfItemsPerPage'),
              of: t('Of'),
              first: LESSON_TYPE_FALLBACK_ONLY.first,
              previous: t('Previous'),
              next: t('Next'),
              last: LESSON_TYPE_FALLBACK_ONLY.last,
            }}
          />
        ) : null}
      </div>
    </LessonTypeWorkspace>
  )
}
