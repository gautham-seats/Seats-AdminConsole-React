import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { api } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import type { CfcConstraintTypeDto, CfcManualInterventionDto } from '@/types/case'
import { CfcConstraintTypeEnum, ConstraintsDrawer, constraintMode } from '../workflow-admin/ConstraintsDrawer'
import {
  interventionErrorsFor,
  ManualInterventionsDrawer,
  stepErrorsFor,
} from '../workflow-admin/ManualInterventionsDrawer'
import { WorkflowDialog } from '../workflow-admin/WorkflowDialog'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)

const CONSTRAINT_TYPES: CfcConstraintTypeDto[] = [
  {
    id: 2,
    name: 'School',
    cfcWorkflowConstraintsViewModel: [
      {
        id: 1,
        cfcConstraintTypeId: 2,
        cfcConstraintTypeName: 'School',
        cfcWorkflowId: 7,
        value: '12',
        description: 'Science',
      },
    ],
  },
]

const MANUAL_ROW: CfcManualInterventionDto = {
  id: 5,
  name: 'Support plan',
  description: 'Weekly check-in',
  duration: 7,
  cfcWorkflowId: 7,
  cfcInstanceRestrictionTypeId: 1,
  studentsCanCreate: false,
  steps: [{ id: 1, name: 'Step 1', description: 'Call', duration: 1, type: 2 }],
  stages: [10],
}

function claims() {
  return Promise.resolve([
    { id: 22, actions: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] },
    { id: 45, actions: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] },
  ])
}

function renderDrawer(node: React.ReactNode) {
  return render(<ProfileProvider>{node}</ProfileProvider>)
}

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  post.mockImplementation((path: string) =>
    path === 'ResourceApi/GetResourcesForScreen'
      ? Promise.resolve({ 'en-GB': {} })
      : Promise.resolve(undefined),
  )
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims') return claims()
    if (path === 'caseapi/getConstraintTypes') return Promise.resolve(CONSTRAINT_TYPES)
    if (path === 'caseapi/manualInterventions') {
      return Promise.resolve({ grid: { items: [MANUAL_ROW], totalRowCount: 1 }, hasSubscriptionAccess: true })
    }
    if (path === 'caseapi/getManualIntervention') return Promise.resolve(MANUAL_ROW)
    if (path === 'caseapi/getManualInterventionTypeOptions')
      return Promise.resolve([{ id: 2, description: 'Phone' }])
    if (path === 'caseapi/getWorkflowStagesWithManualInterventionRelation') {
      return Promise.resolve([
        {
          id: 10,
          name: 'Stage A',
          numericValue: 1,
          numericLabel: null,
          description: null,
          sortOrder: 1,
          defaultNextCheckSuccessPeriod: 0,
          defaultNextCheckFailurePeriod: 0,
          defaultNextCheckSuccessDay: 0,
          defaultNextCheckFailureDay: 0,
          defaultAttendanceDurationPeriod: 0,
          defaultNextCheckCron: null,
          cfcWorkflowStageGroupId: 1,
          cfcWorkflowStageRuleGroups: null,
        },
      ])
    }
    return Promise.resolve([])
  })
})

// Lets a read the test started resolve inside act.
async function settle() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

describe('ConstraintsDrawer', () => {
  it('loads constraint types and saves workflow constraints', async () => {
    renderDrawer(<ConstraintsDrawer open workflowId={7} onOpenChange={jest.fn()} />)
    expect(await screen.findByText('School')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Science/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        'caseapi/createconstraints',
        expect.objectContaining({
          body: {
            id: 2,
            name: 'School',
            cfcWorkflowConstraintsViewModel: [
              {
                id: null,
                cfcConstraintTypeId: 2,
                cfcConstraintTypeName: 'School',
                cfcWorkflowId: 7,
                value: '12',
                description: 'Science',
              },
            ],
          },
          query: { workflowId: 7, constraintTypeId: 2 },
        }),
      ),
    )
  })
})

