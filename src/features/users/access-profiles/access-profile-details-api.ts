import { api } from '@/shared/api'
import type {
  AccessProfileContainerViewModel,
  AccessProfileEventTypes,
  AccessProfileViewModel,
  AccessProfileVisibilityList,
  LandingPageViewModel,
} from '@/types/access-profiles'
import {
  parseAccessProfileContainer,
  parseEventTypes,
  parseLandingPages,
  parseVisibilityList,
} from './access-profile-form'

// GET api/AccessProfileApi/{id}; 0 for a new profile; 401 shows NotAuthorised (accessProfileDetailsController.js:441-462).
export async function fetchAccessProfile(
  id: number,
  signal: AbortSignal,
): Promise<AccessProfileContainerViewModel> {
  const raw = await api.get<unknown>(`AccessProfileApi/${id}`, { signal })
  return parseAccessProfileContainer(raw)
}

// GET api/AccessProfileApi/GetLandingPages (accessProfileDetailsController.js:170-218).
export async function fetchLandingPages(signal: AbortSignal): Promise<LandingPageViewModel[]> {
  return parseLandingPages(await api.get<unknown>('AccessProfileApi/GetLandingPages', { signal }))
}

// GET api/AccessProfileApi/GetAllEventTypes?accesProfile= (AccessProfile/Details.cshtml:185, legacy parameter spelling).
export async function fetchEventTypes(
  accessProfileId: number,
  signal: AbortSignal,
): Promise<AccessProfileEventTypes> {
  const raw = await api.get<unknown>('AccessProfileApi/GetAllEventTypes', {
    query: { accesProfile: accessProfileId },
    signal,
  })
  return parseEventTypes(raw)
}

// GET api/caseapi/getAllCasesProfile?accesProfile= (AccessProfile/Details.cshtml:193).
export async function fetchCaseVisibility(
  accessProfileId: number,
  signal: AbortSignal,
): Promise<AccessProfileVisibilityList> {
  const raw = await api.get<unknown>('caseapi/getAllCasesProfile', {
    query: { accesProfile: accessProfileId },
    signal,
  })
  return parseVisibilityList(raw, 'cases')
}

// GET api/caseapi/getAllWorkflows?accesProfile= (AccessProfile/Details.cshtml:201).
export async function fetchWorkflowVisibility(
  accessProfileId: number,
  signal: AbortSignal,
): Promise<AccessProfileVisibilityList> {
  const raw = await api.get<unknown>('caseapi/getAllWorkflows', {
    query: { accesProfile: accessProfileId },
    signal,
  })
  return parseVisibilityList(raw, 'workflows')
}

// POST api/AccessProfileApi with the details view model (AccessProfileApiController.cs:225-304).
export function saveAccessProfile(details: AccessProfileViewModel): Promise<void> {
  return api.post<void>('AccessProfileApi', { body: details })
}
