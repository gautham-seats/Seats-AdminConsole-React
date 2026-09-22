import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { getLegacyViewHtml } from '@/shared/api/legacy-view'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { LessonTypeDetailsScreen } from '../LessonTypeDetailsScreen'
import { LessonTypesScreen } from '../LessonTypesScreen'

const push = jest.fn()

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))

jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

jest.mock('@/shared/api/legacy-view', () => ({ getLegacyViewHtml: jest.fn() }))

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)
const view = jest.mocked(getLegacyViewHtml)

const LEC = {
  id: 4,
  name: 'LEC',
  description: 'Lecture',
  earlyCutoff: 10,
  lateCutoff: 15,
  absenceCutoff: 30,
  percentageCutoff: 50,
  checkoutCutoff: 5,
  isAbsenceBasedOnStart: true,
  isAttendanceBasedOnCheckout: true,
  attendanceScaling: 2,
  isGPSEnabled: true,
  isActive: true,
  globalId: '6f1c0e5e-0000-0000-0000-000000000000',
  isConsecutiveAttendanceUpdate: false,
  isAbsenceBasedOnStartCutOff: null,
  isMandatory: null,
}
const LAB = {
  ...LEC,
  id: 7,
  name: 'LAB',
  description: 'Lab',
  isActive: false,
  isAttendanceBasedOnCheckout: null,
}

function setup({
  actions = [1, 3, 103, 132],
  // The init script url is what marks the response as the real lesson type partial.
  html = `<script>x('/api/LessonTypeApi/')</script><th id="attendance-scaling-col"></th><th id="is-consecutive-attendance-update-col"></th>`,
  list = () => Promise.resolve<unknown>([LEC, LAB]),
} = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 23, actions: actions.map(id => ({ id })) }])
    if (path === 'LessonTypeApi/') return list()
    if (path === 'LessonTypeApi/4')
      return Promise.resolve({
        detail: LEC,
        attendanceScalingAvailables: [
          { id: 1, description: 'Enabled' },
          { id: 2, description: 'Only If Absent' },
          { id: 3, description: 'Only If Attended' },
        ],
        attendanceBasedOnCheckoutAvailables: [
          { id: 0, description: 'Optional' },
          { id: 1, description: 'Mandatory' },
        ],
      })
    if (path === 'LessonTypeApi/9') return Promise.reject(new ApiError('http', '/api/LessonTypeApi/9', 404))
    return Promise.resolve(null)
  })
  view.mockResolvedValue(html)
  post.mockImplementation((path: string) =>
    path === 'ResourceApi/GetResourcesForScreen'
      ? Promise.resolve({ 'en-GB': {} })
      : Promise.resolve(undefined),
  )
}

