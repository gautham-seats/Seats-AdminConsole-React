import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { formatShortDate, resetUiCulture, setUiCulture } from '@/shared/i18n/culture'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { StudentWorkflowScreen } from '../student-workflow/StudentWorkflowScreen'
import {
  formatWorkflowDate,
  hasMoveErrors,
  studentFilterField,
  todayCultureDate,
  validateMove,
  validateMoveStage,
  workflowStudentsQuery,
} from '../student-workflow/student-workflow'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/case/student-workflow',
}))
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

const WORKFLOW = {
  id: 7,
  name: 'Attendance Monitoring',
  startDate: null,
  endDate: null,
  cfcWorkflowTypeId: 1,
  sendToEmailBasedOnFaculty: false,
  sendFromEmailBasedOnFaculty: false,
  cfcWorkflowStatusTypeId: 1,
  cfcWorkflowApprovalTypeId: 1,
  showAsDefault: false,
  defaultContactGroupId: 0,
  totalStudentsInWorkflowCount: 12,
  totalEmailCount: 0,
  totalStageChange: 0,
  nextCheckDate: null,
  finalWarningStageChange: 0,
  cfcWorkflowConstraints: null,
  globalId: null,
}

// CaseApiController.cs:1331-1378 getstages: one CfcWorkflowGroupViewModel per workflow.
const STAGE_GROUPS = [
  {
    workflowId: 7,
    workflowName: 'Attendance Monitoring',
    id: 7,
    stages: [
      {
        id: 11,
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
    ],
  },
]

const STUDENT_ROW = {
  studentId: 101,
  studentGlobalId: 'g-1',
  studentNumber: 'S-001',
  studentFullName: 'Ada Lovelace',
  universityEmail: null,
  personalEmail: null,
  workflowId: 9001,
  workflowName: WORKFLOW.name,
  stageId: 11,
  stageName: 'Stage A',
  nextCheck: '2026-09-01T00:00:00',
  nextSuccess: '9999-12-31T00:00:00',
  scheduledLectures: 10,
  attendedLectures: 8,
  percentage: 80,
}

function claims(actions: number[]) {
  return Promise.resolve([
    { id: PermissionItem.Case, actions: actions.map(id => ({ id })) },
    { id: PermissionItem.Students, actions: [{ id: PermissionAction.EditHoldStatus }] },
  ])
}

// Lets the reads a search starts (students, then stages) resolve inside act.
async function settle() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

async function runStudentSearch() {
  const input = await screen.findByLabelText('Search by name')
  fireEvent.keyDown(input, { key: 'Enter' })
  await settle()
}

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  post.mockResolvedValue({ 'en-GB': {} })
})

