import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { ProfileProvider } from '@/shared/shell/profile'
import { clearResourceCache } from '@/shared/resources'
import { UsersIndexScreen } from '../UsersIndexScreen'

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

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)
const del = jest.mocked(api.delete)

type Options = {
  actions?: number[]
  personas?: boolean
  users?: number
  total?: number
  fail?: boolean
  malformed?: boolean
}

function user(id: number) {
  return {
    id,
    userName: `user.${id}`,
    emailAddress: `user.${id}@example.com`,
    fullName: `User ${id}`,
    realName: `User ${id}`,
    associatedStudentId: null,
    accessProfiles: 'Admin, Timetabling',
  }
}

function setup({
  actions = [1, 2, 4],
  personas = true,
  users = 3,
  total = users,
  fail = false,
  malformed = false,
}: Options = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([
        { id: 6, actions: actions.map(id => ({ id })) },
        { id: 7, actions: [{ id: 1 }] },
      ])
    if (path === 'UserApi') {
      if (fail) return Promise.reject(new ApiError('http', '/Seats.Trunk.Admin/api/UserApi', 500))
      if (malformed) return Promise.resolve({ unexpected: [] })
      return Promise.resolve({
        items: Array.from({ length: users }, (_, i) => user(i + 1)),
        totalRowCount: total,
        seatsAuthorisationByPersonas: personas,
      })
    }
    return Promise.resolve(null)
  })
  post.mockResolvedValue({ 'en-GB': {} })
  return render(
    <ProfileProvider>
      <UsersIndexScreen />
    </ProfileProvider>,
  )
}

