import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ProfileProvider } from '@/shared/shell/profile'
import { PermissionAction } from '@/shared/shell/admin-menu'
import { resetUiCulture, setUiCulture } from '@/shared/i18n/culture'
import { api } from '@/shared/api'
import {
  CfcWorkflowApprovalType,
  CfcWorkflowStatusType,
  WorkflowType,
  type CfcWorkflowDto,
} from '@/types/case'
import { WorkflowList } from '../workflow-admin/WorkflowList'
import { WorkflowHeader } from '../workflow-admin/WorkflowHeader'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)
const put = jest.mocked(api.put)

const WORKFLOW: CfcWorkflowDto = {
  id: 7,
  name: 'Attendance Monitoring',
  startDate: null,
  endDate: null,
  cfcWorkflowTypeId: WorkflowType.Standard,
  sendToEmailBasedOnFaculty: false,
  sendFromEmailBasedOnFaculty: false,
  cfcWorkflowStatusTypeId: CfcWorkflowStatusType.Live,
  cfcWorkflowApprovalTypeId: CfcWorkflowApprovalType.Approve,
  showAsDefault: false,
  defaultContactGroupId: 0,
  totalStudentsInWorkflowCount: 42,
  totalEmailCount: 10,
  totalStageChange: 3,
  nextCheckDate: '2026-09-15T00:00:00',
  finalWarningStageChange: 1,
  cfcWorkflowConstraints: null,
  globalId: null,
}

const PAGE = { items: [WORKFLOW], totalRowCount: 1 }

function setup(onSelect = jest.fn()) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 22, actions: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] }])
    if (path === 'caseapi/workflows') return Promise.resolve(PAGE)
    return Promise.resolve(null)
  })
  post.mockResolvedValue(undefined)
  return {
    onSelect,
    ...render(
      <ProfileProvider>
        <WorkflowList
          selectedId={null}
          reloadToken={0}
          onSelect={onSelect}
          onAdd={jest.fn()}
          onReloaded={jest.fn()}
        />
      </ProfileProvider>,
    ),
  }
}

const listCalls = () => get.mock.calls.filter(([path]) => path === 'caseapi/workflows')

beforeEach(() => {
  jest.clearAllMocks()
})

// Lets a read the test started resolve inside act.
async function settle() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

