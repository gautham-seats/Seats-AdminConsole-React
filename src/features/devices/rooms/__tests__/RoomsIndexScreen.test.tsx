import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { RoomsIndexScreen } from '../RoomsIndexScreen'

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
const del = jest.mocked(api.delete)

const room = (id: number) => ({
  id,
  externalCode: `R${id}`,
  name: `Room ${id}`,
  capacity: id * 10,
  buildingName: 'Library',
})

function setup({
  rooms = [1, 2, 4],
  fail = false,
  total = 2,
  returnedRooms = 2,
  malformed = false,
}: { rooms?: number[]; fail?: boolean; total?: number; returnedRooms?: number; malformed?: boolean } = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims') return Promise.resolve([{ id: 8, actions: rooms.map(id => ({ id })) }])
    if (path === 'RoomApi/GetRooms') {
      if (fail) return Promise.reject(new ApiError('http', '/api/RoomApi/GetRooms', 500))
      if (malformed) return Promise.resolve({ unexpected: [] })
      return Promise.resolve({
        items: Array.from({ length: returnedRooms }, (_, index) => room(index + 1)),
        totalRowCount: total,
      })
    }
    return Promise.resolve(null)
  })
  post.mockImplementation((path: string) =>
    Promise.resolve(path === 'ResourceApi/GetResourcesForScreen' ? { 'en-GB': {} } : undefined),
  )
  return render(
    <ProfileProvider>
      <RoomsIndexScreen />
    </ProfileProvider>,
  )
}

const listCalls = () => get.mock.calls.filter(([path]) => path === 'RoomApi/GetRooms')

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('RoomsIndexScreen', () => {
  it('loads with the legacy defaults, sorts and searches', async () => {
    setup()
    expect(await screen.findByRole('link', { name: 'R1' })).toHaveAttribute('href', '/resources/rooms/1')
    expect(listCalls()[0][1]?.query).toEqual({
      currentPageIndex: 0,
      pageSize: 100,
      sortCol: 'externalCode',
      sortDir: 'desc',
      searchFilter: '',
    })
    expect(screen.getAllByRole('columnheader').map(th => th.textContent)).toEqual([
      '',
      'Code',
      'Name',
      'Capacity',
      'Building',
    ])
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute('href', '/resources/rooms/new')
    fireEvent.click(screen.getByText('Room 2'))
    expect(push).toHaveBeenCalledWith('/resources/rooms/2')

    fireEvent.click(screen.getByRole('button', { name: 'Name' }))
    await waitFor(() =>
      expect(listCalls().at(-1)?.[1]?.query).toMatchObject({ sortCol: 'name', sortDir: 'asc' }),
    )

    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: '  lib   0 ' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Search...'), { key: 'Enter' })
    await waitFor(() =>
      expect(listCalls().at(-1)?.[1]?.query).toMatchObject({ searchFilter: 'lib 0', currentPageIndex: 0 }),
    )
  })

  it('G2-03 carries the typed, unsubmitted search into a sort reload (swgrid.js:650-653)', async () => {
    setup()
    await screen.findByRole('link', { name: 'R1' })
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: ' lib ' } })
    const before = listCalls().length
    fireEvent.click(screen.getByRole('button', { name: 'Capacity' }))
    await waitFor(() => expect(listCalls()).toHaveLength(before + 1))
    expect(listCalls().at(-1)?.[1]?.query).toMatchObject({
      sortCol: 'capacity',
      searchFilter: 'lib',
      currentPageIndex: 0,
    })
    expect(screen.getByPlaceholderText('Search...')).toHaveValue('lib')
  })

  it('deletes the selected rooms with repeated ids', async () => {
    del.mockResolvedValue(undefined)
    setup()
    await screen.findByRole('link', { name: 'R1' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Room 1' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Room 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(del).toHaveBeenCalledWith('RoomApi?ids=1&ids=2'))
    expect(await screen.findByText('The item was deleted succesfully.')).toBeInTheDocument()
  })

  it('P8 RoomsIndex shows not-authorised on 401', async () => {
    setup()
    await screen.findByRole('link', { name: 'R1' })
    // The selection survives a failed delete, so it is made once.
    const tryDelete = async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
      const confirm = await screen.findByRole('button', { name: 'Confirm' })
      await act(async () => fireEvent.click(confirm))
    }
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Room 1' }))
    del.mockRejectedValueOnce(new ApiError('auth', '/api/RoomApi', 403))
    await tryDelete()
    await waitFor(() => expect(del).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('You do not have permission to view this.')).not.toBeInTheDocument()

    del.mockRejectedValueOnce(new ApiError('auth', '/api/RoomApi', 401))
    await tryDelete()
    expect(await screen.findByText('You do not have permission to view this.')).toBeInTheDocument()
  })

  it('hides Add and selection without Add and Delete', async () => {
    setup({ rooms: [1] })
    await screen.findByRole('link', { name: 'R1' })
    expect(screen.queryByRole('link', { name: 'Add' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('blocks users without Rooms Access and shows errors instead of an empty grid', async () => {
    const view = setup({ rooms: [] })
    expect(await screen.findByText('You do not have permission to view rooms.')).toBeInTheDocument()
    expect(listCalls()).toHaveLength(0)
    view.unmount()
    clearResourceCache()

    setup({ fail: true })
    expect(await screen.findByText('The server could not complete the request.')).toBeInTheDocument()
    expect(screen.queryByText('There are no items to show.')).not.toBeInTheDocument()
  })

  it('shows an error instead of an empty grid for a malformed success response', async () => {
    setup({ malformed: true })
    expect(await screen.findByText('There was an error while processing your request.')).toBeInTheDocument()
    expect(screen.queryByText('There are no items to show.')).not.toBeInTheDocument()
  })

  it('shows returned rooms, the header, corrected total and pager when the server total is zero', async () => {
    setup({ returnedRooms: 10, total: 0 })
    expect(await screen.findByRole('link', { name: 'R1' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).not.toHaveLength(0)
    expect(screen.getByText('Total 10')).toBeInTheDocument()
    expect(screen.getByLabelText('Number of items per page')).toBeInTheDocument()
  })
})
