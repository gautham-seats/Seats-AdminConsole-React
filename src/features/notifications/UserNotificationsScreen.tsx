'use client'

import { Bell, Check, Download, FileDown, Lock, ShieldCheck, Trash2, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { api, toApiError, useApiRead } from '@/shared/api'
import { pageEnvelope } from '@/shared/api/page-total'
import { safeHttpUrl } from '@/shared/security/safe-http-url'
import { NOTIFICATIONS_PERMISSION } from '@/shared/shell/admin-menu'
import { refreshNotificationCount, useNotificationPushes } from '@/shared/shell/use-shell-data'
import { Button, ConfirmDialog, DelayedLoading, ErrorState, Pagination } from '@/shared/ui'
import { ADD_BUTTON_CLASS, ADD_ICON_CLASS } from '@/shared/ui/add-button'
import { cn } from '@/shared/ui/cn'
import { CountUp } from '@/shared/ui/CountUp'
import { EmptyState } from '@/shared/ui/EmptyState'
import type { UserNotificationDto, UserNotificationPageDto } from '@/types/notifications'
import { PAGE_SIZES, PAGER_MIN_ROWS } from '@/features/settings/shared/list-model'
import { SaveToast, type Notice } from '@/features/settings/shared/SaveToast'
import { FRAME_EN, SettingsGate } from '@/features/settings/shared/SettingsFrame'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import {
  canDeleteNotification,
  formatNotificationDate,
  isUnreadNotification,
  NOTIFICATION_PAGE_SIZE,
  notificationListQuery,
} from './notification-list'
import { useExpirationColumn } from './use-expiration-column'
import { useOptionWindow } from './use-option-window'

const TEXT = {
  UserNotifications: 'User Notifications',
  Type: 'Type',
  Status: 'Status',
  DateCreated: 'Date Created',
  Expiration: 'Expiration',
  File: 'File',
  Remove: 'Remove',
  Days: 'Days',
  Day: 'Day',
  Confirm: 'Confirm',
  Cancel: 'Cancel',
  Total: 'Total',
  Loading: 'Loading',
  Refresh: 'Refresh',
  NumberOfItemsPerPage: 'Number of items per page',
  Of: 'of',
  Next: 'Next',
  Previous: 'Previous',
  DeleteConfirmationMsg: 'Are you sure you want to delete selected items?',
  AlertDeleteSuccessDefault: 'The item was deleted succesfully.',
  AlertDeleteErrorDefault: 'There was an error while trying to delete the item.',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
  MarkAllAsRead: 'Mark all as read',
} as const

// English fallbacks: legacy has no keys for the inbox filter, progress steps or file hints.
const EN = {
  noItems: 'There are no items to show.',
  first: 'First',
  last: 'Last',
  deleteTitle: 'Delete notification',
  all: 'All',
  list: 'Notifications',
  requested: 'Requested',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
  download: 'Download file',
  fileLater: 'The file appears here when processing finishes.',
  noFile: 'This notification has no file.',
  locked: 'Cannot delete while processing',
} as const

const readNotificationPage = (raw: unknown): UserNotificationPageDto =>
  pageEnvelope<UserNotificationDto>(raw, LIST_PATH)

const LIST_PATH = 'UserNotificationApi'
const MARK_READ_PATH = 'usernotificationapi/setAllAsRead'

// UserNotificationStatusEnum and UserNotificationTypeEnum in Seats.Trunk.Contracts.
const STATUS_PROCESSING = 1
const STATUS_ERROR = 3

const TYPE_LOOK: Record<number, { icon: LucideIcon; tile: string }> = {
  1: { icon: FileDown, tile: 'bg-brand/[0.09] text-brand' },
  2: { icon: Download, tile: 'bg-violet-50 text-violet-700' },
  3: { icon: ShieldCheck, tile: 'bg-amber-50 text-amber-700' },
}
const TYPE_FALLBACK = { icon: Bell, tile: 'bg-slate-100 text-slate-600' }

const STATUS_PILL: Record<number, string> = {
  1: 'bg-brand/[0.09] text-brand',
  2: 'bg-emerald-50 text-emerald-700',
  3: 'bg-red-50 text-destructive',
}

type Filter = 'all' | number

export function UserNotificationsScreen() {
  return (
    <SettingsGate access={NOTIFICATIONS_PERMISSION}>
      <UserNotificationsInbox />
    </SettingsGate>
  )
}

function TypeTile({ row, large = false }: { row: UserNotificationDto; large?: boolean }) {
  const look = TYPE_LOOK[row.userNotificationTypeId] ?? TYPE_FALLBACK
  const Icon = look.icon
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center',
        large ? 'size-12 rounded-[14px]' : 'size-8 rounded-[9px]',
        look.tile,
      )}
    >
      <Icon className={large ? 'size-[22px]' : 'size-4'} />
    </span>
  )
}