const renderIn = (node: React.ReactNode) => render(<ProfileProvider>{node}</ProfileProvider>)
const saved = () => post.mock.calls.find(([path]) => path === 'LessonTypeApi/')?.[1]?.body

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('LessonTypesScreen', () => {
  it('lists lesson types by description with every permitted and tenant column', async () => {
    setup()
    renderIn(<LessonTypesScreen />)
    expect(await screen.findByRole('link', { name: 'LAB' })).toHaveAttribute(
      'href',
      '/resources/lesson-types/7',
    )
    expect(get).toHaveBeenCalledWith('LessonTypeApi/', expect.anything())
    expect(view).toHaveBeenCalledWith('LessonType/Index', expect.anything())
    const headers = screen.getAllByRole('columnheader').map(cell => cell.textContent)
    expect(headers).toEqual([
      'Name',
      'Description',
      'Early Cut Off',
      'Late Cut Off',
      'Absence Cut Off',
      'Checkout Cut Off',
      'Percentage Cut Off',
      'Is Absence Based On Start',
      'Is Attendance Based On Checkout',
      'Attendance Scaling',
      'Consecutive Attendance Update',
      'Is Active',
    ])
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('LAB')
    expect(rows[0]).toHaveTextContent('Disabled')
    expect(rows[1]).toHaveTextContent('Mandatory')
    expect(rows[1]).toHaveTextContent('Only If Absent')
    fireEvent.click(rows[1])
    expect(push).toHaveBeenCalledWith('/resources/lesson-types/4')
    expect(screen.queryByRole('button', { name: /add|delete/i })).not.toBeInTheDocument()
  })

  it('hides checkout, scaling and consecutive columns without the rights or tenant settings', async () => {
    setup({
      actions: [1],
      html: `<script>x('/api/LessonTypeApi/')</script><th id="name-lesson-type-col"></th>`,
    })
    renderIn(<LessonTypesScreen />)
    await screen.findByRole('link', { name: 'LEC' })
    const headers = screen.getAllByRole('columnheader').map(cell => cell.textContent)
    expect(headers).not.toContain('Checkout Cut Off')
    expect(headers).not.toContain('Is Attendance Based On Checkout')
    expect(headers).not.toContain('Attendance Scaling')
    expect(headers).not.toContain('Consecutive Attendance Update')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // The flags come from scraping a legacy partial; losing them must not blank a list that loaded.
  it('still lists the lesson types when the tenant flag read fails', async () => {
    setup()
    view.mockRejectedValue(new ApiError('http', '/LessonType/Index', 500))
    renderIn(<LessonTypesScreen />)
    expect(await screen.findByRole('link', { name: 'LAB' })).toBeInTheDocument()
    expect(screen.queryByText('There was an error while processing your request.')).not.toBeInTheDocument()
    const headers = screen.getAllByRole('columnheader').map(cell => cell.textContent)
    expect(headers).not.toContain('Attendance Scaling')
    expect(headers).toContain('Checkout Cut Off')
    expect(await screen.findByRole('alert')).toHaveTextContent('tenant settings could not be loaded')
  })

  // A sign-in page or a changed partial must not silently read as "both tenant flags are off".
  it('treats an unrecognised partial as a failed flag read, not as flags off', async () => {
    setup({ html: '<form action="/Account/ForceLogin"></form>' })
    renderIn(<LessonTypesScreen />)
    expect(await screen.findByRole('link', { name: 'LAB' })).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('tenant settings could not be loaded')
  })

  // Alpha returns a bare null here for a tenant with no lesson types configured.
  it('shows the empty state with headers when the list comes back as null', async () => {
    setup({ list: () => Promise.resolve(null) })
    renderIn(<LessonTypesScreen />)
    expect(await screen.findByText('There are no items to show.')).toBeInTheDocument()
    expect(screen.queryByText('There was an error while processing your request.')).not.toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0)
  })

  it('shows the empty message and an error with Refresh', async () => {
    setup({ list: () => Promise.resolve([]) })
    const first = renderIn(<LessonTypesScreen />)
    expect(await screen.findByText('There are no items to show.')).toBeInTheDocument()
    first.unmount()
    setup({ list: () => Promise.reject(new ApiError('http', '/api/LessonTypeApi/', 500)) })
    renderIn(<LessonTypesScreen />)
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(get.mock.calls.filter(([path]) => path === 'LessonTypeApi/')).toHaveLength(3))
  })

  it('blocks the page without Lesson Type access', async () => {
    setup({ actions: [] })
    renderIn(<LessonTypesScreen />)
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission')
    expect(get).not.toHaveBeenCalledWith('LessonTypeApi/', expect.anything())
  })
})

