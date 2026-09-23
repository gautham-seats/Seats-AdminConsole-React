import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import type { JobDetailsDto, JobScheduleDto } from '@/types/operations'
import {
  buildCron,
  describeCron,
  estimateNextCronRuns,
  isValidCronExpression,
  parseCron,
} from '../job-schedule/cron'
import { JobScheduleDetailsScreen } from '../job-schedule/JobScheduleDetailsScreen'
import { JobSchedulesScreen } from '../job-schedule/JobSchedulesScreen'
import {
  JOB_SCHEDULE_BODY_KEYS,
  JOB_TYPE,
  lookupQuery,
  showsAcademic,
  showsAttendance,
  showsDateRange,
  showsLocation,
  showsMonitor,
  toJobBody,
  toJobDraft,
  validateJob,
  withVisibleDefaults,
} from '../job-schedule/job-schedule-form'
import { RollbackScreen } from '../rollback/RollbackScreen'
import { parseRollbacks } from '../rollback/rollback-list'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/job-schedule' }))
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

const BLANK: JobScheduleDto = {
  id: 0,
  typeId: 0,
  typeCode: null,
  typeName: null,
  description: null,
  cronExpression: '0 4 1 * *',
  enabled: true,
  code: null,
  schoolId: null,
  courseId: null,
  moduleId: null,
  siteId: null,
  buildingId: null,
  roomId: null,
  from: null,
  to: null,
  dateRangeId: 0,
  jobClass: null,
  sendToTutor: null,
  comparisonOperator: '',
  percentageAttended: null,
  emptyEmail: true,
  minutes: null,
  minutesDefault: 30,
  recipients: null,
}

const NEW_JOB: JobDetailsDto = {
  detail: BLANK,
  jobTypeAvailables: [
    { id: 2, name: 'Attendance Export', code: 'AttendanceExport' },
    { id: 103, name: 'Last Heartbeat Report', code: 'LastHeartbeatReport' },
  ],
  dateRangeAvailables: [
    { id: 1, description: 'Last Day' },
    { id: 2, description: 'Last Week' },
  ],
  comparisonOperatorAvailables: [
    { id: 0, description: 'Less than' },
    { id: 2, description: 'Greater than' },
  ],
}

// The form's dropdowns are the shared Radix Select: open with the keyboard, then commit the option.
async function chooseOption(comboboxName: string, optionName: string | RegExp) {
  const trigger = screen.getByRole('combobox', { name: comboboxName })
  await act(async () => {
    fireEvent.keyDown(trigger, { key: 'Enter' })
  })
  const option = await screen.findByRole('option', { name: optionName })
  await act(async () => {
    option.focus()
    fireEvent.keyDown(option, { key: 'Enter' })
  })
}

function claims(item: number, actions: number[]) {
  return Promise.resolve([{ id: item, actions: actions.map(id => ({ id })) }])
}

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  post.mockResolvedValue({ 'en-GB': {} })
})

