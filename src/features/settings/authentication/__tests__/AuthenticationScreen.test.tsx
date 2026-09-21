import { act, fireEvent, render, screen } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import type { AuthenticationDto } from '@/types/authentication'
import { AuthenticationScreen } from '../AuthenticationScreen'

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

const MODEL: AuthenticationDto = {
  EnvironmentId: 3,
  ClientId: 9,
  AuthProtocol: 'saml',
  SeatsAuthorisationByPersonas: 'true',
  SpecificUserIdentifierClaim: 'upn',
  SpecificGroupClaim: '',
  SeatsAuthenticationByOurIdentityProvider: 'false',
  AuthHomeRealm: '',
  AuthSpecificLogoutUrl: '',
  Domains: [
    {
      Id: 1,
      SiteTypeId: 2,
      SiteType: 'Website',
      Url: 'https://site.example.com',
      Thumbprint: 'AB12',
      FederationMetadata: '',
      Realm: '',
      IdentityIssuer: '',
      IssuerAuthority: '',
    },
  ],
  AuthenticationBy: 'Other',
}

function setup(actions = [1], model: AuthenticationDto = MODEL) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 56, actions: actions.map(id => ({ id })) }])
    if (path === 'AuthenticationApi/') return Promise.resolve(model)
    return Promise.resolve(null)
  })
  post.mockResolvedValue({ 'en-GB': {} })
  return render(
    <ProfileProvider>
      <AuthenticationScreen />
    </ProfileProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('AuthenticationScreen', () => {
  it('shows provider and site settings for Other and hides them for SEAtS', async () => {
    setup()
    expect(await screen.findByLabelText('Specific user claim')).toHaveValue('upn')
    expect(screen.getByLabelText('Thumbprint')).toHaveValue('AB12')
    expect(screen.getByLabelText('URL')).toHaveAttribute('readonly')
    expect(screen.getByRole('radio', { name: 'No' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radiogroup', { name: 'Authentication protocol' })).toHaveAttribute(
      'aria-labelledby',
      'auth-protocol-label',
    )
    fireEvent.click(screen.getByRole('radio', { name: 'SEAtS' }))
    expect(screen.queryByLabelText('Specific user claim')).not.toBeInTheDocument()
  })

  it('sends the whole model with PUT and keeps the hidden ids', async () => {
    put.mockImplementation((_path, options) => Promise.resolve(options?.body as AuthenticationDto))
    setup()
    fireEvent.change(await screen.findByLabelText('Thumbprint'), { target: { value: 'CD34' } })
    fireEvent.click(screen.getByRole('radio', { name: 'WS-FED' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    const body = put.mock.calls[0][1]?.body as AuthenticationDto
    expect(put.mock.calls[0][0]).toBe('AuthenticationApi/')
    expect(body).toMatchObject({ ClientId: 9, EnvironmentId: 3, AuthProtocol: 'wsfed' })
    expect(body.Domains?.[0].Thumbprint).toBe('CD34')
    expect(await screen.findByRole('status')).toHaveTextContent('Settings successfully updated.')
  })

  it('explains safe mode when the save is blocked', async () => {
    put.mockRejectedValue(new ApiError('blocked', '/Seats.Trunk.Admin/api/AuthenticationApi/'))
    setup()
    fireEvent.change(await screen.findByLabelText('Realm'), { target: { value: 'urn:x' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('safe mode')
  })

  it('needs Configure authentication access', async () => {
    setup([])
    expect(await screen.findByText('You do not have permission to view this page.')).toBeInTheDocument()
  })
})
