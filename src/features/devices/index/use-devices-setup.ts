'use client'

import { useCallback, useMemo } from 'react'
import { useApiRead, type ReadStatus } from '@/shared/api'
import {
  fetchBatteryColumnEnabled,
  fetchBuildingOptions,
  fetchRoomOptions,
  fetchSiteOptions,
} from './devices-api'
import type { LocationOptions } from './device-filters'

export type LocationOptionsRead = {
  status: ReadStatus
  data: LocationOptions | undefined
  reload: () => void
}

// Buildings follow the chosen site and rooms follow both, as loadBuildings/loadRooms do
// (deviceIndexController.js:167-177). Sites are loaded once.
export function useLocationOptions(siteId: number | null, buildingId: number | null): LocationOptionsRead {
  const sites = useApiRead('devices-site-options', fetchSiteOptions)

  const loadBuildings = useCallback((signal: AbortSignal) => fetchBuildingOptions(siteId, signal), [siteId])
  const buildings = useApiRead(`devices-building-options#${siteId ?? ''}`, loadBuildings)

  const loadRooms = useCallback(
    (signal: AbortSignal) => fetchRoomOptions(siteId, buildingId, signal),
    [siteId, buildingId],
  )
  const rooms = useApiRead(`devices-room-options#${siteId ?? ''}#${buildingId ?? ''}`, loadRooms)

  const status: ReadStatus =
    sites.status === 'error' || buildings.status === 'error' || rooms.status === 'error'
      ? 'error'
      : sites.status === 'success' && buildings.status === 'success' && rooms.status === 'success'
        ? 'success'
        : 'loading'

  const data = useMemo(
    () =>
      sites.data && buildings.data && rooms.data
        ? { sites: sites.data, buildings: buildings.data, rooms: rooms.data }
        : undefined,
    [sites.data, buildings.data, rooms.data],
  )

  const { reload: reloadSites } = sites
  const { reload: reloadBuildings } = buildings
  const { reload: reloadRooms } = rooms
  const reload = useCallback(() => {
    reloadSites()
    reloadBuildings()
    reloadRooms()
  }, [reloadSites, reloadBuildings, reloadRooms])

  return { status, data, reload }
}

export function useBatteryColumn() {
  return useApiRead('devices-battery-column', fetchBatteryColumnEnabled)
}
