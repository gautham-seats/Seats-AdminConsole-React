import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { api } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import type { CfcWorkflowRuleDefinitionDto, CfcWorkflowStageRuleDto } from '@/types/case'
import type { SimpleListItemDto } from '@/types/users'
import {
  isLessonTypeAttribute,
  ruleAttributeValueError,
  triggerAttributeValueError,
  validateRuleAttributeValue,
  validateTriggerAttributeValue,
} from '../attribute-form-utils'
import * as caseNodeApi from '../case-node-api'
import { RuleAttributePanel } from '../RuleAttributePanel'
import { RuleGroupPanel } from '../RuleGroupPanel'
import { RulePanel } from '../RulePanel'
import { stageErrorsFor } from '../StagePanel'
import { toRuleBody, toRuleDraft } from '../rule-form'
import { TriggerAttributePanel } from '../TriggerAttributePanel'
import { TriggerPanel } from '../TriggerPanel'
import * as caseApi from '../../../case-api'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

jest.mock('../case-node-api')
jest.mock('../../../case-api', () => ({
  fetchRules: jest.fn(),
  fetchTriggers: jest.fn(),
}))

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)
const mockedCaseNodeApi = jest.mocked(caseNodeApi)
const mockedFetchRules = jest.mocked(caseApi.fetchRules)
const mockedFetchTriggers = jest.mocked(caseApi.fetchTriggers)

const CLASS_TYPES: CfcWorkflowRuleDefinitionDto[] = [
  { id: 3, name: 'Attendance Rule', description: null, classType: 'Attendance' },
]

const RULE: CfcWorkflowStageRuleDto = {
  id: 12,
  sortOrder: 1,
  startDate: null,
  endDate: null,
  name: 'Attendance Rule',
  classType: 'Attendance',
  cfcWorkflowRuleDefinitionId: 3,
  cfcWorkflowStageRuleGroupId: 7,
  enabled: false,
  enabledComputed: true,
  cfcWorkflowStageRuleAttributes: [
    {
      id: 55,
      cfcWorkflowRuleDefinitionAttributeId: 9,
      cfcWorkflowStageRuleGroupId: 12,
      value: '10',
      dataType: 'Int32',
      name: 'Threshold',
      description: 'Threshold',
      sortOrder: 1,
    },
  ],
}

const TRIGGER_TYPES: SimpleListItemDto[] = [{ id: 2, description: 'Send Email' }]
const TRIGGER = {
  id: 20,
  cfcTriggerTypeId: 2,
  name: 'Send Email',
  classType: null,
  cfcWorkflowStageRuleGroupId: 7,
  cfcWorkflowStageRuleGroupTriggerAttributes: [
    {
      id: 88,
      cfcTriggerTypeAttributeId: 4,
      cfcWorkflowStageRuleGroupTriggerId: 20,
      dataType: 'String',
      name: 'Subject line',
      description: 'Subject',
      sortOrder: 1,
      value: 'Hello',
      valueName: null,
    },
  ],
}

function claims(item: number, actions: number[]) {
  return Promise.resolve([{ id: item, actions: actions.map(id => ({ id })) }])
}

function renderPanel(node: ReactNode) {
  return render(<ProfileProvider>{node}</ProfileProvider>)
}

