import { adminApiPath, isPermissionOnly403, isReadOnlyPost, writesAllowed } from './config'
import { ApiError, isAbortError } from './errors'
import { isSessionRedirect } from './session-redirect'
import { redirectToForceLogin, redirectToSignOut } from './navigation'
import { getVerificationToken, resetVerificationToken } from './verification-token'
import { trackRequest } from './inflight'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export type QueryValue = string | number | boolean | null | undefined

export type RequestOptions = {
  query?: Record<string, QueryValue>
  body?: unknown
  signal?: AbortSignal
  // Upload progress as a 0-1 fraction; the request then goes through XMLHttpRequest, which reports it.
  onUploadProgress?: (fraction: number) => void
  // A read whose 200 may carry no body (a recorder, a void action); by default that is a failed load.
  allowEmpty?: boolean
}

type RawResponse = { status: number; ok: boolean; text: string; redirected: boolean }

function sendWithProgress(
  method: HttpMethod,
  url: string,
  headers: Record<string, string>,
  body: XMLHttpRequestBodyInit | undefined,
  signal: AbortSignal | undefined,
  onProgress: (fraction: number) => void,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const abortError = () => new DOMException('Aborted', 'AbortError')
    if (signal?.aborted) return reject(abortError())
    const xhr = new XMLHttpRequest()
    xhr.open(method, url)
    xhr.withCredentials = true
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value)
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total)
    }
    const onAbort = () => xhr.abort()
    signal?.addEventListener('abort', onAbort, { once: true })
    const done = () => signal?.removeEventListener('abort', onAbort)
    xhr.onload = () => {
      done()
      const ok = xhr.status >= 200 && xhr.status < 300
      // A failed upload keeps the bar where the bytes stopped instead of claiming completion.
      if (ok) onProgress(1)
      // XHR follows redirects itself; a login page has no JSON, so the parse step reports it.
      resolve({ status: xhr.status, ok, text: xhr.responseText, redirected: false })
    }
    xhr.onerror = xhr.ontimeout = () => {
      done()
      reject(new TypeError('Network request failed'))
    }
    xhr.onabort = () => {
      done()
      reject(abortError())
    }
    xhr.send(body ?? null)
  })
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = adminApiPath(path)
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue
    params.append(key, value === null ? '' : String(value))
  }
  const search = params.toString()
  if (!search) return url
  return `${url}${url.includes('?') ? '&' : '?'}${search}`
}

// WebAPI's BadRequest(ModelState) puts the useful text under modelState, behind a generic message.
function modelStateMessages(parsed: Record<string, unknown>): string | null {
  const modelState = parsed.modelState ?? parsed.ModelState
  if (!modelState || typeof modelState !== 'object') return null
  const lines = Object.values(modelState as Record<string, unknown>).flatMap(value =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [],
  )
  return lines.length ? lines.join(' ') : null
}

function readServerMessage(text: string): string | null {
  try {
    const parsed: unknown = JSON.parse(text)
    if (parsed && typeof parsed === 'object') {
      const fields = modelStateMessages(parsed as Record<string, unknown>)
      if (fields) return fields
      // The camel-case contract resolver sends HttpError as `message` (swgrid.js:445-447 reads it that way).
      if ('message' in parsed && typeof parsed.message === 'string') return parsed.message
      if ('Message' in parsed && typeof parsed.Message === 'string') return parsed.Message
    }
    return typeof parsed === 'string' ? parsed : null
  } catch {
    return null
  }
}

// swapp.js:173-194 — 403 forces a login, 401 stays on the page as "not authorised".
// Endpoints whose 403 answers a permission question (not the session) are listed in config.ts.
function handleSessionStatus(status: number, urlPath: string): boolean {
  if (status === 403) {
    if (isPermissionOnly403(urlPath)) return false
    redirectToForceLogin()
    return true
  }
  if (status === 408 || status === 428) {
    redirectToSignOut()
    return true
  }
  return false
}

const ANTI_FORGERY = /anti-?forgery/i

export async function apiRequest<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
  tokenRetried = false,
): Promise<T> {
  const url = buildUrl(path, options.query)
  const urlPath = url.split('?')[0]
  const isRead = method === 'GET' || isReadOnlyPost(method, urlPath)

  if (!isRead && !writesAllowed()) {
    throw new ApiError('blocked', urlPath)
  }

  // swapp.js:269 sends the token on every ajax call, reads included; the server-side check is outside the corpus.
  // A file body cannot be sent twice, so an upload takes a fresh token up front instead of retrying (SL-06).
  const upload = options.body instanceof FormData
  if (upload && !tokenRetried) resetVerificationToken()
  const token = await getVerificationToken()
  if (!isRead && token === null) {
    throw new ApiError('token', urlPath)
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  if (token !== null) headers.RequestVerificationToken = token
  const { body } = options
  const payload = body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body)
  if (typeof payload === 'string') headers['Content-Type'] = 'application/json'

  let response: RawResponse
  const untrack = trackRequest()
  try {
    if (options.onUploadProgress) {
      response = await sendWithProgress(
        method,
        url,
        headers,
        payload,
        options.signal,
        options.onUploadProgress,
      )
    } else {
      const fetched = await fetch(url, {
        method,
        headers,
        body: payload,
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'manual',
        signal: options.signal,
      })
      response = {
        status: fetched.status,
        ok: fetched.ok,
        text: await fetched.text(),
        redirected: isSessionRedirect(fetched),
      }
    }
  } catch (error) {
    throw new ApiError(isAbortError(error) ? 'aborted' : 'network', urlPath)
  } finally {
    untrack()
  }

  if (response.redirected) {
    redirectToForceLogin()
    throw new ApiError('auth', urlPath, 403)
  }
  if (response.status === 401) {
    throw new ApiError('auth', urlPath, response.status)
  }
  if (handleSessionStatus(response.status, urlPath)) {
    throw new ApiError('auth', urlPath, response.status)
  }

  const { text } = response
  if (!response.ok) {
    if (!isRead && !upload && !tokenRetried && response.status === 400 && ANTI_FORGERY.test(text)) {
      resetVerificationToken()
      return apiRequest<T>(method, path, options, true)
    }
    // swgrid.js:444-447 shows the server's message only for 400.
    const serverMessage = response.status === 400 ? readServerMessage(text) : null
    throw new ApiError('http', urlPath, response.status, serverMessage)
  }
  if (!text) {
    // swgrid.js:429-451 treats an empty body on a read as a failed load, never as "no rows".
    if (isRead && !options.allowEmpty) throw new ApiError('parse', urlPath, response.status)
    return undefined as T
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError('parse', urlPath, response.status)
  }
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) => apiRequest<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => apiRequest<T>('POST', path, options),
  put: <T>(path: string, options?: RequestOptions) => apiRequest<T>('PUT', path, options),
  delete: <T>(path: string, options?: RequestOptions) => apiRequest<T>('DELETE', path, options),
}