describe('LessonTypeDetailsScreen', () => {
  it('edits cutoffs and saves the full DTO, then returns with the saved notice', async () => {
    setup()
    renderIn(<LessonTypeDetailsScreen idParam="4" />)
    expect(await screen.findByLabelText(/^Late Cut Off/)).toHaveValue(15)
    expect(view).toHaveBeenCalledWith('LessonType/Details', expect.anything())
    expect(screen.getByLabelText('Name')).toBeDisabled()
    expect(screen.getByLabelText('Description')).toBeDisabled()
    expect(screen.getAllByText('On')[0]).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/^Late Cut Off/), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Is Active' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saved()).toEqual({ ...LEC, lateCutoff: 20, isActive: false })
    expect(push).toHaveBeenCalledWith('/resources/lesson-types')
  })

  it('requires the three cutoffs before posting', async () => {
    setup()
    renderIn(<LessonTypeDetailsScreen idParam="4" />)
    fireEvent.change(await screen.findByLabelText(/^Early Cut Off/), { target: { value: '' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('There are fields with input validation errors.')
    expect(saved()).toBeUndefined()
    const early = screen.getByLabelText(/^Early Cut Off/)
    fireEvent.change(early, { target: { value: '1.5' } })
    expect(early).toHaveAccessibleDescription('Enter a whole number.')
    fireEvent.change(early, { target: { value: '5' } })
    expect(early).toHaveAttribute('aria-invalid', 'false')
  })

  // Legacy starts the cut-offs at ko.observable(null) and blocks the save; we must never invent a 0.
  it('blocks the save on a blank cut-off and posts nothing at all', async () => {
    setup()
    renderIn(<LessonTypeDetailsScreen idParam="4" />)
    fireEvent.change(await screen.findByLabelText(/^Absence Cut Off/), { target: { value: '' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saved()).toBeUndefined()
    expect(post).not.toHaveBeenCalledWith('LessonTypeApi/', expect.anything())
  })

  // A stored null must open as an empty box, not as the 0 we used to invent.
  it('loads a null cut-off as an empty field', async () => {
    setup()
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims')
        return Promise.resolve([{ id: 23, actions: [1, 3, 103, 132].map(id => ({ id })) }])
      if (path === 'LessonTypeApi/4')
        return Promise.resolve({
          detail: { ...LEC, earlyCutoff: null, percentageCutoff: null },
          attendanceScalingAvailables: [],
          attendanceBasedOnCheckoutAvailables: [],
        })
      return Promise.resolve(null)
    })
    renderIn(<LessonTypeDetailsScreen idParam="4" />)
    expect(await screen.findByLabelText(/^Early Cut Off/)).toHaveValue(null)
    expect(screen.getByLabelText(/^Percentage Cut Off/)).toHaveValue(null)
    expect(screen.getByLabelText(/^Late Cut Off/)).toHaveValue(15)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saved()).toBeUndefined()
  })

  it('shows the server message and stays on the page when the save fails', async () => {
    setup()
    renderIn(<LessonTypeDetailsScreen idParam="4" />)
    await screen.findByLabelText(/^Late Cut Off/)
    post.mockImplementation((path: string) =>
      path === 'LessonTypeApi/'
        ? Promise.reject(
            new ApiError(
              'http',
              '/api/LessonTypeApi/',
              400,
              'There was an error while trying to save the item.',
            ),
          )
        : Promise.resolve({ 'en-GB': {} }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('There was an error while trying to save the item.')
    expect(push).not.toHaveBeenCalled()
  })

  it('hides Save and checkout fields without Edit and CheckOutPolicy', async () => {
    setup({ actions: [1], html: '' })
    renderIn(<LessonTypeDetailsScreen idParam="4" />)
    expect(await screen.findByLabelText(/^Late Cut Off/)).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.getByText('View only')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Checkout Cut Off/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Attendance Scaling')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Consecutive Attendance Update' })).not.toBeInTheDocument()
  })

  it('shows the unsaved pill and discards edits', async () => {
    setup()
    renderIn(<LessonTypeDetailsScreen idParam="4" />)
    const late = await screen.findByLabelText(/^Late Cut Off/)
    fireEvent.change(late, { target: { value: '20' } })
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(late).toHaveValue(15)
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('saves with Ctrl+S', async () => {
    setup()
    renderIn(<LessonTypeDetailsScreen idParam="4" />)
    fireEvent.change(await screen.findByLabelText(/^Late Cut Off/), { target: { value: '22' } })
    await act(async () => {
      fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    })
    expect(saved()).toEqual({ ...LEC, lateCutoff: 22 })
    expect(push).toHaveBeenCalledWith('/resources/lesson-types')
  })

  it('warns on Cancel when the form is dirty', async () => {
    setup()
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
    renderIn(<LessonTypeDetailsScreen idParam="4" />)
    fireEvent.change(await screen.findByLabelText(/^Late Cut Off/), { target: { value: '18' } })
    fireEvent.click(screen.getByRole('link', { name: 'Cancel' }))
    expect(confirm).toHaveBeenCalledWith('You have unsaved changes. Leave this page?')
    expect(push).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('registers beforeunload while the form is dirty', async () => {
    setup()
    const add = jest.spyOn(window, 'addEventListener')
    renderIn(<LessonTypeDetailsScreen idParam="4" />)
    fireEvent.change(await screen.findByLabelText(/^Late Cut Off/), { target: { value: '20' } })
    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    add.mockRestore()
  })

  it('shows not found for a bad id or a 404', async () => {
    setup()
    const first = renderIn(<LessonTypeDetailsScreen idParam="new" />)
    expect(await screen.findByText('This lesson type could not be found.')).toBeInTheDocument()
    first.unmount()
    renderIn(<LessonTypeDetailsScreen idParam="9" />)
    expect(await screen.findByText('This lesson type could not be found.')).toBeInTheDocument()
  })

  // The empty DTO the controller returns for a missing id is "no such record"; an unreadable body is not.
  it('shows the error state with Retry for a body it cannot read', async () => {
    setup()
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims')
        return Promise.resolve([{ id: 23, actions: [1, 3, 103, 132].map(id => ({ id })) }])
      if (path === 'LessonTypeApi/4') return Promise.resolve({ detail: { name: 'no id' } })
      return Promise.resolve(null)
    })
    renderIn(<LessonTypeDetailsScreen idParam="4" />)
    expect(await screen.findByText('There was an error while processing your request.')).toBeInTheDocument()
    expect(screen.queryByText('This lesson type could not be found.')).not.toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })
})
