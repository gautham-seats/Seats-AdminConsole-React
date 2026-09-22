import { api } from '@/shared/api'
import type {
  CfcWorkflowRuleDefinitionDto,
  CfcWorkflowStageRuleAttributeDto,
  CfcWorkflowStageRuleDto,
  CfcWorkflowStageRuleGroupTriggerAttributeDto,
  CfcWorkflowStageRuleGroupTriggerDto,
} from '@/types/case'
import type { SimpleListItemDto } from '@/types/users'
import type { RuleDefinitionAttributeOption, TriggerTypeAttributeOption } from './node-panel-types'

const prefix = 'caseapi'

export function fetchClassTypes(signal?: AbortSignal) {
  return api.get<CfcWorkflowRuleDefinitionDto[]>(`${prefix}/getClassTypes`, { signal })
}

export function fetchTriggerTypes(signal?: AbortSignal) {
  return api.get<SimpleListItemDto[]>(`${prefix}/getTriggerTypes`, { signal })
}

export function fetchRuleDefinitionAttributes(definitionId?: number, signal?: AbortSignal) {
  const path = definitionId
    ? `${prefix}/getRuleDefinitionAttributes/${definitionId}`
    : `${prefix}/getRuleDefinitionAttributes`
  return api.get<RuleDefinitionAttributeOption[]>(path, { signal })
}

export function fetchTriggerTypeAttributes(triggerTypeId?: number, signal?: AbortSignal) {
  const path = triggerTypeId
    ? `${prefix}/getTriggerTypeAttributes/${triggerTypeId}`
    : `${prefix}/getTriggerTypeAttributes`
  return api.get<TriggerTypeAttributeOption[]>(path, { signal })
}

export function createStageRuleGroupsRule(body: CfcWorkflowStageRuleDto) {
  return api.post<void>(`${prefix}/creatstagerulegroupsrule`, { body })
}

export function updateStageRuleGroupsRule(body: CfcWorkflowStageRuleDto) {
  return api.put<void>(`${prefix}/updatestagerulegroupsrule`, { body })
}

export function deleteStageRuleGroupsRule(ids: readonly number[]) {
  return api.post<void>(`${prefix}/deletestagerulegroupsrule`, { body: ids })
}

export function createStageRuleGroupsRuleAttribute(body: CfcWorkflowStageRuleAttributeDto) {
  return api.post<void>(`${prefix}/createstagerulegroupsruleattributes`, { body })
}

export function updateStageRuleGroupsRuleAttribute(body: CfcWorkflowStageRuleAttributeDto) {
  return api.put<void>(`${prefix}/updatestagerulegroupsruleattributes`, { body })
}

export function deleteStageRuleGroupsRuleAttributes(ids: readonly number[]) {
  return api.post<void>(`${prefix}/deletestagerulegroupsruleattributes`, { body: ids })
}

export function createStageRuleGroupsTrigger(body: CfcWorkflowStageRuleGroupTriggerDto) {
  return api.post<void>(`${prefix}/creatstagerulegroupstrigger`, { body })
}

export function updateStageRuleGroupsTrigger(body: CfcWorkflowStageRuleGroupTriggerDto) {
  return api.put<void>(`${prefix}/updatestagerulegroupstrigger`, { body })
}

export function deleteStageRuleGroupsTrigger(ids: readonly number[]) {
  return api.post<void>(`${prefix}/deletestagerulegroupstrigger`, { body: ids })
}

export function createStageRuleGroupsTriggerAttribute(body: CfcWorkflowStageRuleGroupTriggerAttributeDto) {
  return api.post<void>(`${prefix}/createStageRuleGroupsTriggerAttribute`, { body })
}

export function updateStageRuleGroupsTriggerAttribute(body: CfcWorkflowStageRuleGroupTriggerAttributeDto) {
  return api.put<void>(`${prefix}/updateStageRuleGroupsTriggerAttribute`, { body })
}

export function deleteStageRuleGroupsTriggerAttribute(ids: readonly number[]) {
  return api.post<void>(`${prefix}/deleteStageRuleGroupsTriggerAttribute`, { body: ids })
}

export function fetchTemplateTypes(signal?: AbortSignal) {
  return api.get<SimpleListItemDto[]>(`${prefix}/TemplateType`, { signal })
}

export function fetchContactGroups(signal?: AbortSignal) {
  return api.get<SimpleListItemDto[]>(`${prefix}/GetContactGroup`, { signal })
}

export function fetchFunctions(signal?: AbortSignal) {
  return api.get<SimpleListItemDto[]>(`${prefix}/GetFunction`, { signal })
}

export function fetchStagesForWorkflow(workflowId: number, signal?: AbortSignal) {
  return api.get<SimpleListItemDto[]>(`${prefix}/StagesWorkflow`, { query: { id: workflowId }, signal })
}

export function fetchManualInterventionWorkflowOptions(workflowId: number, signal?: AbortSignal) {
  return api.get<SimpleListItemDto[]>(`${prefix}/manualInterventionWorkflow`, {
    query: { id: workflowId },
    signal,
  })
}

export function fetchLessonTypes(signal?: AbortSignal) {
  return api.get<SimpleListItemDto[]>('LessonTypeApi/', { signal })
}
