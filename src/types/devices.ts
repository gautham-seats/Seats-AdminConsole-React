import type { SortDirection } from './users'

// Seats.Trunk.Contracts DeviceDto fields bound by Views/Device/Index.cshtml:133-157 (camelCase via WebApiConfig.cs:15).
export type DeviceListItemDto = {
  id: number
  description: string | null
  isActive: boolean
  serialNumber: string | null
  macAddress: string | null
  ipAddress: string | null
  displayLastHeartBeat: string | null
  displayLastReadDate: string | null
  roomNames: string | null
  assetTag: string | null
  buildingNames: string | null
  batteryPercent: number | null
}

// ServerSidePagedListDto<DeviceDto> (DeviceApiController.cs:47-64).
export type DevicesPageDto = {
  items: DeviceListItemDto[]
  totalRowCount: number
}

// data-column values of Views/Device/Index.cshtml:115-127.
export type DevicesSortColumn =
  | 'description'
  | 'isActive'
  | 'serialNumber'
  | 'mac'
  | 'ip'
  | 'lastHeartBeat'
  | 'lastReadDate'
  | 'room'
  | 'assetTag'
  | 'building'
  | 'batteryPercent'

export type DevicesQueryParams = {
  currentPageIndex: number
  pageSize: number
  sortCol: DevicesSortColumn
  sortDir: SortDirection
  searchFilter: string
  includeInactive: boolean
  batteryPercentMin?: number
  batteryPercentMax?: number
  siteId?: number
  buildingId?: number
  roomId?: number
}

// DeviceApiController.cs:292-304.
export type DeviceBuildingOptionDto = {
  id: number
  description: string | null
  siteId: number
}

export type DeviceRoomOptionDto = {
  id: number
  description: string | null
  buildingId: number | null
}

// RoomDto fields bound by Views/Room/Index.cshtml:55-58.
export type RoomListItemDto = {
  id: number
  externalCode: string | null
  name: string | null
  capacity: number | null
  buildingName: string | null
}

// ServerSidePagedListDto<RoomDto> (RoomApiController.cs:56-66).
export type RoomsPageDto = {
  items: RoomListItemDto[]
  totalRowCount: number
}

// data-column values of Views/Room/Index.cshtml:47-49; Building has no working sort key (LB-063).
export type RoomsSortColumn = 'externalCode' | 'name' | 'capacity'

export type RoomsQueryParams = {
  currentPageIndex: number
  pageSize: number
  sortCol: RoomsSortColumn
  sortDir: SortDirection
  searchFilter: string
}

// BuildingDto fields bound by Views/Room/Details.cshtml:38.
export type RoomBuildingOptionDto = { id: number; name: string | null }

// RoomDto for the room form; unknown fields are kept so the save echoes them like ko.toJSON.
export type RoomDetailDto = {
  id: number
  externalCode: string | null
  name: string | null
  capacity: number | null
  buildingId: number | null
  extra: Record<string, unknown>
}

// RoomViewModel (ViewModels/Room/RoomViewModel.cs).
export type RoomDetailsViewModel = {
  detail: RoomDetailDto
  buildings: RoomBuildingOptionDto[]
}

// RoomCreateViewModel = RoomDto + url (RoomCreateViewModel.cs).
export type RoomSaveBody = Record<string, unknown> & {
  id: number
  externalCode: string | null
  name: string
  capacity: number
  buildingId: number | null
  url: string
}

// Seats.Trunk.Contracts RoomDto fields the device screen reads (RoomApiController.cs:70-92, Device/Details.cshtml:132-134).
export type DeviceRoomDto = {
  id: number
  name: string | null
  description: string | null
  externalCode: string | null
  capacity: number | null
}

// Seats.Trunk.Contracts CreateDeviceDto; unknown fields are kept so the save echoes them like ko.toJSON.
export type DeviceDetailDto = {
  id: number
  description: string | null
  serialNumber: string | null
  macAddress: string | null
  ipAddress: string | null
  assetTag: string | null
  isBeacon: boolean
  isActive: boolean
  roomIdsInDevice: number[] | null
  extra: Record<string, unknown>
}

