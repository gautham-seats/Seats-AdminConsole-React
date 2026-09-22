// Seats.Trunk.Contracts LessonTypeDto (camelCase).
// The cutoffs are nullable: lessonTypeDetailsController.js:37-52 starts them at null and makes them required,
// so legacy blocks the save rather than sending a number the user never typed.
export type LessonTypeDto = {
  id: number
  name: string | null
  description: string | null
  earlyCutoff: number | null
  lateCutoff: number | null
  absenceCutoff: number | null
  percentageCutoff: number | null
  checkoutCutoff: number | null
  isAbsenceBasedOnStart: boolean
  isAttendanceBasedOnCheckout: boolean | null
  attendanceScaling: number | null
  isGPSEnabled: boolean
  isActive: boolean
  globalId: string | null
  isConsecutiveAttendanceUpdate: boolean
  isAbsenceBasedOnStartCutOff: boolean | null
  isMandatory: boolean | null
}

// ViewModels/LessonType/LessonTypeViewModel from GET api/LessonTypeApi/{id}.
export type LessonTypeViewModel = {
  detail: LessonTypeDto
  attendanceScalingAvailables: { id: number; description: string | null }[]
  attendanceBasedOnCheckoutAvailables: { id: number; description: string | null }[]
}

// ViewBag flags LessonTypeController.cs:37-57 renders into the legacy partial.
export type LessonTypeTenantFlags = {
  attendanceByDuration: boolean
  consecutiveAttendanceUpdate: boolean
}

export type LessonTypeSortColumn =
  | 'name'
  | 'description'
  | 'earlyCutoff'
  | 'lateCutoff'
  | 'absenceCutoff'
  | 'checkoutCutoff'
  | 'percentageCutoff'
  | 'isAbsenceBasedOnStart'
  | 'isAttendanceBasedOnCheckout'
  | 'attendanceScaling'
  | 'isConsecutiveAttendanceUpdate'
  | 'isActive'