describe('cron', () => {
  it('reads only the day, week and month shapes jquery-cron offers', () => {
    expect(parseCron('0 4 1 * *')).toMatchObject({ period: 'month', minute: 0, hour: 4, dayOfMonth: 1 })
    expect(parseCron('30 9 * * 1')).toMatchObject({ period: 'week', dayOfWeek: 1 })
    expect(parseCron('15 6 * * *')).toMatchObject({ period: 'day', hour: 6, minute: 15 })
    expect(parseCron('* * * * *')).toBeNull()
    expect(parseCron('15 * * * *')).toBeNull()
    expect(parseCron('5 23 2 12 *')).toBeNull()
    expect(parseCron('*/5 * * * *')).toBeNull()
    expect(describeCron('0 4 1 * *')).toBe('Every month on the 1st at 04:00')
  })

  // prettycron.js:118-132 describes these in legacy; the builder cannot show them, the list still must.
  it('describes hourly and every-minute jobs instead of printing raw cron', () => {
    expect(describeCron('15 * * * *')).toBe('Every hour at 15 minutes past')
    expect(describeCron('0 * * * *')).toBe('Every hour, on the hour')
    expect(describeCron('* * * * *')).toBe('Every minute')
    expect(describeCron('* 4 * * *')).toBe('Every minute of the 04:00 hour')
    expect(describeCron('00 4 * * 1')).toBe('Every Monday at 04:00')
    expect(describeCron('*/5 * * * *')).toBe('*/5 * * * *')
    expect(describeCron('0 4 1 1 *')).toBe('0 4 1 1 *')
  })

  it('round-trips every builder period', () => {
    const samples = [
      { period: 'day' as const, minute: 30, hour: 9, dayOfMonth: 1, dayOfWeek: 0 },
      { period: 'week' as const, minute: 0, hour: 6, dayOfMonth: 1, dayOfWeek: 1 },
      { period: 'month' as const, minute: 0, hour: 4, dayOfMonth: 1, dayOfWeek: 0 },
    ]
    for (const parts of samples) {
      const expression = buildCron(parts)
      expect(parseCron(expression)).toMatchObject(parts)
      expect(isValidCronExpression(expression)).toBe(true)
    }
  })

  // WorkflowApiController.cs:1586-1598 and JobScheduleApiController.cs:454-466 accept whatever Cronos parses,
  // which includes the six-field form with seconds and the @daily macros.
  it('accepts every expression the server may accept and rejects malformed ones', () => {
    for (const expression of [
      '*/5 * * * *',
      '0 4 1-5 * *',
      '0,30 * * * *',
      '0 4 * * MON',
      '0-30/5 * * * *',
      '0 0 4 * * *',
      '@daily',
      '@every_minute',
    ]) {
      expect(isValidCronExpression(expression)).toBe(true)
    }
    for (const expression of ['', 'bad cron', '0 4 * *', '0 4 * * * * *', '0 <4 * * *']) {
      expect(isValidCronExpression(expression)).toBe(false)
    }
  })

  // F3-00: Scripts/thirdParty/jquery-cron.js:147 (periods day/week/month), :162-169 (shape regexes),
  // :238-279 (getCurrentValue joins "min hour day month dow"); option values are the plain numbers (:104-142).
  it('F3-00 produces every expression the legacy jquery-cron build can, byte for byte, and nothing else', () => {
    const legacyValue = (
      period: 'day' | 'week' | 'month',
      min: number,
      hour: number,
      dom: number,
      dow: number,
    ) => {
      let day = '*'
      let dowValue = '*'
      if (period === 'week') dowValue = String(dow)
      if (period === 'month') day = String(dom)
      return [String(min), String(hour), day, '*', dowValue].join(' ')
    }
    const legacyType = (cron: string) => {
      if (/^(\*\s){4}\*$/.test(cron)) return 'minute'
      if (/^\d{1,2}\s(\*\s){3}\*$/.test(cron)) return 'hour'
      if (/^(\d{1,2}\s){2}(\*\s){2}\*$/.test(cron)) return 'day'
      if (/^(\d{1,2}\s){2}(\*\s){2}\d{1,2}$/.test(cron)) return 'week'
      if (/^(\d{1,2}\s){3}\*\s\*$/.test(cron)) return 'month'
      if (/^(\d{1,2}\s){4}\*$/.test(cron)) return 'year'
      return undefined
    }
    let count = 0
    for (let minute = 0; minute < 60; minute += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        const day = buildCron({ period: 'day', minute, hour, dayOfMonth: 1, dayOfWeek: 0 })
        expect(day).toBe(legacyValue('day', minute, hour, 1, 0))
        expect(parseCron(day)).toEqual({ period: 'day', minute, hour, dayOfMonth: 1, dayOfWeek: 0 })
        count += 1
        for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
          const week = buildCron({ period: 'week', minute, hour, dayOfMonth: 1, dayOfWeek })
          expect(week).toBe(legacyValue('week', minute, hour, 1, dayOfWeek))
          expect(legacyType(week)).toBe('week')
          expect(parseCron(week)).toEqual({ period: 'week', minute, hour, dayOfMonth: 1, dayOfWeek })
          count += 1
        }
        for (let dayOfMonth = 1; dayOfMonth <= 31; dayOfMonth += 1) {
          const month = buildCron({ period: 'month', minute, hour, dayOfMonth, dayOfWeek: 0 })
          expect(month).toBe(legacyValue('month', minute, hour, dayOfMonth, 0))
          expect(legacyType(month)).toBe('month')
          expect(parseCron(month)).toEqual({ period: 'month', minute, hour, dayOfMonth, dayOfWeek: 0 })
          count += 1
        }
      }
    }
    expect(count).toBe(60 * 24 * (1 + 7 + 31))
    // Shapes the dropped minute/hour/year periods would parse (jquery-cron.js:163-164,168) stay out of the builder.
    for (const cron of [
      '* * * * *',
      '15 * * * *',
      '0 4 1 1 *',
      '0 4 1 * 1',
      '0 4 * 1 *',
      '60 4 * * *',
      '0 24 * * *',
      '0 4 32 * *',
      '0 4 * * 7',
    ]) {
      expect(parseCron(cron)).toBeNull()
    }
    expect(['minute', 'hour', 'year']).toContain(legacyType('* * * * *'))
    expect(legacyType('0 4 1 1 *')).toBe('year')
    expect(legacyType('0 4 1 * 1')).toBeUndefined()
  })

  it('estimates the next runs with real dates', () => {
    const from = new Date(2026, 8, 15, 10, 0, 30)
    expect(estimateNextCronRuns('30 9 * * *', 3, from)).toEqual([
      new Date(2026, 8, 16, 9, 30),
      new Date(2026, 8, 17, 9, 30),
      new Date(2026, 8, 18, 9, 30),
    ])
    expect(estimateNextCronRuns('0 6 * * 1', 2, from)).toEqual([
      new Date(2026, 8, 21, 6, 0),
      new Date(2026, 8, 28, 6, 0),
    ])
    expect(estimateNextCronRuns('0 4 31 * *', 3, from)).toEqual([
      new Date(2026, 9, 31, 4, 0),
      new Date(2026, 11, 31, 4, 0),
      new Date(2027, 0, 31, 4, 0),
    ])
    expect(estimateNextCronRuns('*/5 * * * *', 3, from)).toHaveLength(0)
  })
})
describe('job schedule rules', () => {
  it('shows parameters per job type as Details.cshtml does', () => {
    expect({
      students: [showsDateRange(101), showsAcademic(101), showsMonitor(101), showsLocation(101)],
      timetables: [showsDateRange(102), showsAcademic(102), showsMonitor(102), showsLocation(102)],
      attendance: [showsDateRange(2), showsAcademic(2), showsAttendance(2), showsLocation(2)],
      room: [showsDateRange(4), showsAcademic(4), showsLocation(4)],
      heartbeat: [showsDateRange(103), showsAcademic(103), showsMonitor(103), showsLocation(103)],
      clockings: [showsDateRange(104), showsAcademic(104), showsMonitor(104), showsLocation(104)],
      academic: [showsDateRange(5), showsAcademic(5), showsLocation(5)],
      absence: [showsDateRange(6), showsAcademic(6), showsLocation(6)],
    }).toEqual({
      students: [false, true, false, false],
      timetables: [true, false, false, false],
      attendance: [true, true, true, false],
      room: [true, true, true],
      heartbeat: [false, false, true, false],
      clockings: [false, false, true, false],
      academic: [true, true, false],
      absence: [true, true, false],
    })
    expect(JOB_TYPE.RoomUtilisation).toBe(4)
  })

  it('filters academic lookups by each other and validates recipients and < >', () => {
    const draft = { ...toJobDraft(BLANK), schoolId: 7, typeId: 2 }
    expect(lookupQuery('course', draft, 'bio')).toEqual({ query: 'bio', schoolId: '7', moduleId: '' })
    expect(validateJob({ ...draft, description: 'a<b' })).toEqual({ field: 'description', kind: 'special' })
    expect(validateJob({ ...draft, cronExpression: '' })).toEqual({
      field: 'cronExpression',
      kind: 'required',
    })
    expect(validateJob({ ...draft, cronExpression: 'not cron' })).toEqual({
      field: 'cronExpression',
      kind: 'cron',
    })
    expect(isValidCronExpression('0 4 * 1 *')).toBe(true)
    expect(validateJob({ ...draft, typeId: 103, recipients: 'a@b.com, nope' })?.kind).toBe('email')
    expect(validateJob({ ...draft, typeId: 103, minutes: '99' })?.kind).toBe('range')
    expect(validateJob({ ...draft, typeId: 2, recipients: 'nope' })).toBeNull()
  })

  it('posts the JobScheduleViewModel field set only', () => {
    const draft = { ...toJobDraft(BLANK), typeId: 2, percentageAttended: '75', minutes: '' }
    const body = toJobBody(draft)
    expect(Object.keys(body).sort()).toEqual([...JOB_SCHEDULE_BODY_KEYS].sort())
    expect(body).toMatchObject({
      percentageAttended: 75,
      minutes: null,
      typeId: 2,
      emptyEmail: true,
      enabled: true,
    })
  })

  it('defaults visible selects and keeps hidden values on type change', () => {
    const draft = toJobDraft({ ...BLANK, dateRangeId: 2, comparisonOperator: '2', schoolId: 9 })
    const defaulted = withVisibleDefaults({ ...draft, typeId: 0 }, NEW_JOB)
    expect(defaulted.typeId).toBe(2)
    expect(defaulted.dateRangeId).toBe(2)
    const monitor = withVisibleDefaults({ ...defaulted, typeId: 103 }, NEW_JOB)
    expect(monitor.dateRangeId).toBe(2)
    expect(monitor.schoolId).toBe(9)
    const attendance = withVisibleDefaults({ ...monitor, typeId: 2 }, NEW_JOB)
    expect(attendance.comparisonOperator).toBe('2')
    expect(attendance.dateRangeId).toBe(2)
  })

  it('drops unpostable text only from the section a type change hides', () => {
    // Attendance (2) shows percentage; the monitor type (103) hides it and shows minutes instead.
    const typed = { ...toJobDraft(BLANK), typeId: 2, percentageAttended: 'abc', minutes: 'x' }
    const monitor = withVisibleDefaults({ ...typed, typeId: 103 }, NEW_JOB)
    expect(monitor.percentageAttended).toBe('')
    expect(monitor.minutes).toBe('x')
    expect(toJobBody(monitor)).toMatchObject({ percentageAttended: null })

    const back = withVisibleDefaults({ ...monitor, typeId: 2 }, NEW_JOB)
    expect(back.minutes).toBe('')

    // A value the server can accept survives being hidden, as legacy kept hidden values (D-101).
    const real = { ...toJobDraft(BLANK), typeId: 2, percentageAttended: '75' }
    expect(withVisibleDefaults({ ...real, typeId: 103 }, NEW_JOB).percentageAttended).toBe('75')
  })
})

