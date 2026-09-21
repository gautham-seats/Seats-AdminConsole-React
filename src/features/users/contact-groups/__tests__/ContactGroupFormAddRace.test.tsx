import { act, fireEvent, render, screen } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { clearFlash } from '../../users-flash'
import { ContactGroupDetailsScreen } from '../ContactGroupDetailsScreen'

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

const group = {
  detail: {
    id: 11,
    name: 'Registry',
    description: null,
    groupEmailAddress: '',
    sendEmailsToTypeId: 2,
    functionId: null,
    entityId: null,
    userIdsInContactGroup: [],
  },
  users: [],
  sendEmailToAvailables: [{ id: 2, description: 'Individual members', visible: false }],
  entityAvailables: [{ id: 0, description: 'None' }],
  functionAvailables: [],
}

const detail = (id: number, userName: string) => ({
  detail: {
    id,
    userName,
    fullName: 'Ben Carter',
    displayName: 'Ben Carter',
    emailAddress: `${userName}@x.test`,
  },
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

function mockApis(userDetails: (path: string) => Promise<unknown> | null) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 16, actions: [1, 2, 3, 129].map(id => ({ id })) }])
    if (path === 'ContactGroupApi/11') return Promise.resolve(group)
    if (path === 'UserApi/GetUsersByCriteria')
      return Promise.resolve([
        { id: 8, userName: 'ben.carter', fullName: 'Ben Carter', emailAddress: 'ben@x.test' },
      ])
    return userDetails(path) ?? Promise.resolve(null)
  })
  post.mockImplementation((path: string) =>
    path === 'ResourceApi/GetResourcesForScreen'
      ? Promise.resolve({ 'en-GB': {} })
      : Promise.resolve(undefined),
  )
}

async function renderForm() {
  render(
    <ProfileProvider>
      <ContactGroupDetailsScreen idParam="11" />
    </ProfileProvider>,
  )
  await screen.findByLabelText(/^Name/)
  const search = screen.getByRole('combobox', { name: 'Add Users' })
  fireEvent.focus(search)
  fireEvent.change(search, { target: { value: 'ben' } })
  fireEvent.click(await screen.findByRole('option', { name: 'ben.carter (Ben Carter)' }, { timeout: 2000 }))
  return screen.getByRole('button', { name: 'Add' })
}

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  clearFlash()
})

describe('ContactGroupForm add-user race', () => {
  it('stays busy for the whole in-flight request and blocks a second add', async () => {
    const first = deferred<unknown>()
    mockApis(path => (path === 'UserApi/8' ? first.promise : null))
    const add = await renderForm()

    fireEvent.click(add)
    expect(add).toHaveAttribute('aria-busy', 'true')
    expect(add).toBeDisabled()

    await act(async () => {
      first.resolve(detail(8, 'ben.carter'))
    })
    expect(add).toHaveAttribute('aria-busy', 'false')
    expect(get).toHaveBeenCalledTimes(4)
    expect(await screen.findByText('ben.carter')).toBeInTheDocument()
  })

  it('an add aborted before it resolves adds no member', async () => {
    const first = deferred<unknown>()
    mockApis(path => (path === 'UserApi/8' ? first.promise : null))
    const add = await renderForm()

    fireEvent.click(add)
    expect(add).toHaveAttribute('aria-busy', 'true')

    await act(async () => {
      first.reject(new DOMException('Aborted', 'AbortError'))
    })

    expect(screen.queryByText('ben.carter')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
