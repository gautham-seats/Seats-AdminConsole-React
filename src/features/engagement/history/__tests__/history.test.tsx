import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { api } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { EngagementHistoryScreen } from '../EngagementHistoryScreen'
import { resetUiCulture, setUiCulture } from '@/shared/i18n/culture'
import {
  EXPORT_TO_CSV,
  parseDisplayDate,
  parseMessageList,
  parseStatsPage,
  periodFilters,
  shortNumber,
  toExportBody,
  toHistoryBody,
  wantsTotal,
} from '../history-query'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)

const STAT = {
  period: '01/09/2026 - 07/09/2026',
  calculated: '2026-09-15T06:00:12',
  training: false,
  model: 'Attendance Risk',
  node: 'VLE Logins',
  status: 'Error',
  instances: 4812,
  min: 0.123456789,
  max: 1,
  mean: 0.71,
  sd: 0.18,
  errors: { messages: '["<b>Timeout</b> on node","Retry failed"]', count: 2 },
  warnings: { messages: null, count: 0 },
  messages: { messages: null, count: 0 },
}

const bodies = (path: string) =>
  post.mock.calls.filter(([p]) => p === path).map(([, options]) => options?.body)

function setup() {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims') return Promise.resolve([{ id: 50, actions: [{ id: 1 }] }])
    if (path === 'EngagementApi/GetCurrentCalculationPeriod')
      return Promise.resolve({ periodStart: '2026-09-08T00:00:00', periodEnd: '2026-09-14T00:00:00' })
    if (path === 'engagementApi/GetAllEngagement')
      return Promise.resolve({ items: [{ id: 1, modelName: 'Attendance Risk', isActive: true }] })
    if (path === 'engagementApi/GetNodes') return Promise.resolve([{ id: 9, description: 'VLE Logins' }])
    return Promise.resolve(null)
  })
  post.mockImplementation((path: string) => {
    if (path === 'ResourceApi/GetResourcesForScreen') return Promise.resolve({ 'en-GB': {} })
    if (path === 'engagementApi/getEngagementStats')
      return Promise.resolve({ items: [STAT], totalRowCount: 1 })
    if (path === 'engagementApi/getEngagementStudentScore')
      return Promise.resolve({
        items: [{ ...STAT, studentId: 142, r: 0.82, z: 1.14, dr: 0, dz: 0, zdz: 0, p: 0.74 }],
        totalRowCount: 1,
      })
    return Promise.resolve(undefined)
  })
}

const renderScreen = () =>
  render(
    <ProfileProvider>
      <EngagementHistoryScreen />
    </ProfileProvider>,
  )

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => undefined
  Element.prototype.scrollIntoView = () => undefined
})

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('history query', () => {
  const filters = periodFilters(
    { periodStart: '2026-09-08T00:00:00', periodEnd: '2026-09-14T00:00:00' },
    new Date(),
  )

  it('builds the legacy Stats and Student Score bodies', () => {
    expect(toHistoryBody({ view: 'Stats', filters, pageIndex: 0, pageSize: 100 })).toEqual({
      returnTotalCount: true,
      pageNumber: 0,
      pageSize: 100,
      sortField: 'periodnumber',
      sortOrder: 'desc',
      isTrainingPeriod: '',
      startDatePeriod: '2026-09-08T00:00:00',
      endDatePeriod: '2026-09-14T00:00:00',
      modelIds: [],
      nodeIds: [],
      status: [],
      containing: '',
    })
    const score = toHistoryBody({ view: 'StudentScore', filters, pageIndex: 2, pageSize: 50 })
    expect(score).toMatchObject({ returnTotalCount: false, pageNumber: 2, studentIds: [''] })
    expect(score).not.toHaveProperty('containing')
    expect(toExportBody({ view: 'Stats', filters, pageIndex: 3, pageSize: 50 }, EXPORT_TO_CSV)).toMatchObject(
      {
        returnTotalCount: true,
        exportTo: EXPORT_TO_CSV,
        userId: '',
      },
    )
  })

  it('keeps messages as text and cuts long numbers like legacy', () => {
    expect(parseMessageList('["<b>x</b>"]')).toEqual(['<b>x</b>'])
    expect(parseMessageList('not json')).toEqual([])
    expect(shortNumber(0.123456789)).toBe('0.1234...')
    expect(shortNumber(1)).toBe('1')
  })

  it('does not hide returned rows behind an incorrect zero total', () => {
    expect(parseStatsPage({ items: [STAT], totalRowCount: 0 }).totalRowCount).toBe(1)
  })

  it('F6-2 asks for the count on page 0 and whenever none is known, like legacy (B7)', () => {
    expect(wantsTotal(0, 250)).toBe(true)
    expect(wantsTotal(2, null)).toBe(true)
    expect(wantsTotal(2, 0)).toBe(true)
    expect(wantsTotal(2, 250)).toBe(false)
    const query = { view: 'Stats' as const, filters, pageIndex: 2, pageSize: 100 }
    expect(toHistoryBody(query).returnTotalCount).toBe(false)
    expect(toHistoryBody(query, true).returnTotalCount).toBe(true)
  })

  it('F6-4 reads the shown dates in the UI culture', () => {
    expect(parseDisplayDate('15/09/2026')).toEqual(new Date(2026, 8, 15))
    setUiCulture('en-US')
    try {
      expect(parseDisplayDate('09/15/2026')).toEqual(new Date(2026, 8, 15))
    } finally {
      resetUiCulture()
    }
  })
})

