import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { peekFlash, clearFlash } from '../../users-flash'
import { UserDetailsScreen } from '../UserDetailsScreen'

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

type Setup = {
  id?: string
  actions?: number[]
  personasMode?: boolean
  identityProvider?: boolean
  loadError?: ApiError
  studentError?: ApiError
}

function details(id: number, { personasMode = true, identityProvider = false } = {}) {
  return {
    detail: {
      id,
      userName: id ? 'amelia.hart' : null,
      setPassword: null,
      accountActive: id !== 0,
      associatedStudentId: null,
      associatedStudentDescription: null,
      authenticateModeId: 0,
      isSuperUser: false,
      seatsAuthorisationByPersonas: personasMode,
      seatsAuthenticationByOurIdentityProvider: identityProvider,
      emailAddress: id ? 'amelia.hart@example.com' : null,
      positionNumber: null,
      personas: personasMode
        ? [{ id: id ? 7 : 0, accessProfileId: id ? 1 : 0, order: 0, userId: id ? String(id) : null }]
        : null,
      fullName: id ? 'Amelia Hart' : null,
      isMobileAppLoggingActive: false,
      displayName: null,
      userSecurityLevelPermissionToProcess: null,
    },
    defaultPersonToAdd: { id: 0, accessProfileId: 0, order: 0, userId: null },
    accessProfileAvailables: [
      { id: 1, description: 'Administrator' },
      { id: 2, description: 'Read Only' },
    ],
    accessProfileRestricted: [],
    accessProfileAll: id
      ? [
          { id: 1, description: 'Administrator' },
          { id: 2, description: 'Read Only' },
        ]
      : null,
    userSecurityLevelPermissionOverview: {
      userId: id,
      school: 'Business School',
      course: null,
      programme: null,
      module: null,
      faculty: null,
      student: null,
      isSuperUser: false,
      isOwnClasses: true,
    },
  }
}

function setup({
  id = '12',
  actions = [1, 2, 3],
  personasMode = true,
  identityProvider = false,
  loadError,
  studentError,
}: Setup = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 6, actions: actions.map(action => ({ id: action })) }])
    if (path.startsWith('UserApi/GetStudentsByCriteria')) {
      if (studentError) return Promise.reject(studentError)
      return Promise.resolve([
        { id: 55, description: 'Ben Carter' },
        { id: 56, description: 'Bella Rossi' },
      ])
    }
    if (path.startsWith('UserApi/')) {
      if (loadError) return Promise.reject(loadError)
      return Promise.resolve(
        details(path === 'UserApi/Details' ? 0 : Number(path.split('/')[1]), {
          personasMode,
          identityProvider,
        }),
      )
    }
    return Promise.resolve(null)
  })
  post.mockImplementation((path: string) =>
    path === 'ResourceApi/GetResourcesForScreen'
      ? Promise.resolve({ 'en-GB': {} })
      : Promise.resolve(undefined),
  )
  return render(
    <ProfileProvider>
      <UserDetailsScreen idParam={id} />
    </ProfileProvider>,
  )
}

const saves = () => post.mock.calls.filter(([path]) => path === 'UserApi')

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  clearFlash()
})

