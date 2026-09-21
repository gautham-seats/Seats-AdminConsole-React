'use client'

import { type LucideIcon } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { api, toApiError, useApiRead } from '@/shared/api'
import { pageEnvelope, pageTotal } from '@/shared/api/page-total'
import { STUDENTS_GROUP, type Permission } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import {
  ConfirmDialog,
  FilterPanel,
  Pagination,
  SearchField,
  SelectionActions,
  SelectionClear,
  selectionButtonClass,
  type FilterChip,
} from '@/shared/ui'
import { nextSortState, PAGE_SIZES, PAGER_MIN_ROWS } from '@/features/settings/shared/list-model'
import { SaveToast, type Notice } from '@/features/settings/shared/SaveToast'
import {
  FRAME_EN,
  SettingsGate,
  SettingsLayout,
  type WorkspaceArea,
} from '@/features/settings/shared/SettingsFrame'
import { SettingsTable, type TableColumn } from '@/features/settings/shared/SettingsTable'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { serverListQuery, STUDENT_PAGE_SIZE, type ServerSort } from './student-list'
import { CountUp } from '@/shared/ui/CountUp'

// Keys from swgrid.js, the sub-navigation pills and the bulk confirmation partials.
const TEXT = {
  Students: 'Students',
  GdprStudentDeleteMenu: 'Student Deletion',
  GdprManualStudentDeletion: 'Manual Student Deletion',
  GdprStudentRecycleBinMenu: 'Recycle Bin',
  Search: 'Search',
  Confirm: 'Confirm',
  Cancel: 'Cancel',
  Clear: 'Clear',
  Selected: 'Selected',
  SelectAll: 'Select All',
  Total: 'Total',
  Loading: 'Loading',
  Refresh: 'Refresh',
  Filters: 'Filters',
  Collapse: 'Collapse',
  NumberOfItemsPerPage: 'Number of items per page',
  Of: 'of',
  Next: 'Next',
  Previous: 'Previous',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
} as const

const EN = {
  noItems: 'There are no items to show.',
  clearSearch: 'Clear search',
  first: 'First',
  last: 'Last',
  select: 'Select',
  views: 'Views',
  resetFilters: 'Reset filters',
  expand: 'Expand',
  activeFilters: 'Active filters',
} as const

export type StudentAction = {
  permission: Permission
  label: string
  icon: LucideIcon
  destructive: boolean
  confirmTitle: string
  confirmMessage: string
  successMessage: string
  errorMessage: string
  path: string
}

type StudentListScreenProps<T extends { id: string }> = {
  sectionId: string
  access: Permission
  readKey: string
  path: string
  columns: readonly TableColumn<T>[]
  rowLabel: (row: T) => string
  initialSort: ServerSort
  sortable: boolean
  searchable: boolean
  action: StudentAction
  extraQuery?: Record<string, string>
  filters?: StudentFilters
  intro?: ReactNode
}

export type StudentFilters = {
  chips: readonly FilterChip[]
  canReset: boolean
  onReset: () => void
  content: ReactNode
}

export function StudentListScreen<T extends { id: string }>(props: StudentListScreenProps<T>) {
  return (
    <SettingsGate access={props.access}>
      <StudentListWorkspace {...props} />
    </SettingsGate>
  )
}

