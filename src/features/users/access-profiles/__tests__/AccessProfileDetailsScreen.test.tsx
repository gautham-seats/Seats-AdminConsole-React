import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { clearFlash, peekFlash } from '../../users-flash'
import { AccessProfileDetailsScreen } from '../AccessProfileDetailsScreen'

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

const NODES = [
  {
    id: 0,
    description: null,
    childNodes: [
      {
        id: 1,
        description: 'Attendance',
        childNodes: [],
        permissions: [
          {
            id: 20,
            name: 'Lectures',
            permissionDefinitionActions: [
              { id: 1, name: 'Access', permissionDefinitionActionInItemId: 101 },
              { id: 3, name: 'Edit', permissionDefinitionActionInItemId: 102 },
            ],
          },
        ],
      },
    ],
  },
]

type Setup = {
  idParam?: string
  actions?: number[]
  events?: boolean
  landingPage?: number | null
  externalKey?: string
  landingPages?: 'ok' | 'error' | 'pending'
}

function setup({
  idParam = '4',
  actions = [1, 2, 3],
  events = false,
  landingPage = null,
  externalKey = 'REG',
  landingPages = 'ok',
}: Setup = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 7, actions: actions.map(id => ({ id })) }])
    if (path === 'AccessProfileApi/GetLandingPages' && landingPages === 'error')
      return Promise.reject(
        new ApiError('http', '/Seats.Trunk.Admin/api/AccessProfileApi/GetLandingPages', 500),
      )
    if (path === 'AccessProfileApi/GetLandingPages' && landingPages === 'pending')
      return new Promise(() => undefined)
    if (path === 'AccessProfileApi/GetLandingPages')
      return Promise.resolve([
        { id: 2, description: 'Lectures', permissionDefinitionItemId: 20, permissionDefinitionActionId: 1 },
        { id: 3, description: 'Reports', permissionDefinitionItemId: 21, permissionDefinitionActionId: 1 },
        { id: 5, description: 'Activity', permissionDefinitionItemId: 20, permissionDefinitionActionId: 1 },
        { id: 9, description: 'Unmapped', permissionDefinitionItemId: 20, permissionDefinitionActionId: 1 },
      ])
    if (path === 'AccessProfileApi/4')
      return Promise.resolve({
        details: {
          id: 4,
          name: 'Registry',
          externalKey,
          isRestricted: false,
          isGeneralStaffProfile: true,
          selectedPermissions: [101],
          selectedEvents: [],
          selectedCases: [],
          selectedWorkflows: [],
          isEventTypeVisible: events,
          isCaseVisible: events,
          isWorkflowVisible: events,
          defaultLandingPage: landingPage,
        },
        nodes: NODES,
      })
    if (path === 'AccessProfileApi/0')
      return Promise.resolve({ details: { id: 0, selectedPermissions: [] }, nodes: NODES })
    if (path === 'AccessProfileApi/GetAllEventTypes')
      return Promise.resolve({
        events: [{ id: 7, type: 5, subType: 7, description: 'Exam' }],
        caseSteps: [],
        general: [],
        selected: [{ id: 9, accessProfileId: 4, type: 5, subType: 7, detail: false, comment: false }],
      })
    return Promise.resolve(null)
  })
  post.mockImplementation((path: string) =>
    path === 'ResourceApi/GetResourcesForScreen'
      ? Promise.resolve({ 'en-GB': {} })
      : Promise.resolve(undefined),
  )
  render(
    <ProfileProvider>
      <AccessProfileDetailsScreen idParam={idParam} />
    </ProfileProvider>,
  )
}

const timerOf = (toast: HTMLElement) =>
  toast.querySelector<HTMLElement>('[style*="animation-duration"]')?.style.animationDuration

const saved = () => post.mock.calls.filter(([path]) => path === 'AccessProfileApi').at(-1)?.[1]?.body

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined
  jest.clearAllMocks()
  clearResourceCache()
  clearFlash()
})

