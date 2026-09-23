'use client'

import { ArrowRightLeft, ListFilter, Search, Trash2 } from 'lucide-react'
import { useCallback, useId, useMemo, useState } from 'react'
import { toApiError, useApiRead } from '@/shared/api'
import { CountUp } from '@/shared/ui/CountUp'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import {
  Button,
  ConfirmDialog,
  ErrorState,
  Label,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectionActions,
  SelectionClear,
  selectionButtonClass,
} from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { EmptyState } from '@/shared/ui/EmptyState'
import { WorkflowType, type CfcWorkflowDto, type WorkflowTypeId } from '@/types/case'
import { nextSortState, PAGE_SIZES, PAGER_MIN_ROWS } from '@/features/settings/shared/list-model'
import { SettingsBody, SettingsGate, SettingsLayout } from '@/features/settings/shared/SettingsFrame'
import { SettingsTable, type TableColumn } from '@/features/settings/shared/SettingsTable'
import { SaveToast, type Notice } from '@/features/settings/shared/SaveToast'
import { FRAME_EN } from '@/features/settings/shared/SettingsFrame'
import { saveFailureMessage } from '@/features/settings/shared/use-object-form'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import {
  fetchWorkflowStages,
  fetchWorkflowStudents,
  fetchWorkflows,
  removeStudentsInWorkflow,
} from '../case-api'
import { useCaseArea } from '../case-area'
import { MovePanel } from './MovePanel'
import { StageTabs, type StageTab } from './StageTabs'
import { StudentSearchField } from './StudentSearchField'
import {
  formatWorkflowDate,
  pickedStudentIds,
  toStudentRow,
  WORKFLOW_PAGE_SIZE,
  workflowStudentsQuery,
  type StudentWorkflowRow,
  type WorkflowListState,
  type WorkflowSort,
} from './student-workflow'

const ACCESS = { item: PermissionItem.Case, action: PermissionAction.Access }
const EDIT = { item: PermissionItem.Case, action: PermissionAction.Edit }
// CaseApiController.cs:431: a New-Engine grid is only filled for users holding Workflow.Access.
const WORKFLOW_ACCESS = { item: PermissionItem.Workflow, action: PermissionAction.Access }

const TEXT = {
  Title: 'Student Workflow',
  Workflow: 'Workflow',
  Stages: 'Stages',
  AllStages: 'All stages',
  SearchByName: 'Search by name',
  SearchPlaceholder: 'Search students...',
  Search: 'Search',
  Students: 'Students',
  StudentNumber: 'Student number',
  FullName: 'Full name',
  Stage: 'Stage',
  NextCheck: 'Next check',
  Approved: 'Approved',
  Attended: 'Attended',
  Scheduled: 'Scheduled',
  Percentage: 'Percentage',
  Move: 'Move',
  Remove: 'Remove',
  Confirm: 'Confirm',
  Cancel: 'Cancel',
  Clear: 'Clear',
  Selected: 'Selected',
  Loading: 'Loading',
  Refresh: 'Refresh',
  NoItems: 'There are no items to show.',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
  AlertDeleteErrorDefault: 'There was an error while trying to delete the item.',
  AuditDataForStudentInWorkflowWillBeDeleted: 'Audit data for students in workflow will be deleted.',
  NumberOfItemsPerPage: 'Number of items per page',
  Of: 'of',
  Next: 'Next',
  Previous: 'Previous',
  First: 'First',
  Last: 'Last',
  Select: 'Select',
  SelectionActions: 'Selection actions',
} as const

// seats-admin-workflow-student.html:487 shows this literal after a move or a remove.
const EN = {
  actionsUpdated: 'Actions updated successfully',
  searchTitle: 'Search for students',
  searchHint: 'Choose a workflow and a stage, then press Search to list the students in it.',
  newEngineTitle: 'Workflow permission needed',
  newEngineHint: 'Students of a New Engine workflow are listed only for users with access to Workflows.',
} as const

