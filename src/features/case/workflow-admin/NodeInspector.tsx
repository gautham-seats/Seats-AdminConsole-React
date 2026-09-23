'use client'

import { RuleAttributePanel } from './nodes/RuleAttributePanel'
import { RuleGroupPanel } from './nodes/RuleGroupPanel'
import { RulePanel } from './nodes/RulePanel'
import { StageGroupPanel } from './nodes/StageGroupPanel'
import { StagePanel } from './nodes/StagePanel'
import { TriggerAttributePanel } from './nodes/TriggerAttributePanel'
import { TriggerPanel } from './nodes/TriggerPanel'
import type { InspectorTarget } from './use-structure-tree'

const SEPARATOR = '›'

const EN = {
  inspector: 'Inspector',
  branchHint: 'Open a rule or a trigger below this branch, or add a new one.',
} as const

type NodeInspectorProps = {
  workflowId: number
  target: InspectorTarget
  crumbs: readonly string[]
  onSaved: () => void
  onDirtyChange: (dirty: boolean) => void
}

export function NodeInspector({ workflowId, target, crumbs, onSaved, onDirtyChange }: NodeInspectorProps) {
  const panel = (() => {
    const { path, id } = target
    switch (target.kind) {
      case 'stageGroup':
        return (
          <StageGroupPanel
            workflowId={workflowId}
            stageGroupId={id}
            onSaved={onSaved}
            onDirtyChange={onDirtyChange}
          />
        )
      case 'stage':
        return path.stageGroupId ? (
          <StagePanel
            workflowId={workflowId}
            stageGroupId={path.stageGroupId}
            stageId={id}
            onSaved={onSaved}
            onDeleted={onSaved}
            onDirtyChange={onDirtyChange}
          />
        ) : null
      case 'ruleGroup':
        return path.stageGroupId && path.stageId ? (
          <RuleGroupPanel
            workflowId={workflowId}
            stageGroupId={path.stageGroupId}
            stageId={path.stageId}
            ruleGroupId={id}
            onSaved={onSaved}
            onDirtyChange={onDirtyChange}
          />
        ) : null
      case 'rule':
        return path.stageGroupId && path.stageId && path.ruleGroupId ? (
          <RulePanel
            workflowId={workflowId}
            stageGroupId={path.stageGroupId}
            stageId={path.stageId}
            ruleGroupId={path.ruleGroupId}
            ruleId={id}
            onSaved={onSaved}
            onDirtyChange={onDirtyChange}
          />
        ) : null
      case 'ruleAttribute':
        return path.stageGroupId && path.stageId && path.ruleGroupId && path.ruleId ? (
          <RuleAttributePanel
            workflowId={workflowId}
            stageGroupId={path.stageGroupId}
            stageId={path.stageId}
            ruleGroupId={path.ruleGroupId}
            ruleId={path.ruleId}
            attributeId={id}
            onSaved={onSaved}
            onDirtyChange={onDirtyChange}
          />
        ) : null
      case 'trigger':
        return path.stageGroupId && path.stageId && path.ruleGroupId ? (
          <TriggerPanel
            workflowId={workflowId}
            stageGroupId={path.stageGroupId}
            stageId={path.stageId}
            ruleGroupId={path.ruleGroupId}
            triggerId={id}
            onSaved={onSaved}
            onDirtyChange={onDirtyChange}
          />
        ) : null
      case 'triggerAttribute':
        return path.stageGroupId && path.stageId && path.ruleGroupId && path.triggerId ? (
          <TriggerAttributePanel
            workflowId={workflowId}
            stageGroupId={path.stageGroupId}
            stageId={path.stageId}
            ruleGroupId={path.ruleGroupId}
            triggerId={path.triggerId}
            attributeId={id}
            onSaved={onSaved}
            onDirtyChange={onDirtyChange}
          />
        ) : null
      default:
        return <p className="text-sm text-muted-foreground">{EN.branchHint}</p>
    }
  })()

  return (
    <section
      aria-label={EN.inspector}
      className="animate-slide-in flex min-h-[18rem] min-w-0 flex-1 flex-col rounded-xl border border-border bg-white p-4 shadow-sm transition-shadow duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none"
    >
      {crumbs.length > 0 ? (
        <p className="mb-3 text-xs break-words text-muted-foreground">{crumbs.join(` ${SEPARATOR} `)}</p>
      ) : null}
      {panel}
    </section>
  )
}
