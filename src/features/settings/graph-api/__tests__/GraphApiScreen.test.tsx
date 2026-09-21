import { act, fireEvent, render, screen } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { buildGraphPayload, mergeEnabled } from '../graph-api-form'
import { GraphApiScreen } from '../GraphApiScreen'

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
const put = jest.mocked(api.put)

const SETTINGS = [
  { id: 4, key: 'GRAPHAPI_ENABLED', value: 'No', description: null },
  { id: 1, key: 'GRAPHAPI_TENANTID', value: 'tenant-1', description: null },
  { id: 2, key: 'GRAPHAPI_CLIENTID', value: '', description: null },
  { id: 3, key: 'GRAPHAPI_APIKEY', value: '***************', description: null },
]

function setup(actions = [1, 3, 93]) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 10, actions: actions.map(id => ({ id })) }])
    if (path === 'GraphApi') return Promise.resolve(SETTINGS)
    return Promise.resolve(null)
  })
  post.mockResolvedValue({ 'en-GB': {} })
  return render(
    <ProfileProvider>
      <GraphApiScreen />
    </ProfileProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('graph api rules', () => {
  it('sends tenant, client, key, enabled in that order and applies the returned enabled flag', () => {
    expect(buildGraphPayload(SETTINGS).map(item => item.key)).toEqual([
      'GRAPHAPI_TENANTID',
      'GRAPHAPI_CLIENTID',
      'GRAPHAPI_APIKEY',
      'GRAPHAPI_ENABLED',
    ])
    expect(mergeEnabled(SETTINGS, { ...SETTINGS[0], value: 'Yes' })[0].value).toBe('Yes')
  })
})

describe('GraphApiScreen', () => {
  it('loads the settings, hides the key and saves with PUT', async () => {
    put.mockResolvedValue({ id: 4, key: 'GRAPHAPI_ENABLED', value: 'Yes', description: null })
    setup()
    expect(await screen.findByLabelText('Tenant ID')).toHaveValue('tenant-1')
    expect(screen.getByLabelText('Key')).toHaveAttribute('type', 'password')
    expect(screen.getByText('Enabled: No')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Client ID'), { target: { value: 'client-9' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(put.mock.calls[0][0]).toBe('GraphApi')
    expect(put.mock.calls[0][1]?.body).toContainEqual({ id: 2, value: 'client-9', key: 'GRAPHAPI_CLIENTID' })
    expect(await screen.findByText('Enabled: Yes')).toBeInTheDocument()
  })

  it('does not call the API without Settings edit', async () => {
    setup([1, 93])
    expect(
      await screen.findByText('Graph API settings need the Settings edit permission.'),
    ).toBeInTheDocument()
    expect(get).not.toHaveBeenCalledWith('GraphApi', expect.anything())
  })
})