const ALL_TAB = 'all'
const BLANK_DATE = '—'

// Legacy sorts by the grid bind names (seats-grid.html:353), so the keys are camelCase.
// seats-admin-workflow-student.html:562-573: no sort until a column header is clicked.
const INITIAL_SORT: WorkflowSort = { column: '', direction: 'asc' }

export function StudentWorkflowScreen() {
  return (
    <SettingsGate access={ACCESS}>
      <StudentWorkflowWorkspace />
    </SettingsGate>
  )
}

function StudentWorkflowWorkspace() {
  const t = useScreenText(TEXT)
  const { area } = useCaseArea()
  const profile = useProfile()
  const canEdit = profile.can(EDIT)
  const canReadNewEngine = profile.can(WORKFLOW_ACCESS)
  const panelId = useId()

  const [selectedWorkflow, setWorkflow] = useState<CfcWorkflowDto | null>(null)
  const [selectedStageId, setStageId] = useState<number | null | undefined>(undefined)
  const [studentText, setStudentText] = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const [listState, setListState] = useState<WorkflowListState>({
    pageIndex: 0,
    pageSize: WORKFLOW_PAGE_SIZE,
    sort: INITIAL_SORT,
    studentText: '',
  })
  const [selection, setSelection] = useState<ReadonlySet<string>>(new Set())
  const [moveOpen, setMoveOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [fetchPass, setFetchPass] = useState(0)
  const dismissNotice = useCallback(() => setNotice(null), [])
  const notifySuccess = useCallback(
    () => setNotice({ id: Date.now(), tone: 'success', message: EN.actionsUpdated }),
    [],
  )

  const workflowsLoad = useCallback(
    // seats-admin-workflow-student.html:793-799 asks for every workflow, without paging.
    (signal: AbortSignal) => fetchWorkflows({}, signal),
    [],
  )
  const workflowsRead = useApiRead('case-student-workflows', workflowsLoad)
  const workflows = useMemo(() => workflowsRead.data?.items ?? [], [workflowsRead.data?.items])
  const workflow = selectedWorkflow ?? workflows[0] ?? null

  // CaseApiController.cs:1331-1378 getstages builds every workflow's stages on each call (New-Engine ones
  // included), so like …student.html:836-846 it is read once and the workflow's group is picked here.
  const stagesLoad = useCallback((signal: AbortSignal) => fetchWorkflowStages(undefined, signal), [])
  const stagesRead = useApiRead(workflows.length > 0 ? 'case-student-stages' : null, stagesLoad)

  const flatStages = useMemo(() => {
    if (!workflow) return []
    const group = (stagesRead.data ?? []).find(item => item.workflowId === workflow.id)
    return group?.stages ?? []
  }, [stagesRead.data, workflow])

  // seats-admin-workflow-student.html:567,836-846: the stage filter starts on "Select", which is every stage.
  const stageId = selectedStageId ?? null
  const stageName = flatStages.find(stage => stage.id === stageId)?.name ?? null

  const newEngineBlocked = workflow?.cfcWorkflowTypeId === WorkflowType.NewEngine && !canReadNewEngine

  const studentsQuery = useMemo(() => {
    if (!workflow || !searchActive || newEngineBlocked) return null
    return workflowStudentsQuery(workflow, stageId, stageName, listState)
  }, [workflow, stageId, stageName, listState, searchActive, newEngineBlocked])

  const studentsLoad = useCallback(
    (signal: AbortSignal) =>
      studentsQuery
        ? fetchWorkflowStudents(studentsQuery, signal)
        : Promise.resolve({ items: [], totalRowCount: 0 }),
    [studentsQuery],
  )
  const studentsRead = useApiRead(
    studentsQuery ? `case-students:${JSON.stringify(studentsQuery)}:${fetchPass}` : null,
    studentsLoad,
  )

  const rows = useMemo(() => (studentsRead.data?.items ?? []).map(toStudentRow), [studentsRead.data?.items])
  const total = Math.max(
    studentsRead.data?.totalRowCount ?? 0,
    listState.pageIndex * listState.pageSize + rows.length,
  )
  const loaded = studentsRead.status === 'success'

  // Every reload starts from an empty selection: the rows behind the ticks are gone.
  const reload = () => {
    setSelection(new Set())
    setRemoveError(null)
    setFetchPass(current => current + 1)
  }

  const submitSearch = () => {
    // …student.html:729: no workflow, no request — and here no idle loader either.
    if (!workflow) return
    setListState(current => ({ ...current, pageIndex: 0, studentText }))
    setSearchActive(true)
    reload()
  }

  const activeTabId = stageId === null ? ALL_TAB : String(stageId)

  const tabs = useMemo<StageTab[]>(() => {
    const countFor = (id: number | null) =>
      loaded && activeTabId === (id === null ? ALL_TAB : String(id)) ? total : null
    return [
      { id: ALL_TAB, stageId: null, label: t('AllStages'), count: countFor(null) },
      ...flatStages.map(stage => ({
        id: String(stage.id),
        stageId: stage.id,
        label: stage.name ?? '',
        count: countFor(stage.id),
      })),
    ]
  }, [activeTabId, flatStages, loaded, t, total])

  const selectStage = (tab: StageTab) => {
    setStageId(tab.stageId)
    setListState(current => ({ ...current, pageIndex: 0 }))
    if (searchActive) reload()
  }

  const columns: TableColumn<StudentWorkflowRow>[] = useMemo(
    () => [
      { key: 'studentNumber', label: t('StudentNumber'), sortable: true, render: row => row.studentNumber },
      { key: 'studentFullName', label: t('FullName'), sortable: true, render: row => row.studentFullName },
      { key: 'stageName', label: t('Stage'), sortable: true, render: row => row.stageName },
      {
        key: 'nextCheck',
        label: t('NextCheck'),
        sortable: true,
        render: row => <DateCell value={row.nextCheck} />,
      },
      {
        key: 'nextSuccess',
        label: t('Approved'),
        sortable: true,
        render: row => <DateCell value={row.nextSuccess} />,
      },
      {
        key: 'attendedLectures',
        label: t('Attended'),
        className: 'tabular-nums',
        render: row => row.attendedLectures,
      },
      {
        key: 'scheduledLectures',
        label: t('Scheduled'),
        className: 'tabular-nums',
        render: row => row.scheduledLectures,
      },
      {
        key: 'percentage',
        label: t('Percentage'),
        className: 'tabular-nums',
        render: row => `${row.percentage}%`,
      },
    ],
    [t],
  )

  const toggle = (id: string) => {
    const next = new Set(selection)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelection(next)
  }

  const confirmRemove = async () => {
    if (!workflow) return
    // seats-admin-workflow-student.html:908-918: each selected row gives its studentId and its own workflowId instance.
    const picked = rows.filter(row => selection.has(row.id))
    setRemoving(true)
    setRemoveError(null)
    try {
      await removeStudentsInWorkflow({
        studentIds: picked.map(row => row.studentId),
        workflowId: workflow.id,
        type: workflow.cfcWorkflowTypeId as WorkflowTypeId,
        instances: picked.map(row => row.workflowId),
      })
      notifySuccess()
      reload()
    } catch (caught) {
      setRemoveError(saveFailureMessage(toApiError(caught), t('AlertDeleteErrorDefault')))
    } finally {
      setRemoving(false)
      setRemoveOpen(false)
    }
  }

  const selectedLabel = `${selection.size} ${t('Selected')}`
  const countLabel = `${t('Students')} : ${total}`
  const showActions = canEdit && loaded && rows.length > 0
  const activeTabExists = tabs.some(tab => tab.id === activeTabId)

  return (
    <SettingsLayout
      area={area}
      sectionId="student-workflow"
      title={t('Title')}
      meta={
        loaded && total > 0 ? (
          <span
            aria-live="polite"
            className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold text-brand tabular-nums"
          >
            <CountUp text={countLabel} />
          </span>
        ) : null
      }
    >
      {/* Legacy toasts a failed workflows / stages read; here the list stays usable with a retry. */}
      {workflowsRead.status === 'error' || stagesRead.status === 'error' ? (
        <ErrorState
          message={t('AlertGeneralErrorDefault')}
          retryLabel={t('Refresh')}
          onRetry={workflowsRead.status === 'error' ? workflowsRead.reload : stagesRead.reload}
          error={workflowsRead.status === 'error' ? workflowsRead.error : stagesRead.error}
        />
      ) : null}
      <StageTabs
        label={t('Stages')}
        tabs={tabs}
        activeId={activeTabId}
        panelId={panelId}
        onSelect={selectStage}
      />

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={activeTabExists ? `${panelId}-tab-${activeTabId}` : undefined}
        aria-label={activeTabExists ? undefined : t('Stages')}
        tabIndex={0}
        className="relative flex min-w-0 flex-col rounded-lg border border-border bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {/* Tab order follows the visual order: workflow, student search, Search button; the count is not focusable. */}
        <div className="flex flex-wrap items-end gap-3 border-b border-border px-3 py-3">
          <div className="min-w-[12rem] flex-1 space-y-1">
            <Label htmlFor="student-workflow-workflow" className="text-xs text-muted-foreground">
              {t('Workflow')}
            </Label>
            <Select
              value={workflow ? String(workflow.id) : undefined}
              disabled={workflows.length === 0}
              onValueChange={value => {
                const next = workflows.find(row => String(row.id) === value)
                if (!next) return
                setWorkflow(next)
                setStageId(undefined)
                setSearchActive(false)
                setSelection(new Set())
              }}
            >
              <SelectTrigger id="student-workflow-workflow" aria-label={t('Workflow')}>
                <SelectValue placeholder={t('Workflow')} />
              </SelectTrigger>
              <SelectContent>
                {workflows.map(row => (
                  <SelectItem key={row.id} value={String(row.id)}>
                    {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <StudentSearchField
            id="student-workflow-search"
            label={t('SearchByName')}
            placeholder={t('SearchPlaceholder')}
            value={studentText}
            onValueChange={setStudentText}
            onSubmit={submitSearch}
          />

          <Button type="button" onClick={submitSearch} disabled={!workflow} className="shrink-0">
            <Search aria-hidden className="size-4" />
            {t('Search')}
          </Button>
        </div>

        {removeError ? (
          <p role="alert" className="mx-3 mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {removeError}
          </p>
        ) : null}
        <SaveToast notice={notice} onDismiss={dismissNotice} dismissLabel={FRAME_EN.dismiss} />

        {/* Legacy leaves the grid empty until Search; an idle read is an instruction, never a loader. */}
        {!searchActive ? (
          <EmptyState
            icon={ListFilter}
            title={EN.searchTitle}
            description={EN.searchHint}
            className="min-h-64"
          />
        ) : newEngineBlocked ? (
          <EmptyState
            icon={ListFilter}
            title={EN.newEngineTitle}
            description={EN.newEngineHint}
            className="min-h-64"
          />
        ) : (
          <SettingsBody error={studentsRead.error} status={studentsRead.status} onRetry={studentsRead.reload}>
            {/* From sm up the bar floats over this padding, so a focused row or pager is never hidden beneath it. */}
            <div className={cn(showActions && 'sm:pb-20')}>
              <SettingsTable
                rows={rows}
                columns={columns}
                status={studentsRead.status}
                sort={listState.sort}
                onSort={column => {
                  setSelection(new Set())
                  setListState(current => ({
                    ...current,
                    sort: nextSortState(current.sort, column),
                    pageIndex: 0,
                  }))
                }}
                selectable={canEdit}
                selected={selection}
                onToggle={toggle}
                onTogglePage={() => {
                  const onPage = rows.every(row => selection.has(row.id))
                  const next = new Set(selection)
                  if (onPage) rows.forEach(row => next.delete(row.id))
                  else rows.forEach(row => next.add(row.id))
                  setSelection(next)
                }}
                onRetry={studentsRead.reload}
                emptyText={t('NoItems')}
                text={{
                  loading: t('Loading'),
                  error: t('AlertGeneralErrorDefault'),
                  retry: t('Refresh'),
                  selectAll: t('Selected'),
                  select: row => `${t('Select')} ${row.studentFullName ?? ''}`,
                }}
              />
              {loaded && total >= PAGER_MIN_ROWS ? (
                <Pagination
                  id="student-workflow-page-size"
                  pageIndex={listState.pageIndex}
                  pageSize={listState.pageSize}
                  total={total}
                  pageSizes={PAGE_SIZES}
                  onPageChange={pageIndex => {
                    setSelection(new Set())
                    setListState(current => ({ ...current, pageIndex }))
                  }}
                  onPageSizeChange={pageSize => {
                    setSelection(new Set())
                    setListState(current => ({ ...current, pageSize, pageIndex: 0 }))
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
            </div>
          </SettingsBody>
        )}

        {/* Tab order after the table and pager: selection count, Move, Remove, Clear. Below sm the bar sits in flow. */}
        {showActions ? (
          <div className="flex justify-center px-3 pb-3 sm:pointer-events-none sm:absolute sm:inset-x-0 sm:bottom-3 sm:pb-0">
            <div className="pointer-events-auto flex max-w-full animate-rise-in flex-wrap items-center justify-center rounded-2xl bg-white/95 px-2 py-1.5 shadow-[0_10px_30px_-12px_rgba(15,23,42,.45)] ring-1 ring-border backdrop-blur motion-reduce:animate-none sm:rounded-full">
              <SelectionActions
                groupLabel={t('SelectionActions')}
                count={selection.size}
                selectedLabel={selectedLabel}
                clearLabel={t('Clear')}
                onClear={() => setSelection(new Set())}
                showClear={false}
              >
                <button
                  type="button"
                  disabled={selection.size === 0}
                  onClick={() => setMoveOpen(true)}
                  className={selectionButtonClass(selection.size > 0, 'brand')}
                >
                  <ArrowRightLeft aria-hidden />
                  {t('Move')}
                </button>
                <button
                  type="button"
                  disabled={selection.size === 0}
                  onClick={() => setRemoveOpen(true)}
                  className={selectionButtonClass(selection.size > 0, 'destructive')}
                >
                  <Trash2 aria-hidden />
                  {t('Remove')}
                </button>
                <SelectionClear
                  active={selection.size > 0}
                  label={t('Clear')}
                  onClear={() => setSelection(new Set())}
                />
              </SelectionActions>
            </div>
          </div>
        ) : null}
      </div>

      {workflow ? (
        <MovePanel
          open={moveOpen}
          onOpenChange={setMoveOpen}
          workflowId={workflow.id}
          workflowType={workflow.cfcWorkflowTypeId as WorkflowTypeId}
          studentIds={pickedStudentIds(rows, selection)}
          stages={flatStages}
          onSaved={() => {
            notifySuccess()
            reload()
          }}
        />
      ) : null}

      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title={t('Remove')}
        message={t('AuditDataForStudentInWorkflowWillBeDeleted')}
        confirmLabel={t('Confirm')}
        cancelLabel={t('Cancel')}
        onConfirm={() => void confirmRemove()}
        pending={removing}
      />
    </SettingsLayout>
  )
}

// 31/12/9999 is the legacy "never" sentinel: blank in legacy, a muted dash here so the cell never looks broken.
function DateCell({ value }: { value: string | null | undefined }) {
  const text = formatWorkflowDate(value)
  if (!text) return <span className="text-muted-foreground">{BLANK_DATE}</span>
  return <span className="tabular-nums">{text}</span>
}
