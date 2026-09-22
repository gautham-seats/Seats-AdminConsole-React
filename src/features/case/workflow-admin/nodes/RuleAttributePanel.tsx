'use client'

import { useCallback, useMemo, useState } from 'react'
import { useApiRead } from '@/shared/api'
import type { CfcWorkflowStageRuleAttributeDto } from '@/types/case'
import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { fetchRules } from '../../case-api'
import {
  isLessonTypeAttribute,
  listOptionLabel,
  ruleAttributeValueError,
  validateRuleAttributeValue,
} from './attribute-form-utils'
import {
  createStageRuleGroupsRuleAttribute,
  deleteStageRuleGroupsRuleAttributes,
  fetchLessonTypes,
  fetchRuleDefinitionAttributes,
  updateStageRuleGroupsRuleAttribute,
} from './case-node-api'
import { NodePanelShell } from './NodePanelShell'
import { NodePanelState } from './NodePanelState'
import type { RuleAttributePanelProps } from './node-panel-types'

const TEXT = {
  RuleAttribute: 'Rule attribute',
  AttributeType: 'Attribute type',
  Value: 'Value',
  Option: 'Option',
  Select: 'Select',
  Yes: 'Yes',
  No: 'No',
  InvalidTypeFor: 'InvalidTypeFor',
  ErrorGettingLessonTypes: 'There was an error while getting the lesson types.',
  Refresh: 'Refresh',
} as const

function emptyAttribute(ruleId: number, definitionAttributeId: number): CfcWorkflowStageRuleAttributeDto {
  return {
    id: null,
    cfcWorkflowRuleDefinitionAttributeId: definitionAttributeId,
    cfcWorkflowStageRuleGroupId: ruleId,
    value: '',
    dataType: null,
    name: null,
    description: null,
    sortOrder: null,
  }
}

