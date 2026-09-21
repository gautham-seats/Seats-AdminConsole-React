export const LEGACY_ADMIN_BASE = '/Seats.Trunk.Admin'
export const FORCE_LOGIN_PATH = `${LEGACY_ADMIN_BASE}/Account/ForceLogin`
export const SIGN_OUT_PATH = `${LEGACY_ADMIN_BASE}/Account/SignOut`

export function adminApiPath(path: string): string {
  return `${LEGACY_ADMIN_BASE}/api/${path.replace(/^\/+/, '')}`
}

// POST endpoints proven to have no side effects; see docs/decisions.md D-004, D-023, D-050 and D-101.
const READ_ONLY_POST_PATHS = [
  adminApiPath('ResourceApi/GetResourcesForScreen'),
  adminApiPath('SettingsApi/GetSettingByKeys'),
  adminApiPath('audit/GetAudit'),
  adminApiPath('UserApi/GetUserDeveloperKey'),
  adminApiPath('engagementApi/getEngagementStats'),
  adminApiPath('engagementApi/getEngagementStudentScore'),
  // FileTemplateApiController.cs:154-181 only parses the template; CaseApiController.cs:837-842 only checks step use.
  adminApiPath('FileTemplateApi/ValidateTemplateTypes'),
  adminApiPath('caseapi/validateDeleteStepAction'),
  // EngagementApiController.cs:453-459 only counts students for the dataset building panel.
  adminApiPath('engagementApi/CountStudentsInModelBuildingCalculation'),
].map(path => path.toLowerCase())

// ImportApiController.cs:259-279 parses the file and returns its errors; nothing is stored (D-125).
const READ_ONLY_PUT_PATHS = [adminApiPath('ImportApi/validateFile')].map(path => path.toLowerCase())

export function isReadOnlyPost(method: string, path: string): boolean {
  const key = path.toLowerCase()
  if (method === 'POST') return READ_ONLY_POST_PATHS.includes(key)
  return method === 'PUT' && READ_ONLY_PUT_PATHS.includes(key)
}

// A 403 here answers "no permission for this option list", not "session over" (LB-051: Reports access).
const PERMISSION_ONLY_403_PATHS = [
  adminApiPath('JobScheduleApi/GetBuildingOptions'),
  adminApiPath('JobScheduleApi/GetRoomOptions'),
].map(path => path.toLowerCase())

export function isPermissionOnly403(path: string): boolean {
  return PERMISSION_ONLY_403_PATHS.includes(path.toLowerCase())
}

export function writesAllowed(): boolean {
  return process.env.ADMIN_ALLOW_WRITES === 'true'
}
