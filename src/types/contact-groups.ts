// Seats.Trunk.Contracts ContactGroupDto from GET api/ContactGroupApi (ContactGroupApiController.cs:69-74) and the POST body.
export type ContactGroupDto = {
  id: number
  name: string | null
  description: string | null
  groupEmailAddress: string | null
  sendEmailsToTypeId: number | null
  sendEmailsToTypeDescription: string | null
  functionId: number | null
  functionName: string | null
  associatedTo: number | null
  associatedToDescription: string | null
  facultyId: number | null
  schoolId: number | null
  programmeId: number | null
  courseId: number | null
  moduleId: number | null
  userIdsInContactGroup: number[] | null
  globalId: string | null
  visible: boolean
}

// ViewModels/ContactGroup/ContactGroupViewModel.cs ContactGroupDetailViewModel.
export type ContactGroupDetailViewModel = {
  id: number
  name: string | null
  description: string | null
  userIdsInContactGroup: number[] | null
  groupEmailAddress: string | null
  associatedTo: number | null
  associatedToDescription: string | null
  sendEmailsToTypeId: number | null
  functionId: number | null
  functionName: string | null
  entityId: number | null
  facultyId: number | null
  schoolId: number | null
  programmeId: number | null
  courseId: number | null
  moduleId: number | null
}

// Seats.Trunk.Contracts SimpleListItemDto with `visible`, used for the send-to options.
export type SendEmailsToOptionDto = {
  id: number
  description: string | null
  visible: boolean
}

// Seats.Trunk.Contracts FunctionDto.
export type FunctionDto = {
  id: number
  name: string | null
}

// Seats.Trunk.Contracts UserListItemDto as returned in the contact group members list.
export type ContactGroupMemberDto = {
  id: number
  userName: string | null
  fullName: string | null
  displayName: string | null
  emailAddress: string | null
}

// ViewModels/ContactGroup/ContactGroupViewModel.cs, returned by GET api/ContactGroupApi/{id}.
export type ContactGroupViewModel = {
  detail: ContactGroupDetailViewModel
  users: ContactGroupMemberDto[] | null
  sendEmailToAvailables: SendEmailsToOptionDto[]
  entityAvailables: { id: number; description: string | null }[]
  functionAvailables: FunctionDto[]
}

// Controllers/Api/ContactGroupApiController.cs EntityType.
export const ENTITY_TYPE = { courses: 1, faculties: 2, modules: 3, programmes: 4, schools: 5 } as const

// Seats.Trunk.Contracts SendEmailsToType.
export const SEND_EMAILS_TO = { groupEmail: 1, individualMembers: 2, groupEmailAndMembers: 3 } as const
