'use client'

import { useCallback } from 'react'
import { useResources } from '@/shared/resources'

// GeneralResources.resx values; keys missing there (checkout, percentage, scaling, consecutive) come from localisation.
const LESSON_TYPE_TEXT = {
  LessonType: 'Lesson Type',
  Name: 'Name',
  Description: 'Description',
  EarlyCutoff: 'Early Cut Off',
  LateCutoff: 'Late Cut Off',
  AbsenceCutoff: 'Absence Cut Off',
  CheckoutCutoff: 'Checkout Cut Off',
  PercentageCutoff: 'Percentage Cut Off',
  IsAbsenceBasedOnStart: 'Is Absence Based On Start',
  IsAttendanceBasedOnCheckout: 'Is Attendance Based On Checkout',
  AttendanceScaling: 'Attendance Scaling',
  ConsecutiveAttendanceUpdate: 'Consecutive Attendance Update',
  IsActive: 'Is Active',
  IsGPSEnabled: 'GPS Enabled',
  Disabled: 'Disabled',
  Mandatory: 'Mandatory',
  Optional: 'Optional',
  None: 'None',
  Enabled: 'Enabled',
  OnlyIfAbsent: 'Only If Absent',
  OnlyIfAttended: 'Only If Attended',
  Save: 'Save',
  Cancel: 'Cancel',
  Required: 'Required',
  Loading: 'Loading',
  Refresh: 'Refresh',
  Collapse: 'Collapse',
  Total: 'Total',
  Yes: 'Yes',
  No: 'No',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
  AlertSaveSucceededDefault: 'The item was saved successfully.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
  FieldsWithInputValidations: 'There are fields with input validation errors.',
  NumberOfItemsPerPage: 'Number of items per page',
  Of: 'of',
  Previous: 'Previous',
  Next: 'Next',
} as const

// Hard-coded in legacy (swgrid.js:816, Details.cshtml:93,100,109) or React-only states.
export const LESSON_TYPE_FALLBACK_ONLY = {
  noItems: 'There are no items to show.',
  expand: 'Expand',
  first: 'First',
  last: 'Last',
  noAccess: 'You do not have permission to view this page.',
  noAccessState: 'Access restricted',
  noAccessHint: 'Ask an administrator to add the Lesson Type permission.',
  notFound: 'This lesson type could not be found.',
  notFoundState: 'Not found',
  notFoundHint: 'It may have been removed, or the link is out of date.',
  disabledCaption: '[Disabled]',
  noneCaption: '[None]',
  on: 'On',
  off: 'Off',
  safeMode: 'Saving is turned off in this environment (safe mode).',
  wholeNumber: 'Enter a whole number.',
  leaveConfirm: 'You have unsaved changes. Leave this page?',
  readOnly: 'Read only',
  identity: 'Identity',
  cutoffs: 'Cut-offs',
  checkOut: 'Check-out',
  attendanceRules: 'Attendance rules',
  summary: 'Summary',
  summaryHint: 'Live preview of this lesson type',
  lessonStart: 'Lesson start',
  lessonEnd: 'from lesson end',
  minutesUnit: 'min',
  percentUnit: '%',
  dash: '-',
  timelineIncomplete: 'Enter the early, late and absence cut-offs to see the timeline.',
  flagsFailed: 'Some tenant settings could not be loaded, so scaling and consecutive update are hidden.',
} as const

export type LessonTypeTextKey = keyof typeof LESSON_TYPE_TEXT

const KEYS = Object.keys(LESSON_TYPE_TEXT)

export function useLessonTypeText() {
  const { text } = useResources(KEYS)
  return useCallback(
    (key: LessonTypeTextKey) => {
      const value = text(key)
      return !value.trim() || value === key ? LESSON_TYPE_TEXT[key] : value
    },
    [text],
  )
}
