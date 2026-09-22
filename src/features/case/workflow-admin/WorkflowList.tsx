'use client'

import { ArrowDownAZ, ArrowUpAZ, Plus, Trash2 } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { toApiError, useApiRead } from '@/shared/api'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import {
  Button,
  ConfirmDialog,
  DelayedLoading,
  ErrorState,
  Pagination,
  SearchField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectionActions,
  SelectionClear,
  selectionButtonClass,
} from '@/shared/ui'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { cn } from '@/shared/ui/cn'
import { useRowWindow } from '@/shared/ui/use-row-window'
import {
  CfcWorkflowApprovalType,
  CfcWorkflowStatusType,
  WorkflowType,
  type CfcWorkflowDto,
} from '@/types/case'
import { deleteWorkflow, fetchWorkflows } from '../case-api'
import { PAGE_SIZES, PAGER_MIN_ROWS } from '@/features/settings/shared/list-model'
import { SaveToast, type Notice } from '@/features/settings/shared/SaveToast'
import { FRAME_EN } from '@/features/settings/shared/SettingsFrame'
import { useScreenText } from '@/features/settings/shared/use-screen-text'

const ITEM = PermissionItem.Case
const ADD = { item: ITEM, action: PermissionAction.Add }
const DELETE = { item: ITEM, action: PermissionAction.Delete }

const TEXT = {
  Add: 'Add',
  Delete: 'Delete',
  Search: 'Search',
  Confirm: 'Confirm',
  Cancel: 'Cancel',
  Clear: 'Clear',
  Selected: 'Selected',
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
  Approved: 'Approved',
  NotApproved: 'Not Approved',
  AutoApproved: 'Auto Approved',
  Live: 'Live',
  Disabled: 'Disabled',
  Students: 'Students',
  FinalWarnings: 'Final warnings',
  Workflows: 'Workflows',
  General: 'General',
  Engagement: 'Engagement',
  Name: 'Name',
  SortBy: 'Sort by',
  First: 'First',
  Last: 'Last',
  NoItems: 'There are no items to show.',
  Select: 'Select',
} as const

const EN = {
  clearSearch: 'Clear search',
  addWorkflow: 'Add workflow',
  listLabel: 'Workflows',
  studentsUnit: 'students',
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  pickWorkflow: 'Workflow',
  showTools: 'Show list tools',
  hideTools: 'Hide list tools',
} as const

const PAGE_STEP = 10

type Cursor = { row: number; col: 0 | 1 }

const cellId = (base: string, rowId: number, col: 0 | 1) => `${base}-${rowId}-${col}`

const APPROVAL_LABELS = {
  [CfcWorkflowApprovalType.Approve]: 'Approved',
  [CfcWorkflowApprovalType.NotApproved]: 'NotApproved',
  [CfcWorkflowApprovalType.AutoApprove]: 'AutoApproved',
} as const

const APPROVAL_TONE = {
  [CfcWorkflowApprovalType.Approve]: 'bg-blue-100 text-blue-800',
  [CfcWorkflowApprovalType.NotApproved]: 'bg-red-100 text-red-800',
  [CfcWorkflowApprovalType.AutoApprove]: 'bg-indigo-100 text-indigo-800',
} as const

type WorkflowsQueryState = {
  pageNumber: number
  pageSize: number
  sortCol: string
  sortDir: string
}

// seats-admin-workflow-creator.html:530-537: no sort until the user picks one, both fields sent empty.
const INITIAL_QUERY: WorkflowsQueryState = {
  pageNumber: 0,
  pageSize: 100,
  sortCol: '',
  sortDir: '',
}

// seats-admin-workflow-creator.html:224,249,259: the three sortable grid columns, by DTO field name.
const SORT_COLUMNS = ['name', 'totalStudentsInWorkflowCount', 'finalWarningStageChange'] as const

type WorkflowListProps = {
  selectedId: number | null
  reloadToken: number
  onSelect: (workflow: CfcWorkflowDto) => void
  onAdd: () => void
  onReloaded: (workflows: readonly CfcWorkflowDto[]) => void
  onDeleted?: (ids: readonly number[]) => void
}

function isBlankWorkflow(row: CfcWorkflowDto): boolean {
  return row.cfcWorkflowTypeId === WorkflowType.General || row.cfcWorkflowTypeId === WorkflowType.Engagement
}