describe('constraint editor mode', () => {
  it('R7-C05 picks the editor by CfcConstraintTypeEnum id', async () => {
    // Names are deliberately misleading: only the id may decide the editor.
    const types: CfcConstraintTypeDto[] = [
      { id: CfcConstraintTypeEnum.Site, name: 'Campus', cfcWorkflowConstraintsViewModel: [] },
      { id: CfcConstraintTypeEnum.Module, name: 'Unit', cfcWorkflowConstraintsViewModel: [] },
      { id: CfcConstraintTypeEnum.StudentStatus, name: 'Monitoring', cfcWorkflowConstraintsViewModel: [] },
      { id: CfcConstraintTypeEnum.Students, name: 'People', cfcWorkflowConstraintsViewModel: [] },
      { id: CfcConstraintTypeEnum.UKVI, name: 'Visa', cfcWorkflowConstraintsViewModel: [] },
    ]
    expect(constraintMode(CfcConstraintTypeEnum.Site, 'Campus')).toBe('site')
    expect(constraintMode(CfcConstraintTypeEnum.Module, 'Unit')).toBe('module')
    expect(constraintMode(CfcConstraintTypeEnum.StudentStatus, 'Monitoring')).toBe('dropdown')
    expect(constraintMode(CfcConstraintTypeEnum.Students, 'People')).toBe('student')
    expect(constraintMode(CfcConstraintTypeEnum.UKVI, 'Visa')).toBe('radio-with-none')
    expect(constraintMode(99, 'UKVI')).toBe('radio-with-none')

    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims()
      if (path === 'caseapi/getConstraintTypes') return Promise.resolve(types)
      return Promise.resolve([])
    })
    const openType = async (name: string) => {
      const row = (await screen.findByText(name)).closest('li') as HTMLElement
      await act(async () => {
        fireEvent.click(within(row).getByRole('button'))
      })
    }
    renderDrawer(<ConstraintsDrawer open workflowId={7} onOpenChange={jest.fn()} />)
    await openType('Campus')
    fireEvent.focus(await screen.findByLabelText('Add Campus'))
    await waitFor(() => expect(get).toHaveBeenCalledWith('caseapi/getSitesOptions', expect.anything()))
    await screen.findByText('No matches')

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await openType('Unit')
    fireEvent.focus(await screen.findByLabelText('Add Unit'))
    await waitFor(() => expect(get).toHaveBeenCalledWith('caseapi/getModuleOptions', expect.anything()))
    await screen.findByText('No matches')

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await openType('Monitoring')
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('caseapi/getStudentMonitoredType', expect.anything()),
    )
    await screen.findByRole('combobox', { name: 'Monitoring' })
    expect(screen.queryByLabelText('Add Monitoring')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    await openType('People')
    fireEvent.focus(await screen.findByLabelText('Add People'))
    await waitFor(() => expect(get).toHaveBeenCalledWith('caseapi/getStudentOptions', expect.anything()))
    await screen.findByText('No matches')
  })
})

describe('ManualInterventionsDrawer', () => {
  it('loads manual interventions with workflow paging params', async () => {
    renderDrawer(<ManualInterventionsDrawer open workflowId={7} onOpenChange={jest.fn()} />)
    expect(await screen.findByText('Support plan')).toBeInTheDocument()
    const call = get.mock.calls.find(([path]) => path === 'caseapi/manualInterventions')
    // R8-27: like the legacy grid, no sort is sent until a header is clicked.
    expect(call?.[1]?.query).toEqual({
      workflowId: '7',
      pageNumber: '0',
      pageSize: '100',
      sortCol: '',
      sortDir: '',
    })
  })

  it('deletes selected manual interventions', async () => {
    renderDrawer(<ManualInterventionsDrawer open workflowId={7} onOpenChange={jest.fn()} />)
    expect(await screen.findByText('Support plan')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /Support plan/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmButtons = await screen.findAllByRole('button', { name: 'Delete' })
    fireEvent.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => expect(post).toHaveBeenCalledWith('caseapi/deleteManualIntervention', { body: [5] }))
  })
})

// Requirements 8.1/8.2: each empty step field gets its own message, and a filled step has none.
describe('manual intervention step validation', () => {
  it('names every missing field and clears once filled', () => {
    expect(
      stepErrorsFor({
        id: 0,
        key: 'new:1',
        name: ' ',
        description: '',
        duration: 0,
        durationText: '',
        type: 0,
      }),
    ).toEqual({
      name: 'Enter a step name.',
      type: 'Select a step type.',
      duration: 'Enter a duration.',
      description: 'Enter a step description.',
    })
    expect(
      stepErrorsFor({
        id: 0,
        key: 'new:2',
        name: 'Call',
        description: 'Phone the student',
        duration: 2,
        durationText: '2',
        type: 2,
      }),
    ).toEqual({})
  })
})