const PATH = {
  workflowId: 1,
  stageGroupId: 2,
  stageId: 3,
  ruleGroupId: 7,
  onSaved: jest.fn(),
  onDeleted: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  post.mockResolvedValue({ 'en-GB': {} })
  get.mockResolvedValue([])
  mockedCaseNodeApi.fetchClassTypes.mockResolvedValue(CLASS_TYPES)
  mockedFetchRules.mockResolvedValue(RULE)
  mockedCaseNodeApi.createStageRuleGroupsRule.mockResolvedValue(undefined)
  mockedCaseNodeApi.updateStageRuleGroupsRule.mockResolvedValue(undefined)
  mockedCaseNodeApi.fetchTriggerTypes.mockResolvedValue(TRIGGER_TYPES)
  mockedFetchTriggers.mockResolvedValue(TRIGGER)
  mockedCaseNodeApi.createStageRuleGroupsTrigger.mockResolvedValue(undefined)
  mockedCaseNodeApi.fetchRuleDefinitionAttributes.mockResolvedValue([
    { id: 9, name: 'Threshold', dataType: 'Int32', cfcWorkflowRuleDefinitionId: 3 },
    { id: 21, name: 'Lesson Type Missed', dataType: 'Int32', cfcWorkflowRuleDefinitionId: 3 },
  ])
  mockedCaseNodeApi.createStageRuleGroupsRuleAttribute.mockResolvedValue(undefined)
  mockedCaseNodeApi.fetchLessonTypes.mockResolvedValue([{ id: 8, description: 'Lecture' }])
  mockedCaseNodeApi.fetchTriggerTypeAttributes.mockResolvedValue([
    { id: 4, name: 'Subject line', dataType: 'String', cfcTriggerTypeId: 2 },
    { id: 5, name: 'Email File Template', dataType: 'Int32', cfcTriggerTypeId: 2 },
  ])
  mockedCaseNodeApi.fetchTemplateTypes.mockResolvedValue([{ id: 1, description: 'Template A' }])
  mockedCaseNodeApi.fetchContactGroups.mockResolvedValue([{ id: 2, description: 'Group A' }])
  mockedCaseNodeApi.fetchFunctions.mockResolvedValue([{ id: 3, description: 'Function A' }])
  mockedCaseNodeApi.fetchStagesForWorkflow.mockResolvedValue([{ id: 4, description: 'Stage A' }])
  mockedCaseNodeApi.fetchManualInterventionWorkflowOptions.mockResolvedValue([
    { id: 5, description: 'Manual A' },
  ])
  mockedCaseNodeApi.updateStageRuleGroupsTriggerAttribute.mockResolvedValue(undefined)
})

describe('workflow node form helpers', () => {
  it('maps disabled checkbox and date fields like legacy stage-rules', () => {
    const draft = toRuleDraft(RULE, 7, 3)
    expect(draft.disabled).toBe(false)
    const body = toRuleBody({ ...draft, disabled: true })
    expect(body.enabled).toBe(true)
    expect(body.endDate).toBeTruthy()
    expect(body.startDate).toBeNull()
  })

  it('R9-41 enabledComputed carries the original flag, as legacy _onEditDialog sets it (:533-534)', () => {
    const draft = toRuleDraft(RULE, 7, 3)
    expect(toRuleBody({ ...draft, disabled: true }).enabledComputed).toBe(false)
    expect(toRuleBody(toRuleDraft(null, 7, 3)).enabledComputed).toBe(false)
    const wasDisabled = toRuleDraft({ ...RULE, enabledComputed: false }, 7, 3)
    expect(toRuleBody({ ...wasDisabled, disabled: false }).enabledComputed).toBe(true)
  })

  it('validates rule and trigger attribute values', () => {
    expect(
      validateRuleAttributeValue(
        { id: 9, name: 'Threshold', dataType: 'Int32', cfcWorkflowRuleDefinitionId: 3 },
        '12',
      ),
    ).toBe(true)
    expect(
      validateRuleAttributeValue(
        { id: 17, name: 'Range', dataType: 'String', cfcWorkflowRuleDefinitionId: 3 },
        '1-3,5',
      ),
    ).toBe(true)
  })

  it('G3 rejects a plain String attribute like the legacy modal', () => {
    const plain = { id: 21, name: 'Note', dataType: 'String', cfcWorkflowRuleDefinitionId: 3 }
    expect(validateRuleAttributeValue(plain, 'any text')).toBe(false)
    expect(validateRuleAttributeValue(plain, '')).toBe(false)
    const range = { id: 40, name: 'Range', dataType: 'String', cfcWorkflowRuleDefinitionId: 3 }
    expect(validateRuleAttributeValue(range, '2,4-6')).toBe(true)
    expect(validateRuleAttributeValue(range, '2,')).toBe(false)
    expect(
      isLessonTypeAttribute({
        id: 15,
        name: 'Lesson Type Percent',
        dataType: 'Int32',
        cfcWorkflowRuleDefinitionId: 3,
      }),
    ).toBe(true)
    // The enum id decides, so a renamed or translated attribute must not change the answer either way.
    expect(
      isLessonTypeAttribute({ id: 16, name: null, dataType: 'Int32', cfcWorkflowRuleDefinitionId: 3 }),
    ).toBe(true)
    expect(
      isLessonTypeAttribute({
        id: 1,
        name: 'Lesson Type Percent',
        dataType: 'Int32',
        cfcWorkflowRuleDefinitionId: 3,
      }),
    ).toBe(false)
    expect(
      validateTriggerAttributeValue(
        { id: 4, name: 'Subject line', dataType: 'String', cfcTriggerTypeId: 2 },
        'Hello',
      ),
    ).toBe(true)
  })
})

