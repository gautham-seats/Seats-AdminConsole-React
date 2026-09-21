import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { clearFlash, peekFlash } from '../../users-flash'
import { ContactGroupDetailsScreen } from '../ContactGroupDetailsScreen'

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
const del = jest.mocked(api.delete)

type ViewPatch = { detail?: Record<string, unknown>; functionAvailables?: { id: number; name: string }[] }

function view(id: number, patch: ViewPatch = {}) {
  const base = {
    detail: id
      ? {
          id,
          name: 'Registry',
          description: null,
          groupEmailAddress: '',
          sendEmailsToTypeId: 2,
          functionId: null,
          entityId: null,
          userIdsInContactGroup: [7],
        }
      : { id: 0, name: null, sendEmailsToTypeId: null },
    users: id
      ? [{ id: 7, userName: 'maya.lee', fullName: 'Maya Lee', emailAddress: 'maya@example.com' }]
      : null,
    sendEmailToAvailables: [
      { id: 1, description: 'Contact group email', visible: false },
      { id: 2, description: 'Individual members', visible: false },
    ],
    entityAvailables: [
      { id: 0, description: 'None' },
      { id: 1, description: 'Course' },
    ],
    functionAvailables: [{ id: 4, name: 'Attendance' }],
  }
  return {
    ...base,
    detail: { ...base.detail, ...patch.detail },
    functionAvailables: patch.functionAvailables ?? base.functionAvailables,
  }
}

function setup(idParam = '11', actions = [1, 2, 3, 129], patch: ViewPatch = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 16, actions: actions.map(id => ({ id })) }])
    if (path === 'ContactGroupApi/11') return Promise.resolve(view(11, patch))
    if (path === 'ContactGroupApi/Details') return Promise.resolve(view(0))
    if (path === 'UserApi/GetUsersByCriteria')
      return Promise.resolve([
        { id: 8, userName: 'ben.carter', fullName: 'Ben Carter', emailAddress: 'ben@example.com' },
      ])
    if (path === 'UserApi/8')
      return Promise.resolve({
        detail: {
          id: 8,
          userName: 'ben.carter',
          fullName: 'Ben Carter',
          displayName: 'Ben Carter',
          emailAddress: 'ben@example.com',
        },
      })
    if (path === 'ContactGroupApi/GetCoursesByCriteria')
      return Promise.resolve([{ id: 90, description: 'BSc Computing' }])
    return Promise.resolve(null)
  })
  post.mockImplementation((path: string) => {
    if (path === 'ResourceApi/GetResourcesForScreen') return Promise.resolve({ 'en-GB': {} })
    if (path === 'contactGroupApi/createOrUpdateFunction') return Promise.resolve({ id: 12, name: 'Exams' })
    return Promise.resolve(undefined)
  })
  render(
    <ProfileProvider>
      <ContactGroupDetailsScreen idParam={idParam} />
    </ProfileProvider>,
  )
}

const saved = () => post.mock.calls.filter(([path]) => path === 'ContactGroupApi').at(-1)?.[1]?.body

const serverError = (path: string) => new ApiError('http', `/api/${path}`, 500, 'Stack trace')

function failGet(failing: string) {
  const current = get.getMockImplementation()
  get.mockImplementation((path: string, options?: Parameters<typeof api.get>[1]) =>
    path === failing
      ? Promise.reject(serverError(path))
      : (current?.(path, options) ?? Promise.resolve(null)),
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  clearFlash()
})

