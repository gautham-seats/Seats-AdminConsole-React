'use client'

import { useState } from 'react'
import { ApiError } from '@/shared/api/errors'
import { useApiRead } from '@/shared/api'
import { Input, Label } from '@/shared/ui'
import type { CfcWorkflowStageRuleGroupDto } from '@/types/case'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import {
  createStageRuleGroup,
  deleteStageRuleGroup,
  fetchRuleGroups,
  updateStageRuleGroup,
} from '../../case-api'
import { NodePanelShell } from './NodePanelShell'
import { NodePanelState } from './NodePanelState'
import type { NodePanelCallbacks } from './node-panel-types'
import { Textarea } from '@/shared/ui/Textarea'

const TEXT = {
  Name: 'Name',
  Description: 'Description',
  IsSuccess: 'Is success',
  Success: 'Success',
  Failure: 'Failure',
  MustPassAllRules: 'Must pass all rules',
  Yes: 'Yes',
  No: 'No',
  RequiredMessage: 'There are fields with input validation errors.',
  RuleGroup: 'Rule group',
} as const

const EN = {
  nameRequired: 'Enter a name.',
} as const

type RuleGroupPanelProps = NodePanelCallbacks & {
  workflowId: number
  stageGroupId: number
  stageId: number
  ruleGroupId: number | null
}

function emptyRuleGroup(stageId: number): CfcWorkflowStageRuleGroupDto {
  return {
    id: null,
    name: '',
    description: '',
    sortOrder: 1,
    isSuccess: false,
    cfcWorkflowStageId: stageId,
    mustPassAllRules: false,
    cfcWorkflowStageRuleGroupConstraints: null,
    cfcWorkflowStageRules: null,
    cfcWorkflowStageRuleGroupTriggers: null,
  }
}

type RuleGroupPanelFormProps = RuleGroupPanelProps & {
  initial: CfcWorkflowStageRuleGroupDto
}

function RuleGroupPanelForm({
  stageId,
  ruleGroupId,
  initial,
  onSaved,
  onDirtyChange,
}: RuleGroupPanelFormProps) {
  const t = useScreenText(TEXT)
  const [baseline, setBaseline] = useState(initial)
  const [values, setValues] = useState(initial)
  const [attempted, setAttempted] = useState(false)
  const nameMissing = !values.name?.trim()
  // Requirement 8.1: shown after the first Save and cleared as soon as a name is typed.
  const nameError = attempted && nameMissing ? EN.nameRequired : null

  return (
    <NodePanelShell
      title={t('RuleGroup')}
      baseline={baseline}
      values={values}
      isNew={ruleGroupId === null}
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
        if (ruleGroupId === null) await createStageRuleGroup({ ...draft, cfcWorkflowStageId: stageId })
        else await updateStageRuleGroup({ ...draft, cfcWorkflowStageId: stageId })
      }}
      onDelete={
        ruleGroupId
          ? async () => {
              await deleteStageRuleGroup([ruleGroupId])
            }
          : undefined
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rule-group-name">{t('Name')}</Label>
          <Input
            id="rule-group-name"
            value={values.name ?? ''}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? 'rule-group-name-error' : undefined}
            onChange={event => setValues(current => ({ ...current, name: event.target.value }))}
          />
          {nameError ? (
            <p id="rule-group-name-error" className="text-xs text-destructive">
              {nameError}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-group-description">{t('Description')}</Label>
          <Textarea
            id="rule-group-description"
            value={values.description ?? ''}
            onChange={event => setValues(current => ({ ...current, description: event.target.value }))}
            className="field-bloom min-h-24 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('IsSuccess')}</legend>
          <div className="flex gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                className="size-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                name="rule-group-success"
                checked={values.isSuccess}
                onChange={() => setValues(current => ({ ...current, isSuccess: true }))}
              />
              {t('Success')}
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                className="size-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                name="rule-group-success"
                checked={!values.isSuccess}
                onChange={() => setValues(current => ({ ...current, isSuccess: false }))}
              />
              {t('Failure')}
            </label>
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t('MustPassAllRules')}</legend>
          <div className="flex gap-4 text-sm">
            {[true, false].map(option => (
              <label key={String(option)} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  className="size-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  name="rule-group-pass-all"
                  checked={values.mustPassAllRules === option}
                  onChange={() => setValues(current => ({ ...current, mustPassAllRules: option }))}
                />
                {option ? t('Yes') : t('No')}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </NodePanelShell>
  )
}

export function RuleGroupPanel({
  workflowId,
  stageGroupId,
  stageId,
  ruleGroupId,
  onSaved,
  onDirtyChange,
}: RuleGroupPanelProps) {
  const read = useApiRead(
    ruleGroupId === null ? null : `case:rule-group:${workflowId}:${stageGroupId}:${stageId}:${ruleGroupId}`,
    signal => fetchRuleGroups(workflowId, stageGroupId, stageId, ruleGroupId ?? 0, signal),
  )

  if (ruleGroupId === null) {
    return (
      <RuleGroupPanelForm
        key="new"
        workflowId={workflowId}
        stageGroupId={stageGroupId}
        stageId={stageId}
        ruleGroupId={null}
        initial={emptyRuleGroup(stageId)}
        onSaved={onSaved}
        onDirtyChange={onDirtyChange}
      />
    )
  }

  if (read.status !== 'success')
    return (
      <NodePanelState status={read.status} onRetry={read.reload} error={read.error}>
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
    <RuleGroupPanelForm
      key={ruleGroupId}
      workflowId={workflowId}
      stageGroupId={stageGroupId}
      stageId={stageId}
      ruleGroupId={ruleGroupId}
      initial={group}
      onSaved={onSaved}
      onDirtyChange={onDirtyChange}
    />
  )
}
