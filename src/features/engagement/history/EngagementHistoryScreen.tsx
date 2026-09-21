'use client'

import { Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toApiError, useApiRead } from '@/shared/api'
import {
  Button,
  DateRangeField,
  DelayedLoading,
  Dialog,
  ErrorState,
  FilterPanel,
  LookupSearch,
  MultiSelect,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  sameFilters,
  type FilterChip,
} from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import type {
  EngagementHistoryItem,
  EngagementHistoryView,
  EngagementMessageDto,
  EngagementStatsItem,
  EngagementStudentScoreItem,
} from '@/types/engagement-history'
import { formatDate } from '../configuration/engagement-models'
import {
  engagementFailureText,
  EngagementGate,
  EngagementNoticeBar,
  EngagementWorkspace,
  type EngagementNotice,
} from '../EngagementFrame'
import { ENGAGEMENT_FALLBACK_ONLY, useEngagementText, type EngagementText } from '../engagement-text'
import {
  exportHistory,
  fetchCalculationPeriod,
  fetchHistoryModels,
  fetchHistoryNodes,
  fetchStats,
  fetchStudentScores,
  searchHistoryStudents,
} from './history-api'
import {
  formatCalculated,
  HISTORY_PAGE_SIZE,
  HISTORY_PAGE_SIZES,
  HISTORY_STATUSES,
  parseFilterDate,
  parseMessageList,
  periodFilters,
  REFRESH_INTERVALS,
  wantsTotal,
  shortNumber,
  SORT_OPTIONS,
  type HistoryFilters,
  type HistoryPage,
  type HistoryQuery,
  type SortOption,
} from './history-query'
import { EmptyState } from '@/shared/ui/EmptyState'
import { CountUp } from '@/shared/ui/CountUp'
import { ScrollEdges } from '@/shared/ui/ScrollEdges'
import { HistoryExportMenu } from './HistoryExportMenu'

const NEVER = 'never'
// Calendar preset from GetCalculationPeriod, the range the page opens with.
const CALCULATION_PERIOD = 'Calculation period'
const ALL = 'all'
const HEAD =
  'sticky top-0 z-10 h-10 bg-brand px-3 text-left align-middle text-xs font-medium tracking-[0.02em] whitespace-nowrap text-white'
const CELL = 'border-b border-border px-3 py-2.5 whitespace-nowrap text-slate-700'
const PAGER_MIN_ROWS = 10
// Student lookups are capped so a broad query never renders thousands of options.
const STUDENT_RESULTS = 50

type Row = EngagementStatsItem | EngagementStudentScoreItem
type OpenMessages = { title: string; items: string[] }

export function EngagementHistoryScreen() {
  return (
    <EngagementGate>
      <HistoryLoader />
    </EngagementGate>
  )
}

function HistoryLoader() {
  const t = useEngagementText()
  const load = useCallback((signal: AbortSignal) => fetchCalculationPeriod(signal), [])
  const period = useApiRead('engagement:period', load)
  if (period.status === 'error')
    return (
      <EngagementWorkspace activeId="engagement-history" title={t('History')}>
        <ErrorState
          message={t('AlertGeneralErrorDefault')}
          retryLabel={t('Refresh')}
          onRetry={period.reload}
          error={period.error}
        />
      </EngagementWorkspace>
    )
  if (period.status !== 'success')
    return (
      <EngagementWorkspace activeId="engagement-history" title={t('History')}>
        <DelayedLoading active variant="page" label={t('Loading')} />
      </EngagementWorkspace>
    )
  return <HistoryWorkspace initial={periodFilters(period.data ?? null, new Date())} />
}

