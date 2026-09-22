'use client'

import { useCallback, useMemo, useState } from 'react'
import { useApiRead } from '@/shared/api'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { fetchTriggers } from '../../case-api'
import {
  createStageRuleGroupsTrigger,
  deleteStageRuleGroupsTrigger,
  fetchTriggerTypes,
  updateStageRuleGroupsTrigger,
} from './case-node-api'
import { NodePanelShell } from './NodePanelShell'
import { NodePanelState } from './NodePanelState'
import type { TriggerPanelProps } from './node-panel-types'

const TEXT = {
  Trigger: 'Trigger',
  Type: 'Type',
  Select: 'Select',
  RequiredMessage: 'There are fields with input validation errors.',
} as const

type TriggerDraft = {
  id: number | null
  cfcTriggerTypeId: number
  name: string | null
  classType: string | null
  cfcWorkflowStageRuleGroupId: number
}

function toDraft(
  trigger: { id: number; cfcTriggerTypeId: number; name: string | null; classType: string | null } | null,
  ruleGroupId: number,
  defaultTypeId: number,
): TriggerDraft {
  if (!trigger) {
    return {
      id: null,
      cfcTriggerTypeId: defaultTypeId,
      name: null,
      classType: null,
      cfcWorkflowStageRuleGroupId: ruleGroupId,
    }
  }
  return {
    id: trigger.id,
    cfcTriggerTypeId: trigger.cfcTriggerTypeId,
    name: trigger.name,
    classType: trigger.classType,
    cfcWorkflowStageRuleGroupId: ruleGroupId,
  }
}

export function TriggerPanel({
  workflowId,
  stageGroupId,
  stageId,
  ruleGroupId,
  triggerId,
  onSaved,
  onDirtyChange,
}: TriggerPanelProps) {
  const t = useScreenText(TEXT)
  const typesRead = useApiRead('case-trigger-types', fetchTriggerTypes)
  const defaultTypeId = typesRead.data?.[0]?.id ?? 0

  const load = useCallback(
    async (signal: AbortSignal) => {
      if (triggerId === null) return toDraft(null, ruleGroupId, defaultTypeId)
      const result = await fetchTriggers(workflowId, stageGroupId, stageId, ruleGroupId, triggerId, signal)
      const trigger = Array.isArray(result) ? result[0] : result
      return toDraft(trigger ?? null, ruleGroupId, defaultTypeId)
    },
    [defaultTypeId, ruleGroupId, stageGroupId, stageId, triggerId, workflowId],
  )

  const read = useApiRead(
    typesRead.status === 'success'
      ? `case-trigger-panel:${workflowId}:${ruleGroupId}:${triggerId ?? 'new'}`
      : null,
    load,
  )
  const baseline = useMemo(
    () => read.data ?? toDraft(null, ruleGroupId, defaultTypeId),
    [defaultTypeId, read.data, ruleGroupId],
  )
  const [draft, setDraft] = useState<{ source: TriggerDraft; values: TriggerDraft } | null>(null)
  const values = draft && draft.source === baseline ? draft.values : baseline
  const [attempted, setAttempted] = useState(false)
  const typeMissing = !(typesRead.data ?? []).some(option => option.id === values.cfcTriggerTypeId)
  const typeError = attempted && typeMissing ? t('RequiredMessage') : null

  const status =
    typesRead.status === 'error' || read.status === 'error'
      ? 'error'
      : typesRead.status !== 'success' || read.status !== 'success'
        ? 'loading'
        : 'success'
  if (status !== 'success') {
    return (
      <NodePanelState
        status={status}
        onRetry={() => {
          typesRead.reload()
          read.reload()
        }}
      >
        {null}
      </NodePanelState>
    )
  }

  return (
    <NodePanelShell
      title={t('Trigger')}
      baseline={baseline}
      values={values}
      isNew={triggerId === null}
      onChange={next => setDraft({ source: baseline, values: next })}
      onDirtyChange={onDirtyChange}
      onSaved={onSaved}
      invalid={typeMissing}
      onSaveAttempt={() => setAttempted(true)}
      onSave={async draftValues => {
        const body = {
          id: draftValues.id ?? 0,
          cfcTriggerTypeId: draftValues.cfcTriggerTypeId,
          name: draftValues.name,
          classType: draftValues.classType,
          cfcWorkflowStageRuleGroupId: ruleGroupId,
          cfcWorkflowStageRuleGroupTriggerAttributes: null,
        }
        if (triggerId === null) await createStageRuleGroupsTrigger(body)
        else await updateStageRuleGroupsTrigger(body)
      }}
      onDelete={
        triggerId
          ? async () => {
              await deleteStageRuleGroupsTrigger([triggerId])
            }
          : undefined
      }
    >
      <div className="space-y-2">
        <Label htmlFor="trigger-type">{t('Type')}</Label>
        <Select
          value={String(values.cfcTriggerTypeId)}
          onValueChange={value =>
            setDraft({
              source: baseline,
              values: { ...values, cfcTriggerTypeId: Number(value) },
            })
          }
        >
          <SelectTrigger
            id="trigger-type"
            aria-invalid={typeError ? true : undefined}
            aria-describedby={typeError ? 'trigger-type-error' : undefined}
          >
            <SelectValue placeholder={t('Select')} />
          </SelectTrigger>
          <SelectContent>
            {(typesRead.data ?? []).map(option => (
              <SelectItem key={option.id} value={String(option.id)}>
                {option.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {typeError ? (
          <p id="trigger-type-error" role="alert" className="text-xs text-destructive">
            {typeError}
          </p>
        ) : null}
      </div>
    </NodePanelShell>
  )
}
