'use client'

import { useState } from 'react'
import { ApiError } from '@/shared/api/errors'
import { useApiRead } from '@/shared/api'
import { Input, Label } from '@/shared/ui'
import type { CfcWorkflowStageGroupDto } from '@/types/case'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import {
  createWorkflowStageGroup,
  deleteWorkflowStageGroup,
  fetchStageGroup,
  fetchWorkflowStageGroups,
  updateWorkflowGroup,
} from '../../case-api'
import { NodePanelShell } from './NodePanelShell'
import { NodePanelState } from './NodePanelState'
import type { NodePanelCallbacks } from './node-panel-types'
import { Textarea } from '@/shared/ui/Textarea'

const TEXT = {
  Name: 'Name',
  Description: 'Description',
  StageGroup: 'Stage Group',
  RequiredMessage: 'There are fields with input validation errors.',
  AtLeastOnGroupForWorkflow: 'At least one stage group is required for the workflow.',
} as const

const EN = {
  nameRequired: 'Enter a name.',
} as const

type StageGroupPanelProps = NodePanelCallbacks & {
  workflowId: number
  stageGroupId: number | null
}

function emptyGroup(workflowId: number): CfcWorkflowStageGroupDto {
  return { id: 0, name: '', description: '', sortOrder: 1, cfcWorkflowId: workflowId }
}

type StageGroupPanelFormProps = StageGroupPanelProps & {
  initial: CfcWorkflowStageGroupDto
}

function StageGroupPanelForm({
  workflowId,
  stageGroupId,
  initial,
  onSaved,
  onDirtyChange,
}: StageGroupPanelFormProps) {
  const t = useScreenText(TEXT)
  const [baseline, setBaseline] = useState(initial)
  const [values, setValues] = useState(initial)
  const [attempted, setAttempted] = useState(false)
  const nameMissing = !values.name?.trim()
  // Requirement 8.1: shown after the first Save and cleared as soon as a name is typed.
  const nameError = attempted && nameMissing ? EN.nameRequired : null

  return (
    <NodePanelShell
      title={t('StageGroup')}
      baseline={baseline}
      values={values}
      isNew={stageGroupId === null}
      onChange={setValues}
      invalid={nameMissing}
      onSaveAttempt={() => setAttempted(true)}
      onDirtyChange={onDirtyChange}
      onSaved={() => {
        setBaseline(values)
        onSaved()
      }}
      onSave={async draft => {
        if (!draft.name?.trim()) throw new ApiError('http', '', 400, t('RequiredMessage'))
        // seats-admin-workflow-creator-stage-group.html:390-398 posts id null and no sortOrder for a new group.
        if (stageGroupId === null) {
          await createWorkflowStageGroup({
            id: null,
            name: draft.name,
            description: draft.description,
            cfcWorkflowId: workflowId,
          })
        } else await updateWorkflowGroup({ ...draft, cfcWorkflowId: workflowId })
      }}
      onDelete={
        stageGroupId
          ? async () => {
              const groups = await fetchWorkflowStageGroups(workflowId)
              if (groups.length <= 1) {
                throw new ApiError('http', '', 400, t('AtLeastOnGroupForWorkflow'))
              }
              await deleteWorkflowStageGroup([stageGroupId])
            }
          : undefined
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="stage-group-name">{t('Name')}</Label>
          <Input
            id="stage-group-name"
            value={values.name ?? ''}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? 'stage-group-name-error' : undefined}
            onChange={event => setValues(current => ({ ...current, name: event.target.value }))}
          />
          {nameError ? (
            <p id="stage-group-name-error" className="text-xs text-destructive">
              {nameError}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="stage-group-description">{t('Description')}</Label>
          <Textarea
            id="stage-group-description"
            value={values.description ?? ''}
            onChange={event => setValues(current => ({ ...current, description: event.target.value }))}
            className="min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
          />
        </div>
      </div>
    </NodePanelShell>
  )
}

export function StageGroupPanel({ workflowId, stageGroupId, onSaved, onDirtyChange }: StageGroupPanelProps) {
  const read = useApiRead(
    stageGroupId === null ? null : `case:stage-group:${workflowId}:${stageGroupId}`,
    signal => fetchStageGroup(workflowId, stageGroupId ?? 0, signal),
  )

  if (stageGroupId === null) {
    return (
      <StageGroupPanelForm
        key="new"
        workflowId={workflowId}
        stageGroupId={null}
        initial={emptyGroup(workflowId)}
        onSaved={onSaved}
        onDirtyChange={onDirtyChange}
      />
    )
  }

  if (read.status !== 'success')
    return (
      <NodePanelState status={read.status} onRetry={read.reload}>
        {null}
      </NodePanelState>
    )
  if (!read.data)
    return (
      <NodePanelState status="success" empty onRetry={read.reload}>
        {null}
      </NodePanelState>
    )
  const group = Array.isArray(read.data) ? read.data[0] : read.data
  if (!group)
    return (
      <NodePanelState status="success" empty onRetry={read.reload}>
        {null}
      </NodePanelState>
    )

  return (
    <StageGroupPanelForm
      key={stageGroupId}
      workflowId={workflowId}
      stageGroupId={stageGroupId}
      initial={{ ...group, cfcWorkflowId: workflowId }}
      onSaved={onSaved}
      onDirtyChange={onDirtyChange}
    />
  )
}
