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

const buildings = [
  { id: 11, name: 'Library', siteId: 1 },
  { id: 12, name: 'Science', siteId: 1 },
]

function setup(
  idParam: string,
  { rooms = [1, 2, 3], missing = false }: { rooms?: number[]; missing?: boolean } = {},
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
    expect(screen.getByRole('heading', { name: 'Room details' })).toBeInTheDocument()
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

  it('D-069 asks before leaving a room with unsaved changes', async () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
    try {
      setup('5')
      const name = await screen.findByLabelText('Name')
      const cancel = screen.getByRole('link', { name: 'Cancel' })
      // jsdom cannot follow the link; the leave guard's click handling still runs.
      cancel.addEventListener('click', event => event.preventDefault())
      fireEvent.click(cancel)
      expect(confirm).not.toHaveBeenCalled()
      fireEvent.change(name, { target: { value: 'LIB 0.14' } })
      fireEvent.click(cancel)
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
})