describe('RollbackScreen', () => {
  it('B8 rejects an unexpected body instead of showing an empty list', () => {
    expect(parseRollbacks([{ id: 9, entityType: 'Student', date: null, displayDate: '02/01/2026' }])).toEqual(
      [{ id: 9, entityType: 'Student', date: null, displayDate: '02/01/2026' }],
    )
    expect(parseRollbacks([])).toEqual([])
    expect(() => parseRollbacks(null)).toThrow('parse: RollbackApi')
    expect(() => parseRollbacks({ items: [] })).toThrow('parse: RollbackApi')
    expect(() => parseRollbacks([{ entityType: 'no id' }])).toThrow('parse: RollbackApi')
  })

  it('blocks the page when Rollback access is missing', async () => {
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims' ? claims(21, [1]) : Promise.resolve(null),
    )
    render(
      <ProfileProvider>
        <RollbackScreen />
      </ProfileProvider>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: /permission/i })).toBeInTheDocument()
    expect(get).not.toHaveBeenCalledWith('RollbackApi', expect.anything())
  })

  it('lists batches by batch number without selection or actions', async () => {
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims(11, [1])
        : Promise.resolve(
            path === 'RollbackApi'
              ? [
                  { id: 9, entityType: 'Student', date: '2026-01-02', displayDate: '02/01/2026' },
                  { id: 3, entityType: 'Course', date: '2026-01-01', displayDate: '01/01/2026' },
                ]
              : null,
          ),
    )
    render(
      <ProfileProvider>
        <RollbackScreen />
      </ProfileProvider>,
    )
    const rows = await screen.findAllByText(/Student|Course/)
    expect(rows[0]).toHaveTextContent('Course')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
})

