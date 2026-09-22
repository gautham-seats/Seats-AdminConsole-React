import { act, fireEvent, render, screen } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import type { ActivityTypeDetailsDto } from '@/types/activity-types'
import { ActivityTypeDetailsScreen } from '../ActivityTypeDetailsScreen'
import { ActivityTypesScreen } from '../ActivityTypesScreen'
import { toActivityTypeBody, validateActivityType, withSelectDefaults } from '../activity-type-form'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
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

const ROWS = [
  {
    id: 2,
    globalId: 'b',
    name: 'Work placement',
    schoolName: null,
    notificationTypeDescription: null,
    actAsClocking: true,
    actAsBlackout: false,
    isAppointment: false,
    triggerEmail: false,
    requiresApproval: false,
    scheduledActivitySubTypeDescription: 'Activity',
    accessLevel: 'Admin',
    attendanceType: null,
    mandatoryComment: false,
    mandatoryAttachments: false,
    scheduledActivitySubTypeId: 1,
  },
  {
    id: 1,
    globalId: 'a',
    name: 'Authorised leave',
    schoolName: null,
    notificationTypeDescription: 'Email',
    actAsClocking: false,
    actAsBlackout: true,
    isAppointment: false,
    triggerEmail: true,
    requiresApproval: false,
    scheduledActivitySubTypeDescription: 'Absence',
    accessLevel: 'Student',
    attendanceType: null,
    mandatoryComment: true,
    mandatoryAttachments: false,
    scheduledActivitySubTypeId: 2,
  },
]

const DETAILS: ActivityTypeDetailsDto = {
  detail: {
    id: 0,
    globalId: '00000000-0000-0000-0000-000000000000',
    name: null,
    schoolId: null,
    notificationTypeId: null,
    actAsClocking: false,
    actAsBlackout: false,
    isAppointment: false,
    triggerEmail: false,
    requiresApproval: false,
    mandatoryComment: false,
    mandatoryAttachments: false,
    scheduledActivitySubTypeId: 0,
    fileTemplateIds: [],
    accessLevelId: null,
    attendanceStatusTypeId: null,
    attendanceStatus: null,
  },
  scheduledActivitySubTypeAvailables: [{ id: 1, description: 'Activity', globalId: null, visible: true }],
  notificationTypeAvailables: [{ id: 3, description: 'Letter', globalId: null, visible: true }],
  fileTemplateAvailables: [
    {
      id: 9,
      name: 'Letter A',
      comment: null,
      fileName: null,
      contentFile: null,
      fileTemplateTypeId: 1,
      fileTemplateTypeDescription: null,
      subject: null,
      externalFileName: null,
      dateCreated: null,
      size: 0,
    },
  ],
  accessLevels: [{ id: 1, description: 'Admin' }],
  attendanceTypes: [{ id: 5, description: 'MarkedAsAbsent' }],
}

function claims(actions: number[]) {
  return Promise.resolve([{ id: 13, actions: actions.map(id => ({ id })) }])
}

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  post.mockResolvedValue({ 'en-GB': {} })
})

describe('activity type rules', () => {
  it('defaults selects to the first option, validates the name and drops [None] values', () => {
    const detail = withSelectDefaults(DETAILS)
    expect(detail.scheduledActivitySubTypeId).toBe(1)
    expect(detail.accessLevelId).toBe(1)
    expect(validateActivityType(detail)?.messageKey).toBe('NameIsRequired')
    expect(validateActivityType({ ...detail, name: 'a<b' })?.messageKey).toBe('SpecialCharacters')
    expect(toActivityTypeBody(detail)).not.toHaveProperty('notificationTypeId')
  })
})

describe('ActivityTypesScreen', () => {
  it('lists sorted by name, opens a row and deletes with ids in the query', async () => {
    del.mockResolvedValue(undefined)
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims([1, 2, 4])
        : Promise.resolve(path === 'ScheduledActivityTypeApi' ? ROWS : null),
    )
    render(
      <ProfileProvider>
        <ActivityTypesScreen />
      </ProfileProvider>,
    )
    const names = await screen.findAllByText(/Authorised leave|Work placement/)
    expect(names[0]).toHaveTextContent('Authorised leave')
    fireEvent.click(names[1])
    expect(push).toHaveBeenCalledWith('/settings/activity-types/2')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Authorised leave' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }))
    })
    expect(del).toHaveBeenCalledWith('ScheduledActivityTypeApi?ids=1')
  })
})

describe('ActivityTypeDetailsScreen', () => {
  it('links the name error and clears it only when the name becomes valid', async () => {
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims([1, 2])
        : Promise.resolve(path === 'ScheduledActivityTypeApi/Details' ? DETAILS : null),
    )
    render(
      <ProfileProvider>
        <ActivityTypeDetailsScreen id={0} />
      </ProfileProvider>,
    )
    const name = await screen.findByLabelText('Name')
    fireEvent.change(name, { target: { value: '' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(name).toHaveAttribute('aria-describedby', 'activity-type-name-error')
    fireEvent.change(name, { target: { value: 'a<b' } })
    expect(name).toHaveAccessibleDescription('Special characters are not allowed .')
    fireEvent.change(name, { target: { value: 'Exam' } })
    expect(name).not.toHaveAttribute('aria-invalid')
  })

  it('shows letter templates only for trigger e-mail with Letter, and posts the detail', async () => {
    get.mockImplementation((path: string) =>
      path === 'UserApi/GetClaims'
        ? claims([1, 2])
        : Promise.resolve(path === 'ScheduledActivityTypeApi/Details' ? DETAILS : null),
    )
    render(
      <ProfileProvider>
        <ActivityTypeDetailsScreen id={0} />
      </ProfileProvider>,
    )
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Exam' } })
    fireEvent.click(screen.getByRole('switch', { name: 'Trigger e-mail' }))
    fireEvent.change(screen.getByLabelText('Attachment'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Letter A/ }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    const body = post.mock.calls.find(([path]) => path === 'ScheduledActivityTypeApi/')?.[1]?.body
    expect(body).toMatchObject({
      name: 'Exam',
      triggerEmail: true,
      notificationTypeId: 3,
      fileTemplateIds: [9],
      accessLevelId: 1,
    })
    expect(push).toHaveBeenCalledWith('/settings/activity-types')
  })
})