describe('RulePanel', () => {
  it('creates a rule with class type and disabled flag', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(22, [1, 2, 3, 4])
      return Promise.resolve({ 'en-GB': {} })
    })

    renderPanel(<RulePanel {...PATH} ruleId={null} />)

    await waitFor(() => expect(mockedCaseNodeApi.fetchClassTypes).toHaveBeenCalled())
    fireEvent.click(await screen.findByRole('button', { name: /save/i }))

    await waitFor(() => expect(mockedCaseNodeApi.createStageRuleGroupsRule).toHaveBeenCalled())
    expect(mockedCaseNodeApi.createStageRuleGroupsRule.mock.calls[0]?.[0]).toMatchObject({
      cfcWorkflowRuleDefinitionId: 3,
      cfcWorkflowStageRuleGroupId: 7,
      enabled: false,
      enabledComputed: false,
    })
  })

  it('R9-46 with no class types Save stops with the required message instead of posting id 0', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(22, [1, 2, 3, 4])
      return Promise.resolve({ 'en-GB': {} })
    })
    mockedCaseNodeApi.fetchClassTypes.mockResolvedValue([])

    renderPanel(<RulePanel {...PATH} ruleId={null} />)
    fireEvent.click(await screen.findByRole('button', { name: /save/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There are fields with input validation errors.',
    )
    expect(screen.getByRole('combobox', { name: 'Class type' })).toHaveAttribute('aria-invalid', 'true')
    expect(mockedCaseNodeApi.createStageRuleGroupsRule).not.toHaveBeenCalled()
  })

  it('R9-47 the visible Disabled text is the checkbox label, so clicking it toggles the box', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(22, [1, 2, 3, 4])
      return Promise.resolve({ 'en-GB': {} })
    })
    renderPanel(<RulePanel {...PATH} ruleId={null} />)
    const box = await screen.findByRole('checkbox', { name: 'Disabled' })
    expect(box).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(screen.getByText('Disabled', { selector: 'label' }))
    expect(box).toHaveAttribute('aria-checked', 'true')
  })

  it('R9-48 a rule that no longer exists shows the empty state, not a blank form', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(22, [1, 2, 3, 4])
      return Promise.resolve({ 'en-GB': {} })
    })
    mockedFetchRules.mockResolvedValue([])

    renderPanel(<RuleAttributePanel {...PATH} ruleId={12} attributeId={null} />)

    expect(await screen.findByText('There are no items to show.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
  })

  it('R9-44 a failed lesson-type read is said next to the list, as the legacy toast does', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(22, [1, 2, 3, 4])
      return Promise.resolve({ 'en-GB': {} })
    })
    mockedCaseNodeApi.fetchLessonTypes.mockRejectedValue(new Error('down'))
    mockedCaseNodeApi.fetchRuleDefinitionAttributes.mockResolvedValue([
      { id: 15, name: 'Lesson Type Percent', dataType: 'Int32', cfcWorkflowRuleDefinitionId: 3 },
    ])
    mockedFetchRules.mockResolvedValue({ ...RULE, cfcWorkflowStageRuleAttributes: [] })

    renderPanel(<RuleAttributePanel {...PATH} ruleId={12} attributeId={null} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while getting the lesson types.',
    )
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })
})