// DeviceViewModel (ViewModels/Device/DeviceViewModel.cs); distancesAvailables is never shown.
export type DeviceDetailsViewModel = {
  detail: DeviceDetailDto
  rooms: DeviceRoomDto[]
}

// DeviceSaveViewModel = CreateDeviceDto + url (DeviceSaveViewModel.cs).
export type DeviceSaveBody = Record<string, unknown> & {
  id: number
  description: string | null
  serialNumber: string
  macAddress: string | null
  ipAddress: string | null
  assetTag: string | null
  isBeacon: boolean
  isActive: boolean
  roomIdsInDevice: number[]
  url: string
}

// Elasticsearch ReadingReportResponse (ReadingsReport/Index.cshtml:62-68); date is 'YYYY-MM-DDTHH:mm:ss'.
export type ReadingReportItemDto = {
  date: string | null
  roomName: string | null
  deviceSerialNumber: string | null
  studentNumber: string | null
  badgeNumber: string | null
  studentName: string | null
  clockingTypeDescription: string | null
}

// data-column values of ReadingsReport/Index.cshtml:50-56.
export type ReadingsSortColumn =
  | 'date'
  | 'roomName'
  | 'deviceSerialNumber'
  | 'studentNumber'
  | 'badgeNumber'
  | 'studentName'
  | 'clockingTypeDescription'

// DeviceDto fields used by the Readings Report device filter (_IndexHeaderFilter.cshtml:32).
export type ReadingsDeviceOptionDto = { id: number; serialNumber: string | null }

// GetStudentClockings query (ReadingsReportApiController.cs:46-47); empty filters are sent as empty strings.
export type ReadingsQueryParams = {
  currentPageIndex: number
  pageSize: number
  sortCol: ReadingsSortColumn
  sortDir: SortDirection
  searchFilter: string
  deviceId: number | null
  dateFilter: string
  time: string
  endDate: string
  includeInactive: boolean
  endTime: string
}

// ExportStudentClockingDto; UserId, UserCultureInfo and SecurityModel are set by the server.
export type ExportStudentClockingBody = {
  deviceId: number | ''
  dateFilter: string
  time: string
  endDate: string
  endTime: string
  includeInactive: boolean
  searchFilter: string
  exportTo: ExportTo
  sortColumn: ReadingsSortColumn
  sortDirection: SortDirection
}

// Clocking service SuspiciousClocking (SuspiciousReadingsReport/Index.cshtml:47-55); ids are Guids.
export type SuspiciousClockingDto = {
  clockingId: string | null
  reason: string | null
  clockingDate: string | null
  createdDate: string | null
  studentNumber: string | null
  classId: string | null
  allocationStartDateTime: string | null
  allocationEndDateTime: string | null
  deviceId: string | null
}

// data-column values of SuspiciousReadingsReport/Index.cshtml:34-42, plus the initial 'date' sort key.
export type SuspiciousSortColumn =
  | 'date'
  | 'reason'
  | 'clockingId'
  | 'createdDate'
  | 'clockingDate'
  | 'classId'
  | 'allocationStartDateTime'
  | 'allocationEndDateTime'
  | 'deviceId'
  | 'studentNumber'

// GetSuspiciousClockings query (SuspiciousReadingsReportApiController.cs:31-36) plus swgrid's searchFilter.
export type SuspiciousQueryParams = {
  currentPageIndex: number
  pageSize: number
  sortCol: SuspiciousSortColumn
  sortDir: SortDirection
  searchFilter: string
  dateFilter: string
  endDate: string
}

export type ReportPageDto<T> = { items: T[]; totalRowCount: number }

// Seats.Trunk.Contracts ExportToEnum.
export type ExportTo = 0 | 1

// Seats.Trunk.Contracts ExportDeviceReportDto; UserId and UserCultureInfo are set by the server.
export type ExportDeviceReportBody = {
  searchString: string
  includeInactive: boolean
  exportTo: ExportTo
  sortField: DevicesSortColumn
  sortOrder: SortDirection
  // An untouched battery filter sends the empty string, like ko's observable (deviceIndexController.js:282-283).
  batteryPercentMin: number | ''
  batteryPercentMax: number | ''
  siteId: number | null
  buildingId: number | null
  roomId: number | null
}