const listCalls = () => get.mock.calls.filter(([path]) => path === 'UserApi')
const lastParams = () => listCalls().at(-1)?.[1]?.query

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('UsersIndexScreen', () => {
  it('loads the first page with the legacy defaults and shows the columns', async () => {
    setup()
    expect(await screen.findByRole('link', { name: 'user.1' })).toBeInTheDocument()
    expect(lastParams()).toEqual({
      currentPageIndex: 0,
      pageSize: 100,
      sortCol: 'userName',
      sortDir: 'asc',
      searchFilter: '',
    })
    const headers = screen.getAllByRole('columnheader').map(th => th.textContent)
    expect(headers).toEqual(['', 'User Name', 'Access Profile(s)', 'E-mail', 'Full Name'])
    expect(screen.getByText('Total 3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'User' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Access Profile' })).toHaveAttribute(
      'href',
      '/users/access-profiles',
    )
    expect(screen.queryByRole('link', { name: 'Contact Group' })).not.toBeInTheDocument()
  })

  it('names every section even when a resource value is empty', async () => {
    setup({ actions: [1, 42] })
    post.mockResolvedValue({ 'en-GB': { Activity: '', User: 'User' } })
    expect(await screen.findByRole('link', { name: 'Activity Log' })).toHaveAttribute(
      'href',
      '/users/activity',
    )
  })

  it('hides the Access Profile(s) column when personas are off', async () => {
    setup({ personas: false })
    await screen.findByRole('link', { name: 'user.1' })
    expect(screen.queryByRole('columnheader', { name: /Access Profile/ })).not.toBeInTheDocument()
  })

  it('searches only on Enter with the cleaned text and leaves the box as typed', async () => {
    setup({ users: 3 })
    await screen.findByRole('link', { name: 'user.1' })
    const box = screen.getByRole('searchbox')
    fireEvent.change(box, { target: { value: '  maya    lee ' } })
    expect(listCalls()).toHaveLength(1)
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(lastParams()).toMatchObject({ searchFilter: 'maya lee', currentPageIndex: 0 }))
    expect(box).toHaveValue('  maya    lee ')
  })

  it('sorts with the typed search text even before Enter', async () => {
    setup({ users: 3 })
    await screen.findByRole('link', { name: 'user.1' })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'maya' } })
    fireEvent.click(screen.getByRole('button', { name: 'E-mail' }))
    await waitFor(() =>
      expect(lastParams()).toMatchObject({
        sortCol: 'emailAddress',
        searchFilter: 'maya',
        currentPageIndex: 0,
      }),
    )
  })

  it('toggles sort on the same column and starts a new column ascending', async () => {
    setup()
    await screen.findByRole('link', { name: 'user.1' })
    fireEvent.click(screen.getByRole('button', { name: 'User Name' }))
    await waitFor(() => expect(lastParams()).toMatchObject({ sortCol: 'userName', sortDir: 'desc' }))
    await screen.findByRole('link', { name: 'user.1' })
    fireEvent.click(screen.getByRole('button', { name: 'E-mail' }))
    await waitFor(() => expect(lastParams()).toMatchObject({ sortCol: 'emailAddress', sortDir: 'asc' }))
  })

  it('deletes the selected users after confirmation and reloads from the first page', async () => {
    setup()
    await screen.findByRole('link', { name: 'user.1' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select user.1' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select user.3' }))
    expect(screen.getByText('2 Selected')).toBeInTheDocument()
    del.mockResolvedValue(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Are you sure you want to delete selected items?')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))
    })
    expect(del).toHaveBeenCalledWith('UserApi?ids=1&ids=3')
    expect(await screen.findByRole('status')).toHaveTextContent('The item was deleted succesfully.')
    await waitFor(() => expect(listCalls().length).toBeGreaterThanOrEqual(2))
    expect(lastParams()).toMatchObject({ currentPageIndex: 0, searchFilter: '' })
  })

  it('shows the server message as a warning when a delete is rejected with 400', async () => {
    setup()
    await screen.findByRole('link', { name: 'user.1' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select user.2' }))
    del.mockRejectedValue(new ApiError('http', '/Seats.Trunk.Admin/api/UserApi', 400, 'User ID: 2 is linked'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await act(async () => {
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' }))
    })
    expect(await screen.findByRole('status')).toHaveTextContent('User ID: 2 is linked')
  })

  it('shows the red delete error when the request gets no response', async () => {
    setup()
    await screen.findByRole('link', { name: 'user.1' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select user.2' }))
    del.mockRejectedValue(new ApiError('network', '/Seats.Trunk.Admin/api/UserApi'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await act(async () => {
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while trying to delete the item.',
    )
  })

  it.each([500, 404])('shows the general error for a %s delete failure', async status => {
    setup()
    await screen.findByRole('link', { name: 'user.1' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select user.2' }))
    del.mockRejectedValue(new ApiError('http', '/Seats.Trunk.Admin/api/UserApi', status, 'Stack trace'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await act(async () => {
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while processing your request.',
    )
  })

  it('does not open the user when the checkbox cell padding is clicked', async () => {
    setup()
    const box = await screen.findByRole('checkbox', { name: 'Select user.1' })
    fireEvent.click(box.closest('td') as HTMLElement)
    expect(push).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('user.1@example.com'))
    expect(push).toHaveBeenCalledWith('/users/1')
  })

  it('keeps row checkboxes but hides Add and Delete without the rights', async () => {
    setup({ actions: [1] })
    await screen.findByRole('link', { name: 'user.1' })
    expect(screen.queryByRole('link', { name: 'Add' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(4)
    expect(screen.getAllByRole('columnheader')).toHaveLength(5)
  })

  it('shows Add linking to the new user screen with the right', async () => {
    setup()
    expect(await screen.findByRole('link', { name: 'Add' })).toHaveAttribute('href', '/users/new')
    expect(screen.getByRole('link', { name: 'user.1' })).toHaveAttribute('href', '/users/1')
  })

  it('shows an error with Refresh instead of an empty list', async () => {
    setup({ fail: true })
    expect(await screen.findByRole('alert')).toHaveTextContent('The server could not complete the request.')
    expect(screen.queryByText('There are no items to show.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Total/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(listCalls()).toHaveLength(2))
  })

  it('shows an error instead of an empty list for a malformed success response', async () => {
    setup({ malformed: true })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while processing your request.',
    )
    expect(screen.queryByText('There are no items to show.')).not.toBeInTheDocument()
  })

  it('shows the empty message when there are no users', async () => {
    setup({ users: 0 })
    expect(await screen.findByText('There are no items to show.')).toBeInTheDocument()
    expect(screen.queryAllByRole('columnheader')).toHaveLength(0)
  })

  it('shows returned users, the header, corrected total and pager when the server total is zero', async () => {
    setup({ users: 10, total: 0 })
    expect(await screen.findByRole('link', { name: 'user.1' })).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).toHaveLength(5)
    expect(screen.getByText('Total 10')).toBeInTheDocument()
    expect(screen.getByLabelText('Number of items per page')).toBeInTheDocument()
  })

  it('blocks the screen without Users access', async () => {
    setup({ actions: [2] })
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission to view users.')
    expect(listCalls()).toHaveLength(0)
  })
})