describe('EngagementHistoryScreen', () => {
  it('F6-2 keeps the known count while paging and asks again once a new search starts (B7)', async () => {
    setup()
    const rows = Array.from({ length: 100 }, (_, index) => ({ ...STAT, node: `Node ${index}` }))
    post.mockImplementation((path: string, options?: { body?: unknown }) => {
      if (path === 'ResourceApi/GetResourcesForScreen') return Promise.resolve({ 'en-GB': {} })
      if (path === 'engagementApi/getEngagementStats') {
        // The server only counts when asked; otherwise the total comes back as 0 (seats-admin-engagement-history.html:801).
        const asked = (options?.body as { returnTotalCount?: boolean } | undefined)?.returnTotalCount
        return Promise.resolve({ items: rows, totalRowCount: asked ? 250 : 0 })
      }
      return Promise.resolve(undefined)
    })
    renderScreen()
    expect(await screen.findByText('Node 0')).toBeInTheDocument()
    expect(bodies('engagementApi/getEngagementStats')[0]).toMatchObject({ returnTotalCount: true })
    expect(screen.getByText('Total 250')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    })
    expect(bodies('engagementApi/getEngagementStats')[1]).toMatchObject({
      pageNumber: 1,
      returnTotalCount: false,
    })
    expect(screen.getByText('Total 250')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    })
    expect(bodies('engagementApi/getEngagementStats')[2]).toMatchObject({
      pageNumber: 0,
      returnTotalCount: true,
    })
  })

  it('searches the current calculation period on open and shows messages as plain text', async () => {
    setup()
    renderScreen()
    expect(await screen.findByText('Attendance Risk', { selector: 'span' })).toBeInTheDocument()
    expect(bodies('engagementApi/getEngagementStats')[0]).toMatchObject({
      startDatePeriod: '2026-09-08T00:00:00',
      endDatePeriod: '2026-09-14T00:00:00',
    })
    fireEvent.click(screen.getByRole('button', { name: '2 Errors' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('<b>Timeout</b> on node')).toBeInTheDocument()
  })

  it('switches to Student Score with its own columns and body', async () => {
    setup()
    renderScreen()
    await screen.findByText('Attendance Risk', { selector: 'span' })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Student Score/ }))
    })
    await waitFor(() => expect(bodies('engagementApi/getEngagementStudentScore')).toHaveLength(1))
    expect(await screen.findByRole('columnheader', { name: 'Student Id' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Errors' })).not.toBeInTheDocument()
  })

  // The menu itself is covered in HistoryExportMenu.test.tsx; opening it inside a full render was flaky.
  it('puts the Export menu in the page header once results load', async () => {
    setup()
    renderScreen()
    await screen.findByText('Attendance Risk', { selector: 'span' })
    expect(screen.getByText('Export').closest('button')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Export to CSV' })).not.toBeInTheDocument()
  })

  // D-097, following D-112: no Search button; a picked filter reloads the grid at once.
  it('has no Search button and reloads as soon as a filter is picked', async () => {
    setup()
    renderScreen()
    await screen.findByText('Attendance Risk', { selector: 'span' })
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument()
    const before = bodies('engagementApi/getEngagementStats').length

    const containing = screen.getByLabelText('Containing')
    fireEvent.change(containing, { target: { value: 'Timeout' } })
    expect(bodies('engagementApi/getEngagementStats')).toHaveLength(before)
    await act(async () => {
      fireEvent.blur(containing)
    })

    await waitFor(() =>
      expect(bodies('engagementApi/getEngagementStats').at(-1)).toMatchObject({ containing: 'Timeout' }),
    )
  })
})