// Requirement 8.1: inline, specific messages that clear as soon as the input becomes valid.
describe('inline validation', () => {
  it('flags a missing Yes/No constraint value and clears it once chosen', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims()
      if (path === 'caseapi/getConstraintTypes')
        return Promise.resolve([{ id: 7, name: 'FE Student', cfcWorkflowConstraintsViewModel: [] }])
      return Promise.resolve([])
    })
    renderDrawer(<ConstraintsDrawer open workflowId={7} onOpenChange={jest.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'None' }))
    await settle()
    const yes = screen.getByRole('radio', { name: 'Yes' })
    // FEStudent starts on Yes like legacy _radioButtonConfiguration; clear it to reach the empty state.
    fireEvent.click(screen.getByRole('radio', { name: 'No' }))
    fireEvent.click(yes)
    expect(yes).toBeChecked()
    expect(screen.queryByText('Select Yes or No before saving.')).not.toBeInTheDocument()
    expect(yes).not.toHaveAttribute('aria-invalid')
  })

  it('R8-06 saving UKVI as None posts an empty list, which is how legacy clears a constraint', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims()
      if (path === 'caseapi/getConstraintTypes')
        return Promise.resolve([
          {
            id: 5,
            name: 'UKVI',
            cfcWorkflowConstraintsViewModel: [
              {
                id: 1,
                cfcConstraintTypeId: 5,
                cfcConstraintTypeName: 'UKVI',
                cfcWorkflowId: 7,
                value: '1',
                description: '',
              },
            ],
          },
        ])
      return Promise.resolve([])
    })
    renderDrawer(<ConstraintsDrawer open workflowId={7} onOpenChange={jest.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Yes' }))
    fireEvent.click(await screen.findByRole('radio', { name: 'None' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(post).toHaveBeenCalledWith(
      'caseapi/createconstraints',
      expect.objectContaining({ body: { id: 5, name: 'UKVI', cfcWorkflowConstraintsViewModel: [] } }),
    )
  })

  it('R8-24 a constraint type with no option source says so instead of rendering nothing', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims()
      if (path === 'caseapi/getConstraintTypes')
        return Promise.resolve([{ id: 99, name: 'Cohort', cfcWorkflowConstraintsViewModel: [] }])
      return Promise.resolve([])
    })
    renderDrawer(<ConstraintsDrawer open workflowId={7} onOpenChange={jest.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'None' }))
    expect(await screen.findByText('This constraint type has no option list.')).toBeInTheDocument()
  })

  it('shows per-field manual intervention errors that follow the current values', async () => {
    renderDrawer(<ManualInterventionsDrawer open workflowId={7} onOpenChange={jest.fn()} />)
    await screen.findByText('Support plan')
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }))

    const name = screen.getByLabelText('Name')
    expect(await screen.findByText('Enter a name.')).toBeInTheDocument()
    expect(screen.getByText('Enter a description.')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAttribute('aria-describedby', 'manual-intervention-name-error')
    expect(screen.getByRole('alert')).toHaveTextContent('At least one step is required.')

    fireEvent.change(name, { target: { value: 'Mentoring' } })
    expect(screen.queryByText('Enter a name.')).not.toBeInTheDocument()
    expect(name).not.toHaveAttribute('aria-invalid')
    expect(post).not.toHaveBeenCalledWith('caseapi/createManualIntervention', expect.anything())
  })

  it('R8-04 R8-05 a new step keeps id 0 and a blank duration blocks the step', async () => {
    renderDrawer(<ManualInterventionsDrawer open workflowId={7} onOpenChange={jest.fn()} />)
    await screen.findByText('Support plan')
    fireEvent.click(screen.getByRole('button', { name: /Edit/i }))
    await screen.findByDisplayValue('Support plan')
    fireEvent.click(screen.getByRole('button', { name: 'Steps' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Add' }))

    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Step 2' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Email' } })
    const stepDurationBefore = screen.getByLabelText('Duration')
    fireEvent.change(stepDurationBefore, { target: { value: '' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' }).at(-1) as HTMLElement)
    expect(await screen.findByText('Enter a duration.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '3' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Save' }).at(-1) as HTMLElement)
    await waitFor(() => expect(screen.queryByLabelText('Description')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Case' }))
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Enter a duration.')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalledWith('caseapi/createManualIntervention', expect.anything())

    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '9' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(post).toHaveBeenCalledWith(
      'caseapi/createManualIntervention',
      expect.objectContaining({
        body: expect.objectContaining({
          duration: 9,
          steps: [
            { id: 1, name: 'Step 1', description: 'Call', duration: 1, type: 2 },
            { id: 0, name: 'Step 2', description: 'Email', duration: 3, type: 2 },
          ],
        }),
      }),
    )
  })

  it('names each missing manual intervention field', () => {
    const blank: CfcManualInterventionDto = { ...MANUAL_ROW, name: ' ', description: '' }
    expect(interventionErrorsFor(blank, '')).toEqual({
      name: 'Enter a name.',
      duration: 'Enter a duration.',
      description: 'Enter a description.',
    })
    expect(interventionErrorsFor(MANUAL_ROW, '7')).toEqual({})
  })

  it('R7-C07 posts id and name only, like _mapWorkflow, and reports the legacy success text', async () => {
    const onSaved = jest.fn()
    post.mockImplementation((path: string) =>
      Promise.resolve(path === 'ResourceApi/GetResourcesForScreen' ? { 'en-GB': {} } : undefined),
    )
    renderDrawer(<WorkflowDialog open workflow={null} onOpenChange={jest.fn()} onSaved={onSaved} />)
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: '  Attendance  ' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(post).toHaveBeenCalledWith('caseapi/createWorkflow', { body: { id: null, name: 'Attendance' } })
    expect(onSaved).toHaveBeenCalledWith('The item was saved successfully.')
  })

  it('shows the workflow name error inline and clears it while typing', async () => {
    renderDrawer(<WorkflowDialog open workflow={null} onOpenChange={jest.fn()} onSaved={jest.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }))

    const name = screen.getByLabelText('Name')
    expect(await screen.findByText('The Name is required.')).toHaveAttribute('id', 'workflow-name-error')
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAttribute('aria-describedby', 'workflow-name-error')

    fireEvent.change(name, { target: { value: 'Attendance' } })
    expect(screen.queryByText('The Name is required.')).not.toBeInTheDocument()
    expect(name).not.toHaveAttribute('aria-invalid')
  })
})