describe('JobSchedulesScreen', () => {
  it('keeps the server order, describes the schedule and deletes with ids', async () => {
    del.mockResolvedValue(undefined)
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims(21, [1, 2, 4])
        : Promise.resolve(
            path === 'JobScheduleApi'
              ? [
                  {
                    ...BLANK,
                    id: 5,
                    description: 'Weekly export',
                    cronExpression: '0 6 * * 1',
                    typeName: 'Attendance',
                  },
                  { ...BLANK, id: 4, description: 'Alpha job', enabled: false, typeName: 'Students' },
                ]
              : null,
          ),
    )
    render(
      <ProfileProvider>
        <JobSchedulesScreen />
      </ProfileProvider>,
    )
    const names = await screen.findAllByText(/Weekly export|Alpha job/)
    expect(names[0]).toHaveTextContent('Weekly export')
    expect(screen.getByText('Every Monday at 06:00')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('No')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toHaveAttribute('href', '/job-schedule/new')
    fireEvent.click(names[1])
    expect(push).toHaveBeenCalledWith('/job-schedule/4')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Alpha job' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    })
    expect(del).toHaveBeenCalledWith('JobScheduleApi?ids=4')
  })

  it('gates add and delete by permission', async () => {
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims(21, [1])
        : Promise.resolve(
            path === 'JobScheduleApi'
              ? [{ ...BLANK, id: 1, description: 'Read only', typeName: 'Students' }]
              : null,
          ),
    )
    render(
      <ProfileProvider>
        <JobSchedulesScreen />
      </ProfileProvider>,
    )
    await screen.findByText('Read only')
    expect(screen.queryByRole('link', { name: /Add/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})

describe('JobScheduleDetailsScreen', () => {
  it('defaults the selects, switches parameters by type and posts the job', async () => {
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims(21, [1, 2])
        : Promise.resolve(path === 'JobScheduleApi/0' ? NEW_JOB : null),
    )
    render(
      <ProfileProvider>
        <JobScheduleDetailsScreen id={0} />
      </ProfileProvider>,
    )
    expect(await screen.findByRole('combobox', { name: 'Date Range' })).toHaveTextContent('Last Day')
    expect(screen.getAllByText('Every month on the 1st at 04:00').length).toBeGreaterThanOrEqual(1)
    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Frequency' })).getByRole('radio', { name: 'Week' }),
    )
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Tutor report' } })
    await chooseOption('Type', 'Last Heartbeat Report')
    expect(screen.queryByRole('combobox', { name: 'Date Range' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Recipients'), { target: { value: 'a@b.com' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    const body = post.mock.calls.find(([path]) => path === 'JobScheduleApi/')?.[1]?.body
    expect(body).toMatchObject({
      typeId: 103,
      description: 'Tutor report',
      cronExpression: '0 4 * * 0',
      dateRangeId: 1,
      comparisonOperator: '0',
      recipients: 'a@b.com',
      emptyEmail: true,
      enabled: true,
    })
    expect(push).toHaveBeenCalledWith('/job-schedule')
  })

  // F3-01: swapp.js:574 + _Layout.cshtml:216 show GeneralResources.FieldsWithInputValidations for a < > failure.
  it('F3-01 shows the FieldsWithInputValidations resource, not RequiredMessage, for a < > failure', async () => {
    post.mockImplementation((path: string) =>
      Promise.resolve(
        path === 'ResourceApi/GetResourcesForScreen'
          ? {
              'en-GB': {
                FieldsWithInputValidations: 'Server: fields with input validation errors.',
                RequiredMessage: 'Server: this field is required.',
              },
            }
          : undefined,
      ),
    )
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims(21, [1, 2])
        : Promise.resolve(path === 'JobScheduleApi/0' ? NEW_JOB : null),
    )
    render(
      <ProfileProvider>
        <JobScheduleDetailsScreen id={0} />
      </ProfileProvider>,
    )
    const description = await screen.findByLabelText('Description')
    fireEvent.change(description, { target: { value: 'a<b' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByText('Server: fields with input validation errors.')).toBeInTheDocument()
    expect(screen.queryByText('Server: this field is required.')).not.toBeInTheDocument()
    expect(screen.getByText('Special characters are not allowed .')).toBeInTheDocument()
    expect(post.mock.calls.some(([path]) => path === 'JobScheduleApi/')).toBe(false)
  })

  it('blocks save when the cron expression is invalid', async () => {
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims(21, [1, 2])
        : Promise.resolve(path === 'JobScheduleApi/0' ? NEW_JOB : null),
    )
    render(
      <ProfileProvider>
        <JobScheduleDetailsScreen id={0} />
      </ProfileProvider>,
    )
    await screen.findByLabelText('Description')
    fireEvent.click(screen.getByLabelText('Advance'))
    fireEvent.change(screen.getByLabelText('Cron Expression'), { target: { value: 'bad cron' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(post.mock.calls.some(([path]) => path === 'JobScheduleApi/')).toBe(false)
    expect(screen.getAllByText(/Cron expression is incorrect/i).length).toBeGreaterThanOrEqual(1)
  })

  it('rechecks the schedule on every change after Save and asks for an empty one specifically', async () => {
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims(21, [1, 2])
        : Promise.resolve(path === 'JobScheduleApi/0' ? NEW_JOB : null),
    )
    render(
      <ProfileProvider>
        <JobScheduleDetailsScreen id={0} />
      </ProfileProvider>,
    )
    await screen.findByLabelText('Description')
    fireEvent.click(screen.getByLabelText('Advance'))
    const expression = screen.getByLabelText('Cron Expression')
    fireEvent.change(expression, { target: { value: '' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(expression).toHaveAttribute('aria-invalid', 'true')
    expect(expression).toHaveAccessibleDescription('Enter a schedule.')
    fireEvent.change(expression, { target: { value: 'still bad' } })
    expect(expression).toHaveAccessibleDescription('Cron expression is incorrect.')
    fireEvent.change(expression, { target: { value: '0 4 * * 1' } })
    expect(expression).not.toHaveAttribute('aria-invalid')
    expect(post.mock.calls.some(([path]) => path === 'JobScheduleApi/')).toBe(false)
  })

  it('moves between periods with arrow keys and keeps one period in the tab order', async () => {
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims(21, [1, 2])
        : Promise.resolve(path === 'JobScheduleApi/0' ? NEW_JOB : null),
    )
    render(
      <ProfileProvider>
        <JobScheduleDetailsScreen id={0} />
      </ProfileProvider>,
    )
    const group = await screen.findByRole('radiogroup', { name: 'Frequency' })
    const month = within(group).getByRole('radio', { name: 'Month' })
    expect(month).toHaveAttribute('tabindex', '0')
    expect(within(group).getByRole('radio', { name: 'Day' })).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(month, { key: 'ArrowRight' })
    const day = within(group).getByRole('radio', { name: 'Day' })
    expect(day).toHaveAttribute('aria-checked', 'true')
    expect(day).toHaveFocus()
    fireEvent.keyDown(day, { key: 'ArrowLeft' })
    expect(within(group).getByRole('radio', { name: 'Month' })).toHaveAttribute('aria-checked', 'true')
  })

  it('shows unsaved state, discards edits and guards navigation', async () => {
    const addListener = jest.spyOn(window, 'addEventListener')
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims(21, [1, 2])
        : Promise.resolve(path === 'JobScheduleApi/0' ? NEW_JOB : null),
    )
    render(
      <ProfileProvider>
        <JobScheduleDetailsScreen id={0} />
      </ProfileProvider>,
    )
    const description = await screen.findByLabelText('Description')
    fireEvent.change(description, { target: { value: 'Draft text' } })
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    expect(addListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(description).toHaveValue('')
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
    addListener.mockRestore()
  })

  it('syncs the builder when Advance is turned off and never replaces an expression it cannot show', async () => {
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims(21, [1, 2])
        : Promise.resolve(path === 'JobScheduleApi/0' ? NEW_JOB : null),
    )
    render(
      <ProfileProvider>
        <JobScheduleDetailsScreen id={0} />
      </ProfileProvider>,
    )
    await screen.findByLabelText('Description')
    fireEvent.click(screen.getByLabelText('Advance'))
    fireEvent.change(screen.getByLabelText('Cron Expression'), { target: { value: '*/5 * * * *' } })
    expect(screen.getByLabelText('Advance')).toBeDisabled()
    expect(screen.getByLabelText('Cron Expression')).toHaveValue('*/5 * * * *')
    fireEvent.change(screen.getByLabelText('Cron Expression'), { target: { value: '0 4 1 * *' } })
    fireEvent.click(screen.getByLabelText('Advance'))
    expect(screen.getByRole('radio', { name: 'Month' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getAllByText('Every month on the 1st at 04:00').length).toBeGreaterThanOrEqual(1)
  })

  it('hides save actions for access-only users', async () => {
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims(21, [1])
        : Promise.resolve(path === 'JobScheduleApi/0' ? NEW_JOB : null),
    )
    render(
      <ProfileProvider>
        <JobScheduleDetailsScreen id={0} />
      </ProfileProvider>,
    )
    await screen.findByLabelText('Description')
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument()
  })

  it('keeps the form and retries only a failed saved lookup description', async () => {
    const details: JobDetailsDto = {
      ...NEW_JOB,
      detail: { ...BLANK, id: 5, typeId: JOB_TYPE.AttendanceExport, schoolId: 7 },
    }
    let schoolAttempts = 0
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(21, [1, 3])
      if (path === 'JobScheduleApi/5') return Promise.resolve(details)
      if (path === 'JobScheduleApi/GetSchoolDescription') {
        schoolAttempts += 1
        return schoolAttempts === 1 ? Promise.reject(new Error('offline')) : Promise.resolve('Science')
      }
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <JobScheduleDetailsScreen id={5} />
      </ProfileProvider>,
    )

    expect(await screen.findByText('Unable to load this saved selection.')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry School' }))
    // A successful retry removes the alert, so focus returns to the field it belonged to.
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'School' })).toHaveValue('Science'))
    expect(screen.getByRole('combobox', { name: 'School' })).toHaveFocus()
    expect(schoolAttempts).toBe(2)
    expect(screen.queryByText('Unable to load this saved selection.')).not.toBeInTheDocument()
  })
})
