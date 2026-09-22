// Seats.Trunk.Contracts RollbackDto (camelCase over Web API).
export type RollbackDto = {
  id: number
  entityType: string | null
  date: string | null
  displayDate: string | null
}

// ViewModels/JobSchedule/JobScheduleViewModel.cs; POST JobScheduleApi/ sends these fields (camelCase).
export type JobScheduleBody = {
  id: number
  typeId: number
  typeCode: string | null
  typeName: string | null
  description: string | null
  cronExpression: string | null
  enabled: boolean
  code: string | null
  schoolId: number | null
  courseId: number | null
  moduleId: number | null
  siteId: number | null
  buildingId: number | null
  roomId: number | null
  from: string | null
  to: string | null
  dateRangeId: number
  jobClass: string | null
  sendToTutor: boolean | null
  comparisonOperator: string | null
  percentageAttended: number | null
  emptyEmail: boolean
  minutes: number | null
  minutesDefault: number | null
  recipients: string | null
}

// ViewModels/JobSchedule/JobScheduleViewModel.cs; the list only fills id, description, cronExpression, enabled, typeName.
export type JobScheduleDto = {
  id: number
  typeId: number
  typeCode: string | null
  typeName: string | null
  description: string | null
  cronExpression: string | null
  enabled: boolean
  code: string | null
  schoolId: number | null
  courseId: number | null
  moduleId: number | null
  siteId: number | null
  buildingId: number | null
  roomId: number | null
  from: string | null
  to: string | null
  dateRangeId: number
  jobClass: string | null
  sendToTutor: boolean | null
  comparisonOperator: string | null
  percentageAttended: number | null
  emptyEmail: boolean
  minutes: number | null
  minutesDefault: number | null
  recipients: string | null
}

export type JobTypeDto = { id: number; name: string | null; code: string | null }

export type JobOptionDto = { id: number; description: string | null }

// ViewModels/JobSchedule/JobDetailsViewModel.cs; jobTypeAvailables is only sent for a new job.
export type JobDetailsDto = {
  detail: JobScheduleDto
  jobTypeAvailables: JobTypeDto[] | null
  dateRangeAvailables: JobOptionDto[] | null
  comparisonOperatorAvailables: JobOptionDto[] | null
}
