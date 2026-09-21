import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { EngagementModelDetailsScreen } from '../EngagementModelDetailsScreen'
import {
  filterNodeInput,
  flattenNodes,
  hasConstraint,
  isValidUrl,
  parseModelId,
  parseModelView,
  toDetailsForm,
  toSaveBody,
  validateDetails,
  weightHidden,
} from '../details-model'

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

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)

const BUILDING = {
  constraints: [],
  assessmentStartDate: '15/09/2026',
  assessmentEndDate: '15/09/2026',
  withDrawalStartDate: '15/09/2026',
  withDrawalEndDate: '15/09/2026',
  withDrawalReasons: [],
  assessmentTypeIds: [],
}

const node = (overrides: Record<string, unknown>) => ({
  parentNodeId: 1,
  isActive: false,
  nodeTypeId: 5,
  url: '',
  urlKey: '',
  mapTo: null,
  synapsesId: 0,
  weight: null,
  decay: null,
  patience: null,
  threshold: null,
  minZ: null,
  maxZ: null,
  childs: [],
  synapsesOptions: [],
  ...overrides,
})

const MODEL = {
  appliedDto: {
    id: 9,
    modelName: 'Attendance Risk',
    isActive: true,
    constraints: [{ isInclude: true, category: 'facultyids', value: '3', valueDescription: 'Science' }],
  },
  buildingDto: BUILDING,
  nodeDto: {
    node: node({
      id: 1,
      parentNodeId: 0,
      name: 'Engagement',
      level: 1,
      childs: [
        node({ id: 2, name: 'Background', nodeTypeId: 4, level: 2 }),
        node({
          id: 3,
          name: 'Presence',
          level: 2,
          isActive: true,
          weight: 0.5,
          synapsesId: 11,
          childs: [
            node({ id: 30, parentNodeId: 3, name: 'Swipe', level: 3, isActive: true, weight: 1, decay: 0.2 }),
          ],
        }),
      ],
    }),
    synapsesOptions: null,
  },
}

function setup(actions = [1, 3]) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 50, actions: actions.map(id => ({ id })) }])
    if (path === 'engagementApi/GetEngagementModelConfigViewModels') return Promise.resolve(MODEL)
    return Promise.resolve([])
  })
  post.mockImplementation((path: string) =>
    path === 'ResourceApi/GetResourcesForScreen'
      ? Promise.resolve({ 'en-GB': {} })
      : Promise.resolve(undefined),
  )
}

