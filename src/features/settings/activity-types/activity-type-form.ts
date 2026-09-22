import type { ActivityTypeDetailsDto, ActivityTypeDto } from '@/types/activity-types'

// Notification type 3 is Letter; file template type 1 is Letter (Details.cshtml:52-77).
const LETTER_NOTIFICATION = 3
const LETTER_TEMPLATE_TYPE = 1

// Knockout selects without a caption take the first option when the value matches none (Details.cshtml:125-131).
export function withSelectDefaults(details: ActivityTypeDetailsDto): ActivityTypeDto {
  const detail = { ...details.detail, fileTemplateIds: details.detail.fileTemplateIds ?? [] }
  const subTypes = details.scheduledActivitySubTypeAvailables ?? []
  const levels = details.accessLevels ?? []
  if (!subTypes.some(option => option.id === detail.scheduledActivitySubTypeId) && subTypes.length > 0) {
    detail.scheduledActivitySubTypeId = subTypes[0].id
  }
  if (!levels.some(option => option.id === detail.accessLevelId) && levels.length > 0) {
    detail.accessLevelId = levels[0].id
  }
  return detail
}

export function showsAttachmentType(detail: ActivityTypeDto, details: ActivityTypeDetailsDto): boolean {
  return (
    detail.triggerEmail &&
    (details.fileTemplateAvailables ?? []).some(
      template => template.fileTemplateTypeId === LETTER_TEMPLATE_TYPE,
    )
  )
}

export function showsFileTemplates(detail: ActivityTypeDto): boolean {
  return detail.triggerEmail && detail.notificationTypeId === LETTER_NOTIFICATION
}

export type ActivityTypeError = { field: 'name'; messageKey: 'NameIsRequired' | 'SpecialCharacters' }

// controller.js:35 checks only that name is truthy; swapp.js:2642-2647 rejects < and > in text values.
export function validateActivityType(detail: ActivityTypeDto): ActivityTypeError | null {
  if (!detail.name) return { field: 'name', messageKey: 'NameIsRequired' }
  if (/[<>]/.test(detail.name)) return { field: 'name', messageKey: 'SpecialCharacters' }
  return null
}

// ko.toJSON drops keys whose "[None]" option left them undefined.
export function toActivityTypeBody(detail: ActivityTypeDto): Partial<ActivityTypeDto> {
  const body: Partial<ActivityTypeDto> = { ...detail }
  if (body.notificationTypeId === null) delete body.notificationTypeId
  if (body.attendanceStatusTypeId === null) delete body.attendanceStatusTypeId
  return body
}

export function toggleId(ids: readonly number[], id: number): number[] {
  return ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id]
}
