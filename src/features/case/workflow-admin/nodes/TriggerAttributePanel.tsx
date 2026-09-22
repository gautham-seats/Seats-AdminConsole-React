'use client'

import { useCallback, useMemo, useState } from 'react'
import { useApiRead } from '@/shared/api'
import type { CfcWorkflowStageRuleGroupTriggerAttributeDto } from '@/types/case'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { fetchTriggers } from '../../case-api'
import {
  listOptionLabel,
  triggerAttributeListKind,
  triggerAttributeValueError,
  validateTriggerAttributeValue,
} from './attribute-form-utils'
import {
  createStageRuleGroupsTriggerAttribute,
  deleteStageRuleGroupsTriggerAttribute,
  fetchContactGroups,
  fetchFunctions,
  fetchManualInterventionWorkflowOptions,
  fetchStagesForWorkflow,
  fetchTemplateTypes,
  fetchTriggerTypeAttributes,
  updateStageRuleGroupsTriggerAttribute,
} from './case-node-api'
import { NodePanelShell } from './NodePanelShell'
import { NodePanelState } from './NodePanelState'
import type { ListOption, TriggerAttributePanelProps } from './node-panel-types'

const TEXT = {
  TriggerAttribute: 'Trigger attribute',
  AttributeType: 'Attribute type',
  Value: 'Value',
  Option: 'Option',
  Select: 'Select',
  Yes: 'Yes',
  No: 'No',
  InvalidTypeFor: 'InvalidTypeFor',
} as const

function emptyAttribute(
  triggerId: number,
  attributeId: number,
): CfcWorkflowStageRuleGroupTriggerAttributeDto {
  return {
    id: 0,
    cfcTriggerTypeAttributeId: attributeId,
    cfcWorkflowStageRuleGroupTriggerId: triggerId,
    dataType: null,
    name: null,
    description: null,
    sortOrder: 0,
    value: '',
    valueName: null,
  }
}

function defaultListValue(options: ListOption[] | undefined): string {
  return options?.[0] ? String(options[0].id) : ''
}

