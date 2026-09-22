'use client'

import { useCallback, useMemo, useState } from 'react'
import { useApiRead } from '@/shared/api'
import { Checkbox, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { fetchRules } from '../../case-api'
import {
  createStageRuleGroupsRule,
  deleteStageRuleGroupsRule,
  fetchClassTypes,
  updateStageRuleGroupsRule,
} from './case-node-api'
import { NodePanelShell } from './NodePanelShell'
import { NodePanelState } from './NodePanelState'
import type { RulePanelProps } from './node-panel-types'
import { toRuleBody, toRuleDraft, type RuleDraft } from './rule-form'

const TEXT = {
  Rule: 'Rule',
  Disabled: 'Disabled',
  ClassType: 'Class type',
  Select: 'Select',
  RequiredMessage: 'There are fields with input validation errors.',
} as const

export function RulePanel({
  workflowId,
  stageGroupId,
  stageId,
  ruleGroupId,
  ruleId,
  onSaved,
  onDirtyChange,
}: RulePanelProps) {
  const t = useScreenText(TEXT)
  const classTypes = useApiRead('case-class-types', fetchClassTypes)
  const defaultDefinitionId = classTypes.data?.[0]?.id ?? 0

  const loadRule = useCallback(
    async (signal: AbortSignal) => {
      if (ruleId === null) return toRuleDraft(null, ruleGroupId, defaultDefinitionId)
      const result = await fetchRules(workflowId, stageGroupId, stageId, ruleGroupId, ruleId, signal)
      const rule = Array.isArray(result) ? result[0] : result
      return toRuleDraft(rule ?? null, ruleGroupId, defaultDefinitionId)
    },
    [defaultDefinitionId, ruleGroupId, ruleId, stageGroupId, stageId, workflowId],
  )

  const read = useApiRead(
    // An empty class-type list is still an answer; only a pending one holds the rule read back.
    classTypes.status === 'success'
      ? `case-rule-panel:${workflowId}:${ruleGroupId}:${ruleId ?? 'new'}`
      : null,
    loadRule,
  )
  const baseline = useMemo(
    () => read.data ?? toRuleDraft(null, ruleGroupId, defaultDefinitionId),
    [defaultDefinitionId, read.data, ruleGroupId],
  )
  const [draft, setDraft] = useState<{ source: RuleDraft; values: RuleDraft } | null>(null)
  const values = draft && draft.source === baseline ? draft.values : baseline
  const update = (change: (current: RuleDraft) => RuleDraft) => {
    setDraft({ source: baseline, values: change(values) })
  }
  const [attempted, setAttempted] = useState(false)
  // Legacy reads classTypes[0].id blindly; with no class types there is nothing valid to save.
  const typeMissing = !(classTypes.data ?? []).some(
    option => option.id === values.cfcWorkflowRuleDefinitionId,
  )
  const typeError = attempted && typeMissing ? t('RequiredMessage') : null

  const status =
    classTypes.status === 'error' || read.status === 'error'
      ? 'error'
      : classTypes.status !== 'success' || read.status !== 'success'
        ? 'loading'
        : 'success'
  if (status !== 'success') {
    return (
      <NodePanelState
        status={status}
        onRetry={() => {
          classTypes.reload()
          read.reload()
        }}
      >
        {null}
      </NodePanelState>
    )
  }

  return (
    <NodePanelShell
      title={t('Rule')}
      baseline={baseline}
      values={values}
      isNew={ruleId === null}
      onChange={next => setDraft({ source: baseline, values: next })}
      onDirtyChange={onDirtyChange}
      onSaved={onSaved}
      invalid={typeMissing}
      onSaveAttempt={() => setAttempted(true)}
      onSave={async draftValues => {
        const body = toRuleBody(draftValues)
        if (ruleId === null) await createStageRuleGroupsRule(body)
        else await updateStageRuleGroupsRule(body)
      }}
      onDelete={
        ruleId
          ? async () => {
              await deleteStageRuleGroupsRule([ruleId])
            }
          : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="rule-disabled"
            checked={values.disabled}
            label={t('Disabled')}
            onCheckedChange={() => update(current => ({ ...current, disabled: !current.disabled }))}
          />
          <Label htmlFor="rule-disabled" className="text-sm font-normal">
            {t('Disabled')}
          </Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-class-type">{t('ClassType')}</Label>
          <Select
            value={String(values.cfcWorkflowRuleDefinitionId)}
            onValueChange={value =>
              update(current => ({ ...current, cfcWorkflowRuleDefinitionId: Number(value) }))
            }
          >
            <SelectTrigger
              id="rule-class-type"
              aria-invalid={typeError ? true : undefined}
              aria-describedby={typeError ? 'rule-class-type-error' : undefined}
            >
              <SelectValue placeholder={t('Select')} />
            </SelectTrigger>
            <SelectContent>
              {(classTypes.data ?? []).map(option => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeError ? (
            <p id="rule-class-type-error" role="alert" className="text-xs text-destructive">
              {typeError}
            </p>
          ) : null}
        </div>
      </div>
    </NodePanelShell>
  )
}
