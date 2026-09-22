'use client'

import { LayoutGrid, ListTree } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { useProfile } from '@/shared/shell/profile'
import { useRememberedFlag } from '@/shared/shell/use-remembered-flag'
import { ConfirmDialog } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { NodeInspector } from './NodeInspector'
import { PipelineCanvas } from './PipelineCanvas'
import { StructureTree } from './StructureTree'
import { useStructureTree, type DraftTarget, type TreeNode, type TreeNodeKind } from './use-structure-tree'

const ADD = { item: PermissionItem.Case, action: PermissionAction.Add }

const TEXT = {
  Add: 'Add',
  Confirm: 'Confirm',
  Cancel: 'Cancel',
  StageGroup: 'Stage Group',
  Stage: 'Stage',
  RuleGroup: 'Rule group',
  Rule: 'Rule',
  Rules: 'Rules',
  Triggers: 'Triggers',
  Trigger: 'Trigger',
  Attribute: 'Attribute',
  UnsavedChangesTitle: 'Unsaved changes',
  UnsavedChangesMessage: 'You have unsaved changes. Discard them and continue?',
} as const

const EN = {
  view: 'Structure view',
  diagram: 'Diagram',
  list: 'List',
} as const

const KIND_TEXT: Record<TreeNodeKind, keyof typeof TEXT> = {
  stageGroup: 'StageGroup',
  stage: 'Stage',
  ruleGroup: 'RuleGroup',
  rulesBranch: 'Rules',
  triggersBranch: 'Triggers',
  rule: 'Rule',
  trigger: 'Trigger',
  ruleAttribute: 'Attribute',
  triggerAttribute: 'Attribute',
}

const VIEW_STORAGE_KEY = 'case.workflow-admin.structure-list-view'

type WorkflowStructureProps = {
  workflowId: number
  initialNodeKey: string | null
  onStatsReload: () => void
  onDirtyChange?: (dirty: boolean) => void
}

export function WorkflowStructure({
  workflowId,
  initialNodeKey,
  onStatsReload,
  onDirtyChange,
}: WorkflowStructureProps) {
  const t = useScreenText(TEXT)
  const profile = useProfile()
  const canAdd = profile.can(ADD)
  const branchLabels = useMemo(() => ({ rules: t('Rules'), triggers: t('Triggers') }), [t])
  const tree = useStructureTree(workflowId, initialNodeKey, branchLabels)
  const { loadRoots } = tree
  const [listView, setListView] = useRememberedFlag(VIEW_STORAGE_KEY, false)
  const [panelDirty, setPanelDirty] = useState(false)
  const [pending, setPending] = useState<{ run: () => void } | null>(null)

  useEffect(() => {
    void loadRoots(true)
  }, [loadRoots])

  useEffect(() => {
    onDirtyChange?.(panelDirty)
  }, [onDirtyChange, panelDirty])

  const guard = useCallback(
    (run: () => void) => {
      if (panelDirty) setPending({ run })
      else run()
    },
    [panelDirty],
  )

  // Switching nodes with an unsaved panel is confirmed once, then the move is replayed.
  const guardedTree = useMemo(
    () => ({
      ...tree,
      selectNode: (node: TreeNode) => guard(() => tree.selectNode(node)),
      startDraft: (target: DraftTarget) => guard(() => tree.startDraft(target)),
    }),
    [guard, tree],
  )

  const reloadParent = useCallback(() => {
    setPanelDirty(false)
    onStatsReload()
    if (tree.draft) {
      // The saved draft is a child now; the parent lists it and the form must not post twice.
      const parentKey = tree.draft.parentKey
      const parent = parentKey ? tree.draftParentTrail.at(-1) : null
      tree.cancelDraft()
      tree.invalidate(parentKey)
      if (parent) tree.selectNode(parent)
      return
    }
    // A node's label lives in its parent's child list; a stage group's lives in the roots.
    const parent = tree.selectedTrail.at(-2) ?? null
    tree.invalidate(parent ? parent.key : null)
  }, [onStatsReload, tree])

  const crumbs = useMemo(() => {
    if (tree.draft) {
      return [
        ...tree.draftParentTrail.map(node => node.label),
        `${t('Add')} ${t(KIND_TEXT[tree.draft.kind])}`,
      ]
    }
    return tree.selectedTrail.map(node => node.label)
  }, [t, tree.draft, tree.draftParentTrail, tree.selectedTrail])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div
        role="group"
        aria-label={EN.view}
        className="flex items-center gap-1 self-start rounded-lg border border-border bg-white p-1 shadow-sm"
      >
        <ViewButton
          active={!listView}
          icon={LayoutGrid}
          label={EN.diagram}
          onClick={() => setListView(false)}
        />
        <ViewButton active={listView} icon={ListTree} label={EN.list} onClick={() => setListView(true)} />
      </div>

      <div className="flex min-h-[24rem] flex-1 flex-col gap-4 lg:flex-row">
        {listView ? (
          <StructureTree workflowId={workflowId} tree={guardedTree} canAdd={canAdd} />
        ) : (
          <div className="min-w-0 flex-1 lg:max-w-[52%]">
            <PipelineCanvas workflowId={workflowId} tree={guardedTree} canAdd={canAdd} />
          </div>
        )}
        <NodeInspector
          workflowId={workflowId}
          target={tree.inspectorTarget}
          crumbs={crumbs}
          onSaved={reloadParent}
          onDirtyChange={setPanelDirty}
        />
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={open => {
          if (!open) setPending(null)
        }}
        title={t('UnsavedChangesTitle')}
        message={t('UnsavedChangesMessage')}
        confirmLabel={t('Confirm')}
        cancelLabel={t('Cancel')}
        onConfirm={() => {
          setPanelDirty(false)
          pending?.run()
          setPending(null)
        }}
      />
    </div>
  )
}

function ViewButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: typeof LayoutGrid
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium',
        'transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        active
          ? 'bg-brand text-primary-foreground'
          : 'text-muted-foreground hover:bg-brand/[0.06] hover:text-brand active:bg-brand/[0.1]',
      )}
    >
      <Icon aria-hidden className="size-4" />
      {label}
    </button>
  )
}
