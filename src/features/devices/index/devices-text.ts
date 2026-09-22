'use client'

import { useCallback } from 'react'
import type { ApiError } from '@/shared/api'
import { useResources } from '@/shared/resources'

// Keys checked in GeneralResources.resx; the value is the English fallback when a key is missing, empty or loading.
export const DEVICES_TEXT = {
  Devices: 'Devices',
  Device: 'Device',
  Room: 'Room',
  ReadingsReport: 'Readings Report',
  Description: 'Description',
  InService: 'In Service',
  SerialNumber: 'Serial Number',
  MacAddress: 'Mac Address',
  IPAddress: 'IP Address',
  LastHeartBeat: 'Last Heart Beat',
  LastReadDate: 'Last Read Date',
  AssetTag: 'Asset Tag',
  Building: 'Building',
  BatteryPercent: 'Battery %',
  IncludeInactiveDevices: 'Include Out of Service Devices',
  Site: 'Site',
  Location: 'Location',
  Filters: 'Filters',
  All: 'All',
  From: 'From',
  To: 'To',
  Search: 'Search',
  Add: 'Add',
  Delete: 'Delete',
  ReprocessCardSwipes: 'Reprocess Card Swipes',
  Date: 'Date',
  Today: 'Today',
  Required: 'Required',
  Confirm: 'Confirm',
  Cancel: 'Cancel',
  Close: 'Close',
  Export: 'Export',
  ExportToPDF: 'Export to PDF',
  ExportToCSV: 'Export to CSV',
  ReportProcessing:
    'The report is being generated and a link to the report will appear on your notification screen',
  Yes: 'Yes',
  No: 'No',
  Loading: 'Loading',
  Refresh: 'Refresh',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
  DeleteConfirmationMsg: 'Are you sure you want to delete selected items?',
  AlertDeleteSuccessDefault: 'The item was deleted succesfully.',
  AlertDeleteErrorDefault: 'There was an error while trying to delete the item.',
  AlertSaveSucceededDefault: 'The item was saved successfully.',
  AlertSaveErrorDefault: 'There was an error while trying to save the item.',
  Selected: 'Selected',
  Clear: 'Clear',
  Collapse: 'Collapse',
  NumberOfItemsPerPage: 'Number of items per page',
  Of: 'of',
  Next: 'Next',
  Previous: 'Previous',
  Total: 'Total',
  SelectAll: 'Select All',
  Min: 'Min',
  Max: 'Max',
  Save: 'Save',
  Select: 'Select',
  IsBeacon: 'Beacon',
  IsActive: 'Is Active',
  AddRooms: 'Add Rooms',
  SearchRoom: 'Search room',
  RoomCode: 'Code',
  RoomName: 'Name',
  RoomCapacity: 'Capacity',
  FieldsWithInputValidations: 'There are fields with input validation errors.',
  StartDate: 'Start Date',
  EndDate: 'End Date',
  StartTime: 'Start Time',
  EndTime: 'End Time',
  StudentNo: 'Student No',
  BadgeNumber: 'Badge Number',
  Name: 'Name',
  Type: 'Type',
  DateRange: 'Date Range',
  SelectRange: 'Select Range',
  Last7Days: 'Last 7 Days',
  Last14Days: 'Last 14 Days',
  Last30Days: 'Last 30 Days',
} as const

// Not in GeneralResources; legacy hard-codes these or has no equivalent (D-024).
export const DEVICES_FALLBACK_ONLY = {
  noItems: 'There are no items to show.',
  expand: 'Expand',
  first: 'First',
  page: 'Page',
  last: 'Last',
  clearSearch: 'Clear search',
  clearFilters: 'Clear filters',
  noAccess: 'You do not have permission to view devices.',
  select: 'Select',
  safeMode: 'Changes are turned off in this environment (safe mode).',
  allLocations: 'All locations',
  findLocation: 'Find a site, building or room',
  noLocationMatch: 'No locations match',
  buildingsWithoutSite: 'Buildings without a site',
  roomsWithoutBuilding: 'Rooms without a building',
  notApplied: 'Not applied yet',
  reset: 'Reset',
  roomHint: 'Choosing a room also selects its building and site.',
  noReading: 'No reading',
  chooseDate: 'Choose date',
  exporting: 'Exporting',
  activeFilters: 'Active filters',
  locationsError: 'Locations could not be loaded.',
  devicesListError: 'Devices could not be loaded.',
  reprocessHelp: 'Card swipes read by this device on the chosen date are processed again.',
  suspiciousReadingsReport: 'Suspicious Readings Report',
  selectionActions: 'Selection actions',
  batteryGood: 'good',
  batteryMedium: 'medium',
  batteryLow: 'low',
  newDevice: 'New device',
  notFound: 'This device could not be found.',
  // swapp.js:2646 message.
  specialCharacters: 'Special characters are not allowed .',
  roomLookupFailed: 'The room could not be added.',
  noRoomAccess: 'You do not have permission to view rooms.',
  newRoom: 'New room',
  roomNotFound: 'This room could not be found.',
  wholeNumber: 'Enter a whole number.',
  noReportAccess: 'You do not have permission to view readings reports.',
  // _IndexHeaderFilter.cshtml:53 caption "[all day]".
  allDay: '[all day]',
  // SuspiciousReadingsReport/Index.cshtml:34-42 hard-coded headers.
  reason: 'Reason',
  readingId: 'Reading Id',
  createdDate: 'Created Date',
  readingDate: 'Reading Date',
  classId: 'Class Id',
  classStart: 'Class Start',
  classEnd: 'Class End',
  deviceColumn: 'Device',
  studentNumber: 'Student Number',
  views: 'Views',
  yesterday: 'Yesterday',
  lowBattery: 'Low battery',
  remove: 'Remove',
  time: 'time',
  chooseMonthYear: 'Choose month and year',
  hours: 'Hours',
  minutes: 'Minutes',
  roomPreview: 'Room preview',
  untitledRoom: 'Untitled room',
  noRoomCode: 'No code',
  noBuilding: 'No building',
  seats: 'seats',
  details: 'Details',
  rooms: 'Rooms',
  outOfService: 'Out of service',
  unsavedChanges: 'Unsaved changes',
  roomDetails: 'Room details',
  endTimeBeforeStart: 'End time must be after the start time',
  batteryAdjusted: 'was changed to keep the range in order',
  // Same wording as ErrorState's 401 text; legacy showed the literal Error/NotAuthorised page (D-120).
  notAuthorised: 'You do not have permission to view this.',
} as const

// deviceIndexController.js:8 parses the reprocess date with globalDateFormat, so the message names the culture pattern.
export const invalidDateText = (pattern: string) => `Enter the date as ${pattern}.`

// A 403 is already redirecting to ForceLogin and an abort is ours; a 401 stays on the page and must be shown.
export const isSilentFailure = (failure: ApiError): boolean =>
  failure.kind === 'aborted' || (failure.kind === 'auth' && failure.status !== 401)

export type DevicesTextKey = keyof typeof DEVICES_TEXT

export const isDevicesTextKey = (key: string): key is DevicesTextKey => Object.hasOwn(DEVICES_TEXT, key)

const KEYS = Object.keys(DEVICES_TEXT)

export function useDevicesText() {
  const { text } = useResources(KEYS)
  return useCallback(
    (key: DevicesTextKey) => {
      const value = text(key)
      return !value.trim() || value === key ? DEVICES_TEXT[key] : value
    },
    [text],
  )
}

export type DevicesText = ReturnType<typeof useDevicesText>
