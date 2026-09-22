import type { CfcWorkflowStageRuleDto } from '@/types/case'

export type RuleDraft = {
  id: number | null
  cfcWorkflowRuleDefinitionId: number
  cfcWorkflowStageRuleGroupId: number
  disabled: boolean
  initialDisabled: boolean
  startDate: string | null
  endDate: string | null
  sortOrder: number
  classType: string | null
}

export function toRuleDraft(
  rule: CfcWorkflowStageRuleDto | null,
  ruleGroupId: number,
  defaultDefinitionId: number,
): RuleDraft {
  if (!rule) {
    return {
      id: null,
      cfcWorkflowRuleDefinitionId: defaultDefinitionId,
      cfcWorkflowStageRuleGroupId: ruleGroupId,
      disabled: false,
      initialDisabled: false,
      startDate: null,
      endDate: null,
      sortOrder: 1,
      classType: null,
    }
  }
  const disabled = !(rule.enabledComputed ?? false)
  return {
    id: rule.id,
    cfcWorkflowRuleDefinitionId: rule.cfcWorkflowRuleDefinitionId ?? defaultDefinitionId,
    cfcWorkflowStageRuleGroupId: rule.cfcWorkflowStageRuleGroupId ?? ruleGroupId,
    disabled,
    initialDisabled: disabled,
    startDate: rule.startDate,
    endDate: rule.endDate,
    sortOrder: rule.sortOrder,
    classType: rule.classType ?? null,
  }
}

function nowIsoDate(): string {
  return new Date().toISOString()
}

export function toRuleBody(draft: RuleDraft): CfcWorkflowStageRuleDto {
  let startDate = draft.startDate
  let endDate = draft.endDate
  const disabled = draft.disabled

  if (disabled) {
    startDate = null
    endDate = endDate ?? nowIsoDate()
  } else {
    endDate = null
    if (draft.id !== null && draft.initialDisabled !== disabled && startDate === null) {
      startDate = nowIsoDate()
    }
  }

  return {
    id: draft.id ?? 0,
    sortOrder: draft.sortOrder,
    startDate,
    endDate,
    name: null,
    classType: draft.classType,
    cfcWorkflowRuleDefinitionId: draft.cfcWorkflowRuleDefinitionId,
    cfcWorkflowStageRuleGroupId: draft.cfcWorkflowStageRuleGroupId,
    enabled: disabled,
    enabledComputed: draft.initialDisabled,
    cfcWorkflowStageRuleAttributes: null,
  }
}
