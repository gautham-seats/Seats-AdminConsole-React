import { api } from '@/shared/api'
import type {
  CasePageDto,
  CfcConstraintTypeDto,
  CfcManualInterventionDto,
  CfcStudentInWorkflowDto,
  CfcStudentsInWorkflowDto,
  CfcWorkflowDto,
  CfcWorkflowGroupDto,
  CfcWorkflowStageDto,
  CfcWorkflowStageGroupDto,
  CfcWorkflowStageRuleDto,
  CfcWorkflowStageRuleGroupDto,
  CfcWorkflowStageRuleGroupTriggerDto,
  ManualInterventionsGridDto,
  ManualInterventionsQuery,
  WorkflowActionDto,
  WorkflowCreatorDto,
  WorkflowStudentsQuery,
  WorkflowsQuery,
} from '@/types/case'
import type { SimpleListItemDto } from '@/types/users'

const prefix = 'caseapi'

function toQuery<T extends Record<string, string | number | boolean | undefined | null>>(params: T) {
  const query: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query[key] = String(value)
  }
  return query
}

export function fetchWorkflows(query: WorkflowsQuery, signal?: AbortSignal) {
  return api.get<CasePageDto<CfcWorkflowDto>>(`${prefix}/workflows`, { query: toQuery(query), signal })
}

export function fetchWorkflowStudents(query: WorkflowStudentsQuery, signal?: AbortSignal) {
  const { workflowId, stageId, ...rest } = query
  const path =
    workflowId && stageId
      ? `${prefix}/getWorkflowStudents/${workflowId}/stages/${stageId}`
      : workflowId
        ? `${prefix}/getWorkflowStudents/${workflowId}`
        : `${prefix}/getWorkflowStudents`
  return api.get<CasePageDto<CfcStudentInWorkflowDto>>(path, { query: toQuery(rest), signal })
}

export function searchStudentsByNumber(query: string, signal?: AbortSignal) {
  return api.get<SimpleListItemDto[]>(`${prefix}/getStudentsByNumber`, { query: { query }, signal })
}

export function searchStudentsByName(query: string, signal?: AbortSignal) {
  return api.get<SimpleListItemDto[]>(`${prefix}/getStudentsByName`, { query: { query }, signal })
}

export function updateWorkflowActions(body: WorkflowActionDto) {
  return api.post<void>(`${prefix}/updateWorkflowActions`, { body })
}

export function removeStudentsInWorkflow(body: CfcStudentsInWorkflowDto) {
  return api.post<void>(`${prefix}/removeStudentsInWorkflow`, { body })
}

// seats-admin-workflow-creator.html:795-798 _mapWorkflow posts id and name only.
export type WorkflowNameBody = Pick<WorkflowCreatorDto, 'id' | 'name'>

export function createWorkflow(body: WorkflowNameBody) {
  return api.post<void>(`${prefix}/createWorkflow`, { body })
}

export function updateWorkflow(body: WorkflowNameBody) {
  return api.put<void>(`${prefix}/updateworkflow`, { body })
}

export function updateWorkflowApprovalType(workflowId: number, approvalTypeValue: number) {
  return api.put<void>(`${prefix}/updateWorkflowApprovalType`, {
    query: { workflowId, approvalTypeValue },
  })
}

export function updateWorkflowStatusType(workflowId: number, statusTypeValue: number) {
  return api.put<void>(`${prefix}/updateStatusType`, {
    query: { workflowId, statusTypeValue },
  })
}

export function deleteWorkflow(ids: readonly number[]) {
  return api.post<void>(`${prefix}/deleteWorkflow`, { body: ids })
}

export function fetchWorkflowStages(workflowId?: number, signal?: AbortSignal) {
  const path = workflowId ? `${prefix}/getstages/${workflowId}` : `${prefix}/getstages`
  return api.get<CfcWorkflowGroupDto[]>(path, { signal })
}

export function fetchWorkflowStageGroups(workflowId: number, signal?: AbortSignal) {
  return api.get<CfcWorkflowStageGroupDto[]>(`${prefix}/workflows/${workflowId}`, { signal })
}