describe('ContactGroupDetailsScreen', () => {
  it('loads the group with its members and saves the edited ContactGroupDto', async () => {
    setup()
    const name = await screen.findByLabelText(/^Name/)
    expect(name).toHaveValue('Registry')
    expect(screen.getByRole('heading', { level: 1, name: 'Registry' })).toBeInTheDocument()
    expect(screen.getByText('maya.lee')).toBeInTheDocument()
    expect(screen.getByText('Maya Lee')).toBeInTheDocument()
    fireEvent.change(name, { target: { value: 'Registry Office' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saved()).toMatchObject({
      id: 11,
      name: 'Registry Office',
      sendEmailsToTypeId: 2,
      userIdsInContactGroup: [7],
    })
    expect(push).toHaveBeenCalledWith('/users/contact-groups')
    expect(peekFlash()).toEqual({
      tone: 'success',
      message: 'The item was saved successfully.',
      duration: 3500,
    })
  })

  it('adds a member through the user search and removes selected members', async () => {
    setup()
    const search = await screen.findByRole('combobox', { name: 'Add Users' })
    fireEvent.focus(search)
    fireEvent.change(search, { target: { value: 'ben' } })
    fireEvent.click(await screen.findByRole('option', { name: 'ben.carter (Ben Carter)' }, { timeout: 2000 }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    })
    expect(get).toHaveBeenCalledWith('UserApi/8', expect.anything())
    expect(await screen.findByText('ben.carter')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select maya.lee' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.queryByText('maya.lee')).not.toBeInTheDocument()
  })

  it('keeps Add busy when a second add supersedes the first', async () => {
    let releaseBen: (value: unknown) => void
    const benPending = new Promise(resolve => {
      releaseBen = resolve
    })
    setup()
    get.mockImplementation((path: string) => {
      if (path === 'UserApi/GetClaims')
        return Promise.resolve([{ id: 16, actions: [1, 2, 3, 129].map(id => ({ id })) }])
      if (path === 'ContactGroupApi/11') return Promise.resolve(view(11))
      if (path === 'UserApi/GetUsersByCriteria')
        return Promise.resolve([
          { id: 8, userName: 'ben.carter', fullName: 'Ben Carter', emailAddress: 'ben@example.com' },
        ])
      if (path === 'UserApi/8') return benPending
      return Promise.resolve(null)
    })
    const search = await screen.findByRole('combobox', { name: 'Add Users' })
    fireEvent.focus(search)
    fireEvent.change(search, { target: { value: 'ben' } })
    fireEvent.click(await screen.findByRole('option', { name: 'ben.carter (Ben Carter)' }, { timeout: 2000 }))
    const add = screen.getByRole('button', { name: 'Add' })
    await act(async () => {
      fireEvent.click(add)
      fireEvent.click(add)
    })
    expect(add).toHaveAttribute('aria-busy', 'true')
    await act(async () => {
      releaseBen!({
        detail: {
          id: 8,
          userName: 'ben.carter',
          fullName: 'Ben Carter',
          displayName: 'Ben Carter',
          emailAddress: 'ben@example.com',
        },
      })
    })
    expect(await screen.findByText('ben.carter')).toBeInTheDocument()
    expect(add).not.toHaveAttribute('aria-busy', 'true')
  })

  it('validates a new group and requires members or a group email', async () => {
    setup('new')
    await screen.findByRole('heading', { level: 1, name: 'New contact group' })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(screen.getAllByText('Required')).toHaveLength(2)
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Advisers' } })
    expect(saved()).toBeUndefined()
  })

  it('creates a function from the dialog and selects it', async () => {
    setup()
    await screen.findByLabelText(/^Name/)
    fireEvent.click(screen.getByRole('button', { name: 'Add Function' }))
    const dialog = await screen.findByRole('dialog', { name: 'Create New Function' })
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Exams' } })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
    })
    expect(post).toHaveBeenCalledWith('contactGroupApi/createOrUpdateFunction', {
      body: { id: 0, name: 'Exams' },
    })
    expect(await screen.findByRole('status')).toHaveTextContent('The item was saved successfully.')
    expect(screen.getByRole('button', { name: 'Edit Function' })).toBeInTheDocument()
  })

  it('clears the function name Required while typing, before Apply runs again', async () => {
    setup()
    await screen.findByLabelText(/^Name/)
    fireEvent.click(screen.getByRole('button', { name: 'Add Function' }))
    const dialog = await screen.findByRole('dialog', { name: 'Create New Function' })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
    })
    const name = within(dialog).getByLabelText('Name')
    expect(name).toHaveAttribute('aria-describedby', 'function-name-error')
    fireEvent.change(name, { target: { value: 'E' } })
    expect(within(dialog).queryByText('Required')).not.toBeInTheDocument()
    expect(name).toHaveAttribute('aria-invalid', 'false')
  })

  it('links the Save errors to their fields', async () => {
    setup('new')
    await screen.findByRole('heading', { level: 1, name: 'New contact group' })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    const sendTo = document.getElementById('contact-group-send-to')
    expect(sendTo).toHaveAttribute('aria-describedby', 'contact-group-send-to-error')
    expect(document.getElementById('contact-group-send-to-error')).toHaveTextContent('Required')
    expect(screen.getByRole('heading', { level: 2, name: 'Contact group details' })).toBeInTheDocument()
  })

  it('deletes a function without confirmation and clears it', async () => {
    setup()
    await screen.findByLabelText(/^Name/)
    post.mockImplementation((path: string) =>
      path === 'ResourceApi/GetResourcesForScreen'
        ? Promise.resolve({ 'en-GB': {} })
        : Promise.resolve({ id: 4, name: 'Attendance' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add Function' }))
    const create = await screen.findByRole('dialog', { name: 'Create New Function' })
    fireEvent.change(within(create).getByLabelText('Name'), { target: { value: 'Attendance' } })
    await act(async () => {
      fireEvent.click(within(create).getByRole('button', { name: 'Apply' }))
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Function' }))
    const edit = await screen.findByRole('dialog', { name: 'Edit Function' })
    expect(within(edit).getByLabelText('Name')).toHaveValue('Attendance')
    del.mockResolvedValue(undefined)
    await act(async () => {
      fireEvent.click(within(edit).getByRole('button', { name: 'Delete' }))
    })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(del).toHaveBeenCalledWith('contactGroupApi/deletefunction', { query: { id: 4 } })
    expect(await screen.findByRole('button', { name: 'Add Function' })).toBeInTheDocument()
  })

  it('hides functions, member editing and Save without the rights but keeps the checkboxes', async () => {
    setup('11', [1])
    await screen.findByLabelText(/^Name/)
    expect(screen.queryByText('Function')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select maya.lee' }))
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('has no form, so Enter cannot save', async () => {
    setup()
    const name = await screen.findByLabelText(/^Name/)
    expect(name.closest('form')).toBeNull()
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
    fireEvent.keyDown(name, { key: 'Enter' })
    expect(saved()).toBeUndefined()
  })

  it('places Add Users between Description and Group Email Address', async () => {
    setup()
    await screen.findByLabelText(/^Name/)
    const description = screen.getByLabelText('Description')
    const users = screen.getByRole('combobox', { name: 'Add Users' })
    const email = screen.getByLabelText('Group Email Address')
    expect(description.compareDocumentPosition(users) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(users.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows the table headers, checkboxes and the empty row with no members', async () => {
    setup('new')
    await screen.findByRole('heading', { level: 1, name: 'New contact group' })
    expect(screen.getAllByRole('columnheader').map(th => th.textContent)).toEqual([
      '',
      'User Name',
      'Full Name',
      'E-mail',
    ])
    expect(screen.getByRole('checkbox', { name: 'Select All' })).toBeInTheDocument()
    expect(screen.getByText('There are no items to show.')).toBeInTheDocument()
  })

  it('shows the association Required before any Save', async () => {
    setup('11', [1, 2, 3, 129], { detail: { functionId: 4, entityId: 1 } })
    await screen.findByLabelText(/^Name/)
    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(saved()).toBeUndefined()
  })

  it('blocks Save when the function name holds angle brackets', async () => {
    setup('11', [1, 2, 3, 129], {
      detail: { functionId: 4 },
      functionAvailables: [{ id: 4, name: '<b>Attendance' }],
    })
    await screen.findByLabelText(/^Name/)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saved()).toBeUndefined()
    expect(await screen.findByRole('status')).toHaveTextContent(
      'There are fields with input validation errors.',
    )
  })

  it('keeps the search text and pick when the user is already a member', async () => {
    setup()
    const search = await screen.findByRole('combobox', { name: 'Add Users' })
    const pickBen = async () => {
      fireEvent.focus(search)
      fireEvent.change(search, { target: { value: 'ben' } })
      fireEvent.click(
        await screen.findByRole('option', { name: 'ben.carter (Ben Carter)' }, { timeout: 2000 }),
      )
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Add' }))
      })
    }
    await pickBen()
    expect(await screen.findByText('ben.carter')).toBeInTheDocument()
    expect(search).toHaveValue('')
    await pickBen()
    expect(search).toHaveValue('ben.carter (Ben Carter)')
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
    expect(screen.getAllByText('ben.carter')).toHaveLength(1)
  })

  it('shows a function save failure as a 10 s page toast and keeps the dialog open', async () => {
    setup()
    await screen.findByLabelText(/^Name/)
    post.mockImplementation((path: string) =>
      path === 'contactGroupApi/createOrUpdateFunction'
        ? Promise.reject(
            new ApiError('http', '/api/contactGroupApi/createOrUpdateFunction', 400, 'Name in use'),
          )
        : Promise.resolve({ 'en-GB': {} }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add Function' }))
    const dialog = await screen.findByRole('dialog', { name: 'Create New Function' })
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Exams' } })
    jest.useFakeTimers()
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('Name in use')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Create New Function' })).toBeInTheDocument()
    act(() => jest.advanceTimersByTime(9999))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    act(() => jest.advanceTimersByTime(1))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    jest.useRealTimers()
  })

  it('shows a function delete failure as a 3 s generic page toast', async () => {
    setup('11', [1, 2, 3, 129], { detail: { functionId: 4 } })
    await screen.findByLabelText(/^Name/)
    del.mockRejectedValue(new ApiError('http', '/api/contactGroupApi/deletefunction', 400, 'In use'))
    fireEvent.click(screen.getByRole('button', { name: 'Edit Function' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit Function' })
    jest.useFakeTimers()
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while trying to save the item.',
    )
    expect(screen.getByRole('dialog', { name: 'Edit Function' })).toBeInTheDocument()
    act(() => jest.advanceTimersByTime(2999))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    act(() => jest.advanceTimersByTime(1))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    jest.useRealTimers()
  })

  it('shows the safe mode message when the save is blocked', async () => {
    setup()
    await screen.findByLabelText(/^Name/)
    post.mockImplementation((path: string) =>
      path === 'ContactGroupApi'
        ? Promise.reject(new ApiError('blocked', '/Seats.Trunk.Admin/api/ContactGroupApi'))
        : Promise.resolve({ 'en-GB': {} }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('safe mode')
  })

  it('shows Name Required once the field is changed, before any Save', async () => {
    setup()
    const name = await screen.findByLabelText(/^Name/)
    fireEvent.focus(name)
    fireEvent.change(name, { target: { value: '' } })
    expect(screen.queryByText('Required')).not.toBeInTheDocument()
    fireEvent.blur(name)
    expect(screen.getByText('Required')).toBeInTheDocument()
    fireEvent.focus(name)
    fireEvent.change(name, { target: { value: 'Registry' } })
    fireEvent.blur(name)
    expect(screen.queryByText('Required')).not.toBeInTheDocument()
  })

  it('shows the function Name Required once changed', async () => {
    setup()
    await screen.findByLabelText(/^Name/)
    fireEvent.click(screen.getByRole('button', { name: 'Add Function' }))
    const dialog = await screen.findByRole('dialog', { name: 'Create New Function' })
    const input = within(dialog).getByLabelText('Name')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'x' } })
    fireEvent.blur(input)
    expect(within(dialog).queryByText('Required')).not.toBeInTheDocument()
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(within(dialog).getByText('Required')).toBeInTheDocument()
  })

  it('keeps Select All as its own flag and resets it on Delete', async () => {
    setup()
    await screen.findByText('maya.lee')
    const all = screen.getByRole('checkbox', { name: 'Select All' })
    const row = () => screen.getByRole('checkbox', { name: 'Select maya.lee' })
    fireEvent.click(all)
    expect(all).toHaveAttribute('aria-checked', 'true')
    expect(row()).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(row())
    expect(row()).toHaveAttribute('aria-checked', 'false')
    expect(all).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(all)
    expect(all).toHaveAttribute('aria-checked', 'false')
    expect(row()).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(row())
    expect(all).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(all)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.queryByText('maya.lee')).not.toBeInTheDocument()
    expect(all).toHaveAttribute('aria-checked', 'false')
  })

  it('shows the general error for 10 s when the user search fails', async () => {
    setup()
    const search = await screen.findByRole('combobox', { name: 'Add Users' })
    failGet('UserApi/GetUsersByCriteria')
    jest.useFakeTimers()
    fireEvent.focus(search)
    fireEvent.change(search, { target: { value: 'ben' } })
    expect(await screen.findByRole('alert', {}, { timeout: 2000 })).toHaveTextContent(
      'There was an error while processing your request.',
    )
    act(() => jest.advanceTimersByTime(9999))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    act(() => jest.advanceTimersByTime(1))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    jest.useRealTimers()
  })

  it('shows the general error for 10 s when the member fetch fails', async () => {
    setup()
    const search = await screen.findByRole('combobox', { name: 'Add Users' })
    fireEvent.focus(search)
    fireEvent.change(search, { target: { value: 'ben' } })
    fireEvent.click(await screen.findByRole('option', { name: 'ben.carter (Ben Carter)' }, { timeout: 2000 }))
    failGet('UserApi/8')
    jest.useFakeTimers()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while processing your request.',
    )
    act(() => jest.advanceTimersByTime(9999))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    act(() => jest.advanceTimersByTime(1))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    jest.useRealTimers()
    expect(screen.queryByText('ben.carter')).not.toBeInTheDocument()
  })

  it('shows the general error text for 5 s when Save fails with a 5xx', async () => {
    setup()
    await screen.findByLabelText(/^Name/)
    post.mockImplementation((path: string) =>
      path === 'ContactGroupApi' ? Promise.reject(serverError(path)) : Promise.resolve({ 'en-GB': {} }),
    )
    jest.useFakeTimers()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while processing your request.',
    )
    act(() => jest.advanceTimersByTime(4999))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    act(() => jest.advanceTimersByTime(1))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    jest.useRealTimers()
    expect(push).not.toHaveBeenCalled()
  })

  it('shows the general error for 10 s when a function apply fails with a 5xx', async () => {
    setup()
    await screen.findByLabelText(/^Name/)
    post.mockImplementation((path: string) =>
      path === 'contactGroupApi/createOrUpdateFunction'
        ? Promise.reject(serverError(path))
        : Promise.resolve({ 'en-GB': {} }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add Function' }))
    const dialog = await screen.findByRole('dialog', { name: 'Create New Function' })
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Exams' } })
    jest.useFakeTimers()
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while processing your request.',
    )
    act(() => jest.advanceTimersByTime(9999))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    act(() => jest.advanceTimersByTime(1))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    jest.useRealTimers()
  })

  it('shows the general error for 3 s when a function delete fails with a 5xx', async () => {
    setup('11', [1, 2, 3, 129], { detail: { functionId: 4 } })
    await screen.findByLabelText(/^Name/)
    del.mockRejectedValue(serverError('contactGroupApi/deletefunction'))
    fireEvent.click(screen.getByRole('button', { name: 'Edit Function' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit Function' })
    jest.useFakeTimers()
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while processing your request.',
    )
    act(() => jest.advanceTimersByTime(2999))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    act(() => jest.advanceTimersByTime(1))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    jest.useRealTimers()
  })

  it('shows not found for a bad id', async () => {
    setup('abc')
    expect(await screen.findByText('This contact group could not be found.')).toBeInTheDocument()
  })
})

describe('ContactGroupDetailsScreen unsaved changes', () => {
  it('asks before Cancel leaves an edited form', async () => {
    setup()
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Registry Office' } })
    fireEvent.click(screen.getByRole('link', { name: 'Cancel' }))
    expect(confirm).toHaveBeenCalledWith('You have unsaved changes. Leave this page?')
    confirm.mockRestore()
  })

  it('does not ask when the form is unchanged or after Save', async () => {
    setup()
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
    const field = await screen.findByLabelText(/^Name/)
    fireEvent.click(screen.getByRole('link', { name: 'Cancel' }))
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