export function RuleAttributePanel({
  workflowId,
  stageGroupId,
  stageId,
  ruleGroupId,
  ruleId,
  attributeId,
  onSaved,
  onDirtyChange,
}: RuleAttributePanelProps) {
  const t = useScreenText(TEXT)
  const lessonTypesRead = useApiRead('rule-attr-lesson-types', fetchLessonTypes)

  const load = useCallback(
    async (signal: AbortSignal) => {
      const result = await fetchRules(workflowId, stageGroupId, stageId, ruleGroupId, ruleId, signal)
      const rule = Array.isArray(result) ? result[0] : result
      if (!rule) return null
      const definitionId = rule.cfcWorkflowRuleDefinitionId ?? 0
      const definitions = (await fetchRuleDefinitionAttributes(definitionId, signal)).filter(
        item => item.cfcWorkflowRuleDefinitionId === definitionId,
      )
      const attr = rule.cfcWorkflowStageRuleAttributes?.find(item => item.id === attributeId) ?? null
      const firstId = definitions[0]?.id ?? 0
      const blank = emptyAttribute(ruleId, attr?.cfcWorkflowRuleDefinitionAttributeId ?? firstId)
      const values =
        attr ??
        ({
          ...blank,
          dataType:
            definitions.find(item => item.id === blank.cfcWorkflowRuleDefinitionAttributeId)?.dataType ??
            null,
          name:
            definitions.find(item => item.id === blank.cfcWorkflowRuleDefinitionAttributeId)?.name ?? null,
        } satisfies CfcWorkflowStageRuleAttributeDto)
      return { definitions, values }
    },
    [attributeId, ruleGroupId, ruleId, stageGroupId, stageId, workflowId],
  )

  const read = useApiRead(`case-rule-attr-panel:${workflowId}:${ruleId}:${attributeId ?? 'new'}`, load)
  const baseline = useMemo(() => read.data?.values ?? emptyAttribute(ruleId, 0), [read.data?.values, ruleId])
  const options = read.data?.definitions ?? []
  const [draft, setDraft] = useState<{
    source: CfcWorkflowStageRuleAttributeDto
    values: CfcWorkflowStageRuleAttributeDto
  } | null>(null)
  const values = draft && draft.source === baseline ? draft.values : baseline
  const meta = options.find(option => option.id === values.cfcWorkflowRuleDefinitionAttributeId)
  const showLessonList = meta ? isLessonTypeAttribute(meta) : false
  const showBool = meta?.dataType === 'Bool' && !showLessonList
  const showNumber = meta?.dataType === 'Double'
  const [attempted, setAttempted] = useState(false)
  const valueProblem = ruleAttributeValueError(meta, values.value ?? '')
  // Requirement 8.1: shown after the first Save and cleared as soon as the value is valid.
  const valueError = attempted ? valueProblem : null
  const errorProps = valueError
    ? { 'aria-invalid': true, 'aria-describedby': 'rule-attribute-value-error' }
    : {}

  if (read.status !== 'success' || read.data === null)
    return (
      <NodePanelState
        status={read.status}
        empty={read.data === null}
        onRetry={read.reload}
        error={read.error}
      >
        {null}
      </NodePanelState>
    )

  return (
    <NodePanelShell
      title={t('RuleAttribute')}
      baseline={baseline}
      values={values}
      isNew={attributeId === null}
      onChange={next => setDraft({ source: baseline, values: next })}
      invalid={valueProblem !== null}
      onSaveAttempt={() => setAttempted(true)}
      onDirtyChange={onDirtyChange}
      onSaved={onSaved}
      onSave={async draftValues => {
        if (!validateRuleAttributeValue(meta, draftValues.value ?? '')) {
          throw new Error(`${t('InvalidTypeFor')}${meta?.name ?? ''}`)
        }
        const body = {
          ...draftValues,
          cfcWorkflowStageRuleGroupId: ruleId,
          name: meta?.name ?? draftValues.name,
          dataType: meta?.dataType ?? draftValues.dataType,
        }
        if (attributeId === null) await createStageRuleGroupsRuleAttribute(body)
        else await updateStageRuleGroupsRuleAttribute(body)
      }}
      onDelete={
        attributeId
          ? async () => {
              await deleteStageRuleGroupsRuleAttributes([attributeId])
            }
          : undefined
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rule-attribute-type">{t('AttributeType')}</Label>
          <Select
            value={String(values.cfcWorkflowRuleDefinitionAttributeId || '')}
            onValueChange={value => {
              const next = options.find(item => item.id === Number(value))
              if (!next) return
              const listDefault =
                isLessonTypeAttribute(next) && lessonTypesRead.data?.[0]
                  ? String(lessonTypesRead.data[0].id)
                  : ''
              setDraft({
                source: baseline,
                values: {
                  ...values,
                  cfcWorkflowRuleDefinitionAttributeId: next.id,
                  name: next.name,
                  dataType: next.dataType,
                  value: next.dataType === 'Bool' ? 'false' : listDefault,
                },
              })
            }}
          >
            <SelectTrigger id="rule-attribute-type" {...(meta ? {} : errorProps)}>
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
        {showLessonList ? (
          <div className="space-y-2">
            <Label htmlFor="rule-attribute-list">{t('Value')}</Label>
            <Select
              value={values.value ?? ''}
              onValueChange={value => setDraft({ source: baseline, values: { ...values, value } })}
            >
              <SelectTrigger id="rule-attribute-list" {...errorProps}>
                <SelectValue placeholder={t('Select')} />
              </SelectTrigger>
              <SelectContent>
                {(lessonTypesRead.data ?? []).map(option => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {listOptionLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lessonTypesRead.status === 'error' ? (
              <p role="alert" className="text-xs text-destructive">
                {t('ErrorGettingLessonTypes')}{' '}
                <button type="button" className="underline" onClick={lessonTypesRead.reload}>
                  {t('Refresh')}
                </button>
              </p>
            ) : null}
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
                    name="rule-attribute-bool"
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
        {!showLessonList && !showBool ? (
          <div className="space-y-2">
            <Label htmlFor="rule-attribute-value">{t('Value')}</Label>
            <input
              id="rule-attribute-value"
              {...errorProps}
              type={showNumber ? 'number' : 'text'}
              step={showNumber ? 'any' : undefined}
              value={values.value ?? ''}
              onChange={event =>
                setDraft({ source: baseline, values: { ...values, value: event.target.value } })
              }
              className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
            />
          </div>
        ) : null}
        {valueError ? (
          <p id="rule-attribute-value-error" role="alert" className="text-xs text-destructive">
            {valueError}
          </p>
        ) : null}
      </div>
    </NodePanelShell>
  )
}
