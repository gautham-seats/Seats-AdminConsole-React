import {
  onSessionRedirect,
  redirectToForceLogin,
  redirectToSignOut,
  resetRedirectGuard,
  sessionNavigation,
} from '../navigation'
import { getLegacyViewHtml } from '../legacy-view'
import { FORCE_LOGIN_PATH, SIGN_OUT_PATH } from '../config'

const assign = jest.spyOn(sessionNavigation, 'go').mockImplementation(() => undefined)

beforeEach(() => {
  resetRedirectGuard()
  assign.mockClear()
  window.history.replaceState(null, '', '/admin-next/users?page=2')
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('session redirects', () => {
  it('forces a login with the current page as returnUrl, encoded', () => {
    redirectToForceLogin()
    expect(assign).toHaveBeenCalledWith(
      `${FORCE_LOGIN_PATH}?returnUrl=${encodeURIComponent(window.location.href)}`,
    )
    expect(assign.mock.calls[0][0]).toContain(encodeURIComponent('/admin-next/users?page=2'))
    expect(assign.mock.calls[0][0]).toBe(
      `${FORCE_LOGIN_PATH}?returnUrl=${encodeURIComponent(window.location.href)}`,
    )
  })

  it('redirects once even when several requests fail together', () => {
    redirectToForceLogin()
    redirectToSignOut()
    redirectToForceLogin()
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('clears the per-user storage before signing out', () => {
    window.localStorage.setItem('seats-admin:list:users', '{"page":3}')
    window.localStorage.setItem('unrelated', 'kept')
    redirectToSignOut()
    expect(assign).toHaveBeenCalledWith(SIGN_OUT_PATH)
    expect(window.localStorage.getItem('seats-admin:list:users')).toBeNull()
    expect(window.localStorage.getItem('unrelated')).toBe('kept')
  })
})

describe('getLegacyViewHtml', () => {
  const fetchMock = jest.fn()
  const respond = (status: number, text = '') =>
    fetchMock.mockResolvedValueOnce({ status, ok: status < 300, text: async () => text } as Response)

  beforeEach(() => {
    fetchMock.mockReset()
    globalThis.fetch = fetchMock
  })

  it('asks for HTML as an XHR so [AjaxOnly] actions answer', async () => {
    respond(200, '<p>hi</p>')
    await expect(getLegacyViewHtml('/Users/List')).resolves.toBe('<p>hi</p>')
    expect(fetchMock).toHaveBeenCalledWith(
      '/Seats.Trunk.Admin/Users/List',
      expect.objectContaining({
        credentials: 'same-origin',
        headers: { Accept: 'text/html', 'X-Requested-With': 'XMLHttpRequest' },
      }),
    )
  })

  it('stays on the page for 401 but forces a login on 403', async () => {
    respond(401)
    await expect(getLegacyViewHtml('x')).rejects.toMatchObject({ kind: 'auth', status: 401 })
    expect(assign).not.toHaveBeenCalled()
    respond(403)
    await expect(getLegacyViewHtml('x')).rejects.toMatchObject({ kind: 'auth', status: 403 })
    expect(assign).toHaveBeenCalledWith(expect.stringContaining(FORCE_LOGIN_PATH))
  })

  it.each([408, 428])('signs out on %i', async status => {
    respond(status)
    await expect(getLegacyViewHtml('x')).rejects.toMatchObject({ kind: 'auth', status })
    expect(assign).toHaveBeenCalledWith(SIGN_OUT_PATH)
  })

  it('maps other failures to http and network kinds', async () => {
    respond(500)
    await expect(getLegacyViewHtml('x')).rejects.toMatchObject({ kind: 'http', status: 500 })
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    await expect(getLegacyViewHtml('x')).rejects.toMatchObject({ kind: 'network' })
  })
})

describe('SF-01 redirect latch', () => {
  it('SF-01 redirects again after a cancelled navigation once the page shows again', () => {
    redirectToForceLogin()
    redirectToForceLogin()
    expect(assign).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event('pageshow'))
    redirectToForceLogin()
    expect(assign).toHaveBeenCalledTimes(2)
  })

  it('SF-01 releases the latch by itself after a few seconds', () => {
    jest.useFakeTimers()
    redirectToForceLogin()
    jest.advanceTimersByTime(5000)
    redirectToForceLogin()
    expect(assign).toHaveBeenCalledTimes(2)
    jest.useRealTimers()
  })

  it('SF-24 forgets the cached legacy layout before every session redirect', () => {
    const reset = jest.fn()
    const off = onSessionRedirect(reset)
    redirectToSignOut()
    expect(reset).toHaveBeenCalledTimes(1)
    off()
  })
})

describe('SF-05 session redirect', () => {
  const fetchMock = jest.fn()
  beforeEach(() => {
    fetchMock.mockReset()
    globalThis.fetch = fetchMock
  })

  it('SF-05 reads an unfollowed redirect to the identity provider as a lost session, not a network fault', async () => {
    fetchMock.mockResolvedValueOnce({
      status: 0,
      ok: false,
      type: 'opaqueredirect',
      text: async () => '',
    } as Response)
    await expect(getLegacyViewHtml('Integration/Index')).rejects.toMatchObject({ kind: 'auth', status: 403 })
    expect(assign).toHaveBeenCalledWith(expect.stringContaining(FORCE_LOGIN_PATH))
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ redirect: 'manual' })
  })
})
