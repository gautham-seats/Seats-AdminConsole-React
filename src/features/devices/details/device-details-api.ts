import { api } from '@/shared/api'
import type { DeviceDetailsViewModel, DeviceRoomDto, DeviceSaveBody } from '@/types/devices'
import { parseDeviceDetails, parseRoom, parseRooms } from './device-form'

// GET api/DeviceApi/{id}; a new device asks for id 0, which Get(int? id) answers with an empty view model
// (swapp.js:469-480, DeviceApiController.cs:115-121). A bare DeviceApi/ would hit Get() and return the whole list.
export async function fetchDeviceDetails(
  id: number | null,
  signal: AbortSignal,
): Promise<DeviceDetailsViewModel> {
  const raw = await api.get<unknown>(`DeviceApi/${id ?? 0}`, { signal })
  return parseDeviceDetails(raw)
}

// POST api/DeviceApi/ with DeviceSaveViewModel (swapp.js:530-536).
export function saveDevice(body: DeviceSaveBody): Promise<unknown> {
  return api.post<unknown>('DeviceApi/', { body })
}

// GET api/roomApi/GetRoomsByCriteria?query= (Details.cshtml:79, swapp.js:784-809).
export async function searchRooms(query: string, signal: AbortSignal): Promise<DeviceRoomDto[]> {
  return parseRooms(await api.get<unknown>('roomApi/GetRoomsByCriteria', { query: { query }, signal }))
}

// GET api/RoomApi/{id} returns { detail, buildings } (deviceDetailsController.js:28-29).
export async function fetchRoom(id: number): Promise<DeviceRoomDto | null> {
  const raw = await api.get<unknown>(`RoomApi/${id}`)
  return raw && typeof raw === 'object' && 'detail' in raw ? parseRoom(raw.detail) : null
}