describe('WorkflowList', () => {
  it('loads workflows with legacy paging parameters', async () => {
    setup()
    expect(await screen.findByRole('row', { name: /Attendance Monitoring/i })).toBeInTheDocument()
    expect(listCalls()[0]?.[1]?.query).toMatchObject({
      pageNumber: '0',
      pageSize: '100',
    })
  })

  it('filters workflows by name on the client', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims')
        return Promise.resolve([{ id: 22, actions: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] }])
      if (path === 'caseapi/workflows')
        return Promise.resolve({
          totalRowCount: 2,
          items: [WORKFLOW, { ...WORKFLOW, id: 8, name: 'Engagement Pathway' }],
        })
      return Promise.resolve(null)
    })
    render(
      <ProfileProvider>
        <WorkflowList
          selectedId={null}
          reloadToken={0}
          onSelect={jest.fn()}
          onAdd={jest.fn()}
          onReloaded={jest.fn()}
        />
      </ProfileProvider>,
    )
    expect(await screen.findByRole('row', { name: /Attendance Monitoring/i })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Engagement Pathway/i })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Attendance' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await settle()
    expect(screen.queryByRole('row', { name: /Engagement Pathway/i })).not.toBeInTheDocument()
  })

  it('selects a workflow row', async () => {
    const onSelect = jest.fn()
    setup(onSelect)
    fireEvent.click(await screen.findByRole('row', { name: /Attendance Monitoring/i }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 7, name: 'Attendance Monitoring' }))
  })

  it('bulk deletes selected workflows', async () => {
    setup()
    const row = await screen.findByRole('row', { name: /Attendance Monitoring/i })
    fireEvent.click(within(row).getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('caseapi/deleteWorkflow', expect.objectContaining({ body: [7] })),
    )
  })

  it('R7-L01 sends empty sort fields until a column is chosen, like the legacy grid', async () => {
    setup()
    await screen.findByRole('row', { name: /Attendance Monitoring/i })
    expect(listCalls()[0]?.[1]?.query).toMatchObject({ sortCol: '', sortDir: '' })
    expect(screen.getByRole('button', { name: 'Sort ascending' })).toBeDisabled()

    const sortBy = screen.getByRole('combobox', { name: 'Sort by' })
    await waitFor(() => expect(sortBy).toBeEnabled())
    fireEvent.click(sortBy)
    fireEvent.click(await screen.findByRole('option', { name: 'Name' }))
    await waitFor(() =>
      expect(listCalls().at(-1)?.[1]?.query).toMatchObject({ sortCol: 'name', sortDir: 'asc' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sort descending' }))
    await waitFor(() =>
      expect(listCalls().at(-1)?.[1]?.query).toMatchObject({ sortCol: 'name', sortDir: 'desc' }),
    )
  })

  it('renders workflows as a grid with one Tab stop and arrow-key movement', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims')
        return Promise.resolve([{ id: 22, actions: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] }])
      if (path === 'caseapi/workflows')
        return Promise.resolve({
          totalRowCount: 2,
          items: [WORKFLOW, { ...WORKFLOW, id: 8, name: 'Engagement Pathway' }],
        })
      return Promise.resolve(null)
    })
    const onSelect = jest.fn()
    render(
      <ProfileProvider>
        <WorkflowList
          selectedId={null}
          reloadToken={0}
          onSelect={onSelect}
          onAdd={jest.fn()}
          onReloaded={jest.fn()}
        />
      </ProfileProvider>,
    )
    const first = await screen.findByRole('row', { name: /Attendance Monitoring/i })
    const grid = screen.getByRole('grid', { name: 'Workflows' })
    expect(within(grid).getAllByRole('row')).toHaveLength(2)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(grid.querySelectorAll('[tabindex="0"]')).toHaveLength(1)

    const firstCell = within(first).getAllByRole('gridcell')[1]
    expect(firstCell).toHaveAttribute('tabindex', '0')
    act(() => firstCell.focus())
    fireEvent.keyDown(firstCell, { key: 'ArrowDown' })
    const second = screen.getByRole('row', { name: /Engagement Pathway/i })
    const secondCell = within(second).getAllByRole('gridcell')[1]
    await waitFor(() => expect(secondCell).toHaveFocus())

    fireEvent.keyDown(secondCell, { key: 'ArrowLeft' })
    await waitFor(() => expect(within(second).getByRole('checkbox')).toHaveFocus())
    fireEvent.keyDown(within(second).getByRole('checkbox'), { key: 'ArrowRight' })
    await waitFor(() => expect(secondCell).toHaveFocus())
    fireEvent.keyDown(secondCell, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 8 }))
  })

  it('keeps loading and empty states outside the grid', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims')
        return Promise.resolve([{ id: 22, actions: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] }])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      return Promise.resolve(null)
    })
    render(
      <ProfileProvider>
        <WorkflowList
          selectedId={null}
          reloadToken={0}
          onSelect={jest.fn()}
          onAdd={jest.fn()}
          onReloaded={jest.fn()}
        />
      </ProfileProvider>,
    )
    await screen.findByRole('row', { name: /Attendance Monitoring/i })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByRole('status')).toHaveTextContent('There are no items to show.')
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
  })

  it('R8-11 a search reads every workflow, not the current page, and hides the pager', async () => {
    const page = Array.from({ length: 12 }, (_, index) => ({
      ...WORKFLOW,
      id: 100 + index,
      name: `Flow ${index}`,
    }))
    const beyond = { ...WORKFLOW, id: 999, name: 'Zeta far away' }
    get.mockImplementation((path: string, options?: { query?: Record<string, unknown> }) => {
      if (path === 'UserApi/GetClaims')
        return Promise.resolve([{ id: 22, actions: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] }])
      if (path === 'caseapi/workflows') {
        const paged = options?.query?.pageSize !== undefined
        return Promise.resolve(
          paged ? { items: page, totalRowCount: 150 } : { items: [...page, beyond], totalRowCount: 13 },
        )
      }
      return Promise.resolve(null)
    })
    render(
      <ProfileProvider>
        <WorkflowList
          selectedId={null}
          reloadToken={0}
          onSelect={jest.fn()}
          onAdd={jest.fn()}
          onReloaded={jest.fn()}
        />
      </ProfileProvider>,
    )
    await screen.findByRole('row', { name: /Flow 0/i })
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zeta' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByRole('row', { name: /Zeta far away/i })).toBeInTheDocument()
    const unpaged = listCalls().at(-1)?.[1]?.query
    expect(unpaged).not.toHaveProperty('pageSize')
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('R8-10 deleting the selected workflow tells the screen which ids went', async () => {
    const onDeleted = jest.fn()
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims')
        return Promise.resolve([{ id: 22, actions: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] }])
      if (path === 'caseapi/workflows') return Promise.resolve(PAGE)
      return Promise.resolve(null)
    })
    post.mockResolvedValue(undefined)
    render(
      <ProfileProvider>
        <WorkflowList
          selectedId={7}
          reloadToken={0}
          onSelect={jest.fn()}
          onAdd={jest.fn()}
          onReloaded={jest.fn()}
          onDeleted={onDeleted}
        />
      </ProfileProvider>,
    )
    fireEvent.click(await screen.findByRole('checkbox', { name: /Attendance Monitoring/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith([7]))
  })

  it('R8-21 offers the third legacy sort column, Final warnings', async () => {
    setup()
    await screen.findByRole('row', { name: /Attendance Monitoring/i })
    const sortBy = screen.getByRole('combobox', { name: 'Sort by' })
    await waitFor(() => expect(sortBy).toBeEnabled())
    fireEvent.click(sortBy)
    fireEvent.click(await screen.findByRole('option', { name: 'Final warnings' }))
    await waitFor(() =>
      expect(listCalls().at(-1)?.[1]?.query).toMatchObject({
        sortCol: 'finalWarningStageChange',
        sortDir: 'asc',
      }),
    )
  })

  it('R7-L20 keeps the selection bar off screen while the list is empty', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims')
        return Promise.resolve([{ id: 22, actions: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] }])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [], totalRowCount: 0 })
      return Promise.resolve(null)
    })
    render(
      <ProfileProvider>
        <WorkflowList
          selectedId={null}
          reloadToken={0}
          onSelect={jest.fn()}
          onAdd={jest.fn()}
          onReloaded={jest.fn()}
        />
      </ProfileProvider>,
    )
    expect(await screen.findByRole('status')).toHaveTextContent('There are no items to show.')
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Selected/)).not.toBeInTheDocument()
  })

  it('opens the list tools below the workspace breakpoint', async () => {
    setup()
    await screen.findByRole('row', { name: /Attendance Monitoring/i })
    const toggle = screen.getByRole('button', { name: 'Show list tools' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Hide list tools' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('keeps the row tick reachable and shows it once focused', async () => {
    setup()
    const row = await screen.findByRole('row', { name: /Attendance Monitoring/i })
    const tick = within(row).getByRole('checkbox')
    expect(tick).not.toHaveAttribute('aria-hidden')
    expect(tick.className).toContain('group-focus-within:opacity-100')
    expect(tick.className).toContain('focus-visible:opacity-100')
    expect(tick.className).toContain('focus-visible:ring-2')
  })

  it('offers a Select of workflows for narrow widths', async () => {
    const onSelect = jest.fn()
    setup(onSelect)
    await screen.findByRole('row', { name: /Attendance Monitoring/i })
    expect(screen.getByLabelText('Workflow')).toBeInTheDocument()
  })
})