describe('RuleAttributePanel', () => {
  it('posts createstagerulegroupsruleattributes with legacy rule id field', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(22, [1, 2, 3, 4])
      return Promise.resolve({ 'en-GB': {} })
    })

    renderPanel(<RuleAttributePanel {...PATH} ruleId={12} attributeId={null} />)

    await waitFor(() => expect(mockedFetchRules).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText(/value/i), { target: { value: '15' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(mockedCaseNodeApi.createStageRuleGroupsRuleAttribute).toHaveBeenCalled())
    expect(mockedCaseNodeApi.createStageRuleGroupsRuleAttribute.mock.calls[0]?.[0]).toMatchObject({
      cfcWorkflowStageRuleGroupId: 12,
      value: '15',
    })
  })
})

describe('TriggerPanel', () => {
  it('creates a trigger with trigger type id', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(22, [1, 2, 3, 4])
      return Promise.resolve({ 'en-GB': {} })
    })

    renderPanel(<TriggerPanel {...PATH} triggerId={null} />)

    await waitFor(() => expect(mockedCaseNodeApi.fetchTriggerTypes).toHaveBeenCalled())
    fireEvent.click(await screen.findByRole('button', { name: /save/i }))

    await waitFor(() => expect(mockedCaseNodeApi.createStageRuleGroupsTrigger).toHaveBeenCalled())
    expect(mockedCaseNodeApi.createStageRuleGroupsTrigger.mock.calls[0]?.[0]).toMatchObject({
      cfcTriggerTypeId: 2,
      cfcWorkflowStageRuleGroupId: 7,
    })
  })
})

describe('TriggerAttributePanel', () => {
  it('R9-43 asks for the five option lists at once, as the legacy page does', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(22, [1, 2, 3, 4])
      return Promise.resolve({ 'en-GB': {} })
    })
    let release: () => void = () => {}
    mockedCaseNodeApi.fetchTemplateTypes.mockReturnValue(
      new Promise(resolve => {
        release = () => resolve([{ id: 1, description: 'Template A' }])
      }),
    )
    renderPanel(<TriggerAttributePanel {...PATH} triggerId={20} attributeId={null} />)

    await waitFor(() => expect(mockedCaseNodeApi.fetchManualInterventionWorkflowOptions).toHaveBeenCalled())
    expect(mockedCaseNodeApi.fetchContactGroups).toHaveBeenCalled()
    expect(mockedCaseNodeApi.fetchStagesForWorkflow).toHaveBeenCalled()
    await act(async () => release())
    expect(await screen.findByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('updates trigger attribute values', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(22, [1, 2, 3, 4])
      return Promise.resolve({ 'en-GB': {} })
    })

    renderPanel(<TriggerAttributePanel {...PATH} triggerId={20} attributeId={88} />)

    fireEvent.change(await screen.findByLabelText(/value/i), { target: { value: 'Updated' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(mockedCaseNodeApi.updateStageRuleGroupsTriggerAttribute).toHaveBeenCalled())
    expect(mockedCaseNodeApi.updateStageRuleGroupsTriggerAttribute.mock.calls[0]?.[0]).toMatchObject({
      id: 88,
      value: 'Updated',
    })
  })
})

