import type { EngagementConstraint } from './details-model'
import { parseConstraintList } from './details-model'

// ViewModels/Engagement/ModelBuildingDto.cs; dates are text the server parses in the request culture.
export type ModelBuilding = {
  constraints: EngagementConstraint[]
  withDrawalStartDate: string
  withDrawalEndDate: string
  withDrawalReasons: number[]
  assessmentStartDate: string
  assessmentEndDate: string
  assessmentTypeIds: number[]
}

// StudentCountProcessDto (EngagementApiController.cs:454-459).
export type StudentCounts = { countSectionA: number; countSectionB: number; countSectionC: number }

export const NO_COUNTS: StudentCounts = { countSectionA: 0, countSectionB: 0, countSectionC: 0 }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

const ids = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : []

export function parseModelBuilding(raw: unknown): ModelBuilding {
  const source = isRecord(raw) ? raw : {}
  return {
    constraints: parseConstraintList(source.constraints),
    withDrawalStartDate: text(source.withDrawalStartDate),
    withDrawalEndDate: text(source.withDrawalEndDate),
    withDrawalReasons: ids(source.withDrawalReasons),
    assessmentStartDate: text(source.assessmentStartDate),
    assessmentEndDate: text(source.assessmentEndDate),
    assessmentTypeIds: ids(source.assessmentTypeIds),
  }
}

// Legacy shows zeros for an empty or unreadable count response (seats-admin-engagement-model.html:1115-1121).
export function parseStudentCounts(raw: unknown): StudentCounts {
  if (!isRecord(raw)) return NO_COUNTS
  return {
    countSectionA: count(raw.countSectionA),
    countSectionB: count(raw.countSectionB),
    countSectionC: count(raw.countSectionC),
  }
}

// _totalStudents (:907-910): with a withdrawal range the total is the withdrawal and assessment counts.
export function totalStudents(counts: StudentCounts, withdrawalActive: boolean): number {
  return withdrawalActive ? counts.countSectionB + counts.countSectionC : counts.countSectionA
}

// _getModelBuildingDto (:1384-1395): assessment fields travel only when both switches are on.
export function buildingRequestBody(
  building: ModelBuilding,
  withdrawalActive: boolean,
  assessmentActive: boolean,
) {
  const assessment = withdrawalActive && assessmentActive
  return {
    constraints: building.constraints,
    assessmentStartDate: assessment ? building.assessmentStartDate : '',
    assessmentEndDate: assessment ? building.assessmentEndDate : '',
    assessmentTypeIds: assessment ? building.assessmentTypeIds : [],
    withDrawalStartDate: withdrawalActive ? building.withDrawalStartDate : '',
    withDrawalEndDate: withdrawalActive ? building.withDrawalEndDate : '',
    withDrawalReasons: withdrawalActive ? building.withDrawalReasons : [],
  }
}

export type BuildingRequestBody = ReturnType<typeof buildingRequestBody>

// _hiddenExportProfileSet (:852-855): nothing to export while the total is zero.
export const exportDisabled = (counts: StudentCounts, withdrawalActive: boolean) =>
  totalStudents(counts, withdrawalActive) === 0

// The Calculate badge counts the changes waiting to be applied (_setCountFilterToApply :1055-1109),
// which React tracks as "the request body differs from the one the shown counts came from".
export function pendingChanges(applied: BuildingRequestBody | null, next: BuildingRequestBody): number {
  if (!applied) return 0
  const keys = Object.keys(next) as (keyof BuildingRequestBody)[]
  return keys.filter(key => JSON.stringify(applied[key]) !== JSON.stringify(next[key])).length
}
