import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { currentKeyStatus, newKeyStatus } from '../developer-key'
import { DeveloperKeyDialog } from '../DeveloperKeyDialog'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const post = jest.mocked(api.post)
const writeText = jest.fn(() => Promise.resolve())

const RESOURCE_WARNING = 'Resource dev key warning'
const KEY_WARNING = 'Getting a new developer key will invalidate any previous one associated to this user.'

function setup(
  current: () => Promise<unknown>,
  generate: () => Promise<unknown> = () =>
    Promise.resolve({ developerKey: 'new-key-value', expiryDate: '2027-03-01T09:05:07' }),
) {
  post.mockImplementation((path: string) => {
    if (path === 'UserApi/GetUserDeveloperKey') return current()
    if (path === 'UserApi/GenerateDeveloperKey') return generate()
    return Promise.resolve({ 'en-GB': { DevKeyWarning: RESOURCE_WARNING } })
  })
  const onOpenChange = jest.fn()
  render(<DeveloperKeyDialog open onOpenChange={onOpenChange} />)
  return onOpenChange
}

beforeAll(() => {
  Object.assign(navigator, { clipboard: { writeText } })
})

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('developer key status', () => {
  const now = new Date(2026, 8, 15, 12)

  it('reports the current expiry with the warning, or expired without it', () => {
    expect(currentKeyStatus({ developerKey: '***', expiryDate: '2026-10-01T08:00:09' }, now)).toEqual({
      message: 'Current key expires on 01/10/2026 08:00:09.',
      warning: 'Getting a new developer key will invalidate any previous one associated to this user.',
    })
    expect(currentKeyStatus({ developerKey: '***', expiryDate: '2026-09-01T08:00:00' }, now)).toEqual({
      message: 'Current key has expired.',
      warning: null,
    })
    expect(currentKeyStatus(null, now)).toBeNull()
    expect(newKeyStatus({ developerKey: 'k', expiryDate: '2027-03-01T09:05:07' }).message).toBe(
      'New key expires on 01/03/2027 09:05:07.',
    )
  })
})

describe('DeveloperKeyDialog', () => {
  it('loads the current key, generates a new one once and copies it', async () => {
    setup(() => Promise.resolve({ developerKey: '******************', expiryDate: '2099-01-01T00:00:00' }))
    expect(await screen.findByText('Current key expires on 01/01/2099 00:00:00.')).toBeInTheDocument()
    expect(await screen.findByText(KEY_WARNING)).toBeInTheDocument()
    expect(screen.queryByText(RESOURCE_WARNING)).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('******************')).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'New Key' }))
    })
    expect(post).toHaveBeenCalledWith('UserApi/GenerateDeveloperKey')
    expect(screen.getByLabelText('Key')).toHaveValue('new-key-value')
    expect(screen.getByText('New key expires on 01/03/2027 09:05:07.')).toBeInTheDocument()
    expect(screen.getByText(/Make sure to copy the key now/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New Key' })).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }))
    })
    expect(writeText).toHaveBeenCalledWith('new-key-value')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('shows no expiry line when the user has no key yet', async () => {
    setup(() => Promise.reject(new ApiError('http', '/api/UserApi/GetUserDeveloperKey', 400, 'Failed')))
    await waitFor(() => expect(screen.getByRole('button', { name: 'New Key' })).toBeEnabled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(await screen.findByText(RESOURCE_WARNING)).toBeInTheDocument()
  })

  it('shows the resource warning with the error when the load fails', async () => {
    setup(() => Promise.reject(new ApiError('http', '/api/UserApi/GetUserDeveloperKey', 500, 'Boom')))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(await screen.findByText(RESOURCE_WARNING)).toBeInTheDocument()
  })

  it('shows the save error with the server text for a 400 generate failure', async () => {
    setup(
      () => Promise.resolve({ developerKey: '***', expiryDate: '2099-01-01T00:00:00' }),
      () => Promise.reject(new ApiError('http', '/api/UserApi/GenerateDeveloperKey', 400, 'Not allowed')),
    )
    expect(await screen.findByText('Current key expires on 01/01/2099 00:00:00.')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'New Key' }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Not allowed')
  })

  it('shows the general error for 10 s on a 5xx generate failure', async () => {
    setup(
      () => Promise.resolve({ developerKey: '***', expiryDate: '2099-01-01T00:00:00' }),
      () => Promise.reject(new ApiError('http', '/api/UserApi/GenerateDeveloperKey', 500, 'Stack trace')),
    )
    expect(await screen.findByText('Current key expires on 01/01/2099 00:00:00.')).toBeInTheDocument()
    const timeouts = jest.spyOn(global, 'setTimeout')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'New Key' }))
    })
    const toast = screen.getByRole('alert')
    expect(toast).toHaveTextContent('There was an error while processing your request.')
    expect(within(screen.getByRole('dialog')).queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText('Stack trace')).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(timeouts).toHaveBeenCalledWith(expect.any(Function), 10000)
    timeouts.mockRestore()
  })

  it('keeps the dialog open with the safe mode message when generating is blocked', async () => {
    setup(() => Promise.resolve({ developerKey: '***', expiryDate: '2020-01-01T00:00:00' }))
    expect(await screen.findByText('Current key has expired.')).toBeInTheDocument()
    expect(screen.queryByText(RESOURCE_WARNING)).not.toBeInTheDocument()
    expect(screen.queryByText(KEY_WARNING)).not.toBeInTheDocument()
    post.mockImplementation((path: string) =>
      path === 'UserApi/GenerateDeveloperKey'
        ? Promise.reject(new ApiError('blocked', '/api/UserApi/GenerateDeveloperKey'))
        : Promise.resolve({ 'en-GB': {} }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'New Key' }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent('safe mode')
    expect(screen.queryByLabelText('Key')).not.toBeInTheDocument()
  })
})
