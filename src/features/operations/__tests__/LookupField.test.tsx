import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { ApiError } from '@/shared/api'
import { api } from '@/shared/api'
import { LookupField } from '../job-schedule/LookupField'
import { lookupQuery } from '../job-schedule/job-schedule-form'
import { toJobDraft } from '../job-schedule/job-schedule-form'
import type { JobScheduleDto } from '@/types/operations'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)

const BLANK: JobScheduleDto = {
  id: 0,
  typeId: 4,
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

function renderLookup(
  props: Partial<ComponentProps<typeof LookupField>> & { draft?: ReturnType<typeof toJobDraft> } = {},
) {
  const draft = props.draft ?? toJobDraft(BLANK)
  const onTextChange = props.onTextChange ?? jest.fn()
  const onSelect = props.onSelect ?? jest.fn()
  return {
    onTextChange,
    onSelect,
    ...render(
      <LookupField
        id="job-course"
        label="Course"
        placeholder="[All]"
        clearLabel="Clear"
        noResults="No matches"
        path="JobScheduleApi/GetCourseOptions"
        query={text => lookupQuery('course', draft, text)}
        filterKey={JSON.stringify(lookupQuery('course', draft, ''))}
        selectedId={draft.courseId}
        text=""
        disabled={false}
        onTextChange={onTextChange}
        onSelect={onSelect}
        {...props}
      />,
    ),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('LookupField', () => {
  it('debounces search, shows loader and results', async () => {
    get.mockResolvedValue([{ id: 1, description: 'Biology' }])
    renderLookup()
    fireEvent.focus(screen.getByRole('combobox', { name: 'Course' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Course' }), { target: { value: 'bio' } })

    await act(async () => {
      jest.advanceTimersByTime(250)
    })
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('JobScheduleApi/GetCourseOptions', expect.any(Object)),
    )

    await act(async () => {
      jest.advanceTimersByTime(400)
    })
    expect(await screen.findByRole('option', { name: /Biology/ })).toBeInTheDocument()
  })

  it('shows no results when the API returns an empty list', async () => {
    get.mockResolvedValue([])
    renderLookup()
    fireEvent.focus(screen.getByRole('combobox', { name: 'Course' }))
    await act(async () => {
      jest.advanceTimersByTime(250)
    })
    expect(await screen.findByText('No matches')).toHaveAttribute('role', 'presentation')
  })

  it('clears the selection with the clear button', () => {
    const onTextChange = jest.fn()
    const onSelect = jest.fn()
    renderLookup({ text: 'Saved course', selectedId: 3, onTextChange, onSelect })
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onTextChange).toHaveBeenCalledWith('')
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('supports arrow keys, Enter and Escape', async () => {
    get.mockResolvedValue([
      { id: 1, description: 'Alpha' },
      { id: 2, description: 'Beta' },
    ])
    const onSelect = jest.fn()
    renderLookup({ onSelect })
    const input = screen.getByRole('combobox', { name: 'Course' })
    fireEvent.focus(input)
    await act(async () => {
      jest.advanceTimersByTime(250)
    })
    await screen.findByRole('option', { name: /Alpha/ })

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith({ id: 2, description: 'Beta' })

    fireEvent.focus(input)
    await act(async () => {
      jest.advanceTimersByTime(250)
    })
    await screen.findByRole('option', { name: /Alpha/ })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('surfaces Reports permission errors for building lookups', async () => {
    get.mockRejectedValue(new ApiError('auth', 'JobScheduleApi/GetBuildingOptions', 403))
    renderLookup({
      label: 'Building',
      path: 'JobScheduleApi/GetBuildingOptions',
      permissionDeniedMessage: 'Reports access required',
      query: text => ({ query: text }),
    })
    fireEvent.focus(screen.getByRole('combobox', { name: 'Building' }))
    await act(async () => {
      jest.advanceTimersByTime(250)
    })
    expect(await screen.findByText('Reports access required')).toBeInTheDocument()
  })

  it('refetches when cross-filter keys change', async () => {
    get.mockResolvedValue([{ id: 1, description: 'Filtered' }])
    const draft = { ...toJobDraft(BLANK), schoolId: 7 }
    const { rerender } = render(
      <LookupField
        id="job-course"
        label="Course"
        placeholder="[All]"
        clearLabel="Clear"
        noResults="No matches"
        path="JobScheduleApi/GetCourseOptions"
        query={text => lookupQuery('course', draft, text)}
        filterKey={JSON.stringify(lookupQuery('course', draft, ''))}
        selectedId={null}
        text=""
        disabled={false}
        onTextChange={jest.fn()}
        onSelect={jest.fn()}
      />,
    )
    fireEvent.focus(screen.getByRole('combobox', { name: 'Course' }))
    await act(async () => {
      jest.advanceTimersByTime(250)
    })
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1))
    expect(get.mock.calls[0][1]?.query).toMatchObject({ schoolId: '7' })

    const nextDraft = { ...draft, schoolId: 9 }
    rerender(
      <LookupField
        id="job-course"
        label="Course"
        placeholder="[All]"
        clearLabel="Clear"
        noResults="No matches"
        path="JobScheduleApi/GetCourseOptions"
        query={text => lookupQuery('course', nextDraft, text)}
        filterKey={JSON.stringify(lookupQuery('course', nextDraft, ''))}
        selectedId={null}
        text=""
        disabled={false}
        onTextChange={jest.fn()}
        onSelect={jest.fn()}
      />,
    )
    await act(async () => {
      jest.advanceTimersByTime(250)
    })
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    expect(get.mock.calls[1][1]?.query).toMatchObject({ schoolId: '9' })
  })
})
