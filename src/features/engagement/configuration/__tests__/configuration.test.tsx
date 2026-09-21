import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { EngagementConfigurationScreen } from '../EngagementConfigurationScreen'
import { setEngagementFlash } from '../../EngagementFrame'
import { formatLastRun, parseModels, toCreateQuery, toRecalculateBody } from '../engagement-models'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)

const MODELS = [
  { id: 1, modelName: 'Attendance Risk', isActive: true, lastRun: '2026-09-14T06:00:12' },
  { id: 2, modelName: 'Pilot Nursing', isActive: false, lastRun: null },
]

function setup(actions = [1, 2, 67]) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 50, actions: actions.map(id => ({ id })) }])
    if (path === 'engagementApi/GetAllEngagement') return Promise.resolve({ items: MODELS, totalRowCount: 2 })
    return Promise.resolve(null)
  })
  post.mockImplementation((path: string) =>
    path === 'ResourceApi/GetResourcesForScreen'
      ? Promise.resolve({ 'en-GB': {} })
      : Promise.resolve(undefined),
  )
}

const renderScreen = () =>
  render(
    <ProfileProvider>
      <EngagementConfigurationScreen />
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

describe('engagement model helpers', () => {
  it('parses the paged list and formats the last run', () => {
    expect(parseModels({ items: MODELS })).toHaveLength(2)
    expect(formatLastRun('2026-09-14T06:00:12')).toBe('14/09/2026 06:00:12')
    expect(formatLastRun(null)).toBeNull()
  })

  it('builds the create query and the recalculate body like legacy', () => {
    expect(toCreateQuery({ modelName: 'New', copy: false, modelIdToClone: 1 })).toEqual({
      modelName: 'New',
      modelIdToClone: '',
    })
    expect(toCreateQuery({ modelName: 'New', copy: true, modelIdToClone: 1 })).toEqual({
      modelName: 'New',
      modelIdToClone: '1',
    })
    const day = new Date(2026, 8, 15)
    expect(toRecalculateBody(MODELS, false, true, day, day)).toEqual({
      reSyncStudents: true,
      selectAll: false,
      startDate: '15/09/2026',
      endDate: '15/09/2026',
      modelIds: [1],
    })
  })
})

describe('EngagementConfigurationScreen', () => {
  it('lists models with the details link and enables Re-calculate only after ticking', async () => {
    setup()
    renderScreen()
    expect(await screen.findByRole('link', { name: 'Attendance Risk' })).toHaveAttribute(
      'href',
      '/engagement/1',
    )
    expect(screen.getByText('Never')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Re-calculate/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Attendance Risk' }))
    fireEvent.click(screen.getByRole('button', { name: /Re-calculate/ }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Selected (1)')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /Run/ }))
    })
    expect(post).toHaveBeenCalledWith('engagementApi/SyncStudentsAndReCalculate', {
      body: expect.objectContaining({ modelIds: [1], selectAll: true, reSyncStudents: false }),
    })
  })

  it('F6-3 shows the saved notice left by the model editor, once', async () => {
    setup()
    setEngagementFlash({ id: 1, tone: 'success', message: 'The item was saved successfully.' })
    const first = renderScreen()
    expect(await screen.findByRole('status')).toHaveTextContent('The item was saved successfully.')
    first.unmount()
    renderScreen()
    await screen.findByRole('link', { name: 'Attendance Risk' })
    expect(screen.queryByText('The item was saved successfully.')).not.toBeInTheDocument()
  })

  it('F6-5 hides a 5xx message behind the general error when Re-calculate fails', async () => {
    setup()
    post.mockImplementation((path: string) =>
      path === 'engagementApi/SyncStudentsAndReCalculate'
        ? Promise.reject(new ApiError('http', '/api/engagementApi/SyncStudentsAndReCalculate', 500, 'Stack'))
        : Promise.resolve({ 'en-GB': {} }),
    )
    renderScreen()
    await screen.findByRole('link', { name: 'Attendance Risk' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Attendance Risk' }))
    fireEvent.click(screen.getByRole('button', { name: /Re-calculate/ }))
    const dialog = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /Run/ }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('There was an error while processing your request.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('Stack')
  })

  it('requires a name before creating a model', async () => {
    setup()
    renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: /Add/ }))
    const dialog = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /Save/ }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('The Name is required.')
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Year 2' } })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /Save/ }))
    })
    expect(post).toHaveBeenCalledWith('engagementApi/createEngagementModel', {
      query: { modelName: 'Year 2', modelIdToClone: '' },
    })
  })

  it('groups the option radios and explains why Save is off until a model to copy is chosen', async () => {
    setup()
    renderScreen()
    fireEvent.click(await screen.findByRole('button', { name: /Add/ }))
    const dialog = await screen.findByRole('dialog')
    const radios = within(dialog).getAllByRole('radio')
    expect(radios.map(radio => radio.getAttribute('name'))).toEqual(['add-model-option', 'add-model-option'])
    fireEvent.click(within(dialog).getByLabelText(/Copy existing/))
    const save = within(dialog).getByRole('button', { name: /Save/ })
    expect(save).toBeDisabled()
    expect(save).toHaveAccessibleDescription('Choose a model to copy to enable Save.')
  })

  it('hides Add and Re-calculate without the rights and shows list errors with Refresh', async () => {
    setup([1])
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? Promise.resolve([{ id: 50, actions: [{ id: 1 }] }])
        : Promise.reject(new ApiError('http', '/api/engagementApi/GetAllEngagement', 500)),
    )
    renderScreen()
    expect(await screen.findByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add/ })).not.toBeInTheDocument()
  })
})
