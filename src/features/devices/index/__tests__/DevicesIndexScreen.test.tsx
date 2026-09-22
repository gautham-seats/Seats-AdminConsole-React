import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { getLegacyViewHtml } from '@/shared/api/legacy-view'
import { resetUiCulture } from '@/shared/i18n/culture'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { DevicesIndexScreen } from '../DevicesIndexScreen'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

jest.mock('@/shared/api/legacy-view', () => ({ getLegacyViewHtml: jest.fn() }))

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)
const put = jest.mocked(api.put)
const del = jest.mocked(api.delete)
const view = jest.mocked(getLegacyViewHtml)

type Options = {
  devices?: number[]
  rooms?: number[]
  readings?: number[]
  battery?: boolean
  fail?: boolean
  returnedDevices?: number
  total?: number
  malformed?: boolean
  culture?: string
}

function device(id: number) {
  return {
    id,
    description: `Reader ${id}`,
    isActive: id % 2 === 1,
    serialNumber: `SN-${id}`,
    macAddress: `00:1A:00:00:00:0${id}`,
    ipAddress: `10.0.0.${id}`,
    displayLastHeartBeat: '14/09/2026 10:30',
    displayLastReadDate: '14/09/2026 09:00',
    roomNames: 'LIB 0.12',
    assetTag: `AT-${id}`,
    buildingNames: 'Library',
    batteryPercent: id === 3 ? null : id * 12,
  }
}

function setup({
  devices = [1, 2, 4, 130],
  rooms = [1],
  readings = [1],
  battery = true,
  fail = false,
  returnedDevices = 3,
  total = returnedDevices,
  malformed = false,
  culture = 'en-GB',
}: Options = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims') {
      return Promise.resolve([
        { id: 9, actions: devices.map(id => ({ id })) },
        { id: 8, actions: rooms.map(id => ({ id })) },
        { id: 15, actions: readings.map(id => ({ id })) },
      ])
    }
    if (path === 'DeviceApi/GetDevices') {
      if (fail)
        return Promise.reject(new ApiError('http', '/Seats.Trunk.Admin/api/DeviceApi/GetDevices', 500))
      if (malformed) return Promise.resolve({ unexpected: [] })
      return Promise.resolve({
        items: Array.from({ length: returnedDevices }, (_, index) => device(index + 1)),
        totalRowCount: total,
      })
    }
    if (path === 'DeviceApi/GetSiteOptions') return Promise.resolve([{ id: 1, description: 'North Campus' }])
    if (path === 'DeviceApi/GetBuildingOptions')
      return Promise.resolve([{ id: 11, description: 'Library', siteId: 1 }])
    if (path === 'DeviceApi/GetRoomOptions')
      return Promise.resolve([{ id: 101, description: 'LIB 0.12', buildingId: 11 }])
    return Promise.resolve(null)
  })
  post.mockImplementation((path: string) =>
    Promise.resolve(path === 'ResourceApi/GetResourcesForScreen' ? { [culture]: {} } : undefined),
  )
  view.mockResolvedValue(
    battery ? '<th id="battery-percent-col">Battery %</th>' : '<th id="building-col"></th>',
  )
  return render(
    <ProfileProvider>
      <DevicesIndexScreen />
    </ProfileProvider>,
  )
}

