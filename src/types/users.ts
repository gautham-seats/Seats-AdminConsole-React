// UserApiController.GetUsers → ServerSidePagedUserListDto<UserListItemDto> (UserApiController.cs:102-123).
export type UserListItemDto = {
  id: number
  userName: string
  emailAddress: string | null
  fullName: string | null
  realName: string | null
  associatedStudentId: number | null
  accessProfiles: string | null
}

export type UsersPageDto = {
  items: UserListItemDto[]
  totalRowCount: number
  seatsAuthorisationByPersonas: boolean
}

export type UsersSortColumn = 'userName' | 'accessProfiles' | 'emailAddress' | 'fullName'

export type SortDirection = 'asc' | 'desc'

// Seats.Trunk.Contracts SimpleListItemDto (camelCase via WebApiConfig CamelCasePropertyNamesContractResolver).
export type SimpleListItemDto = {
  id: number
  description: string | null
}

// Seats.Trunk.Contracts UserPersonDto.
export type UserPersonDto = {
  id: number
  accessProfileId: number
  order: number
  userId: string | null
}

// UserSecurityLevelPermission/Index `securityLevel` values; `isOwnClasses` is the lecturer visibility entry.
export type SecurityLevel = 'school' | 'course' | 'module' | 'programme' | 'faculty' | 'student'

// Seats.Trunk.Contracts UserSecurityLevelPermissionDto. Nested entity objects and other fields are kept as received.
export type UserSecurityLevelPermissionDto = {
  [field: string]: unknown
  id: number
  userId: number | null
  name: string | null
  userName: string | null
  facultyId: number | null
  schoolId: number | null
  programmeId: number | null
  courseId: number | null
  moduleId: number | null
  studentId: number | null
  isSuperUser: boolean
  isOwnClasses: boolean
}

// Seats.Trunk.Contracts UserSecurityLevelPermissionToProcessDto.
export type UserSecurityLevelPermissionToProcessDto = {
  securityLevel: string
  userSecurityLevelPermissions: UserSecurityLevelPermissionDto[]
}

// Seats.Trunk.Contracts UserDto, the GET detail and the POST api/UserApi body.
export type UserDto = {
  id: number
  userName: string | null
  setPassword: string | null
  accountActive: boolean
  associatedStudentId: number | null
  associatedStudentDescription: string | null
  authenticateModeId: number
  isSuperUser: boolean
  seatsAuthorisationByPersonas: boolean
  seatsAuthenticationByOurIdentityProvider: boolean
  emailAddress: string | null
  positionNumber: string | null
  personas: UserPersonDto[] | null
  fullName: string | null
  isMobileAppLoggingActive: boolean
  displayName: string | null
  userSecurityLevelPermissionToProcess: UserSecurityLevelPermissionToProcessDto[] | null
}

// Seats.Trunk.Contracts UserSecurityLevelPermissionOverviewDto.
export type UserSecurityLevelPermissionOverviewDto = {
  userId: number
  faculty: string | null
  course: string | null
  programme: string | null
  module: string | null
  school: string | null
  student: string | null
  isSuperUser: boolean
  isOwnClasses: boolean
}

// ViewModels/User/UserDetailsViewModel.cs, returned by GET api/UserApi/{id}.
export type UserDetailsViewModel = {
  detail: UserDto
  defaultPersonToAdd: UserPersonDto
  accessProfileAvailables: SimpleListItemDto[]
  accessProfileRestricted: number[]
  accessProfileAll: SimpleListItemDto[] | null
  userSecurityLevelPermissionOverview: UserSecurityLevelPermissionOverviewDto | null
}

export type UsersQueryParams = {
  currentPageIndex: number
  pageSize: number
  sortCol: UsersSortColumn
  sortDir: SortDirection
  searchFilter: string
}
