import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { api } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { WorkflowStructure } from '../workflow-admin/WorkflowStructure'

// The URL is live: replace() changes what useSearchParams returns on the next render, as in Next.
let search = 'workflow=12&node=stageGroup:5'
const replace = jest.fn((url: string) => {
  search = url.split('?')[1] ?? ''
})

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/case',
  useSearchParams: () => new URLSearchParams(search),
}))

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const put = jest.mocked(api.put)
const post = jest.mocked(api.post)

const STAGE_GROUPS = [
  { id: 5, name: 'Group A', description: 'First group', sortOrder: 1, cfcWorkflowStages: [] },
  { id: 6, name: 'Group B', description: 'Second group', sortOrder: 2, cfcWorkflowStages: [] },
]

const STAGES = [
  {
    id: 20,
    name: 'Stage One',
    description: 'Intro',
    numericValue: 1,
    numericLabel: null,
    sortOrder: 1,
    defaultNextCheckSuccessPeriod: 7,
    defaultNextCheckFailurePeriod: 3,
    defaultNextCheckSuccessDay: 1,
    defaultNextCheckFailureDay: 2,
    defaultAttendanceDurationPeriod: 30,
    defaultNextCheckCron: '0 4 1 * *',
    cfcWorkflowStageGroupId: 5,
    cfcWorkflowStageRuleGroups: [],
  },
]

const RULE_GROUPS = [
  {
    id: 40,
    name: 'Group Success',
    description: null,
    sortOrder: 1,
    isSuccess: true,
    cfcWorkflowStageId: 20,
    mustPassAllRules: true,
    cfcWorkflowStageRuleGroupConstraints: null,
    cfcWorkflowStageRules: null,
    cfcWorkflowStageRuleGroupTriggers: null,
  },
]

const RULE_ATTRIBUTE = {
  id: 300,
  cfcWorkflowRuleDefinitionAttributeId: 17,
  cfcWorkflowStageRuleGroupId: 40,
  value: '3',
  dataType: 'Int32',
  name: 'Absences',
  description: null,
  sortOrder: 1,
}

const RULES = [
  {
    id: 30,
    sortOrder: 1,
    startDate: null,
    endDate: null,
    name: 'Rule Absent',
    cfcWorkflowStageRuleAttributes: [RULE_ATTRIBUTE],
  },
]

function claims(actions: number[]) {
  return Promise.resolve([{ id: 22, actions: actions.map(id => ({ id })) }])
}

const CASE_CLAIMS = [1, 2, 3, 4]

function mockReads() {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims') return claims(CASE_CLAIMS)
    if (path === 'caseapi/workflows/12') return Promise.resolve(STAGE_GROUPS)
    if (path === 'caseapi/workflows/12/stageGroups/5') {
      return Promise.resolve(STAGE_GROUPS[0])
    }
    if (path === 'caseapi/workflows/12/stageGroups/5/stages') return Promise.resolve(STAGES)
    if (path === 'caseapi/workflows/12/stageGroups/5/stages/20') return Promise.resolve(STAGES[0])
    if (path === 'caseapi/workflows/12/stageGroups/6/stages') return Promise.resolve([])
    if (path === 'caseapi/workflows/12/stageGroups/5/stages/20/ruleGroups')
      return Promise.resolve(RULE_GROUPS)
    if (path === 'caseapi/workflows/12/stageGroups/5/stages/20/ruleGroups/40')
      return Promise.resolve(RULE_GROUPS[0])
    if (path === 'caseapi/workflows/12/stageGroups/5/stages/20/ruleGroups/40/rules')
      return Promise.resolve(RULES)
    if (path === 'caseapi/workflows/12/stageGroups/5/stages/20/ruleGroups/40/rules/30')
      return Promise.resolve(RULES[0])
    if (path === 'caseapi/workflows/12/stageGroups/5/stages/20/ruleGroups/40/triggers')
      return Promise.resolve([])
    return Promise.resolve([])
  })
  post.mockResolvedValue({ 'en-GB': {} })
}