describe('AccessProfileDetailsScreen', () => {
  it('toggles permissions in the tree and saves the full view model', async () => {
    setup()
    expect(await screen.findByLabelText('Name')).toHaveValue('Registry')
    const edit = screen.getByRole('button', { name: 'Edit' })
    expect(screen.getByRole('button', { name: 'Access' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(edit)
    expect(edit).toHaveAttribute('aria-pressed', 'true')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saved()).toMatchObject({
      id: 4,
      name: 'Registry',
      externalKey: 'REG',
      isGeneralStaffProfile: true,
      selectedPermissions: [101, 102],
      defaultLandingPage: null,
    })
    expect(push).toHaveBeenCalledWith('/users/access-profiles')
    expect(peekFlash()).toEqual({
      tone: 'success',
      message: 'The item was saved successfully.',
      duration: 3500,
    })
  })

  it('unticks a permission and saves without it', async () => {
    setup()
    await screen.findByLabelText('Name')
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('AccessProfileApi/GetLandingPages', expect.anything()),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Access' }))
    expect(screen.getByRole('button', { name: 'Access' })).toHaveAttribute('aria-pressed', 'false')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saved()).toMatchObject({ selectedPermissions: [] })
  })

  it('copies an existing profile into a new one', async () => {
    setup()
    await screen.findByLabelText('Name')
    fireEvent.click(screen.getByRole('button', { name: 'Copy profile' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Registry (1)')
    expect(screen.queryByRole('button', { name: 'Copy profile' })).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saved()).toMatchObject({ id: 0, name: 'Registry (1)' })
  })

  it('loads event visibility and saves the edited event rows', async () => {
    setup({ events: true })
    await screen.findByLabelText('Name')
    fireEvent.click(screen.getByRole('tab', { name: 'Event Visibility' }))
    const panel = screen.getByRole('tabpanel', { name: 'Event Visibility' })
    const detail = await within(panel).findByRole('button', { name: 'Exam: Details' })
    expect(get).toHaveBeenCalledWith(
      'AccessProfileApi/GetAllEventTypes',
      expect.objectContaining({ query: { accesProfile: 4 } }),
    )
    expect(within(panel).getByRole('button', { name: 'Exam: Event' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(detail)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saved()).toMatchObject({
      selectedEvents: [{ id: 9, type: 5, subType: 7, detail: true, comment: false }],
    })
  })

  it('requires a name for a new profile with the gray 4 s validation notice', async () => {
    setup({ idParam: 'new' })
    await screen.findByRole('heading', { level: 1, name: 'New access profile' })
    await screen.findByLabelText('Name')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(screen.getByText('Required')).toBeInTheDocument()
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent('There are fields with input validation errors.')
    expect(timerOf(notice)).toBe('4000ms')
    expect(saved()).toBeUndefined()
  })

  it.each(['new', 'abc', '-3', '0', '2.5'])('opens a blank new profile for the id %p', async idParam => {
    setup({ idParam })
    await screen.findByRole('heading', { level: 1, name: 'New access profile' })
    expect(await screen.findByLabelText('Name')).toHaveValue('')
    expect(get).toHaveBeenCalledWith(
      'AccessProfileApi/0',
      expect.objectContaining({ signal: expect.anything() }),
    )
  })

  it('shows the not-authorised page instead of a login redirect when the profile answers 401', async () => {
    setup()
    get.mockImplementation((path: string) =>
      path === 'AccessProfileApi/4'
        ? Promise.reject(new ApiError('http', '/Seats.Trunk.Admin/api/AccessProfileApi/4', 401))
        : Promise.resolve(path === 'UserApi/GetClaims' ? [{ id: 7, actions: [{ id: 1 }] }] : null),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You do not have permission to view this page within the SEAtS application.',
    )
    expect(get).toHaveBeenCalledWith(
      'AccessProfileApi/4',
      expect.objectContaining({ signal: expect.anything() }),
    )
    expect(screen.queryByRole('button', { name: 'Refresh' })).not.toBeInTheDocument()
  })

  it('does not save on Enter and shows no required asterisk', async () => {
    setup()
    const name = await screen.findByLabelText('Name')
    expect(document.querySelector('form')).toBeNull()
    fireEvent.keyDown(name, { key: 'Enter' })
    fireEvent.submit(name)
    expect(saved()).toBeUndefined()
    expect(screen.getByText('Name').className).not.toContain("content-['*']")
  })

  it('sets a permission level and shows the unlocked page in the live preview', async () => {
    setup()
    await screen.findByLabelText('Name')
    const levels = screen.getByRole('radiogroup', { name: 'Lectures' })
    expect(within(levels).getByRole('radio', { name: 'View' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(within(levels).getByRole('radio', { name: 'Full' }))
    expect(within(levels).getByRole('radio', { name: 'Full' })).toHaveAttribute('aria-checked', 'true')
    const preview = screen.getByRole('complementary', { name: 'Live preview' })
    expect(within(preview).getAllByText('Lectures').length).toBeGreaterThan(0)
    fireEvent.click(within(levels).getByRole('radio', { name: 'None' }))
    expect(within(preview).getByText('This profile cannot open any page yet.')).toBeInTheDocument()
  })

  it('moves a permission level with the arrow keys, one tab stop per group', async () => {
    setup()
    await screen.findByLabelText('Name')
    const levels = screen.getByRole('radiogroup', { name: 'Lectures' })
    const view = within(levels).getByRole('radio', { name: 'View' })
    expect(view).toHaveAttribute('tabindex', '0')
    fireEvent.keyDown(view, { key: 'ArrowRight' })
    const next = within(levels)
      .getAllByRole('radio')
      .find(radio => radio.getAttribute('aria-checked') === 'true')
    expect(next).not.toBe(view)
    expect(next).toHaveFocus()
    expect(next).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('heading', { level: 2, name: 'Access profile details' })).toBeInTheDocument()
  })

  it('shows a blank option for a landing page id without a legacy name', async () => {
    setup({ landingPage: 9 })
    await screen.findByLabelText('Name')
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Default Landing Page' }), { key: 'Enter' })
    const options = await screen.findAllByRole('option')
    expect(options.map(option => option.textContent)).toEqual([
      'Not Set',
      'Lectures',
      'Reports',
      'Activity',
      '',
    ])
  })

  it('shows Required as soon as an edited name is cleared, without Save', async () => {
    setup()
    const name = await screen.findByLabelText('Name')
    fireEvent.focus(name)
    fireEvent.change(name, { target: { value: '' } })
    expect(screen.queryByText('Required')).not.toBeInTheDocument()
    fireEvent.blur(name)
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'true')
    fireEvent.focus(name)
    fireEvent.change(name, { target: { value: '<b>' } })
    fireEvent.blur(name)
    expect(screen.queryByText('Required')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('checks the landing page before switching on the special character rule and all messages', async () => {
    setup({ landingPage: 3, externalKey: '<x>' })
    const key = await screen.findByLabelText('External Key')
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('AccessProfileApi/GetLandingPages', expect.anything()),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent("lacks the 'Access' permission")
    expect(key).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText('There are fields with input validation errors.')).not.toBeInTheDocument()
    expect(saved()).toBeUndefined()
  })

  it('shows the special character message only after a Save passes the landing page check', async () => {
    setup({ externalKey: '<x>' })
    const key = await screen.findByLabelText('External Key')
    expect(key).toHaveAttribute('aria-invalid', 'false')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(key).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('There are fields with input validation errors.')
    expect(saved()).toBeUndefined()
  })

  it.each(['ok', 'error'] as const)(
    'silently resets a landing page missing from the %s landing page list to Not Set',
    async landingPages => {
      setup({ landingPage: 7, landingPages })
      await screen.findByLabelText('Name')
      await waitFor(() =>
        expect(screen.getByRole('combobox', { name: 'Default Landing Page' })).toHaveTextContent('Not Set'),
      )
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Save' }))
      })
      expect(screen.queryByText(/lacks the 'Access' permission/)).not.toBeInTheDocument()
      expect(saved()).toMatchObject({ defaultLandingPage: null })
    },
  )

  it('keeps Save disabled without a message while landing pages load for a set landing page', async () => {
    setup({ landingPage: 2, landingPages: 'pending' })
    await screen.findByLabelText('Name')
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    await act(async () => {
      fireEvent.click(save)
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(saved()).toBeUndefined()
  })

  it('titles the toolbar and fields like the legacy details view', async () => {
    setup()
    await screen.findByLabelText('Name')
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('title', 'Save')
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('title', 'Cancel')
    expect(screen.getByRole('button', { name: 'Copy profile' })).toHaveAttribute('title', 'Copy profile')
    expect(screen.getByLabelText('Name')).toHaveAttribute('title', 'Name')
    expect(screen.getByLabelText('External Key')).toHaveAttribute('title', 'External Key')
    const restricted = screen.getByRole('checkbox', { name: 'Restricted' })
    expect(restricted).toHaveAttribute('title', 'Restricted')
    expect(restricted.parentElement).not.toHaveAttribute('title')
    const legend = 'Restricted access profiles can only be assigned by users who hold them.'
    const legendTitles = document.querySelectorAll(`[title="${legend}"]`)
    expect(legendTitles).toHaveLength(1)
    expect(legendTitles[0]?.querySelector('svg')).not.toBeNull()
    expect(screen.getByRole('combobox', { name: 'Default Landing Page' })).toHaveAttribute(
      'title',
      'Default Landing Page',
    )
  })

  it('titles every tab with its own label', async () => {
    setup({ events: true })
    await screen.findByLabelText('Name')
    for (const label of ['Site Access', 'Event Visibility', 'Case Visibility', 'Workflow Visibility'])
      expect(screen.getByRole('tab', { name: label })).toHaveAttribute('title', label)
  })

  it('shows the server save error for 10 s', async () => {
    setup()
    await screen.findByLabelText('Name')
    post.mockImplementation((path: string) =>
      path === 'AccessProfileApi'
        ? Promise.reject(
            new ApiError('http', '/Seats.Trunk.Admin/api/AccessProfileApi', 400, 'Name already exists.'),
          )
        : Promise.resolve({ 'en-GB': {} }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Name already exists.')
    expect(timerOf(alert)).toBe('10000ms')
    expect(push).not.toHaveBeenCalled()
  })

  it('hides Save for an existing profile without Edit', async () => {
    setup({ actions: [1, 2] })
    await screen.findByLabelText('Name')
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('explains safe mode when the save is blocked', async () => {
    setup()
    await screen.findByLabelText('Name')
    post.mockImplementation((path: string) =>
      path === 'AccessProfileApi'
        ? Promise.reject(new ApiError('blocked', '/Seats.Trunk.Admin/api/AccessProfileApi'))
        : Promise.resolve({ 'en-GB': {} }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('safe mode')
  })
})

describe('AccessProfileDetailsScreen unsaved changes', () => {
  it('asks before Cancel leaves an edited form', async () => {
    setup()
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'Registry Office' } })
    fireEvent.click(screen.getByRole('link', { name: 'Cancel' }))
    expect(confirm).toHaveBeenCalledWith('You have unsaved changes. Leave this page?')
    confirm.mockRestore()
  })

  it('does not ask when the form is unchanged or after Save', async () => {
    setup()
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
    const field = await screen.findByLabelText('Name')
    const cancel = screen.getByRole('link', { name: 'Cancel' })
    // jsdom cannot follow the link; the leave guard's click handling still runs.
    cancel.addEventListener('click', event => event.preventDefault())
    fireEvent.click(cancel)
    expect(confirm).not.toHaveBeenCalled()
    fireEvent.change(field, { target: { value: 'Registry Office' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(push).toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
    confirm.mockRestore()
  })
})
