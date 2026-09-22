// AccessProfileSimpleItem from GET api/AccessProfileApi (AccessProfileApiController.cs:83-108).
export type AccessProfileSimpleItemDto = {
  id: number
  description: string | null
  isEnabled: boolean
  globalId: string | null
  visible: boolean
}

// Seats.Service.Security.Schema EventTypeInAccessProfileRequest.
export type EventTypeInAccessProfileDto = {
  id: number
  accessProfileId: number
  type: number
  subType: number
  detail: boolean
  comment: boolean
}

// ViewModels/AccessProfile/AccessProfileViewModel.cs, the GET details and the POST body.
export type AccessProfileViewModel = {
  id: number
  name: string | null
  externalKey: string | null
  isGeneralStudentProfile: boolean
  isGeneralStaffProfile: boolean
  isRestricted: boolean
  selectedPermissions: number[]
  selectedEvents: EventTypeInAccessProfileDto[] | null
  isEventTypeVisible: boolean
  isCaseVisible: boolean
  isWorkflowVisible: boolean
  selectedCases: number[] | null
  selectedWorkflows: number[] | null
  forceNewUI: boolean
  defaultLandingPage: number | null
}

// Seats.Trunk.Contracts PermissionDefinitionActionDto.
type PermissionDefinitionActionDto = {
  id: number
  name: string | null
  permissionDefinitionActionInItemId: number
}

// Seats.Trunk.Contracts PermissionDefinitionItemDto.
export type PermissionDefinitionItemDto = {
  id: number
  name: string | null
  permissionDefinitionActions: PermissionDefinitionActionDto[] | null
}

// ViewModels/AccessProfile/AccessProfilePermissionViewModel.cs.
export type AccessProfilePermissionNode = {
  id: number
  description: string | null
  expanded: boolean
  childNodes: AccessProfilePermissionNode[]
  permissions: PermissionDefinitionItemDto[] | null
}

// ViewModels/AccessProfile/AccessProfileContainerViewModel.cs, returned by GET api/AccessProfileApi/{id}.
export type AccessProfileContainerViewModel = {
  details: AccessProfileViewModel
  nodes: AccessProfilePermissionNode[]
}

// ViewModels/AccessProfile/LandingPageViewModel.cs from GET api/AccessProfileApi/GetLandingPages.
export type LandingPageViewModel = {
  id: number
  description: string | null
  permissionDefinitionItemId: number | null
  permissionDefinitionActionId: number | null
}

// ViewModels/ItemTypeViewModel.cs rows of GET api/AccessProfileApi/GetAllEventTypes.
export type ItemTypeViewModel = {
  id: number
  type: number
  subType: number
  description: string | null
}

type EventTypeGroup = { id: string; value: ItemTypeViewModel[] }

export type AccessProfileEventTypes = {
  events: ItemTypeViewModel[]
  caseSteps: ItemTypeViewModel[]
  general: EventTypeGroup[]
  selected: EventTypeInAccessProfileDto[]
}

// api/caseapi/getAllCasesProfile and getAllWorkflows responses.
export type AccessProfileVisibilityList = {
  items: { id: number; description: string | null }[]
  selected: number[]
}
