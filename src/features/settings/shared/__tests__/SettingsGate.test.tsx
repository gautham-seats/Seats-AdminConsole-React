import { act, render, screen } from '@testing-library/react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { PermissionAction, PermissionItem } from '@/shared/shell/admin-menu'
import { ProfileProvider } from '@/shared/shell/profile'
import { SettingsGate } from '../SettingsFrame'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)
const ACCESS = { item: PermissionItem.Settings, action: PermissionAction.Access }

const renderGate = () =>
  render(
    <ProfileProvider>
      <SettingsGate access={ACCESS}>
        <h1>Inside</h1>
      </SettingsGate>
    </ProfileProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  post.mockResolvedValue({ 'en-GB': {} })
})

// Requirements 6.1: every route state, including the gate's own states, has exactly one h1.
describe('SettingsGate headings', () => {
  it('has one h1 while the profile loads', async () => {
    get.mockReturnValue(new Promise(() => undefined))
    renderGate()
    // The screen text read settles while the profile is still pending.
    await act(async () => {})
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('has one h1 when access is denied', async () => {
    get.mockResolvedValue([])
    renderGate()
    expect(await screen.findByRole('heading', { level: 1, name: /permission|access/i })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('has one h1 when the profile fails to load', async () => {
    get.mockRejectedValue(new ApiError('http', '/api/UserApi/GetClaims', 500))
    renderGate()
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})
