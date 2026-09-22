import type { SimpleListItemDto } from './users'

export type CasePageDto<T> = {
  items: T[] | null
  totalRowCount: number
}

export const WorkflowType = {
  Standard: 1,
  Engagement: 2,
  StandardByModule: 3,
  General: 4,
  NewEngine: 5,
} as const

export type WorkflowTypeId = (typeof WorkflowType)[keyof typeof WorkflowType]

export const CfcWorkflowApprovalType = {
  Approve: 1,
  NotApproved: 2,
  AutoApprove: 3,
} as const

export const CfcWorkflowStatusType = {
  Live: 1,
  Draft: 2,
} as const

export type CfcWorkflowDto = {
  id: number
  name: string | null
  startDate: string | null
  endDate: string | null
  cfcWorkflowTypeId: number
  sendToEmailBasedOnFaculty: boolean
  sendFromEmailBasedOnFaculty: boolean
  cfcWorkflowStatusTypeId: number
  cfcWorkflowApprovalTypeId: number
  showAsDefault: boolean
  defaultContactGroupId: number
  totalStudentsInWorkflowCount: number
  totalEmailCount: number
  totalStageChange: number
  nextCheckDate: string | null
  finalWarningStageChange: number
  cfcWorkflowConstraints: CfcConstraintDto[] | null
  globalId: string | null
}

export type CfcConstraintDto = {
  id: number
  cfcConstraintTypeId: number
  cfcConstraintTypeName: string | null
  cfcWorkflowStageRuleGroupId: number
  name: string | null
  value: number
}

export type CfcWorkflowConstraintDto = {
  id: number | null
  cfcConstraintTypeId: number
  cfcConstraintTypeName: string | null
  cfcWorkflowId: number
  value: string | null
  description: string | null
}

export type CfcConstraintTypeDto = {
  id: number
  name: string | null
  cfcWorkflowConstraintsViewModel: CfcWorkflowConstraintDto[] | null
}

export type CfcWorkflowStageGroupDto = {
  id: number
  name: string | null
  description: string | null
  sortOrder: number
  cfcWorkflowId?: number
  cfcWorkflowStages?: CfcWorkflowStageDto[] | null
}

export type CfcWorkflowStageDto = {
  id: number | null
  workflowGroupId?: number | null
  name: string | null
  numericValue: number
  numericLabel: string | null
  description: string | null
  sortOrder: number
  defaultNextCheckSuccessPeriod: number
  defaultNextCheckFailurePeriod: number
  defaultNextCheckSuccessDay: number
  defaultNextCheckFailureDay: number
  defaultAttendanceDurationPeriod: number
  defaultNextCheckCron: string | null
  cfcWorkflowStageGroupId: number
  colourCode?: string | null
  cfcWorkflowStageRuleGroups: CfcWorkflowStageRuleGroupDto[] | null
}

export type CfcWorkflowStageRuleGroupDto = {
  id: number | null
  name: string | null
  description: string | null
  sortOrder: number
  isSuccess: boolean
  cfcWorkflowStageId: number
  mustPassAllRules: boolean
  cfcWorkflowStageRuleGroupConstraints: CfcConstraintDto[] | null
  cfcWorkflowStageRules: CfcWorkflowStageRuleDto[] | null
  cfcWorkflowStageRuleGroupTriggers: CfcWorkflowStageRuleGroupTriggerDto[] | null
}

export type CfcWorkflowStageRuleDto = {
  id: number
  sortOrder: number
  startDate: string | null
  endDate: string | null
  name: string | null
  classType?: string | null
  cfcWorkflowRuleDefinitionId?: number
  cfcWorkflowStageRuleGroupId?: number
  enabled?: boolean
  enabledComputed?: boolean
  cfcWorkflowStageRuleAttributes: CfcWorkflowStageRuleAttributeDto[] | null
}

export type CfcWorkflowStageRuleAttributeDto = {
  id: number | null
  cfcWorkflowRuleDefinitionAttributeId: number
  cfcWorkflowStageRuleGroupId: number
  value: string | null
  dataType: string | null
  name: string | null
  description: string | null
  sortOrder: number | null
}

