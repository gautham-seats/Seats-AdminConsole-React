import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes, ReactElement } from 'react'
import { api, ApiError } from '@/shared/api'
import { resetUiCulture, setUiCulture } from '@/shared/i18n/culture'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import {
  formatDateTime,
  initialReadingsQuery,
  readingsExportBody,
  TIME_OPTIONS,
  toReadingsParams,
} from '../readings-query'
import { ReadingsReportScreen } from '../ReadingsReportScreen'
import { DateRangeField, TimeRangeError, timeRangeInverted } from '../DateRangeField'
import { DEVICES_TEXT, type DevicesTextKey } from '../../index/devices-text'
import { SuspiciousReadingsReportScreen } from '../SuspiciousReadingsReportScreen'

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

const TODAY = new Date(2026, 8, 15)

function setup(
  screenNode: ReactElement,
  {
    readings = [1],
    fail = false,
    rowCount = 1,
    total = rowCount,
    malformed,
  }: {
    readings?: number[]
    fail?: boolean
    rowCount?: number
    total?: number
    malformed?: 'readings' | 'suspicious'
  } = {},
) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 15, actions: readings.map(id => ({ id })) }])
    if (path === 'ReadingsReportApi/GetDevices') return Promise.resolve([{ id: 4, serialNumber: 'SN-4' }])
    if (path === 'ReadingsReportApi/GetStudentClockings') {
      if (fail) return Promise.reject(new ApiError('http', '/api/ReadingsReportApi/GetStudentClockings', 500))
      if (malformed === 'readings') return Promise.resolve({ unexpected: [] })
      return Promise.resolve({
        items: Array.from({ length: rowCount }, (_, index) => ({
          date: '2026-09-15T08:05:09',
          roomName: 'LIB 0.12',
          deviceSerialNumber: 'SN-4',
          studentNumber: `S${100 + index}`,
          badgeNumber: 'B7',
          studentName: 'Alex Doe',
          clockingTypeDescription: 'Swipe',
        })),
        totalRowCount: total,
      })
    }
    if (path === 'SuspiciousReadingsReportApi/GetSuspiciousClockings') {
      if (malformed === 'suspicious') return Promise.resolve({ unexpected: [] })
      return Promise.resolve({
        items: Array.from({ length: rowCount }, (_, index) => ({
          clockingId: `c-${index + 1}`,
          reason: 'Outside class',
          clockingDate: '2026-09-15T09:00:00',
          createdDate: '2026-09-15T09:01:00',
          studentNumber: `S${100 + index}`,
          classId: 'CL-9',
          allocationStartDateTime: null,
          allocationEndDateTime: null,
          deviceId: 'd-1',
        })),
        totalRowCount: total,
      })
    }
    return Promise.resolve(null)
  })
  post.mockImplementation((path: string) =>
    Promise.resolve(path === 'ResourceApi/GetResourcesForScreen' ? { 'en-GB': {} } : undefined),
  )
  return render(<ProfileProvider>{screenNode}</ProfileProvider>)
}

const calls = (path: string) => get.mock.calls.filter(([called]) => called === path)

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  jest.useFakeTimers({
    doNotFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
    ],
  })
  jest.setSystemTime(TODAY)
})

afterEach(() => {
  jest.useRealTimers()
})

describe('readings query', () => {
  it('builds legacy params, export body, time options and date text', () => {
    const query = initialReadingsQuery(TODAY)
    expect(toReadingsParams(query)).toEqual({
      currentPageIndex: 0,
      pageSize: 100,
      sortCol: 'date',
      sortDir: 'desc',
      searchFilter: '',
      deviceId: null,
      dateFilter: '15/09/2026',
      time: '',
      endDate: '15/09/2026',
      includeInactive: false,
      endTime: '',
    })
    expect(readingsExportBody(query, 1)).toMatchObject({
      deviceId: '',
      exportTo: 1,
      sortColumn: 'date',
      sortDirection: 'desc',
    })
    expect(TIME_OPTIONS[0]).toBe('07:00')
    expect(TIME_OPTIONS.at(-1)).toBe('23:00')
    expect(TIME_OPTIONS).toHaveLength(65)
    expect(formatDateTime('2026-09-15T08:05:09.123Z')).toBe('15/09/2026 08:05:09')
    expect(formatDateTime(null)).toBe('')
  })

  it('G2-01 shows hh:mm:ss AM/PM for en-US and HH:mm:ss elsewhere (_Layout.cshtml:310-313)', () => {
    expect(formatDateTime('2026-09-15T13:05:09')).toBe('15/09/2026 13:05:09')
    setUiCulture('en-US')
    try {
      expect(formatDateTime('2026-09-15T13:05:09')).toBe('09/15/2026 01:05:09 PM')
      expect(formatDateTime('2026-09-15T00:05:09')).toBe('09/15/2026 12:05:09 AM')
      expect(formatDateTime('2026-09-15T12:00:00')).toBe('09/15/2026 12:00:00 PM')
    } finally {
      resetUiCulture()
    }
  })
})