const renderScreen = (id = '9') =>
  render(
    <ProfileProvider>
      <EngagementModelDetailsScreen idParam={id} />
    </ProfileProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('engagement model details helpers', () => {
  const view = parseModelView(MODEL)

  it('parses the view and treats a response without buildingDto as not found', () => {
    expect(view?.applied.modelName).toBe('Attendance Risk')
    expect(flattenNodes(view!.root).map(entry => entry.path)).toEqual(['r', 'r.0', 'r.1', 'r.1.0'])
    expect(parseModelView({ appliedDto: { id: 9, constraints: [] }, nodeDto: { node: {} } })).toBeNull()
    expect(parseModelId('9')).toBe(9)
    expect(parseModelId('abc')).toBeNull()
  })

  it('applies the legacy weight, input and url rules', () => {
    const [, , presence, swipe] = flattenNodes(view!.root)
    expect(weightHidden(view!.root, null)).toBe(true)
    expect(weightHidden(presence.node, view!.root)).toBe(false)
    expect(weightHidden(swipe.node, presence.node)).toBe(true)
    expect(filterNodeInput('patience', '1a.5')).toBe('15')
    expect(filterNodeInput('weight', '-0.5x')).toBe('-0.5')
    expect(isValidUrl('https://example.com/score')).toBe(true)
    expect(isValidUrl('example')).toBe(false)
  })

  it('validates decay and the active background url', () => {
    const form = toDetailsForm(view!)
    form.nodes['r.1.0'] = { ...form.nodes['r.1.0'], decay: '1.5' }
    form.nodes['r.0'] = { ...form.nodes['r.0'], isActive: true, url: 'nope' }
    const errors = validateDetails(view!, form, field => field)
    expect(errors.map(error => error.message)).toEqual([
      'Please enter a valid URL.',
      'The decay for Swipe should be a value between 0.01 and 0.99',
    ])
  })

  it('F6-1 builds the SaveModel body with numbers and the edited buildingDto', () => {
    const form = toDetailsForm(view!)
    form.modelName = 'Renamed'
    form.nodes['r.1'] = { ...form.nodes['r.1'], weight: '0.75', decay: '' }
    const building = { ...BUILDING, withDrawalStartDate: '01/09/2026' }
    const body = toSaveBody(view!, form, building)
    expect(body.appliedDto).toEqual({ ...MODEL.appliedDto, modelName: 'Renamed' })
    expect(body.buildingDto).toBe(building)
    expect(body.nodeDto.node.childs[1].weight).toBe(0.75)
    expect(body.nodeDto.node.childs[1].childs[0].decay).toBe(0.2)
    expect(
      hasConstraint(body.appliedDto.constraints, {
        isInclude: false,
        category: 'FacultyIds',
        value: '3',
        valueDescription: null,
      }),
    ).toBe(true)
  })
})

describe('EngagementModelDetailsScreen', () => {
  it('loads the model and saves the edited body', async () => {
    setup()
    renderScreen()
    const name = await screen.findByLabelText('Model Name')
    expect(get).toHaveBeenCalledWith(
      'engagementApi/GetEngagementModelConfigViewModels',
      expect.objectContaining({ query: { engagementId: 9 } }),
    )
    expect(screen.getByText('Science')).toBeInTheDocument()
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    fireEvent.change(name, { target: { value: 'Renamed' } })
    fireEvent.change(screen.getByLabelText('Weight Presence'), { target: { value: '0.9' } })
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(save)
    })
    const call = post.mock.calls.find(([path]) => path === 'engagementApi/SaveModel')
    expect(call?.[1]).toEqual(
      expect.objectContaining({
        body: expect.objectContaining({
          appliedDto: expect.objectContaining({ id: 9, modelName: 'Renamed' }),
        }),
      }),
    )
    expect(push).toHaveBeenCalledWith('/engagement')
  })

  it('F6-1 marks the form dirty and saves the dataset-building change with the model', async () => {
    setup()
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return Promise.resolve([{ id: 50, actions: [{ id: 1 }, { id: 3 }] }])
      if (path === 'engagementApi/GetEngagementModelConfigViewModels') return Promise.resolve(MODEL)
      if (path === 'engagementApi/GetCollegeYear') return Promise.resolve([{ id: 1, description: 'Year 1' }])
      return Promise.resolve([])
    })
    renderScreen()
    await screen.findByLabelText('Model Name')
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    const panel = screen.getByRole('region', { name: 'Dataset Building' })
    fireEvent.click(within(panel).getByRole('combobox', { name: 'Category' }))
    fireEvent.click(await screen.findByRole('option', { name: 'College Year' }))
    fireEvent.click(within(panel).getByRole('combobox', { name: 'Include' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Include' }))
    fireEvent.click(within(panel).getByRole('combobox', { name: 'Value' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Year 1' }))
    fireEvent.click(within(panel).getByRole('button', { name: 'Add' }))
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(save)
    })
    const call = post.mock.calls.find(([path]) => path === 'engagementApi/SaveModel')
    expect(call?.[1]).toEqual(
      expect.objectContaining({
        body: expect.objectContaining({
          buildingDto: expect.objectContaining({
            constraints: [expect.objectContaining({ category: 'collegeyearids', value: '1' })],
          }),
        }),
      }),
    )
  })

  it('F6-5 shows the general error on a 5xx save and not authorised on a 401', async () => {
    setup()
    renderScreen()
    const name = await screen.findByLabelText('Model Name')
    fireEvent.change(name, { target: { value: 'Renamed' } })
    post.mockImplementation((path: string) =>
      path === 'engagementApi/SaveModel'
        ? Promise.reject(new ApiError('http', '/api/engagementApi/SaveModel', 500, 'Stack trace'))
        : Promise.resolve({ 'en-GB': {} }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('There was an error while trying to save the item.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('Stack trace')
    post.mockImplementation((path: string) =>
      path === 'engagementApi/SaveModel'
        ? Promise.reject(new ApiError('auth', '/api/engagementApi/SaveModel', 401))
        : Promise.resolve({ 'en-GB': {} }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('You do not have permission to view this.')
    expect(push).not.toHaveBeenCalled()
  })

  it('F6-6 does not save when Enter is pressed in a field', async () => {
    setup()
    renderScreen()
    const name = await screen.findByLabelText('Model Name')
    fireEvent.change(name, { target: { value: 'Renamed' } })
    await act(async () => {
      fireEvent.keyDown(name, { key: 'Enter' })
      fireEvent.submit(name)
    })
    expect(post.mock.calls.find(([path]) => path === 'engagementApi/SaveModel')).toBeUndefined()
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it('F6-7 says only the charts and Map To are legacy-only', async () => {
    setup()
    renderScreen()
    await screen.findByLabelText('Model Name')
    expect(screen.getByText(/only in the legacy editor/)).toHaveTextContent(
      'The prevalence charts and Map To are only in the legacy editor for now.',
    )
  })

  it('shows the safe-mode message when the save is blocked', async () => {
    setup()
    post.mockImplementation((path: string) =>
      path === 'engagementApi/SaveModel'
        ? Promise.reject(new ApiError('blocked', path))
        : Promise.resolve({ 'en-GB': {} }),
    )
    renderScreen()
    fireEvent.change(await screen.findByLabelText('Model Name'), { target: { value: 'Renamed' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(
      await screen.findByText('Saving is turned off in this environment (safe mode).'),
    ).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it('is read-only without Engagement + Edit', async () => {
    setup([1])
    renderScreen()
    expect(await screen.findByText('View only')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Model Name')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete Science' })).toBeDisabled()
  })

  it('shows node errors as linked text that clears as soon as the value is fixed', async () => {
    setup()
    renderScreen()
    expect(await screen.findByRole('heading', { name: 'Model details' })).toBeInTheDocument()
    const decay = screen.getByLabelText('Decay Swipe')
    fireEvent.change(decay, { target: { value: '1.5' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(decay).toHaveAttribute('aria-invalid', 'true')
    const describedBy = decay.getAttribute('aria-describedby')
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent(
      'The decay for Swipe should be a value between 0.01 and 0.99',
    )
    fireEvent.change(decay, { target: { value: '0.3' } })
    expect(decay).toHaveAttribute('aria-invalid', 'false')
    expect(decay).not.toHaveAttribute('aria-describedby')
  })

  it('flags each missing rule part on Add and clears a flag once that part is chosen', async () => {
    setup()
    renderScreen()
    await screen.findByLabelText('Model Name')
    const applied = screen.getByRole('region', { name: 'Model applied to' })
    fireEvent.click(within(applied).getByRole('button', { name: 'Add' }))
    expect(within(applied).getByText('Choose Include or Exclude.')).toBeInTheDocument()
    expect(within(applied).getByText('Choose a category.')).toBeInTheDocument()
    expect(within(applied).getByText('Choose a value.')).toBeInTheDocument()
    expect(document.getElementById('engagement-rule-include')).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById('engagement-rule-category')).toHaveAttribute(
      'aria-describedby',
      'engagement-rule-category-error',
    )
  })

  it('removes a rule when editing is allowed', async () => {
    setup()
    renderScreen()
    const applied = await screen.findByRole('region', { name: 'Model applied to' })
    fireEvent.click(within(applied).getByRole('button', { name: 'Delete Science' }))
    expect(within(applied).getByText('There are no rules.')).toBeInTheDocument()
  })

  it('shows not found for an unknown model and an error with retry', async () => {
    setup()
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return Promise.resolve([{ id: 50, actions: [{ id: 1 }] }])
      return Promise.resolve({ appliedDto: { id: 99, constraints: [] }, nodeDto: { node: {} } })
    })
    const { unmount } = renderScreen('99')
    expect(await screen.findByText('The model could not be found.')).toBeInTheDocument()
    unmount()

    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return Promise.resolve([{ id: 50, actions: [{ id: 1 }] }])
      return Promise.reject(new ApiError('http', path, 500))
    })
    renderScreen()
    expect(await screen.findByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText('The server could not complete the request.')).toBeInTheDocument(),
    )
  })
})

describe('dataset building', () => {
  const counts = { countSectionA: 12, countSectionB: 4, countSectionC: 3 }

  function buildingSetup(count: unknown = counts) {
    setup()
    post.mockImplementation((path: string) => {
      if (path === 'ResourceApi/GetResourcesForScreen') return Promise.resolve({ 'en-GB': {} })
      if (path === 'engagementApi/CountStudentsInModelBuildingCalculation') return Promise.resolve(count)
      return Promise.resolve(undefined)
    })
  }

  const countBody = () =>
    post.mock.calls
      .filter(([path]) => path === 'engagementApi/CountStudentsInModelBuildingCalculation')
      .at(-1)?.[1]?.body

  it('counts students and sends the withdrawal part only when that range is switched on', async () => {
    buildingSetup()
    renderScreen()
    await screen.findByLabelText('Model Name')
    const panel = screen.getByRole('region', { name: 'Dataset Building' })

    await act(async () => {
      fireEvent.click(within(panel).getByRole('button', { name: 'Calculate' }))
    })
    expect(countBody()).toMatchObject({
      withDrawalStartDate: '',
      withDrawalReasons: [],
      assessmentTypeIds: [],
    })
    // Section A and the total both read 12 while no withdrawal range is set.
    expect(within(panel).getAllByText('12')).toHaveLength(2)

    await act(async () => {
      fireEvent.click(within(panel).getByRole('checkbox', { name: 'Withdrawn between range' }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^Calculate/ }))
    })
    expect(countBody()).toMatchObject({ withDrawalStartDate: '15/09/2026', withDrawalEndDate: '15/09/2026' })
    // With a withdrawal range the total is the withdrawal and assessment counts, not section A.
    expect(within(panel).getByText('7')).toBeInTheDocument()
  })

  it('offers College Year here, which the applied rules do not', async () => {
    buildingSetup()
    renderScreen()
    await screen.findByLabelText('Model Name')
    const panel = screen.getByRole('region', { name: 'Dataset Building' })
    fireEvent.click(within(panel).getByRole('combobox', { name: 'Category' }))
    expect(await screen.findByRole('option', { name: 'College Year' })).toBeInTheDocument()
  })

  it('exports only once there are students, and explains a blocked export', async () => {
    buildingSetup()
    renderScreen()
    await screen.findByLabelText('Model Name')
    const panel = screen.getByRole('region', { name: 'Dataset Building' })
    const exportButton = within(panel).getByRole('button', { name: 'Export profile set' })
    expect(exportButton).toBeDisabled()

    await act(async () => {
      fireEvent.click(within(panel).getByRole('button', { name: 'Calculate' }))
    })
    expect(exportButton).toBeEnabled()

    post.mockImplementation((path: string) =>
      path === 'engagementApi/ExportProfileSet'
        ? Promise.reject(new ApiError('blocked', '/api/engagementApi/ExportProfileSet'))
        : Promise.resolve(path === 'ResourceApi/GetResourcesForScreen' ? { 'en-GB': {} } : undefined),
    )
    await act(async () => {
      fireEvent.click(exportButton)
    })
    expect(await screen.findByText(/safe mode/)).toBeInTheDocument()
  })

  it('shows zero counts when the count answer is not a number set', async () => {
    buildingSetup('nonsense')
    renderScreen()
    await screen.findByLabelText('Model Name')
    const panel = screen.getByRole('region', { name: 'Dataset Building' })
    await act(async () => {
      fireEvent.click(within(panel).getByRole('button', { name: 'Calculate' }))
    })
    expect(within(panel).getAllByText('0').length).toBeGreaterThan(0)
  })
})

describe('run node', () => {
  it('runs a node for the events range and reports the calculation guid', async () => {
    setup()
    post.mockImplementation((path: string) => {
      if (path === 'ResourceApi/GetResourcesForScreen') return Promise.resolve({ 'en-GB': {} })
      if (path === 'engagementApi/RunNode') return Promise.resolve('abc-123')
      return Promise.resolve(undefined)
    })
    renderScreen()
    await screen.findByLabelText('Model Name')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Run Presence' }))
    })
    const body = post.mock.calls.find(([path]) => path === 'engagementApi/RunNode')?.[1]?.body
    expect(body).toMatchObject({ modelId: 9, nodeId: 3 })
    expect(screen.getByRole('status')).toHaveTextContent('The node has run successfully - Guid: abc-123')
  })

  it('offers no Run on a level three node or the background node', async () => {
    setup()
    renderScreen()
    await screen.findByLabelText('Model Name')
    expect(screen.queryByRole('button', { name: 'Run Swipe' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Run Background' })).not.toBeInTheDocument()
  })
})
