import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { ActivityScreen } from '../ActivityScreen'

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

const ROWS = [
  {
    id: 1,
    userName: 'maya.lee',
    userFullName: 'Maya Lee',
    userId: 9,
    accessDate: '15/09/2026 09:12',
    auditType: 'Page',
    detail: {
      auditType: 'Page',
      detail: JSON.stringify({ path: '#/user', url: 'https://admin.test/#/user' }),
    },
  },
  {
    id: 2,
    userName: 'System',
    userFullName: 'System',
    userId: 0,
    accessDate: '15/09/2026 08:01',
    auditType: 'Login',
    detail: { auditType: 'Login', detail: JSON.stringify({ site: 'admin' }) },
  },
]

type AuditResponse = { items: unknown[]; totalRowCount: number } | Error

function setup({ activity = true, audit = (): AuditResponse => ({ items: ROWS, totalRowCount: 2 }) } = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 6, actions: [{ id: 1 }, ...(activity ? [{ id: 42 }] : [])] }])
    if (path === 'Audit/GetUser') return Promise.resolve([{ id: 42, description: 'maya.lee' }])
    return Promise.resolve(null)
  })
  post.mockImplementation((path: string) => {
    if (path === 'audit/GetAudit') {
      const result = audit()
      return result instanceof Error ? Promise.reject(result) : Promise.resolve(result)
    }
    if (path === 'audit/Export') return Promise.resolve(undefined)
    return Promise.resolve({ 'en-GB': {} })
  })
  render(
    <ProfileProvider>
      <ActivityScreen />
    </ProfileProvider>,
  )
}