describe('readings time range check', () => {
  const range = { dateFilter: '15/09/2026', endDate: '15/09/2026', time: '10:00', endTime: '09:00' }

  it('only reports an inverted range once both times are set on the same day', () => {
    expect(timeRangeInverted(range)).toBe(true)
    expect(timeRangeInverted({ ...range, endTime: '10:00' })).toBe(true)
    expect(timeRangeInverted({ ...range, endTime: '11:00' })).toBe(false)
    expect(timeRangeInverted({ ...range, endTime: '' })).toBe(false)
    expect(timeRangeInverted({ ...range, endDate: '16/09/2026' })).toBe(false)
  })

  it('shows one combined message and flags both time pickers', async () => {
    const t = (key: DevicesTextKey) => DEVICES_TEXT[key]
    const { rerender } = render(
      <>
        <DateRangeField id="range" value={range} onChange={() => undefined} t={t} today={TODAY} />
        <TimeRangeError id="range" value={range} />
      </>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('End time must be after the start time')
    for (const id of ['range-start-time', 'range-end-time']) {
      await waitFor(() => expect(document.getElementById(id)).toHaveAttribute('aria-invalid', 'true'))
      expect(document.getElementById(id)).toHaveAccessibleDescription('End time must be after the start time')
    }
    const fixed = { ...range, endTime: '11:00' }
    rerender(
      <>
        <DateRangeField id="range" value={fixed} onChange={() => undefined} t={t} today={TODAY} />
        <TimeRangeError id="range" value={fixed} />
      </>,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await waitFor(() => expect(document.getElementById('range-end-time')).not.toHaveAttribute('aria-invalid'))
  })
})

describe('ReadingsReportScreen', () => {
  it('loads today, applies each filter at once and picks a range in the calendar', async () => {
    setup(<ReadingsReportScreen />)
    expect(await screen.findByText('15/09/2026 08:05:09')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map(th => th.textContent)).toEqual([
      'Date',
      'Room',
      'Device Serial Number',
      'Student No',
      'Badge Number',
      'Name',
      'Type',
    ])
    expect(calls('ReadingsReportApi/GetStudentClockings')).toHaveLength(1)

    fireEvent.click(screen.getByRole('switch', { name: 'Include Out of Service Devices' }))
    await waitFor(() => expect(calls('ReadingsReportApi/GetStudentClockings')).toHaveLength(2))
    expect(calls('ReadingsReportApi/GetStudentClockings').at(-1)?.[1]?.query).toMatchObject({
      includeInactive: true,
      currentPageIndex: 0,
    })

    fireEvent.click(screen.getByRole('button', { name: /Last 7 Days/ }))
    await waitFor(() =>
      expect(calls('ReadingsReportApi/GetStudentClockings').at(-1)?.[1]?.query).toMatchObject({
        dateFilter: '09/09/2026',
        endDate: '15/09/2026',
      }),
    )
    expect(screen.getByRole('button', { name: /Last 7 Days/ })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Start Date' }))
    const dialog = await screen.findByRole('dialog', { name: 'Date Range' })
    // The dialog renders the presets twice: the rail for wide screens and chips for narrow ones.
    fireEvent.click(within(dialog).getAllByRole('button', { name: /^Last 14 Days/ })[0])
    const calls14 = calls('ReadingsReportApi/GetStudentClockings').length
    fireEvent.click(within(dialog).getByRole('button', { name: 'Select Range' }))
    await waitFor(() => expect(calls('ReadingsReportApi/GetStudentClockings')).toHaveLength(calls14 + 1))
    expect(calls('ReadingsReportApi/GetStudentClockings').at(-1)?.[1]?.query).toMatchObject({
      dateFilter: '02/09/2026',
      endDate: '15/09/2026',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('G2-03 carries the typed, unsubmitted search into a sort reload (swgrid.js:650-653)', async () => {
    setup(<ReadingsReportScreen />)
    await screen.findByText('15/09/2026 08:05:09')
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: '  S100  ' } })
    const before = calls('ReadingsReportApi/GetStudentClockings').length
    fireEvent.click(screen.getByRole('button', { name: 'Room' }))
    await waitFor(() => expect(calls('ReadingsReportApi/GetStudentClockings')).toHaveLength(before + 1))
    expect(calls('ReadingsReportApi/GetStudentClockings').at(-1)?.[1]?.query).toMatchObject({
      sortCol: 'roomName',
      searchFilter: 'S100',
      currentPageIndex: 0,
    })
    expect(screen.getByPlaceholderText('Search...')).toHaveValue('S100')
  })

  it('G2-05 captions the device and time selects [All] and [all day] (_IndexHeaderFilter.cshtml:32,53)', async () => {
    setup(<ReadingsReportScreen />)
    await screen.findByText('15/09/2026 08:05:09')
    expect(screen.getByRole('combobox', { name: 'Device' })).toHaveTextContent('[All]')
    expect(screen.getByRole('button', { name: 'Start Time' })).toHaveTextContent('[all day]')
  })

  it('P8 ReadingsReport export shows not-authorised on 401', async () => {
    setup(<ReadingsReportScreen />)
    await screen.findByText('15/09/2026 08:05:09')
    const exportCsv = async () => {
      const trigger = screen.getByText('Export').closest('button')
      if (!trigger) throw new Error('Export trigger not found')
      trigger.focus()
      fireEvent.keyDown(trigger, { key: 'Enter' })
      const csv = await screen.findByText('Export to CSV')
      await act(async () => fireEvent.click(csv))
    }
    post.mockRejectedValueOnce(new ApiError('auth', '/api/ReadingsReportApi/Export', 403))
    await exportCsv()
    await waitFor(() =>
      expect(post.mock.calls.filter(([path]) => path === 'ReadingsReportApi/Export')).toHaveLength(1),
    )
    expect(screen.queryByText('You do not have permission to view this.')).not.toBeInTheDocument()

    post.mockRejectedValueOnce(new ApiError('auth', '/api/ReadingsReportApi/Export', 401))
    await exportCsv()
    expect(await screen.findByText('You do not have permission to view this.')).toBeInTheDocument()
  })

  it('shows an error with Retry and blocks users without Readings Report access', async () => {
    const view = setup(<ReadingsReportScreen />, { fail: true })
    expect(await screen.findByText('The server could not complete the request.')).toBeInTheDocument()
    expect(screen.queryByText('There are no items to show.')).not.toBeInTheDocument()
    view.unmount()
    clearResourceCache()
    setup(<ReadingsReportScreen />, { readings: [] })
    expect(
      await screen.findByText('You do not have permission to view readings reports.'),
    ).toBeInTheDocument()
  })

  it('shows returned readings, the header, corrected total and pager when the server total is zero', async () => {
    setup(<ReadingsReportScreen />, { rowCount: 10, total: 0 })
    expect(await screen.findByText('Total 10')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).not.toHaveLength(0)
    expect(screen.getByLabelText('Number of items per page')).toBeInTheDocument()
  })

  it('shows an error instead of empty data for a malformed readings response', async () => {
    setup(<ReadingsReportScreen />, { malformed: 'readings' })
    expect(await screen.findByText('There was an error while processing your request.')).toBeInTheDocument()
    expect(screen.queryByText('There are no items to show.')).not.toBeInTheDocument()
  })
})

describe('SuspiciousReadingsReportScreen', () => {
  it('loads with the two dates and the legacy date sort', async () => {
    setup(<SuspiciousReadingsReportScreen />)
    expect(await screen.findByText('Outside class')).toBeInTheDocument()
    expect(calls('SuspiciousReadingsReportApi/GetSuspiciousClockings')[0][1]?.query).toEqual({
      currentPageIndex: 0,
      pageSize: 100,
      sortCol: 'date',
      sortDir: 'desc',
      searchFilter: '',
      dateFilter: '15/09/2026',
      endDate: '15/09/2026',
    })
    expect(screen.getByText('15/09/2026 09:00:00')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reason' }))
    await waitFor(() =>
      expect(calls('SuspiciousReadingsReportApi/GetSuspiciousClockings').at(-1)?.[1]?.query).toMatchObject({
        sortCol: 'reason',
        sortDir: 'asc',
      }),
    )
  })

  it('shows returned suspicious readings and a corrected total when the server total is zero', async () => {
    setup(<SuspiciousReadingsReportScreen />, { rowCount: 10, total: 0 })
    expect(await screen.findByText('Total 10')).toBeInTheDocument()
    expect(screen.getAllByRole('columnheader')).not.toHaveLength(0)
    expect(screen.getByLabelText('Number of items per page')).toBeInTheDocument()
  })

  it('shows an error instead of empty data for a malformed suspicious response', async () => {
    setup(<SuspiciousReadingsReportScreen />, { malformed: 'suspicious' })
    expect(await screen.findByText('There was an error while processing your request.')).toBeInTheDocument()
    expect(screen.queryByText('There are no items to show.')).not.toBeInTheDocument()
  })
})
