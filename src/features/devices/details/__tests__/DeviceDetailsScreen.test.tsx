import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { peekDevicesFlash } from '../../devices-flash'
import { DeviceDetailsScreen } from '../DeviceDetailsScreen'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)

const room = (id: number) => ({
  id,
  name: `Room ${id}`,
  description: `Room ${id} desc`,
  externalCode: `R${id}`,
  capacity: id * 10,
})

type Options = { devices?: number[]; rooms?: number[]; missing?: boolean }

function setup(idParam: string, { devices = [1, 2, 3], rooms = [1, 3, 4], missing = false }: Options = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims') {
      return Promise.resolve([
        { id: 9, actions: devices.map(id => ({ id })) },
        { id: 8, actions: rooms.map(id => ({ id })) },
      ])
    }
    if (path === 'DeviceApi/7') {
      if (missing) return Promise.reject(new ApiError('http', '/api/DeviceApi/7', 404))
      return Promise.resolve({
        detail: {
          id: 7,
          description: 'Reader 7',
          serialNumber: 'SN-7',
          macAddress: '',
          ipAddress: '',
          assetTag: '',
          isBeacon: false,
          isActive: true,
          deviceTypeId: 1,
        },
        rooms: [room(1)],
      })
    }
    if (path === 'DeviceApi/0') {
      return Promise.resolve({
        detail: { id: 0, isActive: true, isBeacon: false, roomInDevices: [{ room: {} }] },
        rooms: [],
      })
    }
    if (path === 'roomApi/GetRoomsByCriteria') return Promise.resolve([room(2)])
    if (path === 'RoomApi/2') return Promise.resolve({ detail: room(2), buildings: [] })
    return Promise.resolve(null)
  })
  post.mockImplementation((path: string) =>
    Promise.resolve(path === 'ResourceApi/GetResourcesForScreen' ? { 'en-GB': {} } : undefined),
  )
  return render(
    <ProfileProvider>
      <DeviceDetailsScreen idParam={idParam} />
    </ProfileProvider>,
  )
}

const saveCalls = () => post.mock.calls.filter(([path]) => path === 'DeviceApi/')