const listCalls = () => get.mock.calls.filter(([path]) => path === 'DeviceApi/GetDevices')
const lastParams = () => listCalls().at(-1)?.[1]?.query
const checkboxFor = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` })

beforeEach(() => {
  // jsdom has no scrollIntoView; Radix Select calls it when the list opens.
  Element.prototype.scrollIntoView = jest.fn()
  jest.clearAllMocks()
  clearResourceCache()
  resetUiCulture()
})

describe('DevicesIndexScreen', () => {
  it('loads once with the legacy defaults and shows every column in order', async () => {
    setup()
    expect(await screen.findByRole('link', { name: 'Reader 1' })).toBeInTheDocument()
    await screen.findByRole('columnheader', { name: /Battery %/ })
    expect(listCalls()).toHaveLength(1)
    expect(lastParams()).toEqual({
      currentPageIndex: 0,
      pageSize: 100,
      sortCol: 'description',
      sortDir: 'desc',
      searchFilter: '',
      includeInactive: false,
    })
    expect(screen.getAllByRole('columnheader').map(th => th.textContent)).toEqual([
      '',
      'Description',
      'In Service',
      'Serial Number',
      'Mac Address',
      'IP Address',
      'Last Heart Beat',
      'Last Read Date',
      'Room',
      'Asset Tag',
      'Building',
      'Battery %',
    ])
    expect(view).toHaveBeenCalledWith('Device/Index', expect.anything())
    expect(screen.getByText('Total 3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Device' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Reader 1' })).toHaveAttribute('href', '/resources/devices/1')
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute('href', '/resources/devices/new')
    // Rows are not mouse-only click targets any more: the description link is the keyboard-reachable way in.
    fireEvent.click(screen.getByText('SN-2'))
    expect(push).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Reader 2' })).toHaveAttribute('href', '/resources/devices/2')
    expect(screen.getAllByRole('row')[1]).toHaveAttribute('aria-rowindex', '2')
  })

  it('hides the battery column and filter when the tenant setting is off', async () => {
    setup({ battery: false })
    await screen.findByRole('link', { name: 'Reader 1' })
    await waitFor(() => expect(screen.getAllByRole('columnheader')).toHaveLength(11))
    expect(screen.queryByRole('group', { name: 'Battery %' })).not.toBeInTheDocument()
  })

  // D-112: a committed battery bound reloads the grid at once; there is no filter Search button.
  it('applies a battery bound as soon as it is committed', async () => {
    setup()
    await screen.findByRole('link', { name: 'Reader 1' })
    const before = listCalls().length
    const panel = screen.getByRole('region', { name: 'Filters' })
    expect(within(panel).queryByRole('button', { name: 'Search' })).not.toBeInTheDocument()

    const from = within(panel).getByLabelText('Battery % (From)')
    fireEvent.change(from, { target: { value: '30' } })
    expect(listCalls()).toHaveLength(before)
    fireEvent.blur(from)

    await waitFor(() => expect(listCalls()).toHaveLength(before + 1))
    expect(lastParams()).toMatchObject({ batteryPercentMin: 30, currentPageIndex: 0 })
  })

  it('says politely when a battery bound moves the other one', async () => {
    setup()
    await screen.findByRole('link', { name: 'Reader 1' })
    const panel = screen.getByRole('region', { name: 'Filters' })
    const to = within(panel).getByLabelText('Battery % (To)')
    fireEvent.change(to, { target: { value: '40' } })
    fireEvent.blur(to)
    const from = within(panel).getByLabelText('Battery % (From)')
    fireEvent.change(from, { target: { value: '60' } })
    fireEvent.blur(from)
    expect(
      await within(panel).findByText('Battery % (To) was changed to keep the range in order: 60'),
    ).toHaveAttribute('aria-live', 'polite')
  })

  // The option lists are asked of the server per parent, like loadBuildings/loadRooms.
  it('re-queries the building and room options for the chosen site', async () => {
    setup()
    await screen.findByRole('link', { name: 'Reader 1' })
    const optionCalls = (path: string) => get.mock.calls.filter(([called]) => called === path)
    expect(optionCalls('DeviceApi/GetBuildingOptions')[0]?.[1]?.query).toEqual({ siteId: null })
    expect(optionCalls('DeviceApi/GetRoomOptions')[0]?.[1]?.query).toEqual({
      siteId: null,
      buildingId: null,
    })
  })

  it('applies each filter at once and back-fills the site from a room', async () => {
    setup()
    await screen.findByRole('link', { name: 'Reader 1' })
    fireEvent.click(await screen.findByRole('switch', { name: 'Include Out of Service Devices' }))
    await waitFor(() => expect(listCalls()).toHaveLength(2))
    expect(lastParams()).toMatchObject({ includeInactive: true, currentPageIndex: 0 })

    expect(lastParams()).not.toHaveProperty('batteryPercentMin')
    expect(screen.getByRole('combobox', { name: 'Room' })).toBeInTheDocument()

    const panel = screen.getByRole('region', { name: 'Filters' })
    // The toggle is named by its visible text; Collapse/Expand is its title.
    fireEvent.click(within(panel).getByRole('button', { name: /^Filters/ }))
    expect(
      within(panel).getByRole('button', { name: 'Remove Include Out of Service Devices' }),
    ).toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Reset' }))
    await waitFor(() => expect(lastParams()).toMatchObject({ includeInactive: false }))
  })

  it('shows Reprocess only for exactly one selected row and sends the dd/MM/yyyy date', async () => {
    put.mockResolvedValue(3)
    setup()
    await screen.findByRole('link', { name: 'Reader 1' })
    fireEvent.click(checkboxFor('Reader 1'))
    expect(screen.getByRole('button', { name: 'Reprocess Card Swipes' })).toBeInTheDocument()
    fireEvent.click(checkboxFor('Reader 2'))
    expect(screen.getByRole('button', { name: 'Reprocess Card Swipes' })).toBeDisabled()
    fireEvent.click(checkboxFor('Reader 2'))

    fireEvent.click(screen.getByRole('button', { name: 'Reprocess Card Swipes' }))
    const dialog = await screen.findByRole('dialog')
    const date = within(dialog).getByLabelText('Date')
    fireEvent.change(date, { target: { value: '31/02/2026' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))
    expect(await within(dialog).findByText('Enter the date as dd/MM/yyyy.')).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
    fireEvent.change(date, { target: { value: '' } })
    expect(within(dialog).getByText('Required')).toBeInTheDocument()

    fireEvent.change(date, { target: { value: '10/09/2026' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith('DeviceApi/ReprocessSwipes', {
        query: { deviceId: 1, date: '10/09/2026' },
      }),
    )
    expect(await screen.findByText('The item was saved successfully.')).toBeInTheDocument()
  })

  it('G2-02 names the culture date pattern in the reprocess message (deviceIndexController.js:8)', async () => {
    setup({ culture: 'en-US' })
    await screen.findByRole('link', { name: 'Reader 1' })
    fireEvent.click(checkboxFor('Reader 1'))
    fireEvent.click(screen.getByRole('button', { name: 'Reprocess Card Swipes' }))
    const dialog = await screen.findByRole('dialog')
    const date = within(dialog).getByLabelText('Date')
    expect(date).toHaveAttribute('placeholder', 'MM/dd/yyyy')
    fireEvent.change(date, { target: { value: '31/02/2026' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))
    expect(await within(dialog).findByText('Enter the date as MM/dd/yyyy.')).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })

  it('G2-03 carries the typed, unsubmitted search into a sort reload (swgrid.js:650-653)', async () => {
    setup()
    await screen.findByRole('link', { name: 'Reader 1' })
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: '  SN-2  ' } })
    expect(listCalls()).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Serial Number' }))
    await waitFor(() => expect(listCalls()).toHaveLength(2))
    expect(lastParams()).toMatchObject({ sortCol: 'serialNumber', searchFilter: 'SN-2', currentPageIndex: 0 })
    expect(screen.getByPlaceholderText('Search...')).toHaveValue('SN-2')
  })

  it('G2-04 labels the include-inactive switch with IncludeInactiveDevices (_IndexHeaderFilter.cshtml:6)', async () => {
    setup()
    await screen.findByRole('link', { name: 'Reader 1' })
    const panel = screen.getByRole('region', { name: 'Filters' })
    const toggle = within(panel).getByRole('switch', { name: 'Include Out of Service Devices' })
    expect(toggle.closest('label')).toHaveTextContent('Include Out of Service Devices')
    expect(within(panel).queryByText('Out of service')).not.toBeInTheDocument()
  })

  it('G2-05 captions the location selects [All] (_IndexFilterRow.cshtml:5,9,13)', async () => {
    setup()
    await screen.findByRole('link', { name: 'Reader 1' })
    for (const name of ['Site', 'Building', 'Room']) {
      expect(screen.getByRole('combobox', { name })).toHaveTextContent('[All]')
    }
  })

  it('shows the server message for a 400 delete and a generic message otherwise', async () => {
    setup()
    await screen.findByRole('link', { name: 'Reader 1' })
    del.mockRejectedValueOnce(new ApiError('http', '/api/DeviceApi', 400, 'Device has pending readings.'))
    fireEvent.click(checkboxFor('Reader 1'))
    fireEvent.click(checkboxFor('Reader 3'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith('DeviceApi?ids=1&ids=3'))
    expect(await screen.findByText('Device has pending readings.')).toBeInTheDocument()

    del.mockRejectedValueOnce(new ApiError('http', '/api/DeviceApi', 409))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText('There was an error while trying to delete the item.')).toBeInTheDocument()
  })

  it('P8 DevicesIndex shows not-authorised on 401', async () => {
    setup()
    await screen.findByRole('link', { name: 'Reader 1' })
    // The selection survives a failed delete, so it is made once.
    const tryDelete = async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      const confirm = await screen.findByRole('button', { name: 'Confirm' })
      await act(async () => fireEvent.click(confirm))
    }
    fireEvent.click(checkboxFor('Reader 1'))
    del.mockRejectedValueOnce(new ApiError('auth', '/api/DeviceApi', 403))
    await tryDelete()
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('You do not have permission to view this.')).not.toBeInTheDocument()

    del.mockRejectedValueOnce(new ApiError('auth', '/api/DeviceApi', 401))
    await tryDelete()
    expect(await screen.findByText('You do not have permission to view this.')).toBeInTheDocument()
  })

  it('hides Add, Delete and Reprocess without their permissions', async () => {
    setup({ devices: [1] })
    await screen.findByRole('link', { name: 'Reader 1' })
    expect(screen.queryByRole('link', { name: 'Add' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('does not open the page for Rooms-only users', async () => {
    setup({ devices: [], rooms: [1] })
    expect(await screen.findByText('You do not have permission to view devices.')).toBeInTheDocument()
    expect(listCalls()).toHaveLength(0)
  })

  it('shows an error with Retry instead of an empty grid', async () => {
    setup({ fail: true })
    expect(await screen.findByText('The server could not complete the request.')).toBeInTheDocument()
    expect(screen.queryByText('There are no items to show.')).not.toBeInTheDocument()
    get.mockImplementation((path: string) =>
      path === 'DeviceApi/GetDevices'
        ? Promise.resolve({ items: [device(5)], totalRowCount: 1 })
        : path === 'UserApi/GetClaims'
          ? Promise.resolve([{ id: 9, actions: [{ id: 1 }] }])
          : Promise.resolve([]),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    })
    expect(await screen.findByRole('link', { name: 'Reader 5' })).toBeInTheDocument()
  })

  it('shows an error instead of an empty grid for a malformed success response', async () => {
    setup({ malformed: true })
    expect(await screen.findByText('There was an error while processing your request.')).toBeInTheDocument()
    expect(screen.queryByText('There are no items to show.')).not.toBeInTheDocument()
  })

  it('shows returned devices, the header, corrected total and pager when the server total is zero', async () => {
    setup({ returnedDevices: 10, total: 0 })
    expect(await screen.findByRole('link', { name: 'Reader 1' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).not.toHaveLength(0)
    expect(screen.getByText('Total 10')).toBeInTheDocument()
    expect(screen.getByLabelText('Number of items per page')).toBeInTheDocument()
  })
})