function renderHeader(workflow: CfcWorkflowDto, actions = [1, 2, 3, 4], onNotice = jest.fn()) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 22, actions: actions.map(id => ({ id })) }])
    return Promise.resolve(null)
  })
  return render(
    <ProfileProvider>
      <WorkflowHeader
        workflow={workflow}
        onEdit={jest.fn()}
        onConstraints={jest.fn()}
        onManualInterventions={jest.fn()}
        onUpdated={jest.fn()}
        onNotice={onNotice}
      />
    </ProfileProvider>,
  )
}

describe('WorkflowHeader', () => {
  it('shows status, approval, constraints and the five stats for a standard workflow', async () => {
    renderHeader(WORKFLOW)

    expect(await screen.findByRole('button', { name: /Constraints/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toBeInTheDocument()
    expect(screen.getByLabelText('Approved')).toBeInTheDocument()
    expect(screen.getByText('Students')).toBeInTheDocument()
    expect(screen.getByText('Emails')).toBeInTheDocument()
    expect(screen.getByText('Stage changes')).toBeInTheDocument()
    expect(screen.getByText('Final warnings')).toBeInTheDocument()
    expect(screen.getByText('Next check')).toBeInTheDocument()
    expect(screen.getByText('15/09/2026')).toBeInTheDocument()
  })

  // seats-admin-workflow-creator.html:218 gates Constraints with 'create' (Case.Add), Edit with 'edit'.
  it('R7-L04 shows Constraints with Case.Add alone and hides it with Edit alone', async () => {
    const { unmount } = renderHeader(WORKFLOW, [PermissionAction.Access, PermissionAction.Add])
    expect(await screen.findByRole('button', { name: /Constraints/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit/i })).not.toBeInTheDocument()
    unmount()
    renderHeader(WORKFLOW, [PermissionAction.Access, PermissionAction.Edit])
    expect(await screen.findByRole('button', { name: /^Edit/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Constraints/i })).not.toBeInTheDocument()
  })

  it('R7-L03 shows the next check date in the UI culture', async () => {
    setUiCulture('en-US')
    try {
      renderHeader(WORKFLOW)
      expect(await screen.findByText('09/15/2026')).toBeInTheDocument()
    } finally {
      resetUiCulture()
    }
  })

  it('R7-L05 reports ApprovalChanged through onNotice after the PUT', async () => {
    const onNotice = jest.fn()
    put.mockResolvedValue(undefined)
    renderHeader(WORKFLOW, [1, 2, 3, 4], onNotice)
    const trigger = await screen.findByLabelText('Approved')
    await waitFor(() => expect(trigger).toBeEnabled())
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('option', { name: 'Not Approved' }))
    await waitFor(() =>
      expect(put).toHaveBeenCalledWith('caseapi/updateWorkflowApprovalType', {
        query: { workflowId: WORKFLOW.id, approvalTypeValue: 2 },
      }),
    )
    await waitFor(() => expect(onNotice).toHaveBeenCalledWith('Approval changed successfully.', 'success'))
  })

  it.each([
    ['General', WorkflowType.General],
    ['Engagement', WorkflowType.Engagement],
  ])('hides status, approval, constraints and the stats for %s workflows', async (_label, typeId) => {
    renderHeader({ ...WORKFLOW, cfcWorkflowTypeId: typeId })

    expect(await screen.findByRole('button', { name: /Edit/i })).toBeInTheDocument()
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Approved')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Constraints/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Students')).not.toBeInTheDocument()
    expect(screen.queryByText('Next check')).not.toBeInTheDocument()
  })
})
