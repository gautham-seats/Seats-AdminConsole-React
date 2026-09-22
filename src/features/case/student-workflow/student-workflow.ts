import { formatShortDate, parseShortDate } from '@/shared/i18n/culture'
import type { SortDirection } from '@/features/settings/shared/list-model'
import type {
  CfcStudentInWorkflowDto,
  CfcWorkflowDto,
  CfcWorkflowStageDto,
  WorkflowStudentsQuery,
  WorkflowTypeId,
} from '@/types/case'

export type StudentWorkflowRow = CfcStudentInWorkflowDto & { id: string }

export const WORKFLOW_PAGE_SIZE = 100

export type WorkflowSort = { column: string; direction: SortDirection }

export type WorkflowListState = {
  pageIndex: number
  pageSize: number
  sort: WorkflowSort
  studentText: string
}

// seats-admin-workflow-student.html:587,707 format with the user's globalDateFormat (D-111).
export function todayCultureDate(): string {
  return formatShortDate(new Date())
}

export function formatWorkflowDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  if (date.getFullYear() >= 9999) return ''
  return formatShortDate(date)
}

export function studentFilterField(text: string): { studentName?: string; studentNumber?: string } {
  const trimmed = text.trim()
  if (!trimmed) return {}
  for (let index = 0; index < trimmed.length; index += 1) {
    const code = trimmed.charCodeAt(index)
    if (code >= 48 && code <= 57) return { studentNumber: trimmed }
  }
  return { studentName: trimmed }
}

// A student can sit in the same workflow twice (one row per instance, …student.html:908-918 posts
// item.workflowId per row), so the row key is student + instance.
export function toStudentRow(row: CfcStudentInWorkflowDto): StudentWorkflowRow {
  return { ...row, id: `${row.studentId}:${row.workflowId}` }
}

export function pickedStudentIds(
  rows: readonly StudentWorkflowRow[],
  selection: ReadonlySet<string>,
): number[] {
  return [...new Set(rows.filter(row => selection.has(row.id)).map(row => row.studentId))]
}

export function workflowStudentsQuery(
  workflow: CfcWorkflowDto,
  stageId: number | null,
  stageName: string | null,
  state: WorkflowListState,
): WorkflowStudentsQuery {
  const student = studentFilterField(state.studentText)
  return {
    workflowId: workflow.id,
    stageId: stageId ?? undefined,
    stageName: stageName ?? undefined,
    workflowName: workflow.name ?? undefined,
    type: workflow.cfcWorkflowTypeId as WorkflowTypeId,
    pageNumber: state.pageIndex,
    pageSize: state.pageSize,
    ...(state.sort.column ? { sortCol: state.sort.column, sortDir: state.sort.direction } : {}),
    ...student,
  }
}

export function moveStageOptions(stages: readonly CfcWorkflowStageDto[]): CfcWorkflowStageDto[] {
  return stages.filter(stage => stage.id !== null && stage.id !== 0)
}

export function validateMoveStage(stageId: number | null, noStageLabel: string): string | null {
  if (stageId === null || stageId === 0) return noStageLabel
  return null
}

// seats-admin-workflow-student.html:352-395 date pickers only ever emit a date in globalDateFormat.
export function validateMoveDate(
  value: string | null,
  required: boolean,
  invalidLabel: string,
): string | null {
  const text = (value ?? '').trim()
  if (!text) return required ? invalidLabel : null
  return parseShortDate(text) ? null : invalidLabel
}

export type MoveValidation = {
  stage: string | null
  selection: string | null
  nextChangeDate: string | null
  onHoldExpiryDate: string | null
}

export function validateMove(
  stageId: number | null,
  studentCount: number,
  labels: { noStage: string; noStudents: string; invalidDate?: string },
  dates: { isOnHold: boolean; nextChangeDate: string | null; onHoldExpiryDate: string | null } = {
    isOnHold: false,
    nextChangeDate: todayCultureDate(),
    onHoldExpiryDate: null,
  },
): MoveValidation {
  const invalid = labels.invalidDate ?? ''
  return {
    stage: validateMoveStage(stageId, labels.noStage),
    selection: studentCount > 0 ? null : labels.noStudents,
    nextChangeDate: validateMoveDate(dates.nextChangeDate, true, invalid),
    onHoldExpiryDate: dates.isOnHold ? validateMoveDate(dates.onHoldExpiryDate, true, invalid) : null,
  }
}

export function hasMoveErrors(validation: MoveValidation): boolean {
  return Object.values(validation).some(error => error !== null)
}
