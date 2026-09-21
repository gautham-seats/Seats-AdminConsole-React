import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { UserDetailsScreen } from '../UserDetailsScreen'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)

type Setup = { actions?: number[]; superUser?: boolean; identityProvider?: boolean }

function setup({ actions = [1, 2, 3, 4, 158], superUser = false, identityProvider = true }: Setup = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 6, actions: actions.map(id => ({ id })) }])
    if (path === 'UserSecurityLevelPermissionApi')
      return Promise.resolve({
        securityLevel: 'school',
        userSecurityLevelPermissions: [{ id: 91, userId: 12, name: 'Business School', schoolId: 30 }],
      })
    if (path === 'UserSecurityLevelPermissionApi/GetSecurityLevelsByCriteria')
      return Promise.resolve([{ id: 31, description: 'School of Law' }])
    if (path === 'UserApi/12')
      return Promise.resolve({
        detail: {
          id: 12,
          userName: 'amelia.hart',
          fullName: 'Amelia Hart',
          accountActive: true,
          isSuperUser: superUser,
          seatsAuthorisationByPersonas: false,
          seatsAuthenticationByOurIdentityProvider: identityProvider,
          personas: null,
          userSecurityLevelPermissionToProcess: [],
        },
        defaultPersonToAdd: { id: 0, accessProfileId: 0, order: 0, userId: null },
        accessProfileAvailables: [],
        accessProfileRestricted: [],
        accessProfileAll: null,
        userSecurityLevelPermissionOverview: {
          userId: 12,
          school: 'Business School;',
          course: null,
          programme: null,
          module: null,
          faculty: null,
          student: null,
          isSuperUser: superUser,
          isOwnClasses: false,
        },
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
      <UserDetailsScreen idParam="12" />
    </ProfileProvider>,
  )
}

