'use client'

import { useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MousePointerClick, Plus, Workflow } from 'lucide-react'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useApiRead } from '@/shared/api'
import { useProfile } from '@/shared/shell/profile'
import { Button, ConfirmDialog } from '@/shared/ui'
import { ADD_BUTTON_CLASS, ADD_ICON_CLASS } from '@/shared/ui/add-button'
import { CountUp } from '@/shared/ui/CountUp'
import { EmptyState } from '@/shared/ui/EmptyState'
import { FRAME_EN, SettingsGate, SettingsLayout } from '@/features/settings/shared/SettingsFrame'
import { SaveToast, type Notice } from '@/features/settings/shared/SaveToast'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import type { CfcWorkflowDto } from '@/types/case'
import { fetchWorkflows } from '../case-api'
import { useCaseArea } from '../case-area'
import { ConstraintsDrawer } from './ConstraintsDrawer'
import { ManualInterventionsDrawer } from './ManualInterventionsDrawer'
import { WorkflowStructure } from './WorkflowStructure'
import { WorkflowDialog } from './WorkflowDialog'
import { WorkflowHeader } from './WorkflowHeader'
import { WorkflowList } from './WorkflowList'

const ACCESS = { item: PermissionItem.Case, action: PermissionAction.Access }
const ADD = { item: PermissionItem.Case, action: PermissionAction.Add }

const TEXT = {
  Workflows: 'Workflows',
  UnsavedChangesTitle: 'Unsaved changes',
  UnsavedChangesMessage: 'You have unsaved changes. Discard them and continue?',
  Confirm: 'Confirm',
  Cancel: 'Cancel',
} as const

const EN = {
  pickTitle: 'Select a workflow',
  pickHint: 'Choose a workflow from the list to open its pipeline of stage groups, stages and rules.',
  emptyTitle: 'No workflows found',
  emptyHint: 'Create a workflow to start building its stage groups, stages and rules.',
  addWorkflow: 'Add workflow',
  total: 'Total',
} as const

export function WorkflowAdminScreen() {
  return (
    <SettingsGate access={ACCESS}>
      <WorkflowAdminWorkspace />
    </SettingsGate>
  )
}