export function fetchStageGroup(workflowId: number, stageGroupId?: number, signal?: AbortSignal) {
  const path = stageGroupId
    ? `${prefix}/workflows/${workflowId}/stageGroups/${stageGroupId}`
    : `${prefix}/workflows/${workflowId}/stageGroups`
  return api.get<CfcWorkflowStageGroupDto | CfcWorkflowStageGroupDto[]>(path, { signal })
}

export function fetchStages(
  workflowId: number,
  stageGroupId: number,
  stageId?: number,
  signal?: AbortSignal,
) {
  const path = stageId
    ? `${prefix}/workflows/${workflowId}/stageGroups/${stageGroupId}/stages/${stageId}`
    : `${prefix}/workflows/${workflowId}/stageGroups/${stageGroupId}/stages`
  return api.get<CfcWorkflowStageDto | CfcWorkflowStageDto[]>(path, { signal })
}

export function fetchRuleGroups(
  workflowId: number,
  stageGroupId: number,
  stageId: number,
  ruleGroupId?: number,
  signal?: AbortSignal,
) {
  const path = ruleGroupId
    ? `${prefix}/workflows/${workflowId}/stageGroups/${stageGroupId}/stages/${stageId}/ruleGroups/${ruleGroupId}`
    : `${prefix}/workflows/${workflowId}/stageGroups/${stageGroupId}/stages/${stageId}/ruleGroups`
  return api.get<CfcWorkflowStageRuleGroupDto | CfcWorkflowStageRuleGroupDto[]>(path, { signal })
}

export function fetchRules(
  workflowId: number,
  stageGroupId: number,
  stageId: number,
  ruleGroupId: number,
  ruleId?: number,
  signal?: AbortSignal,
) {
  const path = ruleId
    ? `${prefix}/workflows/${workflowId}/stageGroups/${stageGroupId}/stages/${stageId}/ruleGroups/${ruleGroupId}/rules/${ruleId}`
    : `${prefix}/workflows/${workflowId}/stageGroups/${stageGroupId}/stages/${stageId}/ruleGroups/${ruleGroupId}/rules`
  return api.get<CfcWorkflowStageRuleDto | CfcWorkflowStageRuleDto[]>(path, { signal })
}

export function fetchTriggers(
  workflowId: number,
  stageGroupId: number,
  stageId: number,
  ruleGroupId: number,
  triggerId?: number,
  signal?: AbortSignal,
) {
  const path = triggerId
    ? `${prefix}/workflows/${workflowId}/stageGroups/${stageGroupId}/stages/${stageId}/ruleGroups/${ruleGroupId}/triggers/${triggerId}`
    : `${prefix}/workflows/${workflowId}/stageGroups/${stageGroupId}/stages/${stageId}/ruleGroups/${ruleGroupId}/triggers`
  return api.get<CfcWorkflowStageRuleGroupTriggerDto | CfcWorkflowStageRuleGroupTriggerDto[]>(path, {
    signal,
  })
}

export function fetchConstraintTypes(workflowId: number, signal?: AbortSignal) {
  return api.get<CfcConstraintTypeDto[]>(`${prefix}/getConstraintTypes`, { query: { workflowId }, signal })
}

// CfcWorkflowStageRuleGroupViewModel.cs:26-30 binds the rules, triggers and constraints, so posting the fetched
// graph back would let a rename rewrite them. seats-admin-workflow-crud-behaviour.html:56 sent scalars only.
function toRuleGroupBody(body: CfcWorkflowStageRuleGroupDto) {
  return {
    id: body.id,
    name: body.name,
    description: body.description,
    sortOrder: body.sortOrder,
    isSuccess: body.isSuccess,
    cfcWorkflowStageId: body.cfcWorkflowStageId,
    mustPassAllRules: body.mustPassAllRules,
  }
}

export function createStageRuleGroup(body: CfcWorkflowStageRuleGroupDto) {
  return api.post<void>(`${prefix}/createstagerulegroup`, { body: toRuleGroupBody(body) })
}

export function updateWorkflowGroup(body: CfcWorkflowStageGroupDto) {
  return api.put<void>(`${prefix}/updateworkflowgroup`, { body })
}

