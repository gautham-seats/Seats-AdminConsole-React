import { api } from '@/shared/api'
import { pageTotal } from '@/shared/api/page-total'
import { getLegacyViewHtml } from '@/shared/api/legacy-view'
import type {
  DeviceBuildingOptionDto,
  DeviceRoomOptionDto,
  DevicesPageDto,
  ExportDeviceReportBody,
} from '@/types/devices'
import type { SimpleListItemDto } from '@/types/users'
import {
  deleteDevicesPath,
  parseBuildingOptions,
  parseDevicesPage,
  parseRoomOptions,
  parseSiteOptions,
  toParams,
  type DevicesQuery,
} from './device-query'

// GET api/DeviceApi/GetDevices (DeviceApiController.cs:47-64); an account without Devices + Access gets an empty page.
export async function fetchDevicesPage(query: DevicesQuery, signal: AbortSignal): Promise<DevicesPageDto> {
  const raw = await api.get<unknown>('DeviceApi/GetDevices', { query: toParams(query), signal })
  const page = parseDevicesPage(raw)
  return {
    ...page,
    totalRowCount: pageTotal(page.totalRowCount, query.pageIndex, query.pageSize, page.items.length),
  }
}

// Each list is fetched for its own parent, like loadBuildings/loadRooms (deviceIndexController.js:167-177).
// A null id sends an empty value, matching $.getJSON's $.param.
export async function fetchSiteOptions(signal: AbortSignal): Promise<SimpleListItemDto[]> {
  return parseSiteOptions(await api.get<unknown>('DeviceApi/GetSiteOptions', { signal }))
}

export async function fetchBuildingOptions(
  siteId: number | null,
  signal: AbortSignal,
): Promise<DeviceBuildingOptionDto[]> {
  return parseBuildingOptions(
    await api.get<unknown>('DeviceApi/GetBuildingOptions', { query: { siteId }, signal }),
  )
}

export async function fetchRoomOptions(
  siteId: number | null,
  buildingId: number | null,
  signal: AbortSignal,
): Promise<DeviceRoomOptionDto[]> {
  return parseRoomOptions(
    await api.get<unknown>('DeviceApi/GetRoomOptions', { query: { siteId, buildingId }, signal }),
  )
}

// Index.cshtml:127 marks the column with data-column="batteryPercent"; the id is kept only as a fallback
// because ids in that view are duplicated on the <th>/<td> pair.
const BATTERY_COLUMN = /data-column="batteryPercent"|\bid="battery-percent-col"/

export function hasBatteryColumn(html: string): boolean {
  return BATTERY_COLUMN.test(html)
}

// Device.BatteryPercent.Enabled reaches the browser only through the rendered partial (DeviceController.cs:30-34).
export async function fetchBatteryColumnEnabled(signal: AbortSignal): Promise<boolean> {
  return hasBatteryColumn(await getLegacyViewHtml('Device/Index', signal))
}

// DELETE api/DeviceApi?ids=… (DeviceApiController.cs:234-258).
export function deleteDevices(ids: readonly number[]): Promise<void> {
  return api.delete<void>(deleteDevicesPath(ids))
}

// PUT api/DeviceApi/ReprocessSwipes?deviceId=&date= with the dd/MM/yyyy text (deviceIndexController.js:18-22).
export function reprocessSwipes(deviceId: number, date: string): Promise<unknown> {
  return api.put<unknown>('DeviceApi/ReprocessSwipes', { query: { deviceId, date } })
}

// POST api/DeviceApi/Export queues a report; it does not return a file (DeviceApiController.cs:260-271).
export function exportDevices(body: ExportDeviceReportBody): Promise<unknown> {
  return api.post<unknown>('DeviceApi/Export', { body })
}
