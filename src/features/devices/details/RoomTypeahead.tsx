'use client'

import { useCallback } from 'react'
import { LookupSearch, type LookupOption } from '@/shared/ui'
import { searchRooms } from './device-details-api'

// bootstrap3-typeahead defaults the device screen ports: 250 ms delay, 8 items, min length 1, menu hidden at 0 results.
const SEARCH_DELAY_MS = 250
const MAX_RESULTS = 8

type RoomTypeaheadProps = {
  id: string
  label: string
  placeholder: string
  clearLabel: string
  selected: LookupOption | null
  onSelect: (option: LookupOption | null) => void
}

export function RoomTypeahead({
  id,
  label,
  placeholder,
  clearLabel,
  selected,
  onSelect,
}: RoomTypeaheadProps) {
  // The list shows the room name; picking one puts its description in the input (swapp.js updater).
  const search = useCallback(async (query: string, signal: AbortSignal): Promise<LookupOption[]> => {
    const rooms = await searchRooms(query.trim(), signal)
    return rooms.map(room => ({
      id: room.id,
      label: room.name ?? room.description ?? '',
      text: room.description ?? room.name ?? '',
    }))
  }, [])

  return (
    <LookupSearch
      id={id}
      label={label}
      placeholder={placeholder}
      clearLabel={clearLabel}
      cacheKey="device-rooms"
      minLength={1}
      selected={selected}
      search={search}
      onSelect={onSelect}
      delayMs={SEARCH_DELAY_MS}
      maxResults={MAX_RESULTS}
      hideEmptyList
      className="min-w-0 flex-1"
    />
  )
}