function StatusPill({ row }: { row: UserNotificationDto }) {
  const processing = row.userNotificationStatusId === STATUS_PROCESSING
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-2 text-xs font-semibold whitespace-nowrap',
        STATUS_PILL[row.userNotificationStatusId] ?? 'bg-slate-100 text-slate-600',
      )}
    >
      {processing ? (
        <span
          aria-hidden
          className="size-2.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
        />
      ) : (
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
      )}
      {row.userNotificationStatusName}
    </span>
  )
}

function UserNotificationsInbox() {
  const t = useScreenText(TEXT)
  const expiration = useExpirationColumn()
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(NOTIFICATION_PAGE_SIZE)
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [pendingMarkRead, setPendingMarkRead] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const markedOnOpen = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])

  const query = useMemo(
    () => notificationListQuery({ pageIndex, pageSize, sort: { column: '', direction: 'asc' }, search: '' }),
    [pageIndex, pageSize],
  )
  const load = useCallback(
    async (signal: AbortSignal) => readNotificationPage(await api.get<unknown>(LIST_PATH, { query, signal })),
    [query],
  )
  const read = useApiRead(`${LIST_PATH}:${JSON.stringify(query)}:${attempt}`, load)
  const listKey = `${JSON.stringify(query)}:${attempt}`
  // A server push fetches the page in the background, so the rows on screen stay until the new ones arrive.
  const pushes = useNotificationPushes()
  const [live, setLive] = useState<{ key: string; data: UserNotificationPageDto | null } | null>(null)
  const [pushesAtOpen] = useState(pushes)
  useEffect(() => {
    if (pushes === pushesAtOpen) return
    const controller = new AbortController()
    const refresh = async () =>
      readNotificationPage(await api.get<unknown>(LIST_PATH, { query, signal: controller.signal }))
    refresh()
      .then(next => setLive({ key: listKey, data: next }))
      .catch(() => undefined)
    return () => controller.abort()
  }, [pushes, pushesAtOpen, query, listKey])
  const data = live?.key === listKey && read.status !== 'loading' ? live.data : read.data
  const rows = useMemo(() => data?.items ?? [], [data])
  const total = Math.max(data?.totalRowCount ?? 0, pageIndex * pageSize + rows.length)
  const unreadOnPage = rows.some(isUnreadNotification)

  const types = useMemo(() => {
    const seen = new Map<number, { name: string; count: number }>()
    for (const row of rows) {
      const entry = seen.get(row.userNotificationTypeId)
      if (entry) entry.count += 1
      else seen.set(row.userNotificationTypeId, { name: row.userNotificationTypeName ?? '', count: 1 })
    }
    return [...seen.entries()].sort(([a], [b]) => a - b)
  }, [rows])
  const activeFilter = filter !== 'all' && types.some(([id]) => id === filter) ? filter : 'all'
  const visible = useMemo(
    () => (activeFilter === 'all' ? rows : rows.filter(row => row.userNotificationTypeId === activeFilter)),
    [rows, activeFilter],
  )
  const selected = visible.find(row => row.id === selectedId) ?? visible[0] ?? null
  const win = useOptionWindow(visible.length, listRef)
  const selectedIndex = selected ? visible.findIndex(row => row.id === selected.id) : -1
  // When the selected option is windowed out, the first rendered option keeps the listbox in the tab order.
  const selectedRendered = selectedIndex >= win.start && selectedIndex < win.end

  const failureMessage = useCallback((caught: unknown, fallback: string) => {
    const error = toApiError(caught)
    if (error.kind === 'blocked') return FRAME_EN.safeMode
    if (error.kind === 'http' && error.status === 400 && error.serverMessage) return error.serverMessage
    return fallback
  }, [])

  const markAllAsRead = useCallback(async () => {
    setPendingMarkRead(true)
    try {
      await api.post<void>(MARK_READ_PATH)
      refreshNotificationCount()
      setAttempt(value => value + 1)
    } catch (caught) {
      setNotice({
        id: Date.now(),
        tone: 'error',
        message: failureMessage(caught, t('AlertGeneralErrorDefault')),
      })
    } finally {
      setPendingMarkRead(false)
    }
  }, [failureMessage, t])

  // Legacy userNotificationIndexController.js:26-31 marks everything read as the page opens.
  useEffect(() => {
    if (markedOnOpen.current) return
    markedOnOpen.current = true
    void markAllAsRead()
  }, [markAllAsRead])

  const confirmDelete = async () => {
    if (confirmId === null) return
    setPendingDelete(true)
    try {
      await api.post<void>('usernotificationapi/delete', { query: { id: confirmId } })
      refreshNotificationCount()
      setAttempt(value => value + 1)
      setNotice({ id: Date.now(), tone: 'success', message: t('AlertDeleteSuccessDefault') })
    } catch (caught) {
      setNotice({
        id: Date.now(),
        tone: 'error',
        message: failureMessage(caught, t('AlertDeleteErrorDefault')),
      })
    } finally {
      setPendingDelete(false)
      setConfirmId(null)
    }
  }

  // Up and Down move through the list like a mail inbox; focus follows the selection.
  const onListKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    if (!selected) return
    event.preventDefault()
    const focusedId = Number((event.target as HTMLElement).dataset.row)
    const focusedIndex = visible.findIndex(row => row.id === focusedId)
    const index = focusedIndex >= 0 ? focusedIndex : selectedIndex
    const next = visible[index + (event.key === 'ArrowDown' ? 1 : -1)]
    if (!next) return
    setSelectedId(next.id)
    listRef.current?.querySelector<HTMLButtonElement>(`[data-row="${next.id}"]`)?.focus()
  }

  const retry = () => {
    expiration.reload()
    read.reload()
  }
  const days = (value: number) => `${value} ${value === 1 ? t('Day') : t('Days')}`
  const loading =
    expiration.status === 'loading' ||
    (data === undefined && (read.status === 'idle' || read.status === 'loading'))

  let body
  if (read.status === 'error' || expiration.status === 'error') {
    body = (
      <ErrorState
        message={t('AlertGeneralErrorDefault')}
        retryLabel={t('Refresh')}
        onRetry={retry}
        error={read.error}
        className="min-h-[28rem]"
      />
    )
  } else if (loading) {
    body = <DelayedLoading active label={t('Loading')} className="min-h-[28rem]" />
  } else if (rows.length === 0) {
    body = <EmptyState title={EN.noItems} className="min-h-[28rem]" />
  } else {
    body = (
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(17rem,24rem)_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col border-b border-border lg:border-r lg:border-b-0">
          <div
            role="group"
            aria-label={t('Type')}
            className="flex flex-wrap gap-1.5 border-b border-border/70 p-3"
          >
            {[
              ['all', EN.all, rows.length] as const,
              ...types.map(([id, entry]) => [id, entry.name, entry.count] as const),
            ].map(([id, label, count]) => {
              const on = activeFilter === id
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(id)}
                  className={cn(
                    'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-semibold outline-none',
                    'transition-[background-color,color,border-color] duration-200 ease-premium focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                    on
                      ? 'border-brand/35 bg-brand/[0.08] text-brand'
                      : 'border-border text-slate-600 hover:border-slate-300 hover:text-foreground',
                  )}
                >
                  {label}
                  <span className={cn('tabular-nums', on ? 'text-brand' : 'text-slate-600')}>{count}</span>
                </button>
              )
            })}
          </div>
          <div
            ref={listRef}
            role="listbox"
            aria-label={EN.list}
            onKeyDown={onListKey}
            onScroll={win.onScroll}
            className="min-h-0 flex-1 overflow-y-auto lg:max-h-[calc(100dvh-17rem)]"
          >
            {win.padTop > 0 ? <div aria-hidden style={{ height: win.padTop }} /> : null}
            {visible.slice(win.start, win.end).map((row, offset) => {
              const index = win.start + offset
              const on = selected?.id === row.id
              const tabbable = on || (!selectedRendered && offset === 0)
              const unread = isUnreadNotification(row)
              return (
                <button
                  key={row.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  data-row={row.id}
                  tabIndex={tabbable ? 0 : -1}
                  onClick={() => setSelectedId(row.id)}
                  style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
                  className={cn(
                    'relative grid w-full animate-[item-in_260ms_var(--ease-premium)_both] grid-cols-[auto_minmax(0,1fr)_auto] gap-2.5 border-b border-border/60 px-3.5 py-3 text-left outline-none',
                    'transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:animate-none',
                    on
                      ? 'bg-brand/[0.07] before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-r before:bg-brand'
                      : 'hover:bg-slate-50',
                  )}
                >
                  <TypeTile row={row} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-foreground">
                      {row.userNotificationTypeName}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 line-clamp-2 min-h-[2lh] text-[13px]',
                        unread ? 'font-semibold text-foreground' : 'text-slate-600',
                      )}
                    >
                      {row.description}
                    </span>
                  </span>
                  <span className="grid content-start justify-items-end gap-1.5">
                    <span className="text-[11.5px] whitespace-nowrap text-slate-500 tabular-nums">
                      {formatNotificationDate(row.dateCreated)}
                    </span>
                    {unread ? (
                      <span
                        aria-hidden
                        className="size-2 rounded-full bg-brand shadow-[0_0_0_3px_rgba(21,102,162,.16)]"
                      />
                    ) : row.userNotificationStatusId === STATUS_ERROR ? (
                      <span aria-hidden className="size-2 rounded-full bg-destructive" />
                    ) : null}
                  </span>
                </button>
              )
            })}
            {win.padBottom > 0 ? <div aria-hidden style={{ height: win.padBottom }} /> : null}
          </div>
          {total >= PAGER_MIN_ROWS ? (
            <Pagination
              id="notifications-page-size"
              pageIndex={pageIndex}
              pageSize={pageSize}
              total={total}
              pageSizes={PAGE_SIZES}
              onPageChange={setPageIndex}
              onPageSizeChange={size => {
                setPageSize(size)
                setPageIndex(0)
              }}
              labels={{
                itemsPerPage: t('NumberOfItemsPerPage'),
                of: t('Of'),
                first: EN.first,
                previous: t('Previous'),
                next: t('Next'),
                last: EN.last,
              }}
            />
          ) : null}
        </div>

        {selected ? detailPane(selected) : <div />}
      </div>
    )
  }

  function detailPane(row: UserNotificationDto) {
    const processing = row.userNotificationStatusId === STATUS_PROCESSING
    const failed = row.userNotificationStatusId === STATUS_ERROR
    const steps = [
      { label: EN.requested, state: 'done' },
      { label: EN.processing, state: processing ? 'now' : 'done' },
      { label: failed ? EN.failed : EN.ready, state: processing ? 'todo' : failed ? 'fail' : 'done' },
    ] as const
    const fileUrl = safeHttpUrl(row.userNotificationFile?.url)
    return (
      <section key={row.id} aria-live="polite" className="page-enter flex min-w-0 flex-col gap-6 p-6 lg:p-8">
        <div className="flex items-start gap-3.5">
          <TypeTile row={row} large />
          <div className="min-w-0">
            <h2 className="text-lg leading-snug font-semibold text-balance text-foreground">
              {row.description}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[13px] text-slate-500">
              <span>{row.userNotificationTypeName}</span>
              <StatusPill row={row} />
              <span className="tabular-nums">{formatNotificationDate(row.dateCreated)}</span>
            </div>
          </div>
        </div>

        <ol className="grid grid-cols-3 gap-2">
          {steps.map(step => (
            <li
              key={step.label}
              className={cn(
                'grid gap-2 text-[12.5px] font-semibold',
                step.state === 'done' && 'text-emerald-700',
                step.state === 'now' && 'text-brand',
                step.state === 'fail' && 'text-destructive',
                step.state === 'todo' && 'text-slate-500',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'relative h-1 overflow-hidden rounded-full',
                  step.state === 'done' && 'bg-emerald-600',
                  step.state === 'fail' && 'bg-destructive',
                  (step.state === 'now' || step.state === 'todo') && 'bg-slate-100',
                )}
              >
                {step.state === 'now' ? (
                  <span className="absolute inset-y-0 w-2/5 animate-[notif-progress_1.6s_var(--ease-premium)_infinite] rounded-full bg-brand motion-reduce:animate-none" />
                ) : null}
              </span>
              {step.label}
            </li>
          ))}
        </ol>

        <dl className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-px overflow-hidden rounded-xl border border-border bg-border">
          <div className="grid gap-0.5 bg-white px-3.5 py-3">
            <dt className="text-[10.5px] font-bold tracking-[0.12em] text-slate-500 uppercase">
              {t('Type')}
            </dt>
            <dd className="font-semibold text-foreground">{row.userNotificationTypeName}</dd>
          </div>
          <div className="grid gap-0.5 bg-white px-3.5 py-3">
            <dt className="text-[10.5px] font-bold tracking-[0.12em] text-slate-500 uppercase">
              {t('Status')}
            </dt>
            <dd className="font-semibold text-foreground">{row.userNotificationStatusName}</dd>
          </div>
          <div className="grid gap-0.5 bg-white px-3.5 py-3">
            <dt className="text-[10.5px] font-bold tracking-[0.12em] text-slate-500 uppercase">
              {t('DateCreated')}
            </dt>
            <dd className="font-semibold text-foreground tabular-nums">
              {formatNotificationDate(row.dateCreated)}
            </dd>
          </div>
          {expiration.show && row.expiresInDays !== null ? (
            <div className="grid gap-0.5 bg-white px-3.5 py-3">
              <dt className="text-[10.5px] font-bold tracking-[0.12em] text-slate-500 uppercase">
                {t('Expiration')}
              </dt>
              <dd
                className={cn(
                  'font-semibold tabular-nums',
                  row.expiresInDays <= 2 ? 'text-amber-700' : 'text-foreground',
                )}
              >
                {days(row.expiresInDays)}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="flex flex-wrap items-center gap-2.5">
          {fileUrl ? (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className={ADD_BUTTON_CLASS}>
              <Download aria-hidden strokeWidth={2.5} className={ADD_ICON_CLASS} />
              {EN.download}
            </a>
          ) : (
            <span className="text-[13px] text-slate-500">{processing ? EN.fileLater : EN.noFile}</span>
          )}
          <button
            type="button"
            disabled={!canDeleteNotification(row)}
            title={canDeleteNotification(row) ? undefined : EN.locked}
            aria-label={t('Remove')}
            onClick={() => setConfirmId(row.id)}
            className={cn(
              'group inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold outline-none',
              'transition-[background-color,transform,color,border-color] duration-300 ease-premium focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
              canDeleteNotification(row)
                ? 'border-destructive/30 text-destructive hover:-translate-y-px hover:bg-red-50 hover:text-red-700 active:translate-y-0 active:scale-[.98]'
                : 'cursor-not-allowed border-border text-slate-500',
            )}
          >
            {canDeleteNotification(row) ? (
              <Trash2
                aria-hidden
                className="size-4 transition-transform duration-300 group-hover:-rotate-12"
              />
            ) : (
              <Lock aria-hidden className="size-4" />
            )}
            {t('Remove')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="page-enter flex min-h-0 flex-1 flex-col gap-4 px-6 pt-5 pb-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl leading-7 font-semibold tracking-tight text-foreground">
            {t('UserNotifications')}
          </h1>
          {data ? (
            <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold text-brand tabular-nums">
              <CountUp text={`${t('Total')} ${total}`} />
            </span>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!unreadOnPage || pendingMarkRead}
          onClick={() => void markAllAsRead()}
          className="shadow-sm"
        >
          <Check aria-hidden className="size-4" />
          {t('MarkAllAsRead')}
        </Button>
      </header>

      <SaveToast notice={notice} onDismiss={dismissNotice} dismissLabel={FRAME_EN.dismiss} />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {body}
      </div>

      <ConfirmDialog
        open={confirmId !== null}
        onOpenChange={open => {
          if (!open) setConfirmId(null)
        }}
        title={EN.deleteTitle}
        message={t('DeleteConfirmationMsg')}
        confirmLabel={t('Confirm')}
        cancelLabel={t('Cancel')}
        pending={pendingDelete}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  )
}