describe('student workflow helpers', () => {
  it('formats sentinel dates and routes student filters like legacy', () => {
    expect(formatWorkflowDate('9999-12-31T00:00:00')).toBe('')
    expect(studentFilterField('Ann Lee')).toEqual({ studentName: 'Ann Lee' })
    expect(studentFilterField('S-42')).toEqual({ studentNumber: 'S-42' })
    expect(validateMoveStage(null, 'No stage selected')).toBe('No stage selected')
    expect(
      workflowStudentsQuery(WORKFLOW, 11, 'Stage A', {
        pageIndex: 0,
        pageSize: 100,
        sort: { column: 'studentNumber', direction: 'asc' },
        studentText: 'Ada',
      }),
    ).toMatchObject({
      workflowId: 7,
      stageId: 11,
      stageName: 'Stage A',
      studentName: 'Ada',
      pageNumber: 0,
      pageSize: 100,
      sortCol: 'studentNumber',
      sortDir: 'asc',
      type: 1,
    })
    expect(todayCultureDate()).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })

  it('A3 follows the user culture for today and list dates', () => {
    setUiCulture('en-US')
    try {
      expect(formatWorkflowDate('2026-09-05T00:00:00')).toBe('09/05/2026')
      expect(todayCultureDate()).toBe(formatShortDate(new Date()))
    } finally {
      resetUiCulture()
    }
  })

  it('blocks a move without students or a stage and clears once both are valid', () => {
    const labels = { noStage: 'No stage selected', noStudents: 'No students selected' }
    expect(validateMove(null, 0, labels)).toMatchObject({
      stage: 'No stage selected',
      selection: 'No students selected',
    })
    expect(hasMoveErrors(validateMove(null, 2, labels))).toBe(true)
    expect(hasMoveErrors(validateMove(11, 0, labels))).toBe(true)
    expect(validateMove(11, 2, labels)).toEqual({
      stage: null,
      selection: null,
      nextChangeDate: null,
      onHoldExpiryDate: null,
    })
    expect(hasMoveErrors(validateMove(11, 2, labels))).toBe(false)
  })

  it('R7-C04 rejects a move date outside the culture format and requires the hold date only on hold', () => {
    const labels = {
      noStage: 'No stage selected',
      noStudents: 'No students selected',
      invalidDate: 'Bad date',
    }
    const dates = { isOnHold: false, nextChangeDate: '31/02/2026', onHoldExpiryDate: null }
    expect(validateMove(11, 2, labels, dates)).toMatchObject({
      nextChangeDate: 'Bad date',
      onHoldExpiryDate: null,
    })
    expect(validateMove(11, 2, labels, { ...dates, nextChangeDate: '' })).toMatchObject({
      nextChangeDate: 'Bad date',
    })
    expect(
      validateMove(11, 2, labels, { isOnHold: true, nextChangeDate: '15/09/2026', onHoldExpiryDate: '' }),
    ).toMatchObject({ nextChangeDate: null, onHoldExpiryDate: 'Bad date' })
    expect(
      validateMove(11, 2, labels, {
        isOnHold: true,
        nextChangeDate: '15/09/2026',
        onHoldExpiryDate: '16/09/2026',
      }),
    ).toMatchObject({ nextChangeDate: null, onHoldExpiryDate: null })
  })
})