// The linked rooms live on their own tab, so reach them the way a user does.
const openRooms = () => fireEvent.click(screen.getByRole('tab', { name: /^Rooms/ }))

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('DeviceDetailsScreen', () => {
  it('loads a device, adds a room from the search and posts the legacy body', async () => {
    setup('7')
    const description = await screen.findByLabelText('Description')
    expect(description).toHaveValue('Reader 7')
    fireEvent.change(description, { target: { value: 'Reader seven' } })

    openRooms()
    expect(screen.getByRole('cell', { name: 'R1' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Add Rooms' }), { target: { value: 'Ro' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Room 2' }, { timeout: 2000 }))
    expect(screen.getByRole('combobox', { name: 'Add Rooms' })).toHaveValue('Room 2 desc')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByRole('cell', { name: 'R2' })).toBeInTheDocument()

    // Switching tabs must not discard the edit made on the other one.
    fireEvent.click(screen.getByRole('tab', { name: 'Details' }))
    expect(screen.getByLabelText('Description')).toHaveValue('Reader seven')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saveCalls()).toHaveLength(1))
    expect(saveCalls()[0][1]).toEqual({
      body: expect.objectContaining({
        id: 7,
        description: 'Reader seven',
        serialNumber: 'SN-7',
        deviceTypeId: 1,
        roomIdsInDevice: [1, 2],
        url: 'http://localhost/Seats.Trunk.Admin/#/Device/Details/7',
      }),
    })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/resources/devices'))
    expect(peekDevicesFlash()).toEqual({ message: 'The item was saved successfully.', durationMs: 3500 })
  })

  it('opens a new device with Is Active on and blocks save without a serial number', async () => {
    setup('new')
    expect(await screen.findByRole('heading', { name: 'New device' })).toBeInTheDocument()
    expect(await screen.findByRole('checkbox', { name: 'Is Active' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Required')).toBeInTheDocument()
    expect(screen.getByText('There are fields with input validation errors.')).toBeInTheDocument()
    expect(saveCalls()).toHaveLength(0)
  })

  it('removes selected rooms with Rooms Delete and shows the server save message', async () => {
    setup('7')
    await screen.findByLabelText('Description')
    openRooms()
    await screen.findByRole('cell', { name: 'R1' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Room 1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.queryByRole('cell', { name: 'R1' })).not.toBeInTheDocument()

    post.mockRejectedValueOnce(new ApiError('http', '/api/DeviceApi/', 400, 'The request is invalid.'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('The request is invalid.')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('P8 DeviceDetails save shows not-authorised on 401', async () => {
    setup('7')
    await screen.findByLabelText('Description')
    post.mockRejectedValueOnce(new ApiError('auth', '/api/DeviceApi/', 403))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saveCalls()).toHaveLength(1))
    expect(screen.queryByText('You do not have permission to view this.')).not.toBeInTheDocument()

    post.mockRejectedValueOnce(new ApiError('auth', '/api/DeviceApi/', 401))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('You do not have permission to view this.')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('P8 DeviceDetails add room shows not-authorised on 401', async () => {
    setup('7')
    await screen.findByLabelText('Description')
    openRooms()
    const pick = async () => {
      fireEvent.change(screen.getByRole('combobox', { name: 'Add Rooms' }), { target: { value: 'Ro' } })
      fireEvent.click(await screen.findByRole('option', { name: 'Room 2' }, { timeout: 2000 }))
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    }
    const base = get.getMockImplementation()
    let status = 403
    get.mockImplementation((path: string, ...rest: unknown[]) =>
      path === 'RoomApi/2'
        ? Promise.reject(new ApiError('auth', '/api/RoomApi/2', status))
        : (base as (...args: unknown[]) => Promise<unknown>)(path, ...rest),
    )

    await pick()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled())
    expect(screen.queryByText('You do not have permission to view this.')).not.toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'R2' })).not.toBeInTheDocument()

    status = 401
    await pick()
    expect(await screen.findByText('You do not have permission to view this.')).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'R2' })).not.toBeInTheDocument()
  })

  it('hides Save, Add room and Delete room without their permissions', async () => {
    setup('7', { devices: [1], rooms: [1] })
    await screen.findByLabelText('Description')
    openRooms()
    await screen.findByRole('cell', { name: 'R1' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Room 1' }))
    const actions = screen.getByRole('link', { name: 'Cancel' }).parentElement
    expect(actions && within(actions).queryByRole('button', { name: 'Save' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('G2-06 labels the room search Add Rooms with the Search room placeholder (Details.cshtml:77-79)', async () => {
    setup('7')
    await screen.findByLabelText('Description')
    openRooms()
    const search = screen.getByRole('combobox', { name: 'Add Rooms' })
    expect(search).toHaveAttribute('placeholder', 'Search room')
    expect(screen.queryByRole('combobox', { name: 'Search room' })).not.toBeInTheDocument()
  })

  it('G2-07 shows the legacy special-character message with its space (swapp.js:2646)', async () => {
    setup('7')
    const description = await screen.findByLabelText('Description')
    fireEvent.change(description, { target: { value: 'Reader <7>' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Special characters are not allowed .')).toBeInTheDocument()
    expect(saveCalls()).toHaveLength(0)
  })

  it('G2-10 saves with Ctrl+S like the room form', async () => {
    setup('7')
    await screen.findByLabelText('Description')
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-keyshortcuts', 'Control+S')
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    await waitFor(() => expect(saveCalls()).toHaveLength(1))
    expect(saveCalls()[0][1]).toEqual({ body: expect.objectContaining({ id: 7, serialNumber: 'SN-7' }) })
  })

  it('sizes Cancel to match Save and keeps the pair in the page header', async () => {
    setup('7')
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

  it('D-069 asks before leaving a device with unsaved changes', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      setup('7')
      const description = await screen.findByLabelText('Description')
      const cancel = screen.getByRole('link', { name: 'Cancel' })
      // jsdom cannot follow the link; the leave guard's click handling still runs.
      cancel.addEventListener('click', event => event.preventDefault())
      fireEvent.click(cancel)
      expect(confirm).not.toHaveBeenCalled()
      fireEvent.change(description, { target: { value: 'Reader seven' } })
      fireEvent.click(cancel)
      expect(confirm).toHaveBeenCalledWith('You have unsaved changes. Leave this page?')
    } finally {
      confirm.mockRestore()
    }
  })

  it('opens the blank Add form for id 0 (DeviceApiController.cs:121)', async () => {
    setup('0')
    expect(await screen.findByRole('heading', { name: 'New device' })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('DeviceApi/0', expect.anything())
  })

  it('shows not found for a non-numeric id', async () => {
    setup('abc')
    expect(await screen.findByText('This device could not be found.')).toBeInTheDocument()
  })

  it('shows not found for a missing device', async () => {
    setup('7', { missing: true })
    expect(await screen.findByText('This device could not be found.')).toBeInTheDocument()
  })
})