function renderStructure(initialNodeKey: string | null = 'stageGroup:5') {
  return render(
    <ProfileProvider>
      <WorkflowStructure workflowId={12} initialNodeKey={initialNodeKey} onStatsReload={jest.fn()} />
    </ProfileProvider>,
  )
}

// The canvas is the default view; List mode is the keyboard tree behind the toggle.
async function renderTree(initialNodeKey: string | null = 'stageGroup:5') {
  const result = renderStructure(initialNodeKey)
  await screen.findByRole('button', { name: 'List' })
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'List' }))
  })
  return result
}

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  replace.mockClear()
  search = 'workflow=12&node=stageGroup:5'
  mockReads()
})

const rootCalls = () => get.mock.calls.filter(([path]) => path === 'caseapi/workflows/12').length

describe('StructureTree', () => {
  it('loads stage groups and selects a node from the deep link', async () => {
    await renderTree('stageGroup:5')

    expect(await screen.findByRole('treeitem', { name: /Group A/i })).toBeInTheDocument()
    expect(screen.getByRole('treeitem', { name: /Group A/i })).toHaveAttribute('aria-selected', 'true')
    expect(get).toHaveBeenCalledWith('caseapi/workflows/12', expect.any(Object))
    expect(await screen.findByLabelText('Name')).toHaveValue('Group A')
  })

  it('resolves a nested deep link and expands its ancestor path', async () => {
    await renderTree('stage:20')

    const stage = await screen.findByRole('treeitem', { name: /Stage One/i })
    expect(stage).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Group A › Stage One')).toBeInTheDocument()
    expect(await screen.findByLabelText('Name')).toHaveValue('Stage One')
  })

  it('syncs node selection to the URL', async () => {
    await renderTree(null)

    const group = await screen.findByRole('treeitem', { name: /Group B/i })
    fireEvent.click(group)

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/case?workflow=12&node=stageGroup%3A6', { scroll: false }),
    )
  })

  it('R8-01 selecting a node neither refetches the roots nor collapses other branches', async () => {
    await renderTree('stage:20')
    await screen.findByRole('treeitem', { name: /Stage One/i })
    const rootsBefore = rootCalls()

    fireEvent.click(screen.getByRole('treeitem', { name: /Group B/i }))
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(expect.stringContaining('stageGroup%3A6'), { scroll: false }),
    )
    expect(screen.getByRole('treeitem', { name: /Group B/i })).toHaveAttribute('aria-selected', 'true')

    expect(rootCalls()).toBe(rootsBefore)
    expect(screen.getByRole('treeitem', { name: /Stage One/i })).toBeInTheDocument()
    expect(screen.getByRole('treeitem', { name: /Group A/i })).toHaveAttribute('aria-expanded', 'true')
  })

  it('R8-12 the URL carries the trail and a trail link is one walk, not a search', async () => {
    await renderTree('stageGroup:5/stage:20/ruleGroup:40/rulesBranch:40/rule:30')
    expect(await screen.findByRole('treeitem', { name: /Rule Absent/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // One walk: each level on the trail is fetched exactly once and the triggers branch never.
    const ruleFetches = get.mock.calls.filter(([path]) =>
      String(path).endsWith('/ruleGroups/40/rules'),
    ).length
    expect(ruleFetches).toBe(1)
    expect(get).not.toHaveBeenCalledWith(
      'caseapi/workflows/12/stageGroups/5/stages/20/ruleGroups/40/triggers',
      expect.anything(),
    )

    fireEvent.click(screen.getByRole('treeitem', { name: /Stage One/i }))
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith('/case?workflow=12&node=stageGroup%3A5%2Fstage%3A20', {
        scroll: false,
      }),
    )
  })

  it('R8-14 the roots load once even though the resource labels arrive later', async () => {
    await renderTree('stageGroup:5')
    await screen.findByRole('treeitem', { name: /Group A/i })
    await screen.findByLabelText('Name')
    expect(rootCalls()).toBe(1)
  })

  it('expands a stage group and loads stages on Enter', async () => {
    await renderTree('stageGroup:5')

    const group = await screen.findByRole('treeitem', { name: /Group A/i })
    fireEvent.click(within(group).getByLabelText(/Expand/i))

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('caseapi/workflows/12/stageGroups/5/stages', expect.any(Object)),
    )

    const stage = await screen.findByRole('treeitem', { name: /Stage One/i })
    fireEvent.click(stage)

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('caseapi/workflows/12/stageGroups/5/stages/20', expect.any(Object)),
    )
    expect(await screen.findByLabelText('Name')).toHaveValue('Stage One')
  })

  it('R7-L11 lists rule attributes under their rule, read from the rule by id', async () => {
    await renderTree('rule:30')

    const rule = await screen.findByRole('treeitem', { name: /Rule Absent/i })
    expect(rule).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('treeitem', { name: /Absences/i })).not.toBeInTheDocument()

    fireEvent.click(within(rule).getByLabelText(/Expand/i))
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        'caseapi/workflows/12/stageGroups/5/stages/20/ruleGroups/40/rules/30',
        expect.any(Object),
      ),
    )
    const attribute = await screen.findByRole('treeitem', { name: /Absences/i })
    expect(Number(attribute.getAttribute('aria-level'))).toBe(Number(rule.getAttribute('aria-level')) + 1)
  })

  it('shows a retry action when loading children fails', async () => {
    let attempts = 0
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(CASE_CLAIMS)
      if (path === 'caseapi/workflows/12') return Promise.resolve(STAGE_GROUPS)
      if (path === 'caseapi/workflows/12/stageGroups/5') return Promise.resolve(STAGE_GROUPS[0])
      if (path === 'caseapi/workflows/12/stageGroups/5/stages') {
        attempts += 1
        return attempts === 1 ? Promise.reject(new Error('failed')) : Promise.resolve(STAGES)
      }
      return Promise.resolve([])
    })
    await renderTree('stageGroup:5')

    const group = await screen.findByRole('treeitem', { name: /Group A/i })
    fireEvent.click(within(group).getByLabelText(/Expand/i))
    fireEvent.click(await within(group).findByText('Retry'))

    expect(await screen.findByRole('treeitem', { name: /Stage One/i })).toBeInTheDocument()
  })

  it('requires stage group name before save', async () => {
    await renderTree('stageGroup:5')

    await screen.findByLabelText('Name')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save/i }))
    })

    // Requirement 8.1: the name field carries its own message, and it clears as soon as a name is typed.
    const name = screen.getByLabelText('Name')
    expect(await screen.findByText('Enter a name.')).toHaveAttribute('id', 'stage-group-name-error')
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAttribute('aria-describedby', 'stage-group-name-error')
    expect(put).not.toHaveBeenCalled()

    fireEvent.change(name, { target: { value: 'Group A' } })
    expect(screen.queryByText('Enter a name.')).not.toBeInTheDocument()
    expect(name).not.toHaveAttribute('aria-invalid')
  })

  it('R8-03 renaming a rule group updates its label in the tree', async () => {
    put.mockResolvedValue(undefined)
    await renderTree('stageGroup:5/stage:20/ruleGroup:40')
    const name = await screen.findByLabelText('Name')
    expect(name).toHaveValue('Group Success')

    RULE_GROUPS[0].name = 'Group Renamed'
    fireEvent.change(name, { target: { value: 'Group Renamed' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save/i }))
    })
    await waitFor(() => expect(put).toHaveBeenCalledWith('caseapi/updatestagerulegroup', expect.anything()))
    expect(await screen.findByRole('treeitem', { name: /Group Renamed/i })).toBeInTheDocument()
    RULE_GROUPS[0].name = 'Group Success'
  })

  it('R8-35 selecting a rule reads it once for the panel; attributes load on expand only', async () => {
    await renderTree('stageGroup:5/stage:20/ruleGroup:40/rulesBranch:40/rule:30')
    const rule = await screen.findByRole('treeitem', { name: /Rule Absent/i })
    fireEvent.click(rule)
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        'caseapi/workflows/12/stageGroups/5/stages/20/ruleGroups/40/rules/30',
        expect.any(Object),
      ),
    )
    await screen.findByLabelText('Class type')
    const reads = get.mock.calls.filter(([path]) => String(path).endsWith('/rules/30')).length
    expect(reads).toBe(1)
    expect(screen.queryByRole('treeitem', { name: /Absences/i })).not.toBeInTheDocument()
  })

  it('R8-13 deleting the selected node clears the panel and the URL node', async () => {
    post.mockResolvedValue(undefined)
    await renderTree('stageGroup:5/stage:20/ruleGroup:40')
    await screen.findByLabelText('Name')
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(CASE_CLAIMS)
      if (path === 'caseapi/workflows/12') return Promise.resolve(STAGE_GROUPS)
      if (path === 'caseapi/workflows/12/stageGroups/5/stages') return Promise.resolve(STAGES)
      if (path === 'caseapi/workflows/12/stageGroups/5/stages/20/ruleGroups') return Promise.resolve([])
      if (path === 'caseapi/workflows/12/stageGroups/5/stages/20/ruleGroups/40')
        return Promise.resolve(RULE_GROUPS[0])
      return Promise.resolve([])
    })

    fireEvent.click(screen.getByRole('button', { name: /^Delete/i }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    })
    await waitFor(() => expect(post).toHaveBeenCalledWith('caseapi/deletestagerulegroup', expect.anything()))
    await waitFor(() =>
      expect(screen.queryByRole('treeitem', { name: /Group Success/i })).not.toBeInTheDocument(),
    )
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/case?workflow=12', { scroll: false }))
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  })

  it('updates a stage group with the legacy endpoint', async () => {
    put.mockResolvedValue(undefined)
    await renderTree('stageGroup:5')

    await screen.findByLabelText('Name')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Group A updated' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save/i }))
    })

    await waitFor(() => expect(put).toHaveBeenCalled())
    const [, options] = put.mock.calls[0] ?? []
    expect(options?.body).toMatchObject({
      id: 5,
      name: 'Group A updated',
      description: 'First group',
      cfcWorkflowId: 12,
    })
  })

  it('R7-L06 creates a stage group with id null and no sortOrder, as the legacy modal', async () => {
    post.mockImplementation((path: string) =>
      Promise.resolve(path === 'ResourceApi/GetResourcesForScreen' ? { 'en-GB': {} } : undefined),
    )
    await renderTree('stageGroup:5')
    fireEvent.click(await screen.findByRole('button', { name: 'Add stage group' }))
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Group C' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save/i }))
    })
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('caseapi/createWorkflowStageGroup', {
        body: { id: null, name: 'Group C', description: '', cfcWorkflowId: 12 },
      }),
    )
  })

  it('R8-02 after creating a stage group the form closes and Save cannot post twice', async () => {
    post.mockImplementation((path: string) =>
      Promise.resolve(path === 'ResourceApi/GetResourcesForScreen' ? { 'en-GB': {} } : undefined),
    )
    await renderTree('stageGroup:5')
    fireEvent.click(await screen.findByRole('button', { name: 'Add stage group' }))
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Group C' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save/i }))
    })
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('caseapi/createWorkflowStageGroup', expect.anything()),
    )
    // The draft is gone: the roots were refreshed and no create form is armed any more.
    await waitFor(() => expect(screen.queryByLabelText('Name')).not.toBeInTheDocument())
    const creates = post.mock.calls.filter(([path]) => path === 'caseapi/createWorkflowStageGroup').length
    expect(creates).toBe(1)
    expect(rootCalls()).toBe(2)
  })

  it('blocks deleting the last stage group', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(CASE_CLAIMS)
      if (path === 'caseapi/workflows/12') return Promise.resolve([STAGE_GROUPS[0]])
      if (path === 'caseapi/workflows/12/stageGroups/5') return Promise.resolve(STAGE_GROUPS[0])
      return Promise.resolve([])
    })

    await renderTree('stageGroup:5')

    await screen.findByLabelText('Name')
    fireEvent.click(screen.getByRole('button', { name: /Delete/i }))
    const dialog = await screen.findByRole('alertdialog')
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /Confirm/i }))
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('At least one stage group')
    expect(post).not.toHaveBeenCalledWith('caseapi/deleteWorkflowStageGroup', expect.anything())
  })
  it('shows the pipeline canvas by default and its lanes and stages', async () => {
    renderStructure(null)

    expect(await screen.findByRole('list', { name: 'Workflow pipeline' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Stage One/i })).toBeInTheDocument()
    expect(screen.queryByRole('tree')).not.toBeInTheDocument()
  })

  it('selects a stage from the canvas and opens its inspector panel', async () => {
    renderStructure(null)

    fireEvent.click(await screen.findByRole('button', { name: /Stage One/i }))

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('caseapi/workflows/12/stageGroups/5/stages/20', expect.any(Object)),
    )
    expect(await screen.findByLabelText('Name')).toHaveValue('Stage One')
  })

  it('toggles between Diagram and List without losing the structure', async () => {
    renderStructure(null)

    await screen.findByRole('list', { name: 'Workflow pipeline' })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'List' }))
    })

    const tree = await screen.findByRole('tree')
    expect(tree).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('list', { name: 'Workflow pipeline' })).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Diagram' }))
    })
    expect(await screen.findByRole('list', { name: 'Workflow pipeline' })).toBeInTheDocument()
  })

  it('List mode carries every node action: expand, add and select', async () => {
    await renderTree('stageGroup:5')

    const group = await screen.findByRole('treeitem', { name: /Group A/i })
    expect(within(group).getByLabelText(/Expand Group A/i)).toBeInTheDocument()
    expect(within(group).getByLabelText(/Add stage Group A/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add stage group' })).toBeInTheDocument()

    fireEvent.click(within(group).getByLabelText(/Add stage Group A/i))
    expect(await screen.findByText(/Add Stage/)).toBeInTheDocument()
  })

  it('moves between tree items with the arrow keys', async () => {
    await renderTree('stageGroup:5')

    const group = await screen.findByRole('treeitem', { name: /Group A/i })
    group.focus()
    fireEvent.keyDown(group, { key: 'ArrowDown' })
    expect(screen.getByRole('treeitem', { name: /Group B/i })).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('treeitem', { name: /Group B/i }), { key: 'ArrowUp' })
    expect(group).toHaveFocus()

    fireEvent.keyDown(group, { key: 'ArrowRight' })
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('caseapi/workflows/12/stageGroups/5/stages', expect.any(Object)),
    )
    expect(await screen.findByRole('treeitem', { name: /Stage One/i })).toBeInTheDocument()
  })

  // Requirement 2.1: the row buttons are hidden mouse shortcuts, so every action also has a key on the treeitem.
  it('keeps row buttons out of the tree semantics and offers keyboard actions', async () => {
    let attempts = 0
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(CASE_CLAIMS)
      if (path === 'caseapi/workflows/12') return Promise.resolve(STAGE_GROUPS)
      if (path === 'caseapi/workflows/12/stageGroups/5') return Promise.resolve(STAGE_GROUPS[0])
      if (path === 'caseapi/workflows/12/stageGroups/5/stages') {
        attempts += 1
        return attempts === 1 ? Promise.reject(new Error('failed')) : Promise.resolve(STAGES)
      }
      return Promise.resolve([])
    })
    await renderTree('stageGroup:5')

    const group = await screen.findByRole('treeitem', { name: /Group A/i })
    expect(within(group).queryAllByRole('button')).toHaveLength(0)
    expect(group).toHaveAttribute('aria-keyshortcuts', 'Insert')

    fireEvent.keyDown(group, { key: 'ArrowRight' })
    await within(group).findByText('Retry')
    fireEvent.keyDown(group, { key: 'ArrowRight' })
    expect(await screen.findByRole('treeitem', { name: /Stage One/i })).toBeInTheDocument()

    fireEvent.keyDown(group, { key: 'Insert' })
    expect(await screen.findByText(/Add Stage/)).toBeInTheDocument()
  })

  it('shows a retryable error when the stage groups fail to load', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(CASE_CLAIMS)
      if (path === 'caseapi/workflows/12') return Promise.reject(new Error('down'))
      return Promise.resolve([])
    })

    renderStructure(null)

    expect(await screen.findByRole('button', { name: /Refresh/i })).toBeInTheDocument()
  })
})