function WorkflowAdminWorkspace() {
  const t = useScreenText(TEXT)
  const { area } = useCaseArea()
  const canAdd = useProfile().can(ADD)
  const router = useRouter()
  const searchParams = useSearchParams()

  const workflowParam = searchParams.get('workflow')
  const nodeParam = searchParams.get('node')
  const linkedWorkflowId = workflowParam ? Number(workflowParam) : null

  const [selectedState, setSelected] = useState<CfcWorkflowDto | null>(null)
  const [workflows, setWorkflows] = useState<readonly CfcWorkflowDto[]>([])
  const [listLoaded, setListLoaded] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<CfcWorkflowDto | null>(null)
  const [constraintsOpen, setConstraintsOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [panelDirty, setPanelDirty] = useState(false)
  const [pendingWorkflow, setPendingWorkflow] = useState<CfcWorkflowDto | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const dismissNotice = useCallback(() => setNotice(null), [])
  const notify = useCallback(
    (message: string, tone: 'success' | 'error') => setNotice({ id: Date.now(), tone, message }),
    [],
  )

  const linkedSelection =
    linkedWorkflowId && Number.isFinite(linkedWorkflowId)
      ? (workflows.find(row => row.id === linkedWorkflowId) ?? null)
      : null
  // A shared link may point past the first page: read the unpaged list once, as the Student page does.
  const linkedLoad = useCallback(
    (signal: AbortSignal) =>
      fetchWorkflows({}, signal).then(
        page => (page.items ?? []).find(row => row.id === linkedWorkflowId) ?? null,
      ),
    [linkedWorkflowId],
  )
  const linkedRead = useApiRead(
    listLoaded && linkedWorkflowId && !linkedSelection ? `case-linked-workflow:${linkedWorkflowId}` : null,
    linkedLoad,
  )
  const selected = linkedSelection ?? linkedRead.data ?? selectedState

  const syncWorkflowUrl = useCallback(
    (workflowId: number | null, keepNode = false) => {
      const params = new URLSearchParams(searchParams.toString())
      if (workflowId) params.set('workflow', String(workflowId))
      else {
        params.delete('workflow')
        params.delete('node')
      }
      if (!keepNode) params.delete('node')
      const query = params.toString()
      router.replace(query ? `?${query}` : '?', { scroll: false })
    },
    [router, searchParams],
  )

  const applyWorkflow = (workflow: CfcWorkflowDto | null) => {
    setSelected(workflow)
    setPanelDirty(false)
    syncWorkflowUrl(workflow?.id ?? null)
  }

  const selectWorkflow = (workflow: CfcWorkflowDto) => {
    if (panelDirty && selected && workflow.id !== selected.id) {
      setPendingWorkflow(workflow)
      setConfirmDiscard(true)
      return
    }
    applyWorkflow(workflow)
  }

  const onReloaded = useCallback(
    (items: readonly CfcWorkflowDto[]) => {
      setWorkflows(items)
      setListLoaded(true)
      if (!selected) return
      const fresh = items.find(row => row.id === selected.id)
      if (fresh) setSelected(fresh)
    },
    [selected],
  )

  // The list deleted rows: a deleted selection must not stay in the header and the URL.
  const onDeleted = useCallback(
    (ids: readonly number[]) => {
      if (selected && ids.includes(selected.id)) {
        setSelected(null)
        setPanelDirty(false)
        syncWorkflowUrl(null)
      }
    },
    [selected, syncWorkflowUrl],
  )

  const bumpReload = () => setReloadToken(current => current + 1)

  const title = selected?.name ?? t('Workflows')
  const initialNodeKey = selected && nodeParam ? nodeParam : null
  const openAdd = () => {
    setEditingWorkflow(null)
    setDialogOpen(true)
  }
  // Only claim there are no workflows once the list has actually loaded; before that, guide selection.
  const noWorkflows = listLoaded && workflows.length === 0

  return (
    <SettingsLayout
      area={area}
      sectionId="workflow-admin"
      title={title}
      meta={
        listLoaded && workflows.length > 0 ? (
          <span className="animate-fade-in rounded-full bg-brand/[0.08] px-2.5 py-0.5 text-xs font-semibold text-brand tabular-nums">
            <CountUp text={`${EN.total} ${workflows.length}`} />
          </span>
        ) : null
      }
      actions={
        canAdd ? (
          <button type="button" onClick={openAdd} className={ADD_BUTTON_CLASS}>
            <Plus aria-hidden className={ADD_ICON_CLASS} />
            {EN.addWorkflow}
          </button>
        ) : null
      }
    >
      <SaveToast notice={notice} onDismiss={dismissNotice} dismissLabel={FRAME_EN.dismiss} />
      <div className="flex min-h-0 flex-1 flex-col items-stretch gap-4 lg:flex-row">
        <WorkflowList
          selectedId={selected?.id ?? null}
          reloadToken={reloadToken}
          onSelect={selectWorkflow}
          onReloaded={onReloaded}
          onDeleted={onDeleted}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          {selected ? (
            <>
              <WorkflowHeader
                workflow={selected}
                onEdit={() => {
                  setEditingWorkflow(selected)
                  setDialogOpen(true)
                }}
                onConstraints={() => setConstraintsOpen(true)}
                onManualInterventions={() => setManualOpen(true)}
                onUpdated={bumpReload}
                onNotice={notify}
              />
              {/* Keyed by workflow: tree state (selected node, cache) must never survive a switch,
                  or the inspector asks for another workflow's node and the API answers 404. */}
              <WorkflowStructure
                key={selected.id}
                workflowId={selected.id}
                initialNodeKey={initialNodeKey}
                onStatsReload={bumpReload}
                onDirtyChange={setPanelDirty}
              />
            </>
          ) : (
            <section
              aria-label={noWorkflows ? EN.emptyTitle : EN.pickTitle}
              className="flex min-h-0 flex-1 rounded-xl border border-border bg-white shadow-sm"
            >
              {noWorkflows ? (
                <EmptyState
                  className="w-full"
                  icon={Workflow}
                  title={EN.emptyTitle}
                  description={EN.emptyHint}
                  action={
                    canAdd ? (
                      <Button size="sm" onClick={openAdd}>
                        <Plus aria-hidden className="size-4" />
                        {EN.addWorkflow}
                      </Button>
                    ) : null
                  }
                />
              ) : (
                <EmptyState
                  className="w-full"
                  icon={MousePointerClick}
                  title={EN.pickTitle}
                  description={EN.pickHint}
                />
              )}
            </section>
          )}
        </div>
      </div>

      <WorkflowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workflow={editingWorkflow}
        onSaved={message => {
          notify(message, 'success')
          bumpReload()
        }}
      />

      {selected ? (
        <>
          <ConstraintsDrawer
            open={constraintsOpen}
            workflowId={selected.id}
            onOpenChange={setConstraintsOpen}
          />
          <ManualInterventionsDrawer
            open={manualOpen}
            workflowId={selected.id}
            onOpenChange={setManualOpen}
          />
        </>
      ) : null}

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title={t('UnsavedChangesTitle')}
        message={t('UnsavedChangesMessage')}
        confirmLabel={t('Confirm')}
        cancelLabel={t('Cancel')}
        onConfirm={() => {
          if (pendingWorkflow) applyWorkflow(pendingWorkflow)
          setPendingWorkflow(null)
          setConfirmDiscard(false)
        }}
      />
    </SettingsLayout>
  )
}
