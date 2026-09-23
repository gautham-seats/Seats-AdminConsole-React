import type { FileTemplateDto, GlobalListItemDto } from './file-templates'

// ScheduledActivityTypeApi list row (camelCase).
export type ActivityTypeRowDto = {
  id: number
  globalId: string | null
  name: string | null
  schoolName: string | null
  notificationTypeDescription: string | null
  actAsClocking: boolean
  actAsBlackout: boolean
  isAppointment: boolean
  triggerEmail: boolean
  requiresApproval: boolean
  scheduledActivitySubTypeDescription: string | null
  accessLevel: string | null
  attendanceType: string | null
  mandatoryComment: boolean
  mandatoryAttachments: boolean
  scheduledActivitySubTypeId: number
}

export type ActivityTypeDto = {
  id: number
  globalId: string | null
  name: string | null
  schoolId: number | null
  notificationTypeId: number | null
  actAsClocking: boolean
  actAsBlackout: boolean
  isAppointment: boolean
  triggerEmail: boolean
  requiresApproval: boolean
  mandatoryComment: boolean
  mandatoryAttachments: boolean
  scheduledActivitySubTypeId: number
  fileTemplateIds: number[]
  accessLevelId: number | null
  attendanceStatusTypeId: number | null
  attendanceStatus: unknown
}

type IdDescriptionDto = { id: number; description: string }

export type ActivityTypeDetailsDto = {
  detail: ActivityTypeDto
  scheduledActivitySubTypeAvailables: GlobalListItemDto[]
  notificationTypeAvailables: GlobalListItemDto[]
  fileTemplateAvailables: FileTemplateDto[]
  accessLevels: IdDescriptionDto[]
  attendanceTypes: IdDescriptionDto[]
}
