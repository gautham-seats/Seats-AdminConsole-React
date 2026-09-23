// UserNotificationDto from Seats.Trunk.Contracts.DataContracts.UserNotification (UserNotificationApiController.cs).
type UserNotificationFileDto = {
  url: string | null
}

export type UserNotificationDto = {
  id: number
  userId: number
  userNotificationTypeId: number
  userNotificationTypeName: string | null
  description: string | null
  userNotificationStatusId: number
  userNotificationStatusName: string | null
  dateCreated: string | null
  expiresInDays: number | null
  externalGuid: string | null
  showAsNew: boolean
  userNotificationFile: UserNotificationFileDto | null
}

export type UserNotificationPageDto = {
  items: UserNotificationDto[] | null
  totalRowCount: number
}
