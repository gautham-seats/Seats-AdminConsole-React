import { api } from '@/shared/api'
import { pageTotal } from '@/shared/api/page-total'
import type { RoomsPageDto } from '@/types/devices'
import { deleteRoomsPath, parseRoomsPage, toRoomsParams, type RoomsQuery } from './rooms-query'

// GET api/RoomApi/GetRooms (RoomApiController.cs:56-66).
export async function fetchRoomsPage(query: RoomsQuery, signal: AbortSignal): Promise<RoomsPageDto> {
  const page = parseRoomsPage(
    await api.get<unknown>('RoomApi/GetRooms', { query: toRoomsParams(query), signal }),
  )
  return {
    ...page,
    totalRowCount: pageTotal(page.totalRowCount, query.pageIndex, query.pageSize, page.items.length),
  }
}

// DELETE api/RoomApi?ids=… (RoomApiController.cs:132-155).
export function deleteRooms(ids: readonly number[]): Promise<void> {
  return api.delete<void>(deleteRoomsPath(ids))
}