describe('StudentWorkflowScreen', () => {
  it('loads students after search and confirms remove with the legacy body shape', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()

    const call = get.mock.calls.find(([path]) => String(path).startsWith('caseapi/getWorkflowStudents/7'))
    expect(call?.[1]?.query).toMatchObject({
      pageNumber: '0',
      pageSize: '100',
      workflowName: WORKFLOW.name,
      type: '1',
    })

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Ada Lovelace' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    })

    expect(post).toHaveBeenCalledWith('caseapi/removeStudentsInWorkflow', {
      body: {
        studentIds: [101],
        workflowId: 7,
        type: 1,
        instances: [9001],
      },
    })
  })

  // seats-admin-workflow-student.html:908-918: a failed remove must not look like a success.
  it('shows the delete error when removing students fails', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })
    post.mockImplementation((path: string) =>
      path === 'caseapi/removeStudentsInWorkflow'
        ? Promise.reject(new ApiError('http', '/api/caseapi/removeStudentsInWorkflow', 500))
        : Promise.resolve({ 'en-GB': {} }),
    )

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Ada Lovelace' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    })

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('renders all eight columns and a muted dash for the sentinel date', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()

    const headers = screen.getAllByRole('columnheader').map(cell => cell.textContent?.trim())
    expect(headers).toEqual([
      '',
      'Student number',
      'Full name',
      'Stage',
      'Next check',
      'Approved',
      'Attended',
      'Scheduled',
      'Percentage',
    ])

    const row = screen.getByText('Ada Lovelace').closest('tr')
    expect(row).not.toBeNull()
    const cells = within(row as HTMLElement)
      .getAllByRole('cell')
      .map(cell => cell.textContent?.trim())
    // nextSuccess is the 31/12/9999 sentinel, so the Approved cell shows a dash, not an empty cell.
    expect(cells.slice(1)).toEqual(['S-001', 'Ada Lovelace', 'Stage A', '01/09/2026', '—', '8', '10', '80%'])

    expect(screen.getByRole('tab', { name: /All stages/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Stage A/ })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText('Students : 1')).toBeInTheDocument()
  })

  it('R7-C01 searches every stage by default and only narrows once a stage tab is chosen', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    await screen.findByText('Ada Lovelace')
    const first = get.mock.calls.find(([path]) => String(path).startsWith('caseapi/getWorkflowStudents'))
    expect(first?.[0]).toBe('caseapi/getWorkflowStudents/7')
    expect(first?.[1]?.query).not.toHaveProperty('stageId')
    expect(first?.[1]?.query).not.toHaveProperty('stageName')

    fireEvent.click(screen.getByRole('tab', { name: /Stage A/ }))
    await screen.findByText('Ada Lovelace')
    const narrowed = get.mock.calls
      .filter(([path]) => String(path).startsWith('caseapi/getWorkflowStudents'))
      .at(-1)
    expect(narrowed?.[0]).toBe('caseapi/getWorkflowStudents/7/stages/11')
    expect(narrowed?.[1]?.query).toMatchObject({ stageName: 'Stage A' })
  })

  it('R7-C02 shows an instruction, not a loader, until Search is pressed', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    expect(await screen.findByText('Search for students')).toBeInTheDocument()
    expect(screen.queryByText('Loading')).not.toBeInTheDocument()
    expect(get.mock.calls.some(([path]) => String(path).startsWith('caseapi/getWorkflowStudents'))).toBe(
      false,
    )
  })

  it('R7-L14 asks for every workflow without paging, as the legacy select does', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await screen.findByRole('tab', { name: /Stage A/ })
    const call = get.mock.calls.find(([path]) => path === 'caseapi/workflows')
    expect(call?.[1]?.query).toEqual({})
  })

  it('R7-C03 reads the stage list from getstages, which also lists New-Engine stages', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    expect(await screen.findByRole('tab', { name: /Stage A/ })).toBeInTheDocument()
    // R8-34: read once without an id, like …student.html:836-846, and filtered here by workflowId.
    expect(get).toHaveBeenCalledWith('caseapi/getstages', expect.anything())
    expect(get).not.toHaveBeenCalledWith('caseapi/getstages/7', expect.anything())
    expect(get).not.toHaveBeenCalledWith('caseapi/workflows/7', expect.anything())
  })

  it('R8-38 a remove failure message clears on the next successful search', async () => {
    post.mockImplementation((path: string) =>
      path === 'caseapi/removeStudentsInWorkflow'
        ? Promise.reject(new ApiError('http', path, 500))
        : Promise.resolve({ 'en-GB': {} }),
    )
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })
    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Ada Lovelace' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while trying to delete the item.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByText('Ada Lovelace')
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('R8-26 with no workflows Search is disabled and never leaves the instruction card', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [], totalRowCount: 0 })
      return Promise.resolve(null)
    })
    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    const search = await screen.findByRole('button', { name: 'Search' })
    await waitFor(() => expect(search).toBeDisabled())
    fireEvent.click(search)
    expect(screen.getByText('Search for students')).toBeInTheDocument()
    expect(screen.queryByText('Loading')).not.toBeInTheDocument()
  })

  it('R8-25 a failed stages read shows a retry instead of a silent single tab', async () => {
    let fail = true
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages')
        return fail
          ? Promise.reject(new ApiError('http', 'caseapi/getstages', 500))
          : Promise.resolve(STAGE_GROUPS)
      return Promise.resolve(null)
    })
    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    const retry = await screen.findByRole('button', { name: 'Refresh' })
    fail = false
    fireEvent.click(retry)
    expect(await screen.findByRole('tab', { name: /Stage A/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument()
  })

  it('R8-15 a New Engine workflow without Workflow access explains the empty grid instead of asking', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows')
        return Promise.resolve({ items: [{ ...WORKFLOW, cfcWorkflowTypeId: 5 }], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      return Promise.resolve(null)
    })
    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    expect(await screen.findByText('Workflow permission needed')).toBeInTheDocument()
    expect(get.mock.calls.some(([path]) => String(path).startsWith('caseapi/getWorkflowStudents'))).toBe(
      false,
    )
  })

  it('R8-07 changing sort, page size or page drops the selection', async () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      ...STUDENT_ROW,
      studentId: 200 + index,
      workflowId: 9100 + index,
      studentNumber: `S-${200 + index}`,
      studentFullName: `Student ${index}`,
    }))
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: rows, totalRowCount: 400 })
      }
      return Promise.resolve(null)
    })
    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Student 0' }))
    expect(screen.getByText('1 Selected')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Full name/ }))
    await screen.findByText('Student 0')
    await waitFor(() => expect(screen.queryByText('1 Selected')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Student 1' }))
    expect(screen.getByText('1 Selected')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.queryByText('1 Selected')).not.toBeInTheDocument())
  })

  it('R8-08 two instances of one student are two rows and Move sends the student once', async () => {
    const twice = [STUDENT_ROW, { ...STUDENT_ROW, workflowId: 9002, stageName: 'Stage B' }]
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: twice, totalRowCount: 2 })
      }
      return Promise.resolve(null)
    })
    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    const boxes = await screen.findAllByRole('checkbox', { name: 'Select Ada Lovelace' })
    expect(boxes).toHaveLength(2)
    fireEvent.click(boxes[0])
    expect(boxes[1]).not.toBeChecked()
    fireEvent.click(boxes[1])
    expect(screen.getByText('2 Selected')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    })
    expect(post).toHaveBeenCalledWith(
      'caseapi/removeStudentsInWorkflow',
      expect.objectContaining({
        body: expect.objectContaining({ studentIds: [101, 101], instances: [9001, 9002] }),
      }),
    )
  })

  it('R7-L16 sends no sort until a column header is clicked, like the legacy grid', async () => {
    expect(
      workflowStudentsQuery(WORKFLOW, null, null, {
        pageIndex: 0,
        pageSize: 100,
        sort: { column: '', direction: 'asc' },
        studentText: '',
      }),
    ).not.toHaveProperty('sortCol')
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    await screen.findByText('Ada Lovelace')
    const first = get.mock.calls.find(([path]) => String(path).startsWith('caseapi/getWorkflowStudents'))
    expect(first?.[1]?.query).not.toHaveProperty('sortCol')
    expect(first?.[1]?.query).not.toHaveProperty('sortDir')
    expect(screen.getByRole('columnheader', { name: /Student number/ })).toHaveAttribute('aria-sort', 'none')

    fireEvent.click(screen.getByRole('button', { name: /Student number/ }))
    await screen.findByText('Ada Lovelace')
    const sorted = get.mock.calls
      .filter(([path]) => String(path).startsWith('caseapi/getWorkflowStudents'))
      .at(-1)
    expect(sorted?.[1]?.query).toMatchObject({ sortCol: 'studentNumber', sortDir: 'asc' })
  })

  it('R7-C06 sorts with the legacy camelCase bind names', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    await screen.findByText('Ada Lovelace')
    fireEvent.click(screen.getByRole('button', { name: /Full name/ }))
    await screen.findByText('Ada Lovelace')
    const last = get.mock.calls
      .filter(([path]) => String(path).startsWith('caseapi/getWorkflowStudents'))
      .at(-1)
    expect(last?.[1]?.query).toMatchObject({ sortCol: 'studentFullName', sortDir: 'asc' })
  })

  it('R7-L05 shows the legacy success text after a remove', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Ada Lovelace' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    })
    expect(await screen.findByText('Actions updated successfully')).toBeInTheDocument()
  })

  it('blocks the move save with a visible message and clears it once a stage is chosen', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Ada Lovelace' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move' }))

    const panel = await screen.findByRole('dialog', { name: 'Move' })
    await act(async () => {
      fireEvent.click(within(panel).getByRole('button', { name: 'Save' }))
    })
    expect(within(panel).getByText('No stage selected.')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalledWith('caseapi/updateWorkflowActions', expect.anything())

    fireEvent.click(within(panel).getByRole('combobox', { name: 'Move stage' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Stage A' }))
    expect(within(panel).queryByText('No stage selected.')).not.toBeInTheDocument()
  })

  it('names the panel from a tab that exists and keeps the floating bar clear of the rows', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    await screen.findByText('Ada Lovelace')

    const panel = screen.getByRole('tabpanel')
    const labelledBy = panel.getAttribute('aria-labelledby')
    const name = labelledBy
      ? document.getElementById(labelledBy)?.textContent
      : panel.getAttribute('aria-label')
    expect(name).toBeTruthy()
    expect(panel.className).toContain('focus-visible:ring-2')

    const bar = screen.getByRole('button', { name: 'Move' }).closest('div.pointer-events-auto')
    expect(bar?.className).toContain('flex-wrap')
    const table = screen.getByRole('table')
    expect(table.closest('div.sm\\:pb-20')).not.toBeNull()
  })

  it('hides bulk actions without Case Edit permission', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Move' })).not.toBeInTheDocument()
  })

  it('R9-49 reopening the Move panel starts clean: no stage shown, no stale message', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') return claims([PermissionAction.Access, PermissionAction.Edit])
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })
    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Ada Lovelace' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move' }))
    let panel = await screen.findByRole('dialog', { name: 'Move' })
    fireEvent.click(within(panel).getByRole('combobox', { name: 'Move stage' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Stage A' }))
    expect(within(panel).getByRole('combobox', { name: 'Move stage' })).toHaveTextContent('Stage A')
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Move' })).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Move' }))
    panel = await screen.findByRole('dialog', { name: 'Move' })
    expect(within(panel).getByRole('combobox', { name: 'Move stage' })).toHaveTextContent('Select')
    expect(within(panel).queryByText('No stage selected.')).not.toBeInTheDocument()
  })

  it('posts updateWorkflowActions from the move panel and disables hold without EditHoldStatus', async () => {
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims') {
        return Promise.resolve([
          {
            id: PermissionItem.Case,
            actions: [{ id: PermissionAction.Access }, { id: PermissionAction.Edit }],
          },
        ])
      }
      if (path === 'caseapi/workflows') return Promise.resolve({ items: [WORKFLOW], totalRowCount: 1 })
      if (path === 'caseapi/getstages') return Promise.resolve(STAGE_GROUPS)
      if (path.startsWith('caseapi/getWorkflowStudents/7')) {
        return Promise.resolve({ items: [STUDENT_ROW], totalRowCount: 1 })
      }
      return Promise.resolve(null)
    })

    render(
      <ProfileProvider>
        <StudentWorkflowScreen />
      </ProfileProvider>,
    )
    await runStudentSearch()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Ada Lovelace' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move' }))

    const panel = await screen.findByRole('dialog', { name: 'Move' })
    expect(within(panel).getByRole('switch', { name: 'Is on hold' })).toBeDisabled()

    fireEvent.click(within(panel).getByRole('combobox', { name: 'Move stage' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Stage A' }))
    await act(async () => {
      fireEvent.click(within(panel).getByRole('button', { name: 'Save' }))
    })

    expect(post).toHaveBeenCalledWith(
      'caseapi/updateWorkflowActions',
      expect.objectContaining({
        body: expect.objectContaining({
          workflowId: 7,
          stageId: 11,
          studentsSelected: [101],
          type: 1,
          isOnHold: false,
        }),
      }),
    )
  })
})