export function updateWorkflowStage(body: CfcWorkflowStageDto) {
  return api.put<void>(`${prefix}/updateworkflowstage`, { body })
}

export function updateStageRuleGroup(body: CfcWorkflowStageRuleGroupDto) {
  return api.put<void>(`${prefix}/updatestagerulegroup`, { body: toRuleGroupBody(body) })
}

// seats-admin-workflow-creator-stage-group.html:390-398: a new group posts id null and no sortOrder.
export type StageGroupCreateBody = Pick<
  CfcWorkflowStageGroupDto,
  'name' | 'description' | 'cfcWorkflowId'
> & {
  id: null
}

export function createWorkflowStageGroup(body: StageGroupCreateBody) {
  return api.post<void>(`${prefix}/createWorkflowStageGroup`, { body })
}

export function deleteWorkflowStageGroup(ids: readonly number[]) {
  return api.post<void>(`${prefix}/deleteWorkflowStageGroup`, { body: ids })
}

export function deleteStageRuleGroup(ids: readonly number[]) {
  return api.post<void>(`${prefix}/deletestagerulegroup`, { body: ids })
}

export function deleteWorkflowStage(ids: readonly number[]) {
  return api.post<void>(`${prefix}/deleteWorkflowStage`, { body: ids })
}

export function createWorkflowStage(body: CfcWorkflowStageDto) {
  return api.post<void>(`${prefix}/createWorkflowStage`, { body })
}

export function createConstraints(workflowId: number, constraintTypeId: number, body: CfcConstraintTypeDto) {
  return api.post<void>(`${prefix}/createconstraints`, {
    body,
    query: { workflowId, constraintTypeId },
  })
}

export function fetchManualInterventions(query: ManualInterventionsQuery, signal?: AbortSignal) {
  return api.get<ManualInterventionsGridDto>(`${prefix}/manualInterventions`, {
    query: toQuery(query),
    signal,
  })
}

export function fetchManualIntervention(id: number, signal?: AbortSignal) {
  return api.get<CfcManualInterventionDto>(`${prefix}/getManualIntervention`, {
    query: { id },
    signal,
  })
}

export function createManualIntervention(body: CfcManualInterventionDto) {
  return api.post<void>(`${prefix}/createManualIntervention`, { body })
}

export function deleteManualIntervention(ids: readonly number[]) {
  return api.post<void>(`${prefix}/deleteManualIntervention`, { body: ids })
}

// CaseApiController.cs:839 binds stepIds from the body and manualInterventionId from the URL.
export function validateDeleteStepAction(stepIds: readonly number[], manualInterventionId: number) {
  return api.post<boolean>(`${prefix}/validateDeleteStepAction`, {
    query: { manualInterventionId: String(manualInterventionId) },
    body: stepIds,
  })
}

export function fetchManualInterventionTypeOptions(signal?: AbortSignal) {
  return api.get<SimpleListItemDto[]>(`${prefix}/getManualInterventionTypeOptions`, { signal })
}

export function fetchWorkflowStagesWithManualInterventionRelation(workflowId: number, signal?: AbortSignal) {
  return api.get<CfcWorkflowStageDto[]>(`${prefix}/getWorkflowStagesWithManualInterventionRelation`, {
    query: { workflowId },
    signal,
  })
}

// seats-admin-workflow-creator-stage-constraints.html:401-431 and WorkflowStageRuleGroupsConstraints.cshtml:59-68:
// the option routes the constraint editor reads, one per lookup, given to LookupField as paths.
export const CONSTRAINT_OPTION_PATHS = {
  school: `${prefix}/getSchoolOptions`,
  course: `${prefix}/getCourseOptions`,
  module: `${prefix}/getModuleOptions`,
  site: `${prefix}/getSitesOptions`,
  faculty: `${prefix}/getFacultyOptions`,
  student: `${prefix}/getStudentOptions`,
  adminArea: `${prefix}/getAdminAreaOptions`,
  studentSubType: `${prefix}/getStudentSubTypeOptions`,
  studentType: `${prefix}/getStudentTypeOptions`,
  studentMonitoredType: `${prefix}/getStudentMonitoredType`,
} as const
