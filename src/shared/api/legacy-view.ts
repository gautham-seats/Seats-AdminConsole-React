import { LEGACY_ADMIN_BASE } from './config'
import { ApiError, isAbortError } from './errors'
import { isSessionRedirect } from './session-redirect'
import { redirectToForceLogin, redirectToSignOut } from './navigation'

// GET of a legacy MVC partial as HTML; [AjaxOnly] actions answer 404 without X-Requested-With.
export async function getLegacyViewHtml(path: string, signal?: AbortSignal): Promise<string> {
  const url = `${LEGACY_ADMIN_BASE}/${path.replace(/^\/+/, '')}`
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'manual',
      signal,
      headers: { Accept: 'text/html', 'X-Requested-With': 'XMLHttpRequest' },
    })
  } catch (error) {
    throw new ApiError(isAbortError(error) ? 'aborted' : 'network', url)
  }
  if (isSessionRedirect(response)) {
    redirectToForceLogin()
    throw new ApiError('auth', url, 403)
  }
  if (response.status === 401) throw new ApiError('auth', url, response.status)
  if (response.status === 403) {
    redirectToForceLogin()
    throw new ApiError('auth', url, response.status)
  }
  if (response.status === 408 || response.status === 428) {
    redirectToSignOut()
    throw new ApiError('auth', url, response.status)
  }
  if (!response.ok) throw new ApiError('http', url, response.status)
  return response.text()
}
