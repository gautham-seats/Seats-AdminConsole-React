import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { ProfileProvider } from '@/shared/shell/profile'
import { clearResourceCache } from '@/shared/resources'
import { AccessProfilesScreen } from '../AccessProfilesScreen'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)
const del = jest.mocked(api.delete)

type Options = { actions?: number[]; fail?: boolean; profiles?: unknown }

const PROFILES = [
  { id: 1, description: 'Timetabling', isEnabled: true },
  { id: 2, description: 'Administrator', isEnabled: true },
  { id: 3, description: 'Restricted Team', isEnabled: false },
]

function setup({ actions = [1, 2, 4], fail = false, profiles = PROFILES }: Options = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([
        { id: 6, actions: [{ id: 1 }] },
        { id: 7, actions: actions.map(id => ({ id })) },
      ])
    if (path === 'AccessProfileApi') {
      if (fail) return Promise.reject(new ApiError('http', '/Seats.Trunk.Admin/api/AccessProfileApi', 500))
      return Promise.resolve(profiles)
    }
    return Promise.resolve(null)
  })
  post.mockResolvedValue({ 'en-GB': {} })
  return render(
    <ProfileProvider>
      <AccessProfilesScreen />
    </ProfileProvider>,
  )
}

const timerOf = (toast: HTMLElement) =>
  toast.querySelector<HTMLElement>('[style*="animation-duration"]')?.style.animationDuration

const listCalls = () => get.mock.calls.filter(([path]) => path === 'AccessProfileApi')
const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map(row => row.textContent)

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('AccessProfilesScreen', () => {
  it('loads every profile once and sorts by name ascending', async () => {
    setup()
    expect(await screen.findByRole('link', { name: 'Administrator' })).toHaveAttribute(
      'href',
      '/users/access-profiles/2',
    )
    expect(listCalls()).toHaveLength(1)
    expect(names()).toEqual(['Administrator', 'Restricted Team', 'Timetabling'])
    expect(screen.getByText('Total 3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Access Profile' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'Name' }))
    expect(names()).toEqual(['Timetabling', 'Restricted Team', 'Administrator'])
  })

  it('filters in the browser on Enter without calling the API again', async () => {
    setup()
    await screen.findByRole('link', { name: 'Administrator' })
    const box = screen.getByRole('searchbox')
    fireEvent.change(box, { target: { value: 'TIME' } })
    expect(names()).toHaveLength(3)
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(names()).toEqual(['Timetabling'])
    expect(screen.getByText('Total 1')).toBeInTheDocument()
    expect(listCalls()).toHaveLength(1)
  })

  it('matches the typed text without trimming it', async () => {
    setup()
    await screen.findByRole('link', { name: 'Administrator' })
    const box = screen.getByRole('searchbox')
    fireEvent.change(box, { target: { value: ' time' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(screen.getByText('Total 0')).toBeInTheDocument()
    expect(box).toHaveValue(' time')
  })

  it('filters when the search box loses focus after an edit', async () => {
    setup()
    await screen.findByRole('link', { name: 'Administrator' })
    const box = screen.getByRole('searchbox')
    fireEvent.change(box, { target: { value: 'admin' } })
    fireEvent.focusOut(box)
    expect(names()).toEqual(['Administrator'])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Administrator' }))
    fireEvent.focus(box)
    fireEvent.focusOut(box)
    expect(screen.getByRole('checkbox', { name: 'Select Administrator' })).toBeChecked()
    expect(listCalls()).toHaveLength(1)
  })

  it('blocks opening a restricted profile with the legacy message', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Restricted Team' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You do not have permission to access this profile.',
    )
  })

  it('shows the in-use message from the server when a delete is refused', async () => {
    setup()
    await screen.findByRole('link', { name: 'Administrator' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Administrator' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Timetabling' }))
    del.mockRejectedValue(
      new ApiError(
        'http',
        '/Seats.Trunk.Admin/api/AccessProfileApi',
        400,
        'The access profile is currently in use.',
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await act(async () => {
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' }))
    })
    expect(del).toHaveBeenCalledWith('AccessProfileApi?ids=2&ids=1')
    const warning = await screen.findByRole('status')
    expect(warning).toHaveTextContent('The access profile is currently in use.')
    expect(timerOf(warning)).toBe('5000ms')
  })

  it('shows the generic delete error for 5 s when the delete fails for another reason', async () => {
    setup()
    await screen.findByRole('link', { name: 'Administrator' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Administrator' }))
    del.mockRejectedValue(new ApiError('http', '/Seats.Trunk.Admin/api/AccessProfileApi', 500, 'Boom'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await act(async () => {
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' }))
    })
    const alert = await screen.findByRole('alert')
    expect(alert).not.toHaveTextContent('Boom')
    expect(timerOf(alert)).toBe('5000ms')
  })

  it('reloads and clears the search after a successful delete', async () => {
    setup()
    await screen.findByRole('link', { name: 'Administrator' })
    const box = screen.getByRole('searchbox')
    fireEvent.change(box, { target: { value: 'admin' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Administrator' }))
    del.mockResolvedValue(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await act(async () => {
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' }))
    })
    const success = await screen.findByRole('status')
    expect(success).toHaveTextContent('The item was deleted succesfully.')
    expect(timerOf(success)).toBe('2500ms')
    await waitFor(() => expect(listCalls()).toHaveLength(2))
    expect(box).toHaveValue('')
  })

  it('shows Add with the Add right and keeps row checkboxes but no Delete without the Delete right', async () => {
    setup({ actions: [1, 2] })
    expect(await screen.findByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/users/access-profiles/new',
    )
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Administrator' }))
    expect(screen.getByRole('checkbox', { name: 'Select Administrator' })).toBeChecked()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('shows the empty message for a null response and an error with Refresh on failure', async () => {
    const view = setup({ profiles: null })
    expect(await screen.findByText('There are no items to show.')).toBeInTheDocument()
    view.unmount()
    setup({ fail: true })
    expect(await screen.findByRole('alert')).toHaveTextContent('The server could not complete the request.')
    expect(screen.queryByText(/Total/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(listCalls().length).toBeGreaterThanOrEqual(3))
  })

  it('blocks the screen without Access Profile access', async () => {
    setup({ actions: [2] })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You do not have permission to view this page within the SEAtS application.',
    )
    expect(listCalls()).toHaveLength(0)
  })
})
