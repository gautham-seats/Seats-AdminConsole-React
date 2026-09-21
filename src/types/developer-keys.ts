// UserDeveloperKeyResponse from GET api/DeveloperKeyApi (DeveloperKeyApiController.cs:28-41).
// The response also carries `developerKey`; it is never read or kept (docs/legacy-bugs.md LB-016).
export type UserDeveloperKeyDto = {
  id: number
  userId: number
  userName: string | null
  fullName: string | null
  expiryDate: string | null
}

export type DeveloperKeysPageDto = {
  items: UserDeveloperKeyDto[]
  totalRowCount: number
}

export type DeveloperKeysSortColumn = 'expiryDate' | 'userName' | 'fullName'

// Anonymous { DeveloperKey, ExpiryDate } from UserApi/GetUserDeveloperKey (masked key) and GenerateDeveloperKey (UserApiController.cs:614-639).
export type DeveloperKeyResultDto = {
  developerKey: string | null
  expiryDate: string | null
}