export function TriggerAttributePanel({
  workflowId,
  stageGroupId,
  stageId,
  ruleGroupId,
  triggerId,
  attributeId,
  onSaved,
  onDirtyChange,
}: TriggerAttributePanelProps) {
  const t = useScreenText(TEXT)
  // …trigger-attributes.html:557-567 fires the five option requests together.
  const loadOptions = useCallback(
    async (signal: AbortSignal) => {
      const [template, contact, fn, stage, manual] = await Promise.all([
        fetchTemplateTypes(signal),
        fetchContactGroups(signal),
        fetchFunctions(signal).catch(() => [] as ListOption[]),
        fetchStagesForWorkflow(workflowId, signal),
        fetchManualInterventionWorkflowOptions(workflowId, signal),
      ])
      return { template, contact, function: fn, stage, manual }
    },
    [workflowId],
  )
  const optionsRead = useApiRead(`trigger-attr-options-${workflowId}`, loadOptions)

  const load = useCallback(
    async (signal: AbortSignal) => {
      const result = await fetchTriggers(workflowId, stageGroupId, stageId, ruleGroupId, triggerId, signal)
      const trigger = Array.isArray(result) ? result[0] : result
      if (!trigger) return null
      const triggerTypeId = trigger.cfcTriggerTypeId
      const definitions = (await fetchTriggerTypeAttributes(triggerTypeId, signal)).filter(
        item => item.cfcTriggerTypeId === triggerTypeId,
      )
      const attr =
        trigger.cfcWorkflowStageRuleGroupTriggerAttributes?.find(item => item.id === attributeId) ?? null
      const firstId = definitions[0]?.id ?? 0
      const values = attr ?? emptyAttribute(triggerId, firstId)
      return { definitions, values }
    },
    [attributeId, ruleGroupId, stageGroupId, stageId, triggerId, workflowId],
  )

  const read = useApiRead(`case-trigger-attr-panel:${workflowId}:${triggerId}:${attributeId ?? 'new'}`, load)
  const baseline = useMemo(
    () => read.data?.values ?? emptyAttribute(triggerId, 0),
    [read.data?.values, triggerId],
  )
  const options = read.data?.definitions ?? []
  const [draft, setDraft] = useState<{
    source: CfcWorkflowStageRuleGroupTriggerAttributeDto
    values: CfcWorkflowStageRuleGroupTriggerAttributeDto
  } | null>(null)
  const values = draft && draft.source === baseline ? draft.values : baseline
  const meta = options.find(option => option.id === values.cfcTriggerTypeAttributeId)
  const listKind = meta ? triggerAttributeListKind(meta) : null
  const listOptions = listKind ? optionsRead.data?.[listKind] : undefined
  const showList = Boolean(listKind && listOptions)
  const showBool = meta?.dataType === 'Bool' && !showList
  const [attempted, setAttempted] = useState(false)
  const valueProblem = triggerAttributeValueError(meta, values.value ?? '')
  // Requirement 8.1: shown after the first Save and cleared as soon as the value is valid.
  const valueError = attempted ? valueProblem : null
  const errorProps = valueError
    ? { 'aria-invalid': true, 'aria-describedby': 'trigger-attribute-value-error' }
    : {}

  const status =
    read.status === 'error' || optionsRead.status === 'error'
      ? 'error'
      : read.status !== 'success' || optionsRead.status !== 'success'
        ? 'loading'
        : 'success'
  if (status !== 'success' || read.data === null) {
    return (
      <NodePanelState
        status={status}
        empty={read.data === null}
        onRetry={() => {
          read.reload()
          optionsRead.reload()
        }}
      >
        {null}
      </NodePanelState>
    )
  }

  return (
    <NodePanelShell
      title={t('TriggerAttribute')}
      baseline={baseline}
      values={values}
      isNew={attributeId === null}
      onChange={next => setDraft({ source: baseline, values: next })}
      invalid={valueProblem !== null}
      onSaveAttempt={() => setAttempted(true)}
      onDirtyChange={onDirtyChange}
      onSaved={onSaved}
      onSave={async draftValues => {
        if (!validateTriggerAttributeValue(meta, draftValues.value ?? '')) {
          throw new Error(`${t('InvalidTypeFor')}${meta?.name ?? ''}`)
        }
        const body = {
          ...draftValues,
          id: draftValues.id || attributeId || 0,
          name: meta?.name ?? draftValues.name,
          dataType: meta?.dataType ?? draftValues.dataType,
        }
        if (attributeId === null) await createStageRuleGroupsTriggerAttribute(body)
        else await updateStageRuleGroupsTriggerAttribute(body)
      }}
      onDelete={
        attributeId
          ? async () => {
              await deleteStageRuleGroupsTriggerAttribute([attributeId])
            }
          : undefined
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="trigger-attribute-type">{t('AttributeType')}</Label>
          <Select
            value={String(values.cfcTriggerTypeAttributeId || '')}
            disabled={attributeId !== null}
            onValueChange={value => {
              const next = options.find(item => item.id === Number(value))
              if (!next) return
              const kind = triggerAttributeListKind(next)
              const nextList = kind ? optionsRead.data?.[kind] : undefined
              setDraft({
                source: baseline,
                values: {
                  ...values,
                  cfcTriggerTypeAttributeId: next.id,
                  name: next.name,
                  dataType: next.dataType,
                  value: next.dataType === 'Bool' ? 'false' : kind ? defaultListValue(nextList) : '',
                },
              })
            }}
          >
            <SelectTrigger id="trigger-attribute-type" {...(meta ? {} : errorProps)}>
              <SelectValue placeholder={t('Select')} />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showList ? (
          <div className="space-y-2">
            <Label htmlFor="trigger-attribute-list">{t('Value')}</Label>
            <Select
              value={values.value ?? ''}
              onValueChange={value => setDraft({ source: baseline, values: { ...values, value } })}
            >
              <SelectTrigger id="trigger-attribute-list" {...errorProps}>
                <SelectValue placeholder={t('Select')} />
              </SelectTrigger>
              <SelectContent>
                {(listOptions ?? []).map(option => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {listOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {showBool ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t('Option')}</legend>
            <div className="flex gap-4 text-sm">
              {(['true', 'false'] as const).map(option => (
                <label key={option} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    className="size-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    name="trigger-attribute-bool"
                    {...errorProps}
                    checked={values.value === option}
                    onChange={() => setDraft({ source: baseline, values: { ...values, value: option } })}
                  />
                  {option === 'true' ? t('Yes') : t('No')}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        {!showList && !showBool ? (
          <div className="space-y-2">
            <Label htmlFor="trigger-attribute-value">{t('Value')}</Label>
            <input
              id="trigger-attribute-value"
              {...errorProps}
              value={values.value ?? ''}
              onChange={event =>
                setDraft({ source: baseline, values: { ...values, value: event.target.value } })
              }
              className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
            />
          </div>
        ) : null}
        {valueError ? (
          <p id="trigger-attribute-value-error" role="alert" className="text-xs text-destructive">
            {valueError}
          </p>
        ) : null}
      </div>
    </NodePanelShell>
  )
}