describe('NodePanelShell delete gate', () => {
  // Legacy permission map (WorkflowStageRuleGroupsRules.cshtml:39-41) gates Delete on Case.Delete alone.
  it('shows Delete to a user with Delete but not Edit', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(22, [1, 4])
      return Promise.resolve({ 'en-GB': {} })
    })

    renderPanel(<TriggerPanel {...PATH} triggerId={20} />)

    expect(await screen.findByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
  })
})

// Requirement 8.1: specific inline messages that follow the current value after the first Save.
describe('node panel inline validation', () => {
  it('describes why an attribute value is invalid', () => {
    const int = { id: 9, name: 'Threshold', dataType: 'Int32', cfcWorkflowRuleDefinitionId: 3 }
    expect(ruleAttributeValueError(int, '')).toBe('Enter a value.')
    expect(ruleAttributeValueError(int, '1.5')).toBe('Enter a whole number, for example 12.')
    expect(ruleAttributeValueError(int, '12')).toBeNull()
    expect(ruleAttributeValueError(undefined, '12')).toBe('Select an attribute type.')
    expect(
      ruleAttributeValueError(
        { id: 17, name: 'Range', dataType: 'String', cfcWorkflowRuleDefinitionId: 3 },
        '1-,',
      ),
    ).toBe('Enter numbers or ranges separated by commas, for example 1-3,5.')
    expect(
      triggerAttributeValueError({ id: 5, name: 'Days', dataType: 'Int32', cfcTriggerTypeId: 2 }, 'x'),
    ).toBe('Enter a whole number, for example 12.')
  })

  it('names every missing stage field', () => {
    const errors = stageErrorsFor({
      id: 1,
      name: 'Stage',
      description: ' ',
      numericValue: '1',
      defaultNextCheckSuccessPeriod: '',
      defaultNextCheckFailurePeriod: '3',
      defaultNextCheckSuccessDay: '1',
      defaultNextCheckFailureDay: '',
      defaultAttendanceDurationPeriod: '30',
      defaultNextCheckCron: '',
      sortOrder: 1,
      cfcWorkflowStageGroupId: 2,
    })
    expect(errors).toEqual({
      description: 'Enter a description.',
      defaultNextCheckSuccessPeriod: 'Enter the default next check success period.',
      defaultNextCheckFailureDay: 'Enter the default next check failure day, from 0 to 7.',
    })
  })

  it('shows the rule attribute value error inline and clears it once valid', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(22, [1, 2, 3, 4])
      return Promise.resolve({ 'en-GB': {} })
    })

    renderPanel(<RuleAttributePanel {...PATH} ruleId={12} attributeId={null} />)

    await waitFor(() => expect(mockedFetchRules).toHaveBeenCalled())
    const value = await screen.findByLabelText(/value/i)
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a value.')
    expect(value).toHaveAttribute('aria-invalid', 'true')
    expect(value).toHaveAttribute('aria-describedby', 'rule-attribute-value-error')
    expect(mockedCaseNodeApi.createStageRuleGroupsRuleAttribute).not.toHaveBeenCalled()

    fireEvent.change(value, { target: { value: '15' } })
    expect(screen.queryByText('Enter a value.')).not.toBeInTheDocument()
    expect(value).not.toHaveAttribute('aria-invalid')
  })

  it('shows the rule group name error inline and clears it while typing', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims(22, [1, 2, 3, 4])
      return Promise.resolve({ 'en-GB': {} })
    })

    renderPanel(
      <RuleGroupPanel workflowId={1} stageGroupId={2} stageId={3} ruleGroupId={null} onSaved={jest.fn()} />,
    )

    const name = await screen.findByLabelText('Name')
    // Save only appears once the form is dirty, so the description is filled and the name left empty.
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Checks attendance' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Enter a name.')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAttribute('aria-describedby', 'rule-group-name-error')

    fireEvent.change(name, { target: { value: 'Attendance group' } })
    expect(screen.queryByText('Enter a name.')).not.toBeInTheDocument()
    expect(name).not.toHaveAttribute('aria-invalid')
  })
})
