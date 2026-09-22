import { EMPTY_FILTERS } from '../device-filters'
import {
  batteryLevel,
  cleanSearch,
  deleteDevicesPath,
  EXPORT_TO,
  exportBody,
  INITIAL_QUERY,
  nextSort,
  PAGE_SIZES,
  parseDevicesPage,
  parseLocationOptions,
  queryKey,
  toParams,
} from '../device-query'

describe('devices query rules', () => {
  it('starts on description descending with 100 rows and no optional filters', () => {
    expect(toParams(INITIAL_QUERY)).toEqual({
      currentPageIndex: 0,
      pageSize: 100,
      sortCol: 'description',
      sortDir: 'desc',
      searchFilter: '',
      includeInactive: false,
    })
    expect(PAGE_SIZES).toEqual([10, 15, 20, 50, 100, 200])
  })

  it('sends battery bounds only once touched, and location ids only when set', () => {
    const untouched = {
      ...INITIAL_QUERY,
      filters: { ...EMPTY_FILTERS, battery: { min: 20, max: 60, touched: false } },
    }
    expect(toParams(untouched)).not.toHaveProperty('batteryPercentMin')

    const query = {
      ...INITIAL_QUERY,
      filters: {
        includeInactive: true,
        siteId: 2,
        buildingId: null,
        roomId: 7,
        battery: { min: 0, max: 40, touched: true },
      },
    }
    expect(toParams(query)).toEqual({
      currentPageIndex: 0,
      pageSize: 100,
      sortCol: 'description',
      sortDir: 'desc',
      searchFilter: '',
      includeInactive: true,
      batteryPercentMin: 0,
      batteryPercentMax: 40,
      siteId: 2,
      roomId: 7,
    })
    expect(queryKey(query)).not.toBe(queryKey(INITIAL_QUERY))
  })

  it('trims and collapses repeated spaces like swgrid', () => {
    expect(cleanSearch('   00:1A     reader  ')).toBe('00:1A reader')
  })

  it('flips the same column, starts a new column ascending and returns to the first page', () => {
    const onPageThree = { ...INITIAL_QUERY, pageIndex: 2 }
    expect(nextSort(onPageThree, 'description')).toMatchObject({
      sortCol: 'description',
      sortDir: 'asc',
      pageIndex: 0,
    })
    expect(nextSort(INITIAL_QUERY, 'mac')).toMatchObject({ sortCol: 'mac', sortDir: 'asc' })
  })

  it('builds the export body from the applied search, filters and sort', () => {
    const query = {
      ...INITIAL_QUERY,
      search: 'reader',
      sortCol: 'lastHeartBeat' as const,
      sortDir: 'asc' as const,
      filters: { ...EMPTY_FILTERS, buildingId: 11, siteId: 1 },
    }
    expect(exportBody(query, EXPORT_TO.csv)).toEqual({
      searchString: 'reader',
      includeInactive: false,
      exportTo: 1,
      sortField: 'lastHeartBeat',
      sortOrder: 'asc',
      batteryPercentMin: '',
      batteryPercentMax: '',
      siteId: 1,
      buildingId: 11,
      roomId: null,
    })
    expect(EXPORT_TO.pdf).toBe(0)
  })

  it('repeats the ids parameter for delete', () => {
    expect(deleteDevicesPath([4, 9])).toBe('DeviceApi?ids=4&ids=9')
  })

  it('uses the legacy battery colour thresholds', () => {
    expect([41, 40, 16, 15, 0].map(batteryLevel)).toEqual(['good', 'medium', 'medium', 'low', 'low'])
  })
})

describe('response parsing', () => {
  it('keeps valid rows and rejects malformed data', () => {
    const page = parseDevicesPage({
      items: [
        {
          id: 1,
          description: 'Reader',
          isActive: true,
          macAddress: '00:1A:2B:3C:4D:5E',
          batteryPercent: 80,
        },
      ],
      totalRowCount: 12,
    })
    expect(page.totalRowCount).toBe(12)
    expect(page.items).toHaveLength(1)
    expect(page.items[0]).toMatchObject({ id: 1, isActive: true, batteryPercent: 80, ipAddress: null })
    expect(() => parseDevicesPage('nonsense')).toThrow('parse: DeviceApi/GetDevices')
    expect(() => parseDevicesPage({ items: [{ description: 'no id' }], totalRowCount: 1 })).toThrow(
      'parse: DeviceApi/GetDevices',
    )
    expect(() => parseDevicesPage({ items: [] })).toThrow('parse: DeviceApi/GetDevices')
  })

  it('J6 keeps the raw battery value, as Index.cshtml:147-151 shows it', () => {
    const items = [255, -5, 0, null].map((batteryPercent, id) => ({ id: id + 1, batteryPercent }))
    const page = parseDevicesPage({ items, totalRowCount: 4 })
    expect(page.items.map(item => item.batteryPercent)).toEqual([255, -5, 0, null])
  })

  it('parses the three location option lists', () => {
    const options = parseLocationOptions(
      [{ id: 1, description: 'North' }],
      [
        { id: 11, description: 'Library', siteId: 1 },
        { id: 12, description: 'Bad' },
      ],
      [{ id: 101, description: 'Room', buildingId: null }],
    )
    expect(options.sites).toEqual([{ id: 1, description: 'North' }])
    expect(options.buildings).toEqual([{ id: 11, description: 'Library', siteId: 1 }])
    expect(options.rooms).toEqual([{ id: 101, description: 'Room', buildingId: null }])
  })
})
