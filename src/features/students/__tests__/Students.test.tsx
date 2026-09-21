import { act, fireEvent, render, screen } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api } from '@/shared/api'
import { resetUiCulture, setUiCulture } from '@/shared/i18n/culture'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { cleanSearch, daysUntil, serverListQuery, toCultureDate } from '../shared/student-list'
import {
  ManualStudentDeletionScreen,
  StudentDeletionScreen,
  StudentRecycleBinScreen,
} from '../StudentScreens'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/students',
}))
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

function withClaims(actions: number[], rows: unknown, total = 2) {
  get.mockImplementation((path: string) =>
    path === 'UserApi/GetClaims'
      ? Promise.resolve([{ id: 51, actions: actions.map(id => ({ id })) }])
      : Promise.resolve(path.startsWith('StudentDeleteApi/') ? { items: rows, totalRowCount: total } : null),
  )
}

const renderScreen = (node: React.ReactNode) => render(<ProfileProvider>{node}</ProfileProvider>)

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  post.mockResolvedValue({ 'en-GB': {} })
})

describe('student list helpers', () => {
  it('builds the swgrid query and dates as the legacy grid did', () => {
    expect(cleanSearch('  Ann   Lee ')).toBe('Ann Lee')
    expect(
      serverListQuery(
        { pageIndex: 1, pageSize: 100, sort: { column: 'student', direction: 'desc' }, search: ' x ' },
        { from: '01/02/2026' },
      ),
    ).toEqual({
      currentPageIndex: '1',
      pageSize: '100',
      sortCol: 'student',
      sortDir: 'desc',
      searchFilter: 'x',
      from: '01/02/2026',
    })
    expect(toCultureDate(new Date(2026, 8, 5))).toBe('05/09/2026')
    expect(daysUntil('2026-09-20T00:00:00', new Date(2026, 8, 15))).toBe(5)
  })

  // StudentDeleteApiController.cs:339,345 parses with CultureInfo.CurrentUICulture, so a fixed
  // dd/MM/yyyy would query the wrong window for any user whose culture is not day-first.
  it('writes the range in the user culture, not a fixed pattern', () => {
    resetUiCulture()
    expect(toCultureDate(new Date(2026, 8, 5))).toBe('05/09/2026')
    setUiCulture('en-US')
    expect(toCultureDate(new Date(2026, 8, 5))).toBe('09/05/2026')
    resetUiCulture()
  })
})

describe('StudentDeletionScreen', () => {
  it('loads three days either side of today and confirms deletion in bulk', async () => {
    withClaims(
      [1, 73],
      [
        {
          id: 'a-1',
          student: 'Test Student - 001',
          confirmationDate: null,
          confirmed: false,
          autoDeleteDate: null,
        },
      ],
    )
    renderScreen(<StudentDeletionScreen />)
    expect(await screen.findByText('Test Student - 001')).toBeInTheDocument()
    const call = get.mock.calls.find(([path]) => path === 'StudentDeleteApi/GetStudentsConfirm')
    expect(call?.[1]?.query).toMatchObject({
      currentPageIndex: '0',
      pageSize: '100',
      sortCol: 'student',
      sortDir: 'desc',
    })
    expect(call?.[1]?.query).toHaveProperty('from')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Test Student - 001' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    })
    expect(post).toHaveBeenCalledWith('StudentDeleteApi/GetStudentsConfirmBulkDelete', { body: ['a-1'] })
  })

  // The bulk endpoints answer 200 for an empty array, so losing the selection would report a false success.
  it('deletes the rows chosen when the dialog opened, even if the selection changes behind it', async () => {
    withClaims(
      [1, 73],
      [
        {
          id: 'a-1',
          student: 'Test Student - 001',
          confirmationDate: null,
          confirmed: false,
          autoDeleteDate: null,
        },
      ],
    )
    renderScreen(<StudentDeletionScreen />)
    expect(await screen.findByText('Test Student - 001')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Test Student - 001' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await screen.findByRole('button', { name: 'Confirm' })

    // The open dialog hides the grid from the accessibility tree, so reach the row the way a reload would.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Test Student - 001', hidden: true }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    })

    expect(post).toHaveBeenCalledWith('StudentDeleteApi/GetStudentsConfirmBulkDelete', { body: ['a-1'] })
    expect(
      post.mock.calls.filter(([path]) => path === 'StudentDeleteApi/GetStudentsConfirmBulkDelete'),
    ).toHaveLength(1)
  })
})

describe('ManualStudentDeletionScreen', () => {
  it('keeps returned rows visible when the server reports a zero total', async () => {
    withClaims(
      [1],
      [{ id: 'b-0', fullName: 'Visible Student', number: '40', email: 'visible@example.com' }],
      0,
    )
    renderScreen(<ManualStudentDeletionScreen />)
    expect(await screen.findByText('Visible Student')).toBeInTheDocument()
    expect(screen.getByText('Total 1')).toBeInTheDocument()
  })

  it('keeps selection but hides the action without the Delete permission', async () => {
    withClaims([1], [{ id: 'b-1', fullName: 'Test Person', number: '42', email: 'test@example.com' }])
    renderScreen(<ManualStudentDeletionScreen />)
    expect(await screen.findByText('Test Person')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select Test Person' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
})

describe('StudentRecycleBinScreen', () => {
  it('restores the selected students', async () => {
    withClaims(
      [1, 72],
      [{ id: 'c-1', student: 'Bin Student - 7', movedToRecycleBin: null, deleteDate: null }],
    )
    renderScreen(<StudentRecycleBinScreen />)
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Bin Student - 7' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    })
    expect(post).toHaveBeenCalledWith('StudentDeleteApi/GetStudentsInRecycleBinBulkRestore', {
      body: ['c-1'],
    })
  })
})
