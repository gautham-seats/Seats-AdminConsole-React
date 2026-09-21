import { api } from '@/shared/api'
import {
  parseModelView,
  parseSimpleList,
  type DropdownCategory,
  type EngagementModelView,
  type SaveModelBody,
  type SearchCategory,
  type SimpleListItem,
} from './details-model'
import { parseStudentCounts, type BuildingRequestBody, type StudentCounts } from './building-model'

// GET api/engagementApi/GetEngagementModelConfigViewModels?engagementId= (EngagementApiController.cs:174-178).
export async function fetchModelDetails(
  id: number,
  signal: AbortSignal,
): Promise<EngagementModelView | null> {
  return parseModelView(
    await api.get<unknown>('engagementApi/GetEngagementModelConfigViewModels', {
      query: { engagementId: id },
      signal,
    }),
  )
}

// Dropdown lookups without a query (EngagementApiController.cs:561-605, Details.cshtml:35-37).
const DROPDOWN_PATHS: Record<DropdownCategory, string> = {
  studenttypeids: 'engagementApi/GetStudentType',
  studentyears: 'engagementApi/GetStudentYear',
  facultyids: 'engagementApi/GetFacultiesInCurrentYear',
  collegeyearids: 'engagementApi/GetCollegeYear',
}

// Type-ahead lookups sent as ?query= (EngagementApiController.cs:607-629, seats-admin-engagement-model-rule.html:401-407).
const SEARCH_PATHS: Record<SearchCategory, string> = {
  schoolids: 'engagementApi/GetSchoolsInCurrentYear',
  programmeids: 'engagementApi/GetProgrammesInCurrentYear',
  courseids: 'engagementApi/GetCoursesInCurrentYear',
}

export async function fetchCategoryOptions(
  category: DropdownCategory,
  signal: AbortSignal,
): Promise<SimpleListItem[]> {
  return parseSimpleList(await api.get<unknown>(DROPDOWN_PATHS[category], { signal }))
}

export async function searchCategory(
  category: SearchCategory,
  query: string,
  signal: AbortSignal,
): Promise<SimpleListItem[]> {
  return parseSimpleList(await api.get<unknown>(SEARCH_PATHS[category], { query: { query }, signal }))
}

// GET api/engagementApi/GetWithdrawlOptions and GetAssessmentOptions, Engagement + Access
// (EngagementApiController.cs:570-588).
export async function fetchWithdrawalOptions(signal: AbortSignal): Promise<SimpleListItem[]> {
  return parseSimpleList(await api.get<unknown>('engagementApi/GetWithdrawlOptions', { signal }))
}

export async function fetchAssessmentOptions(signal: AbortSignal): Promise<SimpleListItem[]> {
  return parseSimpleList(await api.get<unknown>('engagementApi/GetAssessmentOptions', { signal }))
}

// POST api/engagementApi/CountStudentsInModelBuildingCalculation: a read-only count (D-117).
export async function countStudentsInModelBuilding(
  body: BuildingRequestBody,
  signal: AbortSignal,
): Promise<StudentCounts> {
  return parseStudentCounts(
    await api.post<unknown>('engagementApi/CountStudentsInModelBuildingCalculation', { body, signal }),
  )
}

// POST api/engagementApi/ExportProfileSet: queues a CSV export the server e-mails/notifies (:641-667).
export function exportProfileSet(body: BuildingRequestBody): Promise<void> {
  return api.post<void>('engagementApi/ExportProfileSet', { body })
}

// POST api/engagementApi/RunNode: queues the node calculation for a date range and answers its guid.
export function runEngagementNode(body: {
  modelId: number
  nodeId: number
  startDateTime: string
  endDateTime: string
}): Promise<string | null> {
  return api.post<string | null>('engagementApi/RunNode', { body })
}

// POST api/engagementApi/SaveModel, Engagement + Edit (EngagementApiController.cs:839-843).
export function saveEngagementModel(body: SaveModelBody): Promise<void> {
  return api.post<void>('engagementApi/SaveModel', { body })
}