function showMetric(value: number | string | null | undefined): boolean {
  return value !== null && value !== undefined
}

function matchesName(row: CfcWorkflowDto, search: string): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) return true
  return (row.name ?? '').toLowerCase().includes(needle)
}

export function WorkflowList({
  selectedId,
  reloadToken,
  onSelect,
  onAdd,
  onReloaded,
  onDeleted,
}: WorkflowListProps) {
  const t = useScreenText(TEXT)
  const profile = useProfile()
  const canAdd = profile.can(ADD)
  const canDelete = profile.can(DELETE)

  const [query, setQuery] = useState<WorkflowsQueryState>(INITIAL_QUERY)
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [selection, setSelection] = useState<{ source: number; ids: ReadonlySet<number> }>({
    source: 0,
    ids: new Set(),
  })
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [fetchPass, setFetchPass] = useState(0)

  const selectionKey = fetchPass + reloadToken

  const searching = search.trim() !== ''
  const load = useCallback(
    (signal: AbortSignal) =>
      fetchWorkflows(
        searching
          ? { sortCol: query.sortCol, sortDir: query.sortDir }
          : {
              pageNumber: query.pageNumber,
              pageSize: query.pageSize,
              sortCol: query.sortCol,
              sortDir: query.sortDir,
            },
        signal,
      ),
    [query.pageNumber, query.pageSize, query.sortCol, query.sortDir, searching],
  )
  const read = useApiRead(`case-workflows:${JSON.stringify(query)}:${searching}:${selectionKey}`, load)

  const rows = useMemo(() => read.data?.items ?? [], [read.data?.items])
  const filtered = useMemo(() => rows.filter(row => matchesName(row, search)), [rows, search])
  // With no workflows at all the main panel owns the message and the Add action, so the list stays quiet.
  const noWorkflows = read.status === 'success' && rows.length === 0
  const total = searching
    ? filtered.length
    : Math.max(read.data?.totalRowCount ?? 0, query.pageNumber * query.pageSize + rows.length)

  useEffect(() => {
    if (read.status !== 'success') return
    onReloaded(rows)
  }, [read.status, rows, onReloaded])

  const selected = selection.source === selectionKey ? selection.ids : new Set<number>()
  const setSelected = (ids: ReadonlySet<number>) => setSelection({ source: selectionKey, ids })
  const selectedCount = canDelete ? selected.size : 0
  const showChecks = selectedCount > 0

  const dismissNotice = useCallback(() => setNotice(null), [])

  const submitSearch = () => {
    setSearch(draft)
    setSelected(new Set())
  }

  const clearSearch = () => {
    setDraft('')
    setSearch('')
    setSelected(new Set())
  }

  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      const ids = [...selected]
      await deleteWorkflow(ids)
      onDeleted?.(ids)
      setSelected(new Set())
      setQuery(current => ({ ...current, pageNumber: 0 }))
      setFetchPass(current => current + 1)
      setNotice({ id: Date.now(), tone: 'success', message: t('AlertDeleteSuccessDefault') })
    } catch (caught) {
      const error = toApiError(caught)
      const message =
        error.kind === 'blocked'
          ? FRAME_EN.safeMode
          : error.kind === 'http' && error.status === 400 && error.serverMessage
            ? error.serverMessage
            : t('AlertDeleteErrorDefault')
      setNotice({ id: Date.now(), tone: 'error', message })
    } finally {
      setDeleting(false)
      setConfirming(false)
    }
  }

  const selectedLabel = `${selectedCount} ${t('Selected')}`

  const sortLabel = (column: string) =>
    column === 'name' ? t('Name') : column === 'finalWarningStageChange' ? t('FinalWarnings') : t('Students')

  const baseId = useId()
  const panelId = `${baseId}-panel`
  const [toolsOpen, setToolsOpen] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const rowWindow = useRowWindow(filtered.length, scroller)
  const [cursor, setCursor] = useState<Cursor | null>(null)
  const focusPending = useRef(false)
  const selectedIndex = filtered.findIndex(row => row.id === selectedId)
  const focusRow = Math.max(0, Math.min(cursor ? cursor.row : selectedIndex, filtered.length - 1))
  const focusCol: 0 | 1 = canDelete && cursor?.col === 0 ? 0 : 1

  // Keyboard moves render the target row first (it may be outside the window), then focus it.
  useEffect(() => {
    if (!focusPending.current) return
    const row = filtered[focusRow]
    if (!row) {
      focusPending.current = false
      return
    }
    const target = document.getElementById(cellId(baseId, row.id, focusCol))
    if (target) {
      focusPending.current = false
      target.focus()
      return
    }
    const node = scroller.current
    if (!node) return
    node.scrollTop = (focusRow / filtered.length) * node.scrollHeight
    rowWindow.onScroll()
  }, [baseId, filtered, focusCol, focusRow, rowWindow])

  const moveFocus = (event: KeyboardEvent<HTMLTableRowElement>, row: CfcWorkflowDto) => {
    const last = filtered.length - 1
    let next: Cursor = { row: focusRow, col: focusCol }
    switch (event.key) {
      case 'ArrowDown':
        next = { ...next, row: Math.min(focusRow + 1, last) }
        break
      case 'ArrowUp':
        next = { ...next, row: Math.max(focusRow - 1, 0) }
        break
      case 'PageDown':
        next = { ...next, row: Math.min(focusRow + PAGE_STEP, last) }
        break
      case 'PageUp':
        next = { ...next, row: Math.max(focusRow - PAGE_STEP, 0) }
        break
      case 'Home':
        next = { ...next, row: 0 }
        break
      case 'End':
        next = { ...next, row: last }
        break
      case 'ArrowLeft':
        if (!canDelete) return
        next = { ...next, col: 0 }
        break
      case 'ArrowRight':
        next = { ...next, col: 1 }
        break
      case 'Enter':
      case ' ':
        if (focusCol === 0) return
        event.preventDefault()
        onSelect(row)
        return
      default:
        return
    }
    event.preventDefault()
    focusPending.current = true
    setCursor(next)
  }

  // A click or Tab into a cell makes that cell the grid's single Tab stop.
  const trackFocus = (event: FocusEvent<HTMLTableElement>) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) return
    const row = Number(target.dataset.row)
    const col = target.dataset.col === '0' ? 0 : 1
    if (Number.isNaN(row) || (cursor?.row === row && cursor.col === col)) return
    setCursor({ row, col })
  }

  return (
    <>
      {/* Below the workspace breakpoint the list is one Select, so the canvas keeps the full width. */}
      <div className="flex flex-wrap items-end gap-2 lg:hidden">
        {/* With the tools open the full list is on screen, so the picker would be a second control for it. */}
        <div className={cn('min-w-[12rem] flex-1', toolsOpen && 'hidden')}>
          <label htmlFor="workflow-picker" className="mb-1 block text-xs font-medium text-muted-foreground">
            {EN.pickWorkflow}
          </label>
          <Select
            value={selectedId === null ? '' : String(selectedId)}
            disabled={read.status !== 'success' || filtered.length === 0}
            onValueChange={value => {
              const row = filtered.find(item => String(item.id) === value)
              if (row) onSelect(row)
            }}
          >
            <SelectTrigger id="workflow-picker" className="w-full">
              <SelectValue placeholder={EN.pickWorkflow} />
            </SelectTrigger>
            <SelectContent>
              {filtered.map(row => (
                <SelectItem key={row.id} value={String(row.id)}>
                  {row.name ?? ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canAdd ? (
          <Button size="sm" onClick={onAdd}>
            <Plus aria-hidden className="size-4" />
            {EN.addWorkflow}
          </Button>
        ) : null}
        {/* Search, sort, bulk delete and paging stay reachable below lg through this disclosure. */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-expanded={toolsOpen}
          aria-controls={panelId}
          onClick={() => setToolsOpen(current => !current)}
        >
          {toolsOpen ? EN.hideTools : EN.showTools}
        </Button>
      </div>

      {/* 20rem: at 280px the shared SearchField's inline Search button was clipped by overflow-hidden. */}
      {/* Tab order follows the visual order: selection bar, search, sort, sort direction, list (one stop), pager, Add. */}
      <aside
        id={panelId}
        className={cn(
          'shrink-0 flex-col gap-2 overflow-hidden rounded-xl border border-border bg-white shadow-sm lg:sticky lg:top-0 lg:flex lg:max-h-[calc(100dvh-10.5rem)] lg:w-80 lg:self-start',
          toolsOpen ? 'flex max-h-[70dvh] w-full' : 'hidden',
        )}
      >
        <SaveToast notice={notice} onDismiss={dismissNotice} dismissLabel={FRAME_EN.dismiss} />

        {canDelete && filtered.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
            <SelectionActions
              count={selectedCount}
              selectedLabel={selectedLabel}
              clearLabel={t('Clear')}
              onClear={() => setSelected(new Set())}
              showClear={false}
            />
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => setConfirming(true)}
              className={selectionButtonClass(selectedCount > 0, 'destructive', 'ml-auto')}
            >
              <Trash2 aria-hidden />
              {t('Delete')}
            </button>
            <SelectionClear
              active={selectedCount > 0}
              label={t('Clear')}
              onClear={() => setSelected(new Set())}
            />
          </div>
        ) : null}

        <div className="px-3 pt-3">
          <SearchField
            id="workflow-list-search"
            value={draft}
            onValueChange={setDraft}
            onSubmit={submitSearch}
            onClear={clearSearch}
            placeholder={`${t('Search')}...`}
            submitLabel={t('Search')}
            clearLabel={EN.clearSearch}
            showClear={Boolean(draft || search)}
            className="w-full focus-within:w-full"
          />
        </div>

        <div className="flex items-center gap-2 px-3">
          <Select
            value={query.sortCol}
            onValueChange={value => {
              setQuery(current => ({
                ...current,
                sortCol: value,
                sortDir: current.sortDir || 'asc',
                pageNumber: 0,
              }))
              setSelected(new Set())
            }}
          >
            <SelectTrigger id="workflow-list-sort" className="h-8 flex-1 text-xs" aria-label={t('SortBy')}>
              <SelectValue placeholder={t('SortBy')} />
            </SelectTrigger>
            <SelectContent>
              {SORT_COLUMNS.map(column => (
                <SelectItem key={column} value={column}>
                  {sortLabel(column)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={!query.sortCol}
            aria-label={query.sortDir === 'asc' ? EN.sortDescending : EN.sortAscending}
            onClick={() => {
              setQuery(current => ({
                ...current,
                sortDir: current.sortDir === 'asc' ? 'desc' : 'asc',
                pageNumber: 0,
              }))
              setSelected(new Set())
            }}
          >
            {query.sortDir === 'asc' ? (
              <ArrowDownAZ aria-hidden className="size-4" />
            ) : (
              <ArrowUpAZ aria-hidden className="size-4" />
            )}
          </Button>
        </div>

        <div ref={scroller} onScroll={rowWindow.onScroll} className="min-h-0 flex-1 overflow-auto">
          {read.status === 'error' ? (
            <div className="p-3">
              <ErrorState
                message={t('AlertGeneralErrorDefault')}
                retryLabel={t('Refresh')}
                onRetry={read.reload}
                error={read.error}
              />
            </div>
          ) : read.status !== 'success' ? (
            <div className="grid h-40 place-items-center">
              <DelayedLoading active label={t('Loading')} />
            </div>
          ) : filtered.length === 0 ? (
            <p
              role="status"
              className="animate-fade-in px-4 py-8 text-center text-sm text-muted-foreground motion-reduce:animate-none"
            >
              {t('NoItems')}
            </p>
          ) : (
            // APG grid: one Tab stop, arrows move between rows and between the tick and the workflow cell.
            <table
              role="grid"
              aria-label={EN.listLabel}
              aria-rowcount={filtered.length}
              className="block w-full"
              onFocus={trackFocus}
            >
              <tbody className="block">
                {rowWindow.padTop > 0 ? (
                  <tr
                    data-row-spacer
                    aria-hidden
                    className="block"
                    style={{ height: `${rowWindow.padTop}px` }}
                  >
                    <td className="block" />
                  </tr>
                ) : null}
                {filtered.slice(rowWindow.start, rowWindow.end).map((row, offset) => {
                  const index = rowWindow.start + offset
                  const active = row.id === selectedId
                  const blank = isBlankWorkflow(row)
                  const approvalKey =
                    APPROVAL_LABELS[row.cfcWorkflowApprovalTypeId as keyof typeof APPROVAL_LABELS]
                  const approvalTone =
                    APPROVAL_TONE[row.cfcWorkflowApprovalTypeId as keyof typeof APPROVAL_TONE] ??
                    'bg-slate-100 text-slate-700'
                  const typeLabel = blank
                    ? row.cfcWorkflowTypeId === WorkflowType.General
                      ? t('General')
                      : t('Engagement')
                    : null
                  const students =
                    !blank && showMetric(row.totalStudentsInWorkflowCount)
                      ? `${row.totalStudentsInWorkflowCount} ${EN.studentsUnit}`
                      : null
                  const live =
                    !blank && showMetric(row.cfcWorkflowStatusTypeId)
                      ? row.cfcWorkflowStatusTypeId === CfcWorkflowStatusType.Live
                      : null
                  const stop = (col: 0 | 1) => (index === focusRow && col === focusCol ? 0 : -1)

                  return (
                    <tr
                      key={row.id}
                      role="row"
                      aria-rowindex={index + 1}
                      aria-selected={active}
                      className={cn(
                        'group relative flex cursor-pointer items-start gap-2 border-b border-border/70 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-brand/[0.05]',
                        active && 'border-l-[3px] border-l-brand bg-brand/[0.08] pl-[calc(0.75rem-3px)]',
                      )}
                      onClick={() => onSelect(row)}
                      onKeyDown={event => moveFocus(event, row)}
                    >
                      {canDelete ? (
                        <td role="gridcell" className="flex shrink-0">
                          <input
                            id={cellId(baseId, row.id, 0)}
                            data-row={index}
                            data-col={0}
                            type="checkbox"
                            tabIndex={stop(0)}
                            aria-label={`${t('Select')} ${row.name ?? ''}`}
                            checked={selected.has(row.id)}
                            className={cn(
                              'mt-1 size-4 shrink-0 cursor-pointer rounded-sm accent-brand transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                              showChecks
                                ? 'opacity-100'
                                : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100',
                            )}
                            onClick={event => event.stopPropagation()}
                            onChange={() => toggle(row.id)}
                          />
                        </td>
                      ) : null}
                      <td
                        role="gridcell"
                        id={cellId(baseId, row.id, 1)}
                        data-row={index}
                        data-col={1}
                        tabIndex={stop(1)}
                        className="block min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 text-sm font-semibold break-words text-slate-800">
                            {row.name}
                          </p>
                          {!blank && approvalKey ? (
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
                                approvalTone,
                              )}
                            >
                              {t(approvalKey)}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {students ? (
                            <span className="text-xs text-muted-foreground tabular-nums">{students}</span>
                          ) : null}
                          {live !== null ? (
                            <StatusBadge tone={live ? 'success' : 'neutral'} pulse={live}>
                              {live ? t('Live') : t('Disabled')}
                            </StatusBadge>
                          ) : null}
                          {typeLabel ? (
                            <span className="text-xs text-muted-foreground">{typeLabel}</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {rowWindow.padBottom > 0 ? (
                  <tr
                    data-row-spacer
                    aria-hidden
                    className="block"
                    style={{ height: `${rowWindow.padBottom}px` }}
                  >
                    <td className="block" />
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>

        {read.status === 'success' && !searching && total >= PAGER_MIN_ROWS ? (
          <Pagination
            id="workflow-list-page-size"
            pageIndex={query.pageNumber}
            pageSize={query.pageSize}
            total={total}
            pageSizes={PAGE_SIZES}
            onPageChange={pageNumber => {
              setQuery(current => ({ ...current, pageNumber }))
              setSelected(new Set())
            }}
            onPageSizeChange={pageSize => {
              setQuery(current => ({ ...current, pageSize, pageNumber: 0 }))
              setSelected(new Set())
            }}
            labels={{
              itemsPerPage: t('NumberOfItemsPerPage'),
              of: t('Of'),
              first: t('First'),
              previous: t('Previous'),
              next: t('Next'),
              last: t('Last'),
            }}
            className="border-t border-border px-2 py-2"
          />
        ) : null}

        {canAdd && !noWorkflows ? (
          <div className="border-t border-border p-3">
            <Button size="sm" className="w-full shadow-sm" onClick={onAdd}>
              <Plus aria-hidden className="size-4" />
              {EN.addWorkflow}
            </Button>
          </div>
        ) : null}

        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title={t('Delete')}
          message={t('DeleteConfirmationMsg')}
          confirmLabel={t('Confirm')}
          cancelLabel={t('Cancel')}
          onConfirm={() => void confirmDelete()}
          pending={deleting}
        />
      </aside>
    </>
  )
}
