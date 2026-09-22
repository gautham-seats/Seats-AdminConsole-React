import {
  activeFilterKeys,
  clearFilter,
  EMPTY_FILTERS,
  sameFilters,
  selectBuilding,
  selectRoom,
  selectSite,
  setBatteryBound,
  type LocationOptions,
} from '../device-filters'

const options: LocationOptions = {
  sites: [
    { id: 1, description: 'North' },
    { id: 2, description: 'South' },
  ],
  buildings: [
    { id: 11, description: 'Library', siteId: 1 },
    { id: 21, description: 'Tower', siteId: 2 },
  ],
  rooms: [
    { id: 101, description: 'LIB 0.12', buildingId: 11 },
    { id: 201, description: 'MT 3.01', buildingId: 21 },
    { id: 301, description: 'Portakabin', buildingId: null },
  ],
}

describe('device filter cascade', () => {
  it('clears building and room when the site changes', () => {
    const start = { ...EMPTY_FILTERS, siteId: 1, buildingId: 11, roomId: 101 }
    expect(selectSite(start, 2)).toMatchObject({ siteId: 2, buildingId: null, roomId: null })
  })

  it('back-fills the site and clears the room when a building is chosen', () => {
    const start = { ...EMPTY_FILTERS, siteId: 1, roomId: 101 }
    expect(selectBuilding(start, 21, options)).toMatchObject({ siteId: 2, buildingId: 21, roomId: null })
  })

  it('back-fills building and site when a room is chosen', () => {
    expect(selectRoom(EMPTY_FILTERS, 201, options)).toMatchObject({ siteId: 2, buildingId: 21, roomId: 201 })
  })

  // deviceIndexController.js:212 returns early, so site and building keep their values.
  it('leaves site and building alone for a room without a building', () => {
    const start = { ...EMPTY_FILTERS, siteId: 1, buildingId: 11 }
    expect(selectRoom(start, 301, options)).toMatchObject({ siteId: 1, buildingId: 11, roomId: 301 })
  })

  it('clears a room without touching its ancestors', () => {
    const start = { ...EMPTY_FILTERS, siteId: 2, buildingId: 21, roomId: 201 }
    expect(selectRoom(start, null, options)).toMatchObject({ siteId: 2, buildingId: 21, roomId: null })
  })
})

describe('battery range clamp', () => {
  const range = EMPTY_FILTERS.battery

  it('clamps to 0-100 and marks the filter as touched', () => {
    expect(setBatteryBound(range, 'min', -20)).toEqual({ min: 0, max: 100, touched: true })
    expect(setBatteryBound(range, 'max', 180)).toEqual({ min: 0, max: 100, touched: true })
  })

  it('moves the other bound so min never exceeds max', () => {
    const low = { min: 10, max: 30, touched: true }
    expect(setBatteryBound(low, 'min', 50)).toEqual({ min: 50, max: 50, touched: true })
    expect(setBatteryBound(low, 'max', 5)).toEqual({ min: 5, max: 5, touched: true })
  })

  it('ignores values that are not numbers', () => {
    expect(setBatteryBound(range, 'min', Number.NaN)).toBe(range)
  })
})

describe('filter comparison and removal', () => {
  it('treats an untouched battery range as equal whatever its bounds', () => {
    const moved = { ...EMPTY_FILTERS, battery: { min: 20, max: 80, touched: false } }
    expect(sameFilters(EMPTY_FILTERS, moved)).toBe(true)
    expect(sameFilters(EMPTY_FILTERS, { ...EMPTY_FILTERS, includeInactive: true })).toBe(false)
  })

  it('lists and clears each active filter', () => {
    const all = {
      includeInactive: true,
      siteId: 1,
      buildingId: 11,
      roomId: 101,
      battery: { min: 0, max: 40, touched: true },
    }
    expect(activeFilterKeys(all)).toEqual(['inactive', 'site', 'building', 'room', 'battery'])
    expect(clearFilter(all, 'building')).toMatchObject({ siteId: 1, buildingId: null, roomId: null })
    expect(clearFilter(all, 'battery').battery.touched).toBe(false)
    expect(activeFilterKeys(clearFilter(all, 'site'))).toEqual(['inactive', 'battery'])
  })
})