describe('UserDetailsScreen', () => {
  it('loads an existing user with GET api/UserApi/{id} and fills the form', async () => {
    setup()
    expect(await screen.findByLabelText('User Name')).toHaveValue('amelia.hart')
    expect(get).toHaveBeenCalledWith(
      'UserApi/12',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(screen.getByLabelText('Full Name')).toHaveValue('Amelia Hart')
    expect(screen.getByRole('switch', { name: 'Account Active' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('heading', { level: 1, name: 'amelia.hart' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Persons' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/users')
  })

  it('saves the edited UserDto and returns to the list with a success notice', async () => {
    setup()
    const fullName = await screen.findByLabelText('Full Name')
    fireEvent.change(fullName, { target: { value: 'Amelia J Hart' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saves()).toHaveLength(1)
    expect(saves()[0][1]).toEqual({
      body: expect.objectContaining({
        id: 12,
        userName: 'amelia.hart',
        fullName: 'Amelia J Hart',
        isSuperUser: false,
        setPassword: null,
        personas: [{ id: 7, accessProfileId: 1, order: 0, userId: '12' }],
      }),
    })
    expect(push).toHaveBeenCalledWith('/users')
    expect(peekFlash()).toEqual({
      tone: 'success',
      message: 'The item was saved successfully.',
      duration: 3500,
    })
  })

  it('sends user name, full name and email untrimmed', async () => {
    setup()
    fireEvent.change(await screen.findByLabelText('Full Name'), { target: { value: ' Amelia Hart ' } })
    fireEvent.change(screen.getByLabelText('User Name'), { target: { value: 'amelia.hart ' } })
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: ' a@example.com' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saves()[0][1]).toEqual({
      body: expect.objectContaining({
        userName: 'amelia.hart ',
        fullName: ' Amelia Hart ',
        emailAddress: ' a@example.com',
      }),
    })
  })

  it('shows Required only after Save or an edit, with the gray validation notice', async () => {
    setup({ id: 'new', actions: [1, 2], personasMode: false })
    await screen.findByRole('heading', { level: 1, name: 'New user' })
    // UserApiController.cs:59 vs :131 — a bare 'UserApi/' would return the user list, not a new-user model.
    expect(get).toHaveBeenCalledWith('UserApi/Details', expect.anything())
    expect(screen.queryByText('Required')).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(screen.getAllByText('Required')).toHaveLength(2)
    expect(screen.getByLabelText('User Name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('There are fields with input validation errors.')
    expect(saves()).toHaveLength(0)
  })

  it('shows a field message only after the changed field loses focus', async () => {
    setup({ id: 'new', actions: [1, 2], personasMode: false })
    const userName = await screen.findByLabelText('User Name')
    fireEvent.focus(userName)
    fireEvent.blur(userName)
    expect(screen.queryByText('Required')).not.toBeInTheDocument()
    fireEvent.focus(userName)
    fireEvent.change(userName, { target: { value: 'maya' } })
    fireEvent.blur(userName)
    fireEvent.focus(userName)
    fireEvent.change(userName, { target: { value: 'maya2' } })
    fireEvent.change(userName, { target: { value: '' } })
    expect(screen.queryByText('Required')).not.toBeInTheDocument()
    fireEvent.blur(userName)
    expect(screen.getAllByText('Required')).toHaveLength(1)
    expect(userName).toHaveAttribute('aria-invalid', 'true')
  })

  it('G1-1 saves with Ctrl+S once the form is dirty, as the Save button advertises', async () => {
    setup()
    const fullName = await screen.findByLabelText('Full Name')
    await act(async () => {
      fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    })
    expect(saves()).toHaveLength(0)
    fireEvent.change(fullName, { target: { value: 'Amelia J Hart' } })
    await act(async () => {
      fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    })
    expect(saves()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('aria-keyshortcuts', 'Control+S')
  })

  it('does not save when Enter is pressed in a field', async () => {
    setup()
    const fullName = await screen.findByLabelText('Full Name')
    fireEvent.change(fullName, { target: { value: 'Amelia J Hart' } })
    await act(async () => {
      fireEvent.keyDown(fullName, { key: 'Enter' })
      fireEvent.submit(fullName)
    })
    expect(saves()).toHaveLength(0)
    expect(fullName.closest('form')).toBeNull()
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it('blocks < and > only once Save has run', async () => {
    setup({ id: 'new', actions: [1, 2], personasMode: false })
    fireEvent.change(await screen.findByLabelText('User Name'), { target: { value: 'maya' } })
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Maya <b>' } })
    expect(screen.queryByText('Special characters are not allowed .')).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(screen.getByText('Special characters are not allowed .')).toBeInTheDocument()
    expect(saves()).toHaveLength(0)
  })

  it('checks personas before the fields and shows the red persona error', async () => {
    setup({ id: 'new', actions: [1, 2] })
    await screen.findByLabelText('User Name')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('must have at least one access profile')
    expect(screen.queryByText('Required')).not.toBeInTheDocument()
    expect(saves()).toHaveLength(0)
  })

  it('links the persona row message to its select and clears it when the row is fixed', async () => {
    setup()
    await screen.findByLabelText('Full Name')
    const panel = screen.getByRole('tabpanel')
    fireEvent.click(within(panel).getByRole('button', { name: 'Add' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    const selects = within(panel).getAllByRole('combobox', { name: 'Access Profile' })
    const errorId = selects[1].getAttribute('aria-describedby')
    expect(selects[1]).toHaveAttribute('aria-invalid', 'true')
    expect(errorId && document.getElementById(errorId)).toHaveTextContent(
      'must have at least one access profile',
    )
    expect(selects[0]).toHaveAttribute('aria-invalid', 'false')
    fireEvent.click(within(panel).getByRole('button', { name: 'Delete [None]' }))
    await waitFor(() =>
      expect(within(panel).getByRole('combobox', { name: 'Access Profile' })).not.toHaveAttribute(
        'aria-describedby',
      ),
    )
    expect(saves()).toHaveLength(0)
  })

  it('moves between the tabs with the arrow keys and keeps one tab stop', async () => {
    setup()
    await screen.findByLabelText('Full Name')
    const persons = screen.getByRole('tab', { name: 'Persons' })
    const security = screen.getByRole('tab', { name: 'Security Level Permissions' })
    expect(persons).toHaveAttribute('tabindex', '0')
    expect(security).toHaveAttribute('tabindex', '-1')
    expect(document.getElementById(security.getAttribute('aria-controls') ?? '')).toBeInTheDocument()
    fireEvent.keyDown(persons, { key: 'ArrowRight' })
    expect(security).toHaveAttribute('aria-selected', 'true')
    expect(security).toHaveFocus()
    fireEvent.keyDown(security, { key: 'Home' })
    expect(persons).toHaveFocus()
    expect(screen.getByRole('heading', { level: 2, name: 'User details' })).toBeInTheDocument()
  })

  it('offers [None] as the first persona option', async () => {
    setup({ id: 'new', actions: [1, 2] })
    await screen.findByLabelText('User Name')
    expect(screen.getByRole('combobox', { name: 'Access Profile' })).toHaveTextContent('[None]')
  })

  it('shows the password fields and policy only for a new user with our identity provider', async () => {
    setup({ id: 'new', actions: [1, 2], personasMode: false, identityProvider: true })
    const password = await screen.findByLabelText('Password')
    // Confirm sits beside Password from the start, so the pair never reflows as you type.
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    fireEvent.focus(password)
    fireEvent.change(password, { target: { value: 'weak' } })
    fireEvent.blur(password)
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('User Name'), { target: { value: 'maya' } })
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Maya' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(screen.getByText(/at least ten characters/)).toBeInTheDocument()
    expect(saves()).toHaveLength(0)
  })

  it('keeps the user on the page and shows the server message on a 400', async () => {
    setup()
    await screen.findByLabelText('Full Name')
    post.mockImplementation((path: string) =>
      path === 'UserApi'
        ? Promise.reject(
            new ApiError(
              'http',
              '/Seats.Trunk.Admin/api/UserApi',
              400,
              'Error has ocurred while saving the user.',
            ),
          )
        : Promise.resolve({ 'en-GB': {} }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Error has ocurred while saving the user.')
    expect(push).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled()
  })

  it('shows the red general error instead of the server text of a 5xx save failure', async () => {
    setup()
    await screen.findByLabelText('Full Name')
    post.mockImplementation((path: string) =>
      path === 'UserApi'
        ? Promise.reject(new ApiError('http', '/Seats.Trunk.Admin/api/UserApi', 500, 'Stack trace'))
        : Promise.resolve({ 'en-GB': {} }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while processing your request.',
    )
    expect(screen.queryByText('Stack trace')).not.toBeInTheDocument()
  })

  it('shows the gray save error when the save gets no response', async () => {
    setup()
    await screen.findByLabelText('Full Name')
    post.mockImplementation((path: string) =>
      path === 'UserApi'
        ? Promise.reject(new ApiError('network', '/Seats.Trunk.Admin/api/UserApi'))
        : Promise.resolve({ 'en-GB': {} }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'There was an error while trying to save the item.',
    )
  })

  it('explains safe mode when the write is blocked', async () => {
    setup()
    await screen.findByLabelText('Full Name')
    post.mockImplementation((path: string) =>
      path === 'UserApi'
        ? Promise.reject(new ApiError('blocked', '/Seats.Trunk.Admin/api/UserApi'))
        : Promise.resolve({ 'en-GB': {} }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('status')).toHaveTextContent('safe mode')
  })

  it('hides Save without Users + Edit for an existing user', async () => {
    setup({ actions: [1, 2] })
    await screen.findByLabelText('Full Name')
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('shows the security level overview read-only when personas are off', async () => {
    setup({ personasMode: false })
    await screen.findByLabelText('Full Name')
    expect(screen.queryByRole('tab', { name: 'Persons' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Security Level Permissions' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('Business School')).toBeInTheDocument()
    expect(screen.queryByText('Lecturer Visibility')).not.toBeInTheDocument()
  })

  it('searches students and stores the selected id', async () => {
    setup()
    const student = await screen.findByRole('combobox', { name: 'Associated Student' })
    fireEvent.focus(student)
    fireEvent.change(student, { target: { value: 'Be' } })
    const option = await screen.findByRole('option', { name: 'Ben Carter' }, { timeout: 2000 })
    expect(get).toHaveBeenCalledWith(
      'UserApi/GetStudentsByCriteria',
      expect.objectContaining({ query: { query: 'Be' } }),
    )
    fireEvent.click(option)
    expect(student).toHaveValue('Ben Carter')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saves()[0][1]).toEqual({
      body: expect.objectContaining({ associatedStudentId: 55, associatedStudentDescription: 'Ben Carter' }),
    })
  })

  it('clears the stored student id when the associated student text is edited', async () => {
    setup()
    const student = await screen.findByRole('combobox', { name: 'Associated Student' })
    fireEvent.focus(student)
    fireEvent.change(student, { target: { value: 'Be' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Ben Carter' }, { timeout: 2000 }))
    fireEvent.change(student, { target: { value: 'Ben Carter edited' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(post).not.toHaveBeenCalledWith('UserApi', expect.anything())
    expect(await screen.findByText(/no item selected/i)).toBeInTheDocument()
  })

  it('does not open the student list on focus or on ArrowDown while closed', async () => {
    setup()
    const student = await screen.findByRole('combobox', { name: 'Associated Student' })
    fireEvent.focus(student)
    fireEvent.keyDown(student, { key: 'ArrowDown' })
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 400))
    })
    expect(student).toHaveAttribute('aria-expanded', 'false')
    expect(get.mock.calls.some(([path]) => path === 'UserApi/GetStudentsByCriteria')).toBe(false)
  })

  it('wraps the highlight with the arrow keys and selects it with Tab', async () => {
    setup()
    const student = await screen.findByRole('combobox', { name: 'Associated Student' })
    fireEvent.focus(student)
    fireEvent.change(student, { target: { value: 'Be' } })
    await screen.findByRole('option', { name: 'Ben Carter' }, { timeout: 2000 })
    const highlighted = () => screen.getByRole('option', { selected: true })
    expect(highlighted()).toHaveTextContent('Ben Carter')
    fireEvent.keyDown(student, { key: 'ArrowUp' })
    expect(highlighted()).toHaveTextContent('Bella Rossi')
    fireEvent.keyDown(student, { key: 'ArrowDown' })
    expect(highlighted()).toHaveTextContent('Ben Carter')
    fireEvent.keyDown(student, { key: 'ArrowUp' })
    expect(fireEvent.keyDown(student, { key: 'Tab' })).toBe(false)
    expect(student).toHaveValue('Bella Rossi')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('shows the general error when the student search fails', async () => {
    setup({ studentError: new ApiError('http', '/Seats.Trunk.Admin/api/UserApi/GetStudentsByCriteria', 500) })
    const student = await screen.findByRole('combobox', { name: 'Associated Student' })
    fireEvent.focus(student)
    fireEvent.change(student, { target: { value: 'Be' } })
    expect(await screen.findByRole('alert', {}, { timeout: 2000 })).toHaveTextContent(
      'There was an error while processing your request.',
    )
  })

  it('adds and removes persona rows', async () => {
    setup()
    await screen.findByLabelText('Full Name')
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument()
    fireEvent.click(within(panel).getByRole('button', { name: 'Add' }))
    expect(within(panel).getAllByRole('button', { name: /^Delete/ })).toHaveLength(2)
    expect(within(panel).getByRole('button', { name: 'Delete [None]' })).toBeInTheDocument()
    fireEvent.click(within(panel).getAllByRole('button', { name: /^Delete/ })[1])
    await waitFor(() =>
      expect(within(panel).queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument(),
    )
  })

  it('shows not found for a bad id and a 404', async () => {
    setup({ id: 'abc' })
    expect(await screen.findByText('This user could not be found.')).toBeInTheDocument()
  })

  it('shows an error with Refresh when loading fails', async () => {
    setup({ loadError: new ApiError('http', '/Seats.Trunk.Admin/api/UserApi/12', 500) })
    expect(await screen.findByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    expect(screen.queryByLabelText('User Name')).not.toBeInTheDocument()
  })
})

describe('UserDetailsScreen studio split', () => {
  it('puts Save, Discard and Cancel in the page header, not a footer', async () => {
    setup()
    const fullName = await screen.findByLabelText('Full Name')
    const save = screen.getByRole('button', { name: 'Save' })
    expect(document.querySelector('footer')).toBeNull()
    // Header actions come before the first field in reading order.
    expect(save.compareDocumentPosition(fullName) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument()
    fireEvent.change(fullName, { target: { value: 'Amelia J Hart' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }))
    expect(screen.getByLabelText('Full Name')).toHaveValue('Amelia Hart')
    expect(screen.queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument()
  })

  it('previews the account as it is typed', async () => {
    setup({ id: 'new', personasMode: true })
    const preview = (await screen.findByRole('heading', { name: 'User preview' })).closest('section')
    if (!preview) throw new Error('preview card not found')
    expect(within(preview).getByText('New user')).toBeInTheDocument()
    expect(within(preview).getByText('No email address')).toBeInTheDocument()
    expect(within(preview).getByText('No access profile chosen')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Ben Carter' } })
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'ben@uni.test' } })
    expect(within(preview).getByText('Ben Carter')).toBeInTheDocument()
    expect(within(preview).getByText('ben@uni.test')).toBeInTheDocument()
    expect(within(preview).getByText('Inactive')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: 'Account Active' }))
    expect(within(preview).getByText('Active')).toBeInTheDocument()
  })

  it('ticks each password rule live for a new account', async () => {
    setup({ id: 'new', personasMode: true, identityProvider: true })
    const password = await screen.findByLabelText('Password')
    const list = screen.getByRole('list', { name: 'Password requirements' })
    const met = () =>
      within(list)
        .getAllByRole('listitem')
        .filter(item => item.getAttribute('data-met') === 'true')
        .map(item => item.textContent)
    expect(met()).toEqual([])
    fireEvent.change(password, { target: { value: 'Str0ng!Pass' } })
    expect(met()).toEqual([
      'At least ten characters',
      'An uppercase letter (A–Z)',
      'A lowercase letter (a–z)',
      'A digit (0–9)',
      'A symbol (!$#,%)',
      'Does not contain the user name',
    ])
    fireEvent.blur(password)
    fireEvent.change(await screen.findByLabelText('Confirm Password'), { target: { value: 'Str0ng!Pass' } })
    expect(met()).toContain('Confirmation matches')
  })
})

describe('UserDetailsScreen unsaved changes', () => {
  it('asks before Cancel leaves an edited form', async () => {
    setup()
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.change(await screen.findByLabelText('Full Name'), { target: { value: 'Amelia J Hart' } })
    fireEvent.click(screen.getByRole('link', { name: 'Cancel' }))
    expect(confirm).toHaveBeenCalledWith('You have unsaved changes. Leave this page?')
    confirm.mockRestore()
  })

  it('does not ask when the form is unchanged or after Save', async () => {
    setup()
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
    const field = await screen.findByLabelText('Full Name')
    fireEvent.click(screen.getByRole('link', { name: 'Cancel' }))
    expect(confirm).not.toHaveBeenCalled()
    fireEvent.change(field, { target: { value: 'Amelia J Hart' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(push).toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
    confirm.mockRestore()
  })
})
