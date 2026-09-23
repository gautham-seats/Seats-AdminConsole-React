import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { peekDevicesFlash } from '../../devices-flash'
import { parseRoomDetails, toRoomForm, toRoomSaveBody, validateRoomForm } from '../room-form'
import { RoomDetailsScreen } from '../RoomDetailsScreen'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

jest.mock('next/link', () => ({
  __esModule: true,
  // jsdom cannot navigate, so the stand-in keeps the href but swallows the click.
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} onClick={event => event.preventDefault()} />
  ),
}))

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)

const buildings = [
  { id: 11, name: 'Library', siteId: 1 },
  { id: 12, name: 'Science', siteId: 1 },
]

const ROOM_DEVICES = [
  {
    id: 91,
    serialNumber: 'S1002',
    description: 'Door beacon',
    isActive: true,
    batteryPercent: 78,
    displayLastReadDate: '15/09/2026 08:05:09',
  },
  {
    id: 92,
    serialNumber: 'S1044',
    description: 'Ceiling beacon',
    isActive: false,
    batteryPercent: 9,
    displayLastReadDate: '16/09/2026 07:10:00',
  },
]

function setup(
  idParam: string,
  {
    rooms = [1, 2, 3],
    missing = false,
    devices = ROOM_DEVICES,
  }: { rooms?: number[]; missing?: boolean; devices?: unknown[] } = {},
) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims') return Promise.resolve([{ id: 8, actions: rooms.map(id => ({ id })) }])
    if (path === 'RoomApi/5') {
      if (missing) return Promise.reject(new ApiError('http', '/api/RoomApi/5', 404))
      return Promise.resolve({
        detail: {
          id: 5,
          name: 'LIB 0.12',
          externalCode: 'L012',
          capacity: 40,
          buildingId: 12,
          globalId: 'g-5',
          buildingName: 'Science',
        },
        buildings,
      })
    }
    if (path === 'RoomApi/0')
      return Promise.resolve({ detail: { id: 0, capacity: 0, buildingId: null }, buildings })
    if (path === 'DeviceApi/GetDevices')
      return Promise.resolve({ items: devices, totalRowCount: devices.length })
    return Promise.resolve(null)
  })
  post.mockImplementation((path: string) =>
    Promise.resolve(path === 'ResourceApi/GetResourcesForScreen' ? { 'en-GB': {} } : undefined),
  )
  return render(
    <ProfileProvider>
      <RoomDetailsScreen idParam={idParam} />
    </ProfileProvider>,
  )
}

const saveCalls = () => post.mock.calls.filter(([path]) => path === 'RoomApi/')

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('room form', () => {
  it('defaults an unset building to the first option and validates like legacy', () => {
    const view = parseRoomDetails({ detail: { id: 0, capacity: 0, buildingId: null }, buildings })
    const form = toRoomForm(view)
    expect(form).toEqual({ buildingId: 11, externalCode: '', name: '', capacity: '0' })
    expect(validateRoomForm(form)).toEqual({ name: 'required' })
    expect(validateRoomForm({ ...form, name: 'A<', capacity: '12a', externalCode: '>' })).toEqual({
      name: 'specialCharacters',
      capacity: 'wholeNumber',
      externalCode: 'specialCharacters',
    })
    expect(toRoomSaveBody(view.detail, { ...form, name: 'Hall', capacity: ' 30 ' }, 'u')).toEqual({
      id: 0,
      externalCode: null,
      name: 'Hall',
      capacity: 30,
      buildingId: 11,
      url: 'u',
    })
  })
})

