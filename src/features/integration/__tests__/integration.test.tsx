import { render, screen } from '@testing-library/react'
import { api, ApiError } from '@/shared/api'
import { getLegacyViewHtml } from '@/shared/api/legacy-view'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { parseZoomStatus, readZoomAuthUrl, zoomLinkState } from '../integration'
import { IntegrationsScreen } from '../IntegrationsScreen'
import { ZoomReturnScreen } from '../ZoomReturnScreen'
import { metadata as zoomMetadata } from '@/app/integrations/zoom/page'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})
jest.mock('@/shared/api/legacy-view', () => ({ getLegacyViewHtml: jest.fn() }))

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)
const view = jest.mocked(getLegacyViewHtml)

const PAGE =
  "<script>scope.urlIntegrateZoom = 'https://zoom.us/oauth/authorize?response_type=code&client_id=abc&redirect_uri=https://dev.seats.local/integration/zoomresponse';</script>"

function setup({
  claims = [52, 10],
  status = () => Promise.resolve<unknown>({ exist: false, sameUser: true }),
} = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims') return Promise.resolve(claims.map(id => ({ id, actions: [{ id: 1 }] })))
    if (path === 'IntegrationApi/ZoomTenantLinked') return status()
    return Promise.resolve(null)
  })
  post.mockResolvedValue({ 'en-GB': {} })
  view.mockResolvedValue(PAGE)
}

const renderScreen = () =>
  render(
    <ProfileProvider>
      <IntegrationsScreen />
    </ProfileProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('integration helpers', () => {
  it('maps the tenant status to the three legacy states', () => {
    expect(zoomLinkState(null)).toBe('notLinked')
    expect(zoomLinkState(parseZoomStatus({ exist: true, sameUser: true }))).toBe('linkedByMe')
    expect(zoomLinkState(parseZoomStatus({ exist: true, sameUser: false }))).toBe('linkedByOther')
  })

  it('reads only an https Zoom URL from the legacy partial', () => {
    expect(readZoomAuthUrl(PAGE)).toMatch(/^https:\/\/zoom\.us\/oauth\/authorize\?/)
    expect(readZoomAuthUrl("scope.urlIntegrateZoom = 'javascript:alert(1)'")).toBeNull()
    expect(readZoomAuthUrl('<div></div>')).toBeNull()
  })

  it('I3 hands back the server-built href untouched, without re-encoding redirect_uri', () => {
    const href =
      'https://zoom.us/oauth/authorize?response_type=code&client_id=abc&redirect_uri=https%3A%2F%2Fadmin.example%2FIntegration%2FZoom%3Ft%3D1&state=x%20y'
    expect(readZoomAuthUrl(`scope.urlIntegrateZoom = '${href.replace(/&/g, '&amp;')}';`)).toBe(href)
  })
})

describe('IntegrationsScreen', () => {
  it('offers Connect with the server-built Zoom link when not linked', async () => {
    setup()
    renderScreen()
    expect(await screen.findByRole('link', { name: /Connect/ })).toHaveAttribute(
      'href',
      expect.stringContaining('https://zoom.us/oauth/authorize'),
    )
    expect(view).toHaveBeenCalledWith('Integration/Index', expect.anything())
  })

  it('shows Connected without a link when another user linked Zoom', async () => {
    setup({ status: () => Promise.resolve({ exist: true, sameUser: false }) })
    renderScreen()
    expect(await screen.findAllByText('Zoom linked with other user')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Connected/ })).toBeDisabled()
    expect(screen.queryByRole('link', { name: /Connect/ })).not.toBeInTheDocument()
  })

  it('shows Zoom linked in the status pill when linked by this user', async () => {
    setup({ status: () => Promise.resolve({ exist: true, sameUser: true }) })
    renderScreen()
    expect(await screen.findAllByText('Zoom linked')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Connected/ })).toBeDisabled()
  })

  it('shows the error and still allows Connect when the status call fails', async () => {
    setup({ status: () => Promise.reject(new ApiError('http', '/api/IntegrationApi/ZoomTenantLinked', 500)) })
    renderScreen()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There was an error while processing your request.',
    )
    expect(await screen.findByRole('link', { name: /Connect/ })).toBeInTheDocument()
  })

  it('blocks users without Settings access', async () => {
    setup({ claims: [52] })
    renderScreen()
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission')
    expect(get).not.toHaveBeenCalledWith('IntegrationApi/ZoomTenantLinked', expect.anything())
  })
})

describe('ZoomReturnScreen', () => {
  const renderZoom = () =>
    render(
      <ProfileProvider>
        <ZoomReturnScreen />
      </ProfileProvider>,
    )

  // F7-01: Views/Integration/Zoom.cshtml:4 titles the callback page "Integrations - SEAtS".
  it('F7-01 keeps the legacy Integrations document title on the Zoom callback page', () => {
    expect(zoomMetadata.title).toBe('Integrations - SEAtS Admin')
  })

  // ZoomResponse is a GET that links the tenant's account, and safe mode only guards non-GET requests.
  it('never calls ZoomResponse, and points at the legacy Admin instead', async () => {
    setup()
    renderZoom()
    expect(await screen.findByRole('status')).toHaveTextContent('Zoom finishes linking on the old Admin')
    expect(get).not.toHaveBeenCalledWith(expect.stringContaining('ZoomResponse'), expect.anything())
    expect(screen.getByRole('link', { name: /Back to Integrations/ })).toHaveAttribute(
      'href',
      '/integrations',
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Zoom' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('navigation', { name: /Integrations/ })).toBeInTheDocument()
  })
})