const lastSave = () => post.mock.calls.filter(([path]) => path === 'UserApi').at(-1)?.[1]?.body

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('User security level permissions', () => {
  it('edits a level in the dialog and saves it with the user', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Schools: Business School;' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('Business School')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith(
      'UserSecurityLevelPermissionApi',
      expect.objectContaining({ query: { userId: 12, securityLevel: 'school' } }),
    )

    const search = within(dialog).getByRole('combobox', { name: 'Add school' })
    fireEvent.focus(search)
    fireEvent.change(search, { target: { value: 'Law' } })
    fireEvent.click(await within(dialog).findByRole('option', { name: 'School of Law' }, { timeout: 2000 }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
    expect(within(dialog).getByText('School of Law')).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Select Business School' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))

    expect(await screen.findByRole('button', { name: 'Schools: School of Law;' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Lecturer Visibility' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(lastSave()).toMatchObject({
      isSuperUser: false,
      userSecurityLevelPermissionToProcess: [
        {
          securityLevel: 'school',
          userSecurityLevelPermissions: [{ id: -1, schoolId: 31, name: 'School of Law', userId: 12 }],
        },
        { securityLevel: 'isOwnClasses', userSecurityLevelPermissions: [{ id: 0, isOwnClasses: true }] },
      ],
    })
  })

  it('loads the level again on reopen but keeps the rows already applied', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Schools: Business School;' }))
    const first = await screen.findByRole('dialog')
    await within(first).findByText('Business School')
    fireEvent.click(within(first).getByRole('checkbox', { name: 'Select Business School' }))
    fireEvent.click(within(first).getByRole('button', { name: 'Delete' }))
    fireEvent.click(within(first).getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const levelCalls = () =>
      get.mock.calls.filter(([path]) => path === 'UserSecurityLevelPermissionApi').length
    expect(levelCalls()).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: /^Schools:/ }))
    const second = await screen.findByRole('dialog')
    expect(within(second).getByRole('button', { name: 'Apply' })).toBeDisabled()
    expect(levelCalls()).toBe(2)
    await waitFor(() => expect(within(second).getByRole('button', { name: 'Apply' })).toBeEnabled())
    expect(within(second).queryByText('Business School')).not.toBeInTheDocument()
  })

  it('keeps the lookup menu closed when a search finds nothing', async () => {
    setup()
    const base = get.getMockImplementation()
    get.mockImplementation((path: string, options?: Parameters<typeof api.get>[1]) =>
      path === 'UserSecurityLevelPermissionApi/GetSecurityLevelsByCriteria'
        ? Promise.resolve([])
        : (base?.(path, options) ?? Promise.resolve(null)),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Schools: Business School;' }))
    const dialog = await screen.findByRole('dialog')
    const search = within(dialog).getByRole('combobox', { name: 'Add school' })
    fireEvent.focus(search)
    fireEvent.change(search, { target: { value: 'Nowhere' } })
    await waitFor(
      () =>
        expect(
          get.mock.calls.some(
            ([path]) => path === 'UserSecurityLevelPermissionApi/GetSecurityLevelsByCriteria',
          ),
        ).toBe(true),
      { timeout: 2000 },
    )
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
    })
    expect(within(dialog).queryByRole('listbox')).not.toBeInTheDocument()
    expect(search).toHaveAttribute('aria-expanded', 'false')
  })

  it('makes levels read-only and disables lecturer visibility for a super user', async () => {
    setup({ superUser: true })
    expect(await screen.findByText('Business School;')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Schools:/ })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Lecturer Visibility' })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Is Super User' }))
    expect(await screen.findByRole('button', { name: /^Schools:/ })).toBeInTheDocument()
  })

  it('hides Add and Delete in the dialog without Edit and Delete', async () => {
    setup({ actions: [1, 158] })
    fireEvent.click(await screen.findByRole('button', { name: 'Schools: Business School;' }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText('Business School')
    expect(within(dialog).getByRole('combobox')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Select Business School' }))
    expect(within(dialog).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
})

describe('User password actions', () => {
  it('G1-4 says Required for an empty password and confirmation, like legacy', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Set Password' }))
    const dialog = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    })
    expect(within(dialog).getAllByText('Required')).toHaveLength(2)
    expect(within(dialog).queryByText('Enter a password.')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Confirm the password.')).not.toBeInTheDocument()
  })

  it('validates and posts a new password', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Set Password' }))
    const dialog = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    })
    expect(within(dialog).getAllByText('Required')).toHaveLength(2)
    fireEvent.focus(within(dialog).getByLabelText('Password'))
    fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'amelia.hart-Pass1!' } })
    expect(within(dialog).getAllByText('Required')).toHaveLength(1)
    expect(within(dialog).getByText(/at least ten characters/)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'Str0ng!Passw0rd' } })
    expect(within(dialog).queryByText(/at least ten characters/)).not.toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Confirm Password'), { target: { value: 'nope' } })
    expect(within(dialog).getByText('The confirmation does not match the password')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByLabelText('Password')).toHaveAttribute(
      'aria-describedby',
      'set-password-confirm-error',
    )
    fireEvent.change(within(dialog).getByLabelText('Confirm Password'), {
      target: { value: 'Str0ng!Passw0rd' },
    })
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    })
    expect(post).toHaveBeenCalledWith('UserApi/SetPassword', {
      body: { id: 12, password: 'Str0ng!Passw0rd' },
    })
    expect(post.mock.calls.filter(([path]) => path === 'UserApi')).toHaveLength(0)
    expect(await screen.findByRole('status')).toHaveTextContent('Password was saved succesfuly')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the dialog open with a page-level safe mode message when writes are blocked', async () => {
    setup()
    post.mockImplementation((path: string) =>
      path === 'UserApi/SetPassword'
        ? Promise.reject(new ApiError('blocked', '/Seats.Trunk.Admin/api/UserApi/SetPassword'))
        : Promise.resolve({ 'en-GB': {} }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Set Password' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'Str0ng!Passw0rd' } })
    fireEvent.change(within(dialog).getByLabelText('Confirm Password'), {
      target: { value: 'Str0ng!Passw0rd' },
    })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('alert', { hidden: true })).toHaveTextContent('safe mode')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the general error when setting the password fails with a 500', async () => {
    setup()
    post.mockImplementation((path: string) =>
      path === 'UserApi/SetPassword'
        ? Promise.reject(new ApiError('http', '/Seats.Trunk.Admin/api/UserApi/SetPassword', 500, 'Boom'))
        : Promise.resolve({ 'en-GB': {} }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Set Password' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'Str0ng!Passw0rd' } })
    fireEvent.change(within(dialog).getByLabelText('Confirm Password'), {
      target: { value: 'Str0ng!Passw0rd' },
    })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('alert', { hidden: true })).toHaveTextContent(
      'There was an error while processing your request.',
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows password messages after blur and never saves on Enter', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Set Password' }))
    const dialog = await screen.findByRole('dialog')
    const password = within(dialog).getByLabelText('Password')
    fireEvent.focus(password)
    fireEvent.change(password, { target: { value: 'weak' } })
    expect(within(dialog).queryByText(/at least ten characters/)).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.keyDown(password, { key: 'Enter' })
      fireEvent.submit(password)
    })
    expect(post.mock.calls.some(([path]) => path === 'UserApi/SetPassword')).toBe(false)
    expect(password.closest('form')).toBeNull()
    fireEvent.blur(password)
    expect(within(dialog).getByText(/at least ten characters/)).toBeInTheDocument()
  })

  it('shows the general error when the security level search fails', async () => {
    setup()
    const base = get.getMockImplementation()
    get.mockImplementation((path: string, options?: Parameters<typeof api.get>[1]) =>
      path === 'UserSecurityLevelPermissionApi/GetSecurityLevelsByCriteria'
        ? Promise.reject(new ApiError('http', '/Seats.Trunk.Admin/api/UserSecurityLevelPermissionApi', 500))
        : (base?.(path, options) ?? Promise.resolve(null)),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Schools: Business School;' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByRole('combobox', { name: 'Add school' }), {
      target: { value: 'Law' },
    })
    expect(await screen.findByRole('alert', { hidden: true }, { timeout: 2000 })).toHaveTextContent(
      'There was an error while processing your request.',
    )
  })

  it('searches the security level lookup again on focus', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Schools: Business School;' }))
    const dialog = await screen.findByRole('dialog')
    const search = within(dialog).getByRole('combobox', { name: 'Add school' })
    fireEvent.change(search, { target: { value: 'Law' } })
    fireEvent.click(await within(dialog).findByRole('option', { name: 'School of Law' }, { timeout: 2000 }))
    fireEvent.blur(search)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 400))
    })
    expect(within(dialog).queryByRole('option')).not.toBeInTheDocument()
    fireEvent.focus(search)
    expect(
      await within(dialog).findByRole('option', { name: 'School of Law' }, { timeout: 2000 }),
    ).toBeInTheDocument()
  })

  it('shows the server message for 10 s when the reset link fails', async () => {
    setup()
    post.mockImplementation((path: string) =>
      path === 'UserApi/SendResetPasswordLink'
        ? Promise.reject(
            new ApiError('http', '/Seats.Trunk.Admin/api/UserApi/SendResetPasswordLink', 400, 'No email'),
          )
        : Promise.resolve({ 'en-GB': {} }),
    )
    const send = await screen.findByRole('button', { name: 'Send Password Reset Link' })
    await act(async () => {
      fireEvent.click(send)
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('No email')
  })

  it('shows the general error when the reset link fails with a 500', async () => {
    setup()
    post.mockImplementation((path: string) =>
      path === 'UserApi/SendResetPasswordLink'
        ? Promise.reject(
            new ApiError('http', '/Seats.Trunk.Admin/api/UserApi/SendResetPasswordLink', 500, 'Boom'),
          )
        : Promise.resolve({ 'en-GB': {} }),
    )
    const send = await screen.findByRole('button', { name: 'Send Password Reset Link' })
    await act(async () => {
      fireEvent.click(send)
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while processing your request.',
    )
  })

  it('shows the fixed reset link failure text without a server message', async () => {
    setup()
    post.mockImplementation((path: string) =>
      path === 'UserApi/SendResetPasswordLink'
        ? Promise.reject(new ApiError('network', '/Seats.Trunk.Admin/api/UserApi/SendResetPasswordLink'))
        : Promise.resolve({ 'en-GB': {} }),
    )
    const send = await screen.findByRole('button', { name: 'Send Password Reset Link' })
    await act(async () => {
      fireEvent.click(send)
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to send password reset link.')
  })

  it('sends the reset link with the user name as a JSON string', async () => {
    setup()
    const send = await screen.findByRole('button', { name: 'Send Password Reset Link' })
    await act(async () => {
      fireEvent.click(send)
    })
    expect(post).toHaveBeenCalledWith('UserApi/SendResetPasswordLink', { body: 'amelia.hart' })
    expect(await screen.findByRole('status')).toHaveTextContent('Password reset link sent successfully.')
  })

  it('shows Set Password without Edit but hides the reset link, and hides both without our identity provider', async () => {
    setup({ actions: [1] })
    expect(await screen.findByRole('button', { name: 'Set Password' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send Password Reset Link' })).not.toBeInTheDocument()
  })

  it('hides both actions when the tenant does not use our identity provider', async () => {
    setup({ identityProvider: false })
    await screen.findByLabelText('Full Name')
    expect(screen.queryByRole('button', { name: 'Set Password' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Send Password Reset Link' })).not.toBeInTheDocument()
  })
})