const auditBodies = () =>
  post.mock.calls.filter(([path]) => path === 'audit/GetAudit').map(([, options]) => options?.body)

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn()
  Element.prototype.hasPointerCapture = jest.fn(() => false)
  Element.prototype.releasePointerCapture = jest.fn()
})

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 8, 15, 12, 0), doNotFake: ['queueMicrotask', 'nextTick'] })
  jest.clearAllMocks()
  clearResourceCache()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('ActivityScreen', () => {
  it('loads today with the legacy body and shows the grid', async () => {
    setup()
    expect(await screen.findByText('SEAtS Pageview')).toBeInTheDocument()
    expect(auditBodies()[0]).toEqual({
      pageNumber: 0,
      pageSize: 100,
      sortCol: 'accessDate',
      sortDir: 'desc',
      type: '',
      user: '',
      site: '',
      from: '2026-09-15',
      to: '2026-09-15',
    })
    const link = screen.getByRole('link', { name: '/User' })
    expect(link).toHaveAttribute('href', 'https://admin.test/#/user')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText('SEAts Logon')).toBeInTheDocument()
    expect(screen.getByText('Administration Site')).toBeInTheDocument()
    expect(screen.getByText('Total 2')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /page/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map(th => th.textContent)).toEqual([
      'Item',
      '',
      'Detail',
      'Date',
      'User Name',
      'User Full Name',
    ])
  })

  it('sorts by auditType from the icon header', async () => {
    setup()
    await screen.findByText('SEAtS Pageview')
    // The icon column has no visible label, so its sort button carries the name (axe button-name).
    fireEvent.click(within(screen.getAllByRole('columnheader')[1]).getByRole('button', { name: 'Type' }))
    await waitFor(() => expect(auditBodies().at(-1)).toMatchObject({ sortCol: 'auditType', sortDir: 'asc' }))
  })

  it('filters by type from the first page', async () => {
    setup()
    await screen.findByText('SEAtS Pageview')
    fireEvent.click(screen.getByRole('columnheader', { name: /Date/ }).querySelector('button') as HTMLElement)
    await waitFor(() => expect(auditBodies().at(-1)).toMatchObject({ sortCol: 'accessDate', sortDir: 'asc' }))
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Type' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('option', { name: 'Page' }))
    await waitFor(() => expect(auditBodies().at(-1)).toMatchObject({ type: 'Page', pageNumber: 0 }))
  })

  it('picks a user from the lookup and cleans every filter', async () => {
    setup()
    await screen.findByText('SEAtS Pageview')
    const user = screen.getByRole('combobox', { name: 'User' })
    fireEvent.focus(user)
    await act(async () => {
      jest.advanceTimersByTime(300)
    })
    expect(get).toHaveBeenCalledWith('Audit/GetUser', expect.objectContaining({ query: { query: '' } }))
    fireEvent.click(await screen.findByRole('option', { name: 'maya.lee' }))
    await waitFor(() => expect(auditBodies().at(-1)).toMatchObject({ user: 42 }))
    fireEvent.click(screen.getByRole('button', { name: 'Clean' }))
    await waitFor(() => expect(auditBodies().at(-1)).toMatchObject({ user: '', type: '', site: '' }))
    expect(user).toHaveValue('')
  })

  it('keeps Clean enabled and resets the sort to date descending from the first page', async () => {
    setup()
    await screen.findByText('SEAtS Pageview')
    const clean = screen.getByRole('button', { name: 'Clean' })
    expect(clean).toBeEnabled()
    fireEvent.click(screen.getAllByRole('columnheader')[0].querySelector('button') as HTMLElement)
    await waitFor(() => expect(auditBodies().at(-1)).toMatchObject({ sortCol: 'auditType', sortDir: 'asc' }))
    const before = auditBodies().length
    fireEvent.click(clean)
    await waitFor(() =>
      expect(auditBodies().at(-1)).toMatchObject({ sortCol: 'accessDate', sortDir: 'desc', pageNumber: 0 }),
    )
    fireEvent.click(clean)
    await waitFor(() => expect(auditBodies().length).toBe(before + 2))
  })

  it('keeps every server user result without client filtering', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return Promise.resolve([{ id: 6, actions: [{ id: 1 }, { id: 42 }] }])
      if (path === 'Audit/GetUser')
        return Promise.resolve([
          { id: 2, description: 'zed.young' },
          { id: 1, description: 'amy.adams' },
        ])
      return Promise.resolve(null)
    })
    post.mockImplementation((path: string) =>
      Promise.resolve(path === 'audit/GetAudit' ? { items: ROWS, totalRowCount: 2 } : { 'en-GB': {} }),
    )
    render(
      <ProfileProvider>
        <ActivityScreen />
      </ProfileProvider>,
    )
    await screen.findByText('SEAtS Pageview')
    const user = screen.getByRole('combobox', { name: 'User' })
    fireEvent.focus(user)
    fireEvent.change(user, { target: { value: 'a' } })
    await act(async () => {
      jest.advanceTimersByTime(300)
    })
    const options = await screen.findAllByRole('option')
    expect(options.map(option => option.textContent).sort()).toEqual(['amy.adams', 'zed.young'])
  })

  it('shows a 3 s general error toast when the user search fails', async () => {
    setup()
    await screen.findByText('SEAtS Pageview')
    get.mockImplementation((path: string) =>
      path === 'Audit/GetUser'
        ? Promise.reject(new ApiError('http', '/Seats.Trunk.Admin/api/Audit/GetUser', 500))
        : Promise.resolve([{ id: 6, actions: [{ id: 1 }, { id: 42 }] }]),
    )
    const timeouts = jest.spyOn(global, 'setTimeout')
    fireEvent.focus(screen.getByRole('combobox', { name: 'User' }))
    await act(async () => {
      jest.advanceTimersByTime(300)
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while processing your request.',
    )
    expect(timeouts).toHaveBeenCalledWith(expect.any(Function), 3000)
    timeouts.mockRestore()
  })

  it('changes the date range with Select Range', async () => {
    setup()
    await screen.findByText('SEAtS Pageview')
    fireEvent.click(screen.getByRole('button', { name: 'Start Date' }))
    const dialog = await screen.findByRole('dialog', { name: 'Date Range' })
    // Legacy hides the presets (seats-admin-audit.html:177); React keeps the shared rail (D-050),
    // and D-129 gives this screen the same date picker as the rest of the console.
    // Both the rail and the narrow-screen chip row render them; jsdom has no media queries.
    expect(within(dialog).getAllByRole('button', { name: /Last 7 Days/ }).length).toBeGreaterThan(0)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Select Range' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Date Range' })).not.toBeInTheDocument())
    expect(auditBodies().at(-1)).toMatchObject({ from: '2026-09-15', to: '2026-09-15' })
    expect(screen.queryByRole('button', { name: /Yesterday/ })).not.toBeInTheDocument()
  })

  it('exports as CSV and shows the report notice', async () => {
    setup()
    await screen.findByText('SEAtS Pageview')
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Csv' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(post).toHaveBeenCalledWith('audit/Export', {
      body: expect.objectContaining({ exportTo: 1, sortCol: 'accessDate', from: '2026-09-15' }),
    })
    const toast = await screen.findByRole('status')
    expect(toast).toHaveTextContent('The report is being generated')
    // Gray swAlert maps to the info toast, not success.
    expect(toast.querySelector('.from-slate-300')).not.toBeNull()
    await act(async () => {
      jest.advanceTimersByTime(3000)
    })
    await waitFor(() => expect(screen.queryByText(/The report is being generated/)).not.toBeInTheDocument())
  })

  it('explains safe mode when the export is blocked', async () => {
    setup()
    await screen.findByText('SEAtS Pageview')
    post.mockImplementation((path: string) =>
      path === 'audit/Export'
        ? Promise.reject(new ApiError('blocked', '/Seats.Trunk.Admin/api/audit/Export'))
        : Promise.resolve({ items: ROWS, totalRowCount: 2 }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    const timeouts = jest.spyOn(global, 'setTimeout')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('safe mode')
    expect(timeouts).toHaveBeenCalledWith(expect.any(Function), 3000)
    timeouts.mockRestore()
  })

  it('disables Export with no rows and shows the empty message', async () => {
    setup({ audit: () => ({ items: [], totalRowCount: 0 }) })
    expect(await screen.findByText('There are no items to show.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
  })

  it('shows returned activity rows, corrected total and pager when the server total is zero', async () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({ ...ROWS[0], id: index + 1 }))
    setup({ audit: () => ({ items: rows, totalRowCount: 0 }) })
    expect(await screen.findByText('Total 101')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).not.toHaveLength(0)
    expect(screen.getByLabelText('Number of items per page')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export' })).toBeEnabled()
  })

  it('shows an error with Refresh instead of an empty grid', async () => {
    setup({ audit: () => new ApiError('http', '/Seats.Trunk.Admin/api/audit/GetAudit', 500) })
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(auditBodies()).toHaveLength(2))
  })

  it('blocks the page without Users + Activity', async () => {
    setup({ activity: false })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You do not have permission to view this page within the SEAtS application.',
    )
    expect(auditBodies()).toHaveLength(0)
  })
})
