import { api } from '@/shared/api'
import type { RoomDetailsViewModel, RoomSaveBody } from '@/types/devices'
import { parseRoomDetails } from './room-form'

// GET api/RoomApi/{id}; a new room sends id 0, which is what getIdFromQueryString yields (roomDetailsController.js:80-81).
export async function fetchRoomDetails(
  id: number | null,
  signal: AbortSignal,
): Promise<RoomDetailsViewModel> {
  return parseRoomDetails(await api.get<unknown>(`RoomApi/${id ?? 0}`, { signal }))
}

// POST api/RoomApi/ with RoomCreateViewModel (swapp.js:530-536).
export function saveRoom(body: RoomSaveBody): Promise<unknown> {
  return api.post<unknown>('RoomApi/', { body })
}