function Field({
  id,
  label,
  children,
  className,
}: {
  id: string
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function statusClass(status: string | null) {
  // _setStatusColor (seats-admin-engagement-history.html:1000-1009).
  return status === 'Error'
    ? 'bg-red-50 text-red-700'
    : status === 'Finished'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'Processing'
        ? 'bg-slate-100 text-slate-500'
        : 'bg-slate-50 text-slate-700'
}

function sortLabel(option: SortOption) {
  return option === 'periodnumber-desc'
    ? ENGAGEMENT_FALLBACK_ONLY.periodNewest
    : option === 'periodnumber-asc'
      ? ENGAGEMENT_FALLBACK_ONLY.periodOldest
      : option === 'calculated-desc'
        ? ENGAGEMENT_FALLBACK_ONLY.calculatedNewest
        : ENGAGEMENT_FALLBACK_ONLY.calculatedOldest
}

function HistoryWorkspace({ initial }: { initial: HistoryFilters }) {
  const t = useEngagementText()
  const [draft, setDraft] = useState<HistoryFilters>(initial)
  const studio = useMemo(
    () => ({
      presets: [
        {
          key: 'calculation-period',
          label: CALCULATION_PERIOD,
          start: parseFilterDate(initial.start),
          end: parseFilterDate(initial.end),
          tone: 'var(--color-brand-avatar)',
        },
      ],
    }),
    [initial],
  )
  const [query, setQuery] = useState<HistoryQuery>({
    view: 'Stats',
    filters: initial,
    pageIndex: 0,
    pageSize: HISTORY_PAGE_SIZE,
  })
  const [total, setTotal] = useState<number | null>(null)
  // Read by the page loader without re-creating it, so a new total never triggers another request.
  const totalRef = useRef<number | null>(null)
  useEffect(() => {
    totalRef.current = total
  }, [total])
  const [openMessages, setOpenMessages] = useState<OpenMessages | null>(null)
  const [notice, setNotice] = useState<EngagementNotice | null>(null)
  const [exporting, setExporting] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null)
  const refreshTimerRef = useRef<number | null>(null)
  const dismiss = useCallback(() => setNotice(null), [])

  const loadModels = useCallback((signal: AbortSignal) => fetchHistoryModels(signal), [])
  const loadNodes = useCallback((signal: AbortSignal) => fetchHistoryNodes(signal), [])
  const models = useApiRead('engagement:history-models', loadModels)
  const nodes = useApiRead('engagement:history-nodes', loadNodes)

  const loadPage = useCallback(
    async (signal: AbortSignal): Promise<HistoryPage<Row>> => {
      // seats-admin-engagement-history.html:801,865,908: the count is asked for while none is known (B7).
      const wantTotal = wantsTotal(query.pageIndex, totalRef.current)
      const page: HistoryPage<Row> =
        query.view === 'Stats'
          ? await fetchStats(query, signal, wantTotal)
          : await fetchStudentScores(query, signal, wantTotal)
      if (wantTotal) setTotal(page.totalRowCount)
      return page
    },
    [query],
  )
  const read = useApiRead(`engagement:history:${JSON.stringify(query)}`, loadPage)

  // _ajaxCall clears the timer and either polls or runs once (seats-admin-engagement-history.html:757-764,1080-1082).
  const { reload } = read
  const applyRefreshInterval = useCallback(
    (ms: number | null) => {
      if (refreshTimerRef.current !== null) {
        window.clearInterval(refreshTimerRef.current)
        refreshTimerRef.current = null
      }
      if (ms) refreshTimerRef.current = window.setInterval(reload, ms)
      else reload()
    },
    [reload],
  )
  useEffect(
    () => () => {
      if (refreshTimerRef.current !== null) window.clearInterval(refreshTimerRef.current)
    },
    [],
  )

  const search = (filters: HistoryFilters, view: EngagementHistoryView = query.view) => {
    setTotal(null)
    setQuery({ view, filters, pageIndex: 0, pageSize: query.pageSize })
  }
  // D-097, following D-112: a picked value reloads at once; nothing waits for a Search button.
  const apply = (filters: HistoryFilters) => {
    setDraft(filters)
    if (!sameFilters(filters, query.filters)) search(filters)
  }

  const isStats = query.view === 'Stats'
  const page = read.status === 'success' ? read.data : undefined
  const rows = page?.items ?? []
  const modelOptions = (models.data ?? []).map(option => ({ value: String(option.id), label: option.label }))
  const nodeOptions = (nodes.data ?? []).map(option => ({ value: String(option.id), label: option.label }))
  const statusOptions = HISTORY_STATUSES.map(status => ({ value: status, label: t(status) }))
  const multiLabels = (selected: (count: number) => string) => ({
    all: t('All'),
    placeholder: t('Select'),
    selected,
  })
  const trainingLabel = (value: HistoryFilters['isTrainingPeriod']) =>
    value === 'true' ? t('Yes') : value === 'false' ? t('No') : t('All')

  const chips = ((): FilterChip[] => {
    const applied = query.filters
    const list: FilterChip[] = [
      { id: 'range', label: t('DateRange'), value: `${applied.start} → ${applied.end}` },
    ]
    if (applied.isTrainingPeriod)
      list.push({
        id: 'training',
        label: t('IsTrainingPeriod'),
        value: trainingLabel(applied.isTrainingPeriod),
      })
    if (applied.modelIds.length)
      list.push({ id: 'models', label: t('Models'), value: String(applied.modelIds.length) })
    if (applied.nodeIds.length)
      list.push({ id: 'nodes', label: t('Nodes'), value: String(applied.nodeIds.length) })
    if (isStats && applied.status.length)
      list.push({ id: 'status', label: t('Status'), value: applied.status.join(', ') })
    if (isStats && applied.containing)
      list.push({ id: 'containing', label: t('Containing'), value: applied.containing })
    if (!isStats && applied.student)
      list.push({ id: 'student', label: t('Students'), value: applied.student.label })
    return list
  })()

  const runExport = async (exportTo: number) => {
    setExporting(true)
    try {
      await exportHistory(query, exportTo)
      setNotice({ id: Date.now(), tone: 'success', message: t('ReportProcessing') })
    } catch (error) {
      const problem = toApiError(error)
      setNotice({
        id: Date.now(),
        tone: 'error',
        message:
          problem.kind === 'blocked'
            ? ENGAGEMENT_FALLBACK_ONLY.exportBlocked
            : engagementFailureText(error, t('AlertGeneralErrorDefault')),
      })
    } finally {
      setExporting(false)
    }
  }

  const messageCell = (value: EngagementMessageDto | null, title: string) =>
    value && value.count > 0 ? (
      <button
        type="button"
        onClick={() => setOpenMessages({ title, items: parseMessageList(value.messages) })}
        aria-label={`${value.count} ${title}`}
        className="rounded-sm font-semibold text-brand tabular-nums underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {value.count}
      </button>
    ) : (
      <span className="text-muted-foreground tabular-nums">{value?.count ?? 0}</span>
    )

  const numberCell = (value: number | null) => (
    <span title={value === null ? undefined : String(value)} className="tabular-nums">
      {shortNumber(value)}
    </span>
  )

  const columns: { key: string; label: string; render: (row: Row) => ReactNode; numeric?: boolean }[] = [
    { key: 'period', label: t('Period'), render: row => row.period },
    { key: 'calculated', label: t('Calculated'), render: row => formatCalculated(row.calculated) },
    { key: 'training', label: t('Training'), render: row => (row.training ? t('Yes') : t('No')) },
    {
      key: 'model',
      label: t('Model'),
      render: row => <span className="font-semibold text-foreground">{row.model}</span>,
    },
    { key: 'node', label: t('Node'), render: row => row.node },
    {
      key: 'status',
      label: t('Status'),
      render: row => (
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            statusClass(row.status),
          )}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {row.status}
        </span>
      ),
    },
    {
      key: 'instances',
      label: t('Instances'),
      numeric: true,
      render: row => <span className="tabular-nums">{row.instances}</span>,
    },
    ...(!isStats
      ? [
          {
            key: 'studentId',
            label: t('StudentId'),
            render: (row: Row) => ('studentId' in row ? row.studentId : ''),
          },
        ]
      : []),
    {
      key: 'min',
      label: t('Min'),
      numeric: true,
      render: (row: EngagementHistoryItem) => numberCell(row.min),
    },
    {
      key: 'max',
      label: t('Max'),
      numeric: true,
      render: (row: EngagementHistoryItem) => numberCell(row.max),
    },
    {
      key: 'mean',
      label: t('Mean'),
      numeric: true,
      render: (row: EngagementHistoryItem) => numberCell(row.mean),
    },
    { key: 'sd', label: t('SD'), numeric: true, render: (row: EngagementHistoryItem) => numberCell(row.sd) },
    ...(isStats
      ? [
          {
            key: 'errors',
            label: t('Errors'),
            numeric: true,
            render: (row: Row) => ('errors' in row ? messageCell(row.errors, t('Errors')) : null),
          },
          {
            key: 'warnings',
            label: t('Warnings'),
            numeric: true,
            render: (row: Row) => ('warnings' in row ? messageCell(row.warnings, t('Warnings')) : null),
          },
          {
            key: 'messages',
            label: t('Messages'),
            numeric: true,
            render: (row: Row) => ('messages' in row ? messageCell(row.messages, t('Messages')) : null),
          },
        ]
      : (['r', 'z', 'dr', 'dz', 'zdz', 'p'] as const).map(key => ({
          key,
          label:
            key === 'zdz' ? 'Zdz' : key.length === 2 ? `${key[0].toUpperCase()}${key[1]}` : key.toUpperCase(),
          numeric: true,
          render: (row: Row) => ('r' in row ? numberCell(row[key]) : null),
        }))),
  ]

  const totalText = `${t('Total')} ${total ?? 0}`

  return (
    <EngagementWorkspace
      activeId="engagement-history"
      title={t('History')}
      actions={
        read.status === 'success' && page ? (
          <HistoryExportMenu busy={exporting} onExport={exportTo => void runExport(exportTo)} t={t} />
        ) : null
      }
    >
      <EngagementNoticeBar notice={notice} onDismiss={dismiss} />

      {/* Tab order is visual: views, then each filter left to right, top to bottom. */}
      <FilterPanel
        labels={{
          title: t('Filters'),
          views: ENGAGEMENT_FALLBACK_ONLY.views,
          reset: ENGAGEMENT_FALLBACK_ONLY.reset,
          expand: ENGAGEMENT_FALLBACK_ONLY.expandFilters,
          collapse: ENGAGEMENT_FALLBACK_ONLY.collapseFilters,
          activeFilters: ENGAGEMENT_FALLBACK_ONLY.activeFilters,
          remove: label => `${t('Clear')} ${label}`,
        }}
        views={[
          { id: 'Stats', label: t('Stats'), tone: 'blue', count: isStats ? total : null },
          { id: 'StudentScore', label: t('StudentScore'), tone: 'sky', count: isStats ? null : total },
        ]}
        activeView={query.view}
        onViewChange={view => search(draft, view as EngagementHistoryView)}
        chips={chips}
        canReset={!sameFilters(draft, initial) || !sameFilters(query.filters, initial)}
        onReset={() => {
          setDraft(initial)
          search(initial)
        }}
        gridClassName="@[40rem]:grid-cols-2 @[64rem]:grid-cols-4"
      >
        <Field id="history-training" label={t('IsTrainingPeriod')}>
          <Select
            value={draft.isTrainingPeriod || ALL}
            onValueChange={value =>
              apply({ ...draft, isTrainingPeriod: value === ALL ? '' : (value as 'true' | 'false') })
            }
          >
            <SelectTrigger id="history-training" className="h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t('All')}</SelectItem>
              <SelectItem value="true">{t('Yes')}</SelectItem>
              <SelectItem value="false">{t('No')}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <DateRangeField
          id="history-range"
          start={parseFilterDate(draft.start)}
          end={parseFilterDate(draft.end)}
          onChange={(start, end) => apply({ ...draft, start: formatDate(start), end: formatDate(end) })}
          formatDate={formatDate}
          studio={studio}
          className="@[40rem]:col-span-1"
          labels={{
            dateRange: t('DateRange'),
            startDate: t('From'),
            endDate: t('To'),
            close: t('Close'),
            cancel: t('Cancel'),
            selectRange: t('SelectRange'),
            chooseMonthYear: ENGAGEMENT_FALLBACK_ONLY.chooseMonthYear,
            previous: t('Previous'),
            next: t('Next'),
            today: t('Today'),
            last7Days: ENGAGEMENT_FALLBACK_ONLY.last7Days,
            last14Days: ENGAGEMENT_FALLBACK_ONLY.last14Days,
            last30Days: ENGAGEMENT_FALLBACK_ONLY.last30Days,
          }}
        />
        <Field id="history-models" label={t('Models')}>
          <MultiSelect
            id="history-models"
            label={t('Models')}
            options={modelOptions}
            value={draft.modelIds.map(String)}
            onChange={value => apply({ ...draft, modelIds: value.map(Number) })}
            labels={multiLabels(ENGAGEMENT_FALLBACK_ONLY.modelsSelected)}
            disabled={models.status !== 'success'}
          />
        </Field>
        <Field id="history-nodes" label={t('Nodes')}>
          <MultiSelect
            id="history-nodes"
            label={t('Nodes')}
            options={nodeOptions}
            value={draft.nodeIds.map(String)}
            onChange={value => apply({ ...draft, nodeIds: value.map(Number) })}
            labels={multiLabels(ENGAGEMENT_FALLBACK_ONLY.nodesSelected)}
            disabled={nodes.status !== 'success'}
          />
        </Field>
        {isStats ? (
          <>
            <Field id="history-status" label={t('Status')}>
              <MultiSelect
                id="history-status"
                label={t('Status')}
                options={statusOptions}
                value={draft.status}
                onChange={value => apply({ ...draft, status: value })}
                labels={multiLabels(ENGAGEMENT_FALLBACK_ONLY.statusSelected)}
              />
            </Field>
            <Field id="history-containing" label={t('Containing')}>
              <input
                id="history-containing"
                type="search"
                maxLength={200}
                autoComplete="off"
                placeholder={t('Search')}
                value={draft.containing}
                // Typed text waits for Enter or leaving the box, like Battery % on Devices (D-112).
                onChange={event => setDraft({ ...draft, containing: event.target.value })}
                onKeyDown={event => {
                  if (event.key === 'Enter') apply(draft)
                }}
                onBlur={() => apply(draft)}
                className="field-bloom h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            </Field>
          </>
        ) : (
          <Field id="history-student" label={t('Students')}>
            <LookupSearch
              id="history-student"
              label={t('Students')}
              placeholder={ENGAGEMENT_FALLBACK_ONLY.studentHint}
              clearLabel={ENGAGEMENT_FALLBACK_ONLY.clearStudent}
              cacheKey="engagement:students"
              minLength={2}
              maxResults={STUDENT_RESULTS}
              selected={draft.student}
              search={searchHistoryStudents}
              onSelect={student => apply({ ...draft, student })}
            />
          </Field>
        )}
        <Field id="history-refresh" label={t('RefreshInterval')}>
          <Select
            value={refreshInterval === null ? NEVER : String(refreshInterval)}
            onValueChange={value => {
              const next = value === NEVER ? null : Number(value)
              setRefreshInterval(next)
              applyRefreshInterval(next)
            }}
          >
            <SelectTrigger id="history-refresh" className="h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NEVER}>{t('Never')}</SelectItem>
              {REFRESH_INTERVALS.map(ms => (
                <SelectItem key={ms} value={String(ms)}>
                  {secondsLabel(ms)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="history-sort" label={t('SortBy')}>
          <Select value={draft.sort} onValueChange={value => apply({ ...draft, sort: value as SortOption })}>
            <SelectTrigger id="history-sort" className="h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option} value={option}>
                  {sortLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FilterPanel>

      <section
        aria-label={t('History')}
        className="flex min-h-[28rem] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white shadow-sm"
      >
        <div className="flex min-h-[3.25rem] items-center gap-3 border-b border-border px-3 py-2">
          {total !== null && read.status === 'success' ? (
            <span className="inline-flex animate-fade-in items-center gap-1.5 rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold text-brand tabular-nums">
              <Users aria-hidden className="size-3.5" />
              <CountUp text={totalText} />
            </span>
          ) : null}
        </div>

        {read.status === 'error' ? (
          <ErrorState
            message={t('AlertGeneralErrorDefault')}
            retryLabel={t('Refresh')}
            onRetry={read.reload}
            error={read.error}
            className="m-6"
          />
        ) : read.status !== 'success' ? (
          <div className="min-h-60">
            <DelayedLoading active label={t('Loading')} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title={ENGAGEMENT_FALLBACK_ONLY.noItems} className="min-h-60" />
        ) : (
          <div className="min-h-0 flex-1 scroll-pt-10 overflow-auto">
            <ScrollEdges />
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  {columns.map(column => (
                    <th key={column.key} scope="col" className={cn(HEAD, column.numeric && 'text-right')}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={`${query.pageIndex}-${index}`}
                    style={{ animationDelay: `${Math.min(index, 12) * 18}ms` }}
                    className="animate-row-in transition-colors hover:bg-slate-50 motion-reduce:animate-none"
                  >
                    {columns.map(column => (
                      <td key={column.key} className={cn(CELL, column.numeric && 'text-right')}>
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {read.status === 'success' && (total ?? 0) >= PAGER_MIN_ROWS ? (
          <Pagination
            id="history-page-size"
            pageIndex={query.pageIndex}
            pageSize={query.pageSize}
            total={total ?? 0}
            pageSizes={HISTORY_PAGE_SIZES}
            onPageChange={pageIndex => setQuery(current => ({ ...current, pageIndex }))}
            onPageSizeChange={pageSize => setQuery(current => ({ ...current, pageIndex: 0, pageSize }))}
            labels={pagerLabels(t)}
          />
        ) : null}
      </section>

      {openMessages ? (
        <Dialog
          open
          onOpenChange={open => (open ? undefined : setOpenMessages(null))}
          title={openMessages.title}
          closeLabel={t('Close')}
          footer={
            <Button variant="outline" size="sm" onClick={() => setOpenMessages(null)}>
              {t('Close')}
            </Button>
          }
        >
          {openMessages.items.length ? (
            <ul className="max-h-80 divide-y divide-border overflow-auto rounded-md border border-border text-sm">
              {openMessages.items.map((item, index) => (
                <li key={`${index}-${item}`} className="px-3 py-2 break-words text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{ENGAGEMENT_FALLBACK_ONLY.noMessages}</p>
          )}
        </Dialog>
      ) : null}
    </EngagementWorkspace>
  )
}

const secondsLabel = (ms: number) => `${ms / 1000} ${ENGAGEMENT_FALLBACK_ONLY.seconds}`

function pagerLabels(t: EngagementText) {
  return {
    itemsPerPage: t('NumberOfItemsPerPage'),
    of: t('Of'),
    first: ENGAGEMENT_FALLBACK_ONLY.first,
    previous: t('Previous'),
    next: t('Next'),
    last: ENGAGEMENT_FALLBACK_ONLY.last,
  }
}