export type CfcWorkflowStageRuleGroupTriggerDto = {
  id: number
  cfcTriggerTypeId: number
  name: string | null
  classType: string | null
  cfcWorkflowStageRuleGroupId?: number
  cfcWorkflowStageRuleGroupTriggerAttributes: CfcWorkflowStageRuleGroupTriggerAttributeDto[] | null
}

export type CfcWorkflowStageRuleGroupTriggerAttributeDto = {
  id: number
  cfcTriggerTypeAttributeId: number
  cfcWorkflowStageRuleGroupTriggerId: number
  dataType: string | null
  name: string | null
  description: string | null
  sortOrder: number
  value: string | null
  valueName: string | null
}

export type CfcWorkflowGroupDto = {
  workflowId: number
  workflowName: string | null
  id: number
  stages: CfcWorkflowStageDto[] | null
}

export type WorkflowActionDto = {
  workflowId: number
  isOnHold: boolean
  stageId: number | null
  nextChangeDate: string | null
  type: WorkflowTypeId | null
  onHoldExpiryDate: string | null
  comment: string | null
  closedUserId: number
  studentsSelected: number[] | null
}

export type CfcStudentsInWorkflowDto = {
  studentIds: number[] | null
  workflowId: number
  type: WorkflowTypeId | null
  instances: number[] | null
}

export type CfcStudentInWorkflowDto = {
  studentId: number
  studentGlobalId: string | null
  studentNumber: string | null
  studentFullName: string | null
  universityEmail: string | null
  personalEmail: string | null
  workflowId: number
  workflowName: string | null
  stageId: number
  stageName: string | null
  nextCheck: string
  nextSuccess: string
  scheduledLectures: number
  attendedLectures: number
  percentage: number
}

export type WorkflowCreatorDto = {
  id: number | null
  globalId: string | null
  name: string | null
  isActive: boolean
}

export type CfcManualInterventionDto = {
  id: number
  name: string | null
  description: string | null
  duration: number
  cfcWorkflowId: number
  cfcInstanceRestrictionTypeId: number
  studentsCanCreate: boolean
  hasSubscriptionAccess?: boolean
  steps: CfcManualInterventionStepDto[] | null
  stages: number[] | null
}

export type CfcManualInterventionStepDto = {
  id: number
  name: string | null
  description: string | null
  duration: number
  type: number
}

export type CfcWorkflowRuleDefinitionDto = {
  id: number
  name: string | null
  description: string | null
  classType: string | null
}

export type CfcRuleDefinitionAttributeDto = {
  id: number
  name: string | null
  dataType: string | null
  cfcWorkflowRuleDefinitionId: number
}

export type CfcTriggerTypeAttributeDto = {
  id: number
  name: string | null
  dataType: string | null
  cfcTriggerTypeId: number
}

export type CaseProfileListDto = {
  cases: SimpleListItemDto[]
  selected: number[]
}

export type WorkflowProfileListDto = {
  workflows: SimpleListItemDto[]
  selected: number[]
}

export type ManualInterventionsGridDto = {
  grid: CasePageDto<CfcManualInterventionDto> | null
  hasSubscriptionAccess: boolean
}

export type WorkflowStudentsQuery = {
  workflowId?: number
  stageId?: number
  studentName?: string
  studentNumber?: string
  startDate?: string
  endDate?: string
  pageNumber?: number
  pageSize?: number
  sortCol?: string
  sortDir?: string
  type?: WorkflowTypeId
  workflowName?: string
  stageName?: string
}

export type WorkflowsQuery = {
  pageNumber?: number
  pageSize?: number
  sortCol?: string
  sortDir?: string
}

export type ManualInterventionsQuery = {
  workflowId?: number
  pageNumber?: number
  pageSize?: number
  sortCol?: string
  sortDir?: string
}

export type BreadcrumbsQuery = {
  ruleType?: string
  workflowId?: number
  stageGroupId?: number
  stageId?: number
  ruleGroupId?: number
  ruleId?: number
  triggerId?: number
  isStageGroup?: boolean
  manualIntervention?: boolean
}
