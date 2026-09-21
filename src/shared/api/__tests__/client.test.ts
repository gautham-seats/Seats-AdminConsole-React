import { apiRequest } from '../client'
import { ApiError } from '../errors'
import { redirectToForceLogin, redirectToSignOut } from '../navigation'
import { extractVerificationToken, resetVerificationToken } from '../verification-token'

jest.mock('../navigation', () => ({
  redirectToForceLogin: jest.fn(),
  redirectToSignOut: jest.fn(),
}))

const TOKEN = 'cookie-part:form-part'
const LAYOUT = `<script>swapp.init({ requestVerificationToken: '${TOKEN}', generalLoadingID: 'loadingModal' })</script>`

function response(status: number, body = ''): Response {
  return { ok: status >= 200 && status < 300, status, text: () => Promise.resolve(body) } as Response
}

const fetchMock = jest.fn()

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock
  resetVerificationToken()
  delete process.env.ADMIN_ALLOW_WRITES
  jest.mocked(redirectToForceLogin).mockClear()
  jest.mocked(redirectToSignOut).mockClear()
})

function routeFetch(api: Response) {
  fetchMock.mockImplementation((url: string) =>
    Promise.resolve(url === '/Seats.Trunk.Admin/' ? response(200, LAYOUT) : api),
  )
}

describe('verification token', () => {
  it('extracts the cookie:form pair rendered by the legacy layout', () => {
    expect(extractVerificationToken(LAYOUT)).toBe(TOKEN)
    expect(extractVerificationToken('<html>login</html>')).toBeNull()
  })
})

