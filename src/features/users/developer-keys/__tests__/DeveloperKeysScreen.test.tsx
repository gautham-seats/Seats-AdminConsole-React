import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api } from '@/shared/api'
import { ProfileProvider } from '@/shared/shell/profile'
import { clearResourceCache } from '@/shared/resources'
import { DeveloperKeysScreen } from '../DeveloperKeysScreen'

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

function setup({ dashboard = true, menu = true } = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([
        { id: 6, actions: [{ id: 1 }, ...(dashboard ? [{ id: 112 }] : [])] },
        { id: 43, actions: menu ? [{ id: 53 }] : [] },
      ])
    if (path === 'DeveloperKeyApi')
      return Promise.resolve({
        items: [
          {
            id: 5,
            userId: 9,
            userName: 'maya.lee',
            fullName: 'Maya Lee',
            developerKey: 'hidden',
            expiryDate: '2026-11-02T08:30:00',
          },
          {
            id: 6,
            userId: 0,
            userName: 'User Deleted',
            fullName: 'User Deleted',
            developerKey: 'hidden',
            expiryDate: '2027-01-15T17:00:05',
          },
        ],
        totalRowCount: 2,
      })
    return Promise.resolve(null)
  })
  post.mockResolvedValue({ 'en-GB': {} })
  render(
    <ProfileProvider>
      <DeveloperKeysScreen />
    </ProfileProvider>,
  )
}

const listCalls = () => get.mock.calls.filter(([path]) => path === 'DeveloperKeyApi')
const lastParams = () => listCalls().at(-1)?.[1]?.query

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('DeveloperKeysScreen', () => {
  it('loads the first server page by expiry date and never shows the key value', async () => {
    setup()
    expect(await screen.findByText('02/11/2026 08:30:00')).toBeInTheDocument()
    expect(lastParams()).toEqual({
      currentPageIndex: 1,
      pageSize: 100,
      sortCol: 'expiryDate',
      sortDir: 'asc',
      searchFilter: '',
    })
    expect(screen.getAllByRole('columnheader').map(th => th.textContent)).toEqual([
      '',
      'Expiry Date',
      'User Name',
      'Full Name',
    ])
    expect(screen.queryByText('hidden')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'maya.lee' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Add' })).not.toBeInTheDocument()
  })

  it('sorts and searches on the server', async () => {
    setup()
    await screen.findByText('maya.lee')
    fireEvent.click(screen.getByRole('button', { name: 'User Name' }))
    await waitFor(() => expect(lastParams()).toMatchObject({ sortCol: 'userName', sortDir: 'asc' }))
    await screen.findByText('maya.lee')
    const box = screen.getByRole('searchbox')
    fireEvent.change(box, { target: { value: ' maya ' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(lastParams()).toMatchObject({ searchFilter: 'maya', currentPageIndex: 1 }))
  })

  it('applies the typed but unsubmitted search when sorting, back to the first page', async () => {
    setup()
    await screen.findByText('maya.lee')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  maya   lee ' } })
    fireEvent.click(screen.getByRole('button', { name: 'User Name' }))
    await waitFor(() =>
      expect(lastParams()).toMatchObject({
        sortCol: 'userName',
        searchFilter: 'maya lee',
        currentPageIndex: 1,
      }),
    )
  })

  it('deletes selected keys and reloads the first page', async () => {
    setup()
    await screen.findByText('maya.lee')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select maya.lee' }))
    del.mockResolvedValue(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await act(async () => {
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' }))
    })
    expect(del).toHaveBeenCalledWith('DeveloperKeyApi?ids=5')
    await waitFor(() => expect(listCalls().length).toBeGreaterThanOrEqual(2))
  })

  it.each([[{ dashboard: false, menu: true }], [{ dashboard: true, menu: false }]])(
    'needs both the dashboard and the developer key menu rights (%o)',
    async rights => {
      setup(rights)
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'You do not have permission to view this page within the SEAtS application.',
      )
      expect(listCalls()).toHaveLength(0)
    },
  )
})
