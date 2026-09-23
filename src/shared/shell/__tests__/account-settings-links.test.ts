import { api } from '@/shared/api'
import { fetchCustomStatement, fetchOnlineHelpUrl, writeCookie } from '../account-settings'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const post = jest.mocked(api.post)
const get = jest.mocked(api.get)
const settings = (url: string) => [
  { key: 'CUSTOM_ACCESSIBILITY_STATEMENT_NAME', value: 'Our statement' },
  { key: 'CUSTOM_ACCESSIBILITY_STATEMENT_URL', value: url },
]

describe('custom accessibility statement link', () => {
  it('links only http(s) URLs from the setting', async () => {
    post.mockResolvedValueOnce(settings('https://example.org/a11y'))
    await expect(fetchCustomStatement(new AbortController().signal)).resolves.toEqual({
      name: 'Our statement',
      url: 'https://example.org/a11y',
    })
  })

  it('hides the link when the setting holds a script or credential URL', async () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'https://user:pw@example.org/']) {
      post.mockResolvedValueOnce(settings(bad))
      await expect(fetchCustomStatement(new AbortController().signal)).resolves.toBeNull()
    }
  })
})

describe('SF-34 online help link', () => {
  it('SF-34 follows only an http(s) URL from the ONLINE_HELP_URL setting', async () => {
    get.mockResolvedValueOnce({ key: 'ONLINE_HELP_URL', value: 'https://help.example.org/' })
    await expect(fetchOnlineHelpUrl(new AbortController().signal)).resolves.toBe('https://help.example.org/')
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', '', null]) {
      get.mockResolvedValueOnce({ key: 'ONLINE_HELP_URL', value: bad })
      await expect(fetchOnlineHelpUrl(new AbortController().signal)).resolves.toBeNull()
    }
  })
})

describe('writeCookie', () => {
  it('sets path, expiry and SameSite=Lax', () => {
    const written: string[] = []
    const original = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!
    Object.defineProperty(document, 'cookie', { configurable: true, set: value => written.push(value) })
    writeCookie('_accset_hc', 'true', 30)
    Object.defineProperty(document, 'cookie', original)
    expect(written[0]).toMatch(/^_accset_hc=true; expires=.+ GMT; path=\/; SameSite=Lax$/)
  })
})

describe('SF-54 one help-URL request for two menus', () => {
  it('shares the GET between the top bar and the sidebar menu mounting together', async () => {
    const before = get.mock.calls.length
    let resolve!: (value: unknown) => void
    get.mockReturnValueOnce(new Promise(r => (resolve = r)))
    const topBar = fetchOnlineHelpUrl(new AbortController().signal)
    const sidebar = fetchOnlineHelpUrl(new AbortController().signal)
    expect(get.mock.calls.length - before).toBe(1)
    resolve({ key: 'ONLINE_HELP_URL', value: 'https://help.example.org/' })
    await expect(topBar).resolves.toBe('https://help.example.org/')
    await expect(sidebar).resolves.toBe('https://help.example.org/')
    // The shared request is over; the next mount asks again, so a changed setting is picked up.
    get.mockResolvedValueOnce({ key: 'ONLINE_HELP_URL', value: 'https://help.example.org/new' })
    await expect(fetchOnlineHelpUrl(new AbortController().signal)).resolves.toBe(
      'https://help.example.org/new',
    )
    expect(get.mock.calls.length - before).toBe(2)
  })

  it('lets one menu leave without cancelling the answer for the other', async () => {
    const before = get.mock.calls.length
    let resolve!: (value: unknown) => void
    get.mockReturnValueOnce(new Promise(r => (resolve = r)))
    const leaving = new AbortController()
    const gone = fetchOnlineHelpUrl(leaving.signal)
    const staying = fetchOnlineHelpUrl(new AbortController().signal)
    leaving.abort()
    resolve({ key: 'ONLINE_HELP_URL', value: 'https://help.example.org/' })
    await expect(gone).rejects.toMatchObject({ name: 'AbortError' })
    await expect(staying).resolves.toBe('https://help.example.org/')
    expect(get.mock.calls.length - before).toBe(1)
  })
})