function StudentListWorkspace<T extends { id: string }>({
  sectionId,
  readKey,
  path,
  columns,
  rowLabel,
  initialSort,
  sortable,
  searchable,
  action,
  extraQuery,
  filters,
  intro,
}: StudentListScreenProps<T>) {
  const t = useScreenText(TEXT)
  const profile = useProfile()
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(STUDENT_PAGE_SIZE)
  const [sort, setSort] = useState<ServerSort>(initialSort)
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)
  // The dialog holds the rows chosen when it opened, so a reload behind it cannot empty the action.
  const [confirming, setConfirming] = useState<readonly string[] | null>(null)
  const [pending, setPending] = useState(false)
  const dismissNotice = useCallback(() => setNotice(null), [])

  // A new date range starts again from the first page, like the legacy grid reload.
  const [lastExtra, setLastExtra] = useState(extraQuery)
  if (lastExtra !== extraQuery) {
    setLastExtra(extraQuery)
    setPageIndex(0)
  }

  const query = useMemo(
    () => serverListQuery({ pageIndex, pageSize, sort, search }, extraQuery),
    [pageIndex, pageSize, sort, search, extraQuery],
  )
  const load = useCallback(
    async (signal: AbortSignal) => {
      return pageEnvelope<T>(await api.get<unknown>(path, { query, signal }), path)
    },
    [path, query],
  )
  const read = useApiRead(`${readKey}:${JSON.stringify(query)}:${attempt}`, load)
  const rows = useMemo(() => read.data?.items ?? [], [read.data])
  const total = pageTotal(read.data?.totalRowCount ?? 0, pageIndex, pageSize, rows.length)

  // swgrid.js:700 clears the selection on every load.
  const [selection, setSelection] = useState<{ source: unknown; ids: ReadonlySet<string> }>({
    source: null,
    ids: new Set(),
  })
  const selected = selection.source === read.data ? selection.ids : new Set<string>()
  const setSelected = (ids: ReadonlySet<string>) => setSelection({ source: read.data, ids })
  const canAct = profile.can(action.permission)

  const sections = useMemo<WorkspaceArea>(
    () => ({
      label: t('Students'),
      sections: STUDENTS_GROUP,
      labels: {
        'student-delete': t('GdprStudentDeleteMenu'),
        'student-manual-deletion': t('GdprManualStudentDeletion'),
        'student-recycle-bin': t('GdprStudentRecycleBinMenu'),
      },
    }),
    [t],
  )
  const title = sections.labels[sectionId] ?? t('Students')

  const runAction = async () => {
    const ids = confirming ?? []
    // An empty body returns 200 from the bulk endpoints, so it would report success having deleted nothing.
    if (ids.length === 0) {
      setConfirming(null)
      return
    }
    setPending(true)
    try {
      await api.post<void>(action.path, { body: [...ids] })
      setPageIndex(0)
      setDraft('')
      setSearch('')
      setAttempt(value => value + 1)
      setNotice({ id: Date.now(), tone: 'success', message: action.successMessage })
    } catch (caught) {
      const error = toApiError(caught)
      const message =
        error.kind === 'blocked'
          ? FRAME_EN.safeMode
          : error.kind === 'http' && error.status === 400 && error.serverMessage
            ? error.serverMessage
            : action.errorMessage
      setNotice({ id: Date.now(), tone: 'error', message })
    } finally {
      setPending(false)
      setConfirming(null)
    }
  }

  const ActionIcon = action.icon
  const totalLabel = `${t('Total')} ${total}`
  const selectedLabel = `${selected.size} ${t('Selected')}`

  return (
    <SettingsLayout
      sectionId={sectionId}
      title={title}
      area={sections}
      meta={
        read.status === 'success' ? (
          <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold text-brand tabular-nums">
            <CountUp text={totalLabel} />
          </span>
        ) : null
      }
    >
      <SaveToast notice={notice} onDismiss={dismissNotice} dismissLabel={FRAME_EN.dismiss} />
      {intro}
      {/* Tab order is visual: filter panel first, then search, selection and the row actions. */}
      {filters ? (
        <FilterPanel
          labels={{
            title: t('Filters'),
            views: EN.views,
            reset: EN.resetFilters,
            expand: EN.expand,
            collapse: t('Collapse'),
            activeFilters: EN.activeFilters,
            remove: label => `${t('Clear')} ${label}`,
          }}
          chips={filters.chips}
          canReset={filters.canReset}
          onReset={filters.onReset}
          gridClassName="@[40rem]:grid-cols-[minmax(0,32rem)]"
        >
          {filters.content}
        </FilterPanel>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="flex min-h-[3.25rem] flex-wrap items-center gap-3 border-b border-border px-3 py-2">
          {searchable ? (
            <SearchField
              id={`${sectionId}-search`}
              value={draft}
              onValueChange={setDraft}
              onSubmit={() => {
                setSearch(draft)
                setPageIndex(0)
              }}
              onClear={() => {
                setDraft('')
                setSearch('')
                setPageIndex(0)
              }}
              placeholder={`${t('Search')}...`}
              submitLabel={t('Search')}
              clearLabel={EN.clearSearch}
              showClear={Boolean(draft || search)}
            />
          ) : null}
          {canAct ? <span aria-hidden className="hidden h-6 w-px bg-border sm:block" /> : null}
          {canAct ? (
            <SelectionActions
              count={selected.size}
              selectedLabel={selectedLabel}
              clearLabel={t('Clear')}
              onClear={() => setSelected(new Set())}
              showClear={false}
            />
          ) : null}
          {canAct ? (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={selected.size === 0}
                onClick={() => setConfirming([...selected])}
                className={selectionButtonClass(
                  selected.size > 0,
                  action.destructive ? 'destructive' : 'brand',
                )}
              >
                <ActionIcon aria-hidden />
                {action.label}
              </button>
              <SelectionClear
                active={selected.size > 0}
                label={t('Clear')}
                onClear={() => setSelected(new Set())}
              />
            </div>
          ) : null}
        </div>
        <SettingsTable<T>
          rows={rows}
          columns={columns}
          status={read.status}
          sort={sortable ? sort : undefined}
          onSort={
            sortable
              ? column => {
                  setSort(current => nextSortState(current, column))
                  setPageIndex(0)
                }
              : undefined
          }
          selectable
          selected={selected}
          onToggle={id => {
            const next = new Set(selected)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            setSelected(next)
          }}
          onTogglePage={() =>
            setSelected(
              rows.length > 0 && rows.every(row => selected.has(row.id))
                ? new Set()
                : new Set(rows.map(row => row.id)),
            )
          }
          onRetry={read.reload}
          emptyText={EN.noItems}
          clearSearchLabel={EN.clearSearch}
          onClearSearch={
            search
              ? () => {
                  setDraft('')
                  setSearch('')
                  setPageIndex(0)
                }
              : undefined
          }
          text={{
            loading: t('Loading'),
            error: t('AlertGeneralErrorDefault'),
            retry: t('Refresh'),
            selectAll: t('SelectAll'),
            select: row => `${EN.select} ${rowLabel(row)}`,
          }}
        />
        {read.status === 'success' && total >= PAGER_MIN_ROWS ? (
          <Pagination
            id={`${sectionId}-page-size`}
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

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={open => setConfirming(open ? (confirming ?? []) : null)}
        title={action.confirmTitle}
        message={action.confirmMessage}
        confirmLabel={t('Confirm')}
        cancelLabel={t('Cancel')}
        onConfirm={() => void runAction()}
        pending={pending}
        destructive={action.destructive}
      />
    </SettingsLayout>
  )
}
