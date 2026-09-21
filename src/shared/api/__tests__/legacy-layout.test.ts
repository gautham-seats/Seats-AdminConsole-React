import { getLegacyLayoutHtml, LAYOUT_RETRY_MS, layoutClock, resetLegacyLayout } from '../legacy-layout'
import { getVerificationToken } from '../verification-token'

const fetchMock = jest.fn()
const page = (body: string, ok = true) => ({ ok, status: ok ? 200 : 0, text: () => Promise.resolve(body) })

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock
  resetLegacyLayout()
  layoutClock.now = () => 1_000_000
})

describe('legacy layout cache (SL-02)', () => {
  it('fetches the page once and never follows a login redirect', async () => {
    fetchMock.mockResolvedValue(page("<script>requestVerificationToken: 'a:b'</script>"))
    await getLegacyLayoutHtml()
    await getLegacyLayoutHtml()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: 'manual' })
  })

  it('remembers a redirected or failed answer for the retry interval', async () => {
    fetchMock.mockResolvedValue(page('', false))
    expect(await getLegacyLayoutHtml()).toBeNull()
    expect(await getLegacyLayoutHtml()).toBeNull()
    expect(await getLegacyLayoutHtml()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    layoutClock.now = () => 1_000_000 + LAYOUT_RETRY_MS
    await getLegacyLayoutHtml()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('treats a page without the token as unusable for the same interval', async () => {
    fetchMock.mockResolvedValue(page('<html>login form</html>'))
    expect(await getVerificationToken()).toBeNull()
    expect(await getVerificationToken()).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    resetLegacyLayout()
    fetchMock.mockResolvedValue(page("requestVerificationToken: 'x:y'"))
    expect(await getVerificationToken()).toBe('x:y')
  })
})