describe('RoomDetailsScreen', () => {
  it('edits a room and posts the legacy body', async () => {
    setup('5')
    const name = await screen.findByLabelText('Name')
    expect(name).toHaveValue('LIB 0.12')
    expect(screen.getByRole('combobox', { name: 'Building' })).toHaveTextContent('Science')
    fireEvent.change(name, { target: { value: 'LIB 0.14' } })
    fireEvent.change(screen.getByLabelText('Capacity'), { target: { value: '55' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saveCalls()).toHaveLength(1))
    expect(saveCalls()[0][1]).toEqual({
      body: {
        globalId: 'g-5',
        buildingName: 'Science',
        id: 5,
        externalCode: 'L012',
        name: 'LIB 0.14',
        capacity: 55,
        buildingId: 12,
        url: 'http://localhost/Seats.Trunk.Admin/#/Room/Details/5',
      },
    })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/resources/rooms'))
    expect(peekDevicesFlash()).toEqual({ message: 'The item was saved successfully.', durationMs: 3500 })
  })

  it('blocks save for a new room without a name', async () => {
    setup('new')
    expect(await screen.findByRole('heading', { name: 'New room' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Room details' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Identification' })).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Required')).toBeInTheDocument()
    expect(screen.getByText('There are fields with input validation errors.')).toBeInTheDocument()
    expect(saveCalls()).toHaveLength(0)
  })

  it('P8 RoomDetails save shows not-authorised on 401', async () => {
    setup('5')
    await screen.findByLabelText('Name')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Room 505' } })
    post.mockRejectedValueOnce(new ApiError('auth', '/api/RoomApi/', 403))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saveCalls()).toHaveLength(1))
    expect(screen.queryByText('You do not have permission to view this.')).not.toBeInTheDocument()

    post.mockRejectedValueOnce(new ApiError('auth', '/api/RoomApi/', 401))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('You do not have permission to view this.')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('shows the server message when save fails', async () => {
    setup('5')
    await screen.findByLabelText('Name')
    post.mockRejectedValueOnce(
      new ApiError('http', '/api/RoomApi/', 400, 'There was an error while trying to save the item.'),
    )
    // Save stays disabled on an existing room until something changes.
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Room 505' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('There was an error while trying to save the item.')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('G2-10 keeps an untouched null code but posts "" once the user edits and clears it, as the device form', async () => {
    const view = parseRoomDetails({ detail: { id: 0, capacity: 0, buildingId: null }, buildings })
    const form = { ...toRoomForm(view), name: 'Hall', capacity: '30' }
    expect(toRoomSaveBody(view.detail, form, 'u').externalCode).toBeNull()
    expect(toRoomSaveBody(view.detail, form, 'u', new Set(['externalCode'])).externalCode).toBe('')

    setup('new')
    const code = await screen.findByLabelText('Code')
    fireEvent.change(code, { target: { value: 'X' } })
    fireEvent.change(code, { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Hall' } })
    fireEvent.change(screen.getByLabelText('Capacity'), { target: { value: '30' } })
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    await waitFor(() => expect(saveCalls()).toHaveLength(1))
    expect(saveCalls()[0][1]).toEqual({
      body: expect.objectContaining({ id: 0, externalCode: '', name: 'Hall' }),
    })
  })

  it('sizes Cancel to match Save and keeps the pair in the page header', async () => {
    setup('5')
    const cancel = await screen.findByRole('link', { name: 'Cancel' })
    const save = screen.getByRole('button', { name: 'Save' })
    // add-button.ts gives both the same box; a mismatch here is the bug this guards.
    for (const box of ['min-h-10', 'min-w-[8.5rem]', 'rounded-lg', 'px-7']) {
      expect(cancel).toHaveClass(box)
      expect(save).toHaveClass(box)
    }
    expect(cancel.parentElement).toBe(save.parentElement)
    expect(cancel.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('D-069 asks before leaving a room with unsaved changes', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      setup('5')
      const name = await screen.findByLabelText('Name')
      fireEvent.click(screen.getByRole('link', { name: 'Cancel' }))
      expect(confirm).not.toHaveBeenCalled()
      fireEvent.change(name, { target: { value: 'LIB 0.14' } })
      fireEvent.click(screen.getByRole('link', { name: 'Cancel' }))
      expect(confirm).toHaveBeenCalledWith('You have unsaved changes. Leave this page?')
    } finally {
      confirm.mockRestore()
    }
  })

  it('hides Save without Rooms Edit and shows not found', async () => {
    const view = setup('5', { rooms: [1] })
    await screen.findByLabelText('Name')
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    view.unmount()
    clearResourceCache()
    setup('5', { missing: true })
    expect(await screen.findByText('This room could not be found.')).toBeInTheDocument()
  })

  it('shows the room devices count and the newest reading in the hero', async () => {
    setup('5')
    expect(await screen.findByRole('tab', { name: /Devices/ })).toBeInTheDocument()
    // The newest reading wins even though it is second in the list.
    expect(await screen.findByText('16/09/2026 07:10:00')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Devices 2' })).toBeInTheDocument()
  })

  it('lists the devices assigned to the room on the Devices tab', async () => {
    setup('5')
    fireEvent.click(await screen.findByRole('tab', { name: /Devices/ }))
    expect(await screen.findByText('S1002')).toBeInTheDocument()
    expect(screen.getByText('Ceiling beacon')).toBeInTheDocument()
  })

  it('says why Timetable and Activity are empty instead of inventing rows', async () => {
    setup('5')
    fireEvent.click(await screen.findByRole('tab', { name: 'Timetable' }))
    expect(await screen.findByText('Timetable needs a backend endpoint')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }))
    expect(await screen.findByText('Activity needs a filter the audit API does not have')).toBeInTheDocument()
  })
})