describe('apiRequest', () => {
  it('sends GET to the legacy API with the verification token and ajax headers', async () => {
    routeFetch(response(200, '{"value":1}'))

    await expect(
      apiRequest('GET', 'UserApi/GetClaims', { query: { a: 1, b: null, c: undefined } }),
    ).resolves.toEqual({
      value: 1,
    })

    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('/Seats.Trunk.Admin/api/UserApi/GetClaims?a=1&b=')
    expect(init.method).toBe('GET')
    expect(init.credentials).toBe('same-origin')
    expect(init.headers).toMatchObject({
      RequestVerificationToken: TOKEN,
      'X-Requested-With': 'XMLHttpRequest',
    })
    expect(init.signal).toBeUndefined()
  })

  it('loads the token once per page', async () => {
    routeFetch(response(200, '[]'))
    await apiRequest('GET', 'A')
    await apiRequest('GET', 'B')
    expect(fetchMock.mock.calls.filter(([url]) => url === '/Seats.Trunk.Admin/')).toHaveLength(1)
  })

  it.each(['POST', 'PUT', 'DELETE'] as const)(
    'blocks %s in safe mode without touching the network',
    async method => {
      await expect(apiRequest(method, 'UserApi', { body: { id: 1 } })).rejects.toMatchObject({
        kind: 'blocked',
      })
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it('allows the read-only resources POST in safe mode', async () => {
    routeFetch(response(200, '{"en-GB":{"Save":"Save"}}'))
    await apiRequest('POST', 'ResourceApi/GetResourcesForScreen', { body: ['Save'] })
    const [, init] = fetchMock.mock.calls[1]
    expect(init.method).toBe('POST')
    expect(init.body).toBe('["Save"]')
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('D-125 allows the validate-file PUT in safe mode and still blocks the upload', async () => {
    routeFetch(response(200, '[]'))
    const form = new FormData()
    await expect(apiRequest('PUT', 'ImportApi/validateFile', { body: form })).resolves.toEqual([])
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT')
    await expect(apiRequest('PUT', 'ImportApi/UploadFile', { body: form })).rejects.toMatchObject({
      kind: 'blocked',
    })
  })

  it('sends writes when ADMIN_ALLOW_WRITES is true', async () => {
    process.env.ADMIN_ALLOW_WRITES = 'true'
    routeFetch(response(200, ''))
    await expect(apiRequest('DELETE', 'UserApi/5')).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE')
  })

  it('allows the read-only settings POST in safe mode and blocks the settings save', async () => {
    routeFetch(response(200, '[]'))
    await expect(
      apiRequest('POST', 'SettingsApi/GetSettingByKeys', { body: ['ONLINE_HELP_URL'] }),
    ).resolves.toEqual([])
    await expect(apiRequest('POST', 'SettingsApi', { body: [] })).rejects.toMatchObject({ kind: 'blocked' })
  })

  it('sends FormData as multipart without a JSON content type', async () => {
    process.env.ADMIN_ALLOW_WRITES = 'true'
    routeFetch(response(200, '"menu-logo-attachments/logo.png"'))
    const form = new FormData()
    form.append('container', 'menu-logo-attachments')
    await expect(apiRequest('POST', 'image', { body: form })).resolves.toBe('menu-logo-attachments/logo.png')
    const init = fetchMock.mock.calls[1][1]
    expect(init.body).toBe(form)
    expect(init.headers['Content-Type']).toBeUndefined()
  })

  it('refuses writes when the verification token is unavailable', async () => {
    process.env.ADMIN_ALLOW_WRITES = 'true'
    fetchMock.mockResolvedValue(response(200, '<html>no token</html>'))
    await expect(apiRequest('POST', 'UserApi', { body: {} })).rejects.toMatchObject({ kind: 'token' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('D1 redirects to ForceLogin on 403 only', async () => {
    routeFetch(response(403))
    await expect(apiRequest('GET', 'UserApi')).rejects.toMatchObject({ kind: 'auth', status: 403 })
    expect(redirectToForceLogin).toHaveBeenCalledTimes(1)
  })

  it('D1 keeps the page on 401 and reports it as an auth error', async () => {
    routeFetch(response(401))
    await expect(apiRequest('GET', 'UserApi')).rejects.toMatchObject({ kind: 'auth', status: 401 })
    expect(redirectToForceLogin).not.toHaveBeenCalled()
  })

  it('B1 treats an empty body on a read as a failed load', async () => {
    routeFetch(response(200, ''))
    await expect(apiRequest('GET', 'UserApi/GetUsers')).rejects.toMatchObject({ kind: 'parse', status: 200 })
  })

  it('B1 still allows an empty body on a write', async () => {
    process.env.ADMIN_ALLOW_WRITES = 'true'
    routeFetch(response(200, ''))
    await expect(apiRequest('DELETE', 'UserApi/1')).resolves.toBeUndefined()
  })

  it('J1 keeps the server message only for 400', async () => {
    routeFetch(response(500, '{"message":"Exception at SqlConnection.Open()"}'))
    await expect(apiRequest('GET', 'UserApi')).rejects.toMatchObject({
      kind: 'http',
      status: 500,
      serverMessage: null,
    })
  })

  it('SL-06 takes a fresh token before an upload and never re-sends the file on a token failure', async () => {
    process.env.ADMIN_ALLOW_WRITES = 'true'
    // A first call primes the layout cache; the upload must fetch the layout again before it sends.
    routeFetch(response(200, '{"value":1}'))
    await apiRequest('GET', 'UserApi/GetClaims')
    let apiCalls = 0
    fetchMock.mockImplementation((url: string) => {
      if (url === '/Seats.Trunk.Admin/') return Promise.resolve(response(200, LAYOUT))
      apiCalls += 1
      return Promise.resolve(response(400, '{"message":"The anti-forgery token could not be decrypted."}'))
    })
    const form = new FormData()
    form.append('file', new Blob(['x']), 'x.csv')
    await expect(apiRequest('POST', 'ImportApi/Upload', { body: form })).rejects.toMatchObject({
      kind: 'http',
      status: 400,
    })
    expect(apiCalls).toBe(1)
    // The priming read, then one fresh layout read for the upload; no third read for a retry.
    expect(fetchMock.mock.calls.filter(([url]) => url === '/Seats.Trunk.Admin/')).toHaveLength(2)
  })

  it('SL-07 lets a read opt in to an empty body', async () => {
    routeFetch(response(200, ''))
    await expect(apiRequest('GET', 'audit/Post', { allowEmpty: true })).resolves.toBeUndefined()
    await expect(apiRequest('GET', 'audit/Post')).rejects.toMatchObject({ kind: 'parse' })
  })

  it('D2 re-reads the verification token once when the server rejects it', async () => {
    process.env.ADMIN_ALLOW_WRITES = 'true'
    let apiCalls = 0
    fetchMock.mockImplementation((url: string) => {
      if (url === '/Seats.Trunk.Admin/') return Promise.resolve(response(200, LAYOUT))
      apiCalls += 1
      return Promise.resolve(
        apiCalls === 1
          ? response(400, '{"message":"The anti-forgery token could not be decrypted."}')
          : response(200, '{"saved":true}'),
      )
    })
    await expect(apiRequest('POST', 'UserApi', { body: {} })).resolves.toEqual({ saved: true })
    expect(apiCalls).toBe(2)
    expect(fetchMock.mock.calls.filter(([url]) => url === '/Seats.Trunk.Admin/')).toHaveLength(2)
  })

  it.each([408, 428])('signs out on %i', async status => {
    routeFetch(response(status))
    await expect(apiRequest('GET', 'UserApi')).rejects.toMatchObject({ kind: 'auth', status })
    expect(redirectToSignOut).toHaveBeenCalledTimes(1)
  })

  it('normalises HTTP errors with the server message', async () => {
    routeFetch(response(400, '{"Message":"There was an error"}'))
    const error = await apiRequest('GET', 'UserApi').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind: 'http', status: 400, serverMessage: 'There was an error' })
  })

  it('reads the camel-cased message the Admin API sends', async () => {
    routeFetch(response(400, '{"message":"The access profile is currently in use."}'))
    await expect(apiRequest('GET', 'AccessProfileApi')).rejects.toMatchObject({
      serverMessage: 'The access profile is currently in use.',
    })
  })

  it('reports aborted and network failures distinctly', async () => {
    fetchMock.mockImplementation((url: string) =>
      url === '/Seats.Trunk.Admin/'
        ? Promise.resolve(response(200, LAYOUT))
        : Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
    )
    await expect(apiRequest('GET', 'UserApi')).rejects.toMatchObject({ kind: 'aborted' })

    fetchMock.mockImplementation((url: string) =>
      url === '/Seats.Trunk.Admin/'
        ? Promise.resolve(response(200, LAYOUT))
        : Promise.reject(new TypeError('offline')),
    )
    await expect(apiRequest('GET', 'UserApi')).rejects.toMatchObject({ kind: 'network' })
  })

  it('reports invalid JSON as a parse error', async () => {
    routeFetch(response(200, '<html>'))
    await expect(apiRequest('GET', 'UserApi')).rejects.toMatchObject({ kind: 'parse' })
  })

  it('reports upload progress through XMLHttpRequest and aborts it on signal', async () => {
    process.env.ADMIN_ALLOW_WRITES = 'true'
    routeFetch(response(200))
    const sent: FakeXhr[] = []
    class FakeXhr {
      status = 0
      responseText = ''
      withCredentials = false
      headers: Record<string, string> = {}
      method = ''
      url = ''
      upload: { onprogress: ((event: ProgressEvent) => void) | null } = { onprogress: null }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      onabort: (() => void) | null = null
      open(method: string, url: string) {
        this.method = method
        this.url = url
      }
      setRequestHeader(name: string, value: string) {
        this.headers[name] = value
      }
      send() {
        sent.push(this)
      }
      abort() {
        this.onabort?.()
      }
    }
    const original = globalThis.XMLHttpRequest
    Object.defineProperty(globalThis, 'XMLHttpRequest', { value: FakeXhr, configurable: true })
    try {
      const progress: number[] = []
      const done = apiRequest('PUT', 'ImportApi/UploadFile', {
        body: new FormData(),
        onUploadProgress: fraction => progress.push(fraction),
      })
      await waitForSend(sent, 1)
      const xhr = sent[0]
      expect(xhr.method).toBe('PUT')
      expect(xhr.url).toBe('/Seats.Trunk.Admin/api/ImportApi/UploadFile')
      expect(xhr.headers.RequestVerificationToken).toBe(TOKEN)
      xhr.upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 } as ProgressEvent)
      xhr.status = 200
      xhr.onload?.()
      await expect(done).resolves.toBeUndefined()
      expect(progress).toEqual([0.25, 1])

      const controller = new AbortController()
      const aborted = apiRequest('PUT', 'ImportApi/UploadFile', {
        body: new FormData(),
        signal: controller.signal,
        onUploadProgress: () => undefined,
      })
      await waitForSend(sent, 2)
      controller.abort()
      await expect(aborted).rejects.toMatchObject({ kind: 'aborted' })
    } finally {
      Object.defineProperty(globalThis, 'XMLHttpRequest', { value: original, configurable: true })
    }
  })
})

async function waitForSend(sent: unknown[], count: number) {
  for (let i = 0; i < 20 && sent.length < count; i++) await Promise.resolve()
}

describe('SF shared foundation fixes', () => {
  it('SF-13 appends a query to a path that already carries one', async () => {
    routeFetch(response(200, '[]'))
    await apiRequest('GET', 'JobScheduleApi?ids=1&ids=2', { query: { page: 2 } })
    expect(fetchMock.mock.calls[1][0]).toBe('/Seats.Trunk.Admin/api/JobScheduleApi?ids=1&ids=2&page=2')
  })

  it('SF-15 surfaces the ModelState field messages behind the generic 400 text', async () => {
    routeFetch(
      response(
        400,
        JSON.stringify({
          message: 'The request is invalid.',
          modelState: {
            'job.Description': ['Description is too long.'],
            'job.Minutes': ['Minutes must be 1-60.'],
          },
        }),
      ),
    )
    await expect(apiRequest('GET', 'JobScheduleApi/1')).rejects.toMatchObject({
      status: 400,
      serverMessage: 'Description is too long. Minutes must be 1-60.',
    })
  })

  it('SF-16 keeps a permission-only 403 on the page instead of forcing a login', async () => {
    routeFetch(response(403))
    await expect(
      apiRequest('GET', 'JobScheduleApi/GetBuildingOptions', { query: { query: 'a' } }),
    ).rejects.toMatchObject({ kind: 'http', status: 403 })
    expect(redirectToForceLogin).not.toHaveBeenCalled()
    await expect(apiRequest('GET', 'JobScheduleApi/GetSchoolOptions')).rejects.toMatchObject({ kind: 'auth' })
    expect(redirectToForceLogin).toHaveBeenCalledTimes(1)
  })

  it('SF-05 treats an unfollowed API redirect as a lost session', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/Seats.Trunk.Admin/'
          ? response(200, LAYOUT)
          : ({ ok: false, status: 0, type: 'opaqueredirect', text: () => Promise.resolve('') } as Response),
      ),
    )
    await expect(apiRequest('GET', 'UserApi/GetClaims')).rejects.toMatchObject({ kind: 'auth', status: 403 })
    expect(redirectToForceLogin).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ redirect: 'manual' })
  })
})
