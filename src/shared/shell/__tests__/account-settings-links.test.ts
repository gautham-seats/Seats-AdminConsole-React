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
