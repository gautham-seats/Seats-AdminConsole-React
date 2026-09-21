import { connectHub, hubTimers } from '../signalr-hub'

class FakeSocket {
  static OPEN = 1
  static all: FakeSocket[] = []
  readyState = 1
  sent: string[] = []
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(readonly url: string) {
    FakeSocket.all.push(this)
  }
  send(data: string) {
    this.sent.push(data)
  }
  close() {
    this.readyState = 3
    this.onclose?.()
  }
  receive(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) })
  }
}

const fetchMock = jest.fn()
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}
const json = (status: number, body: unknown) =>
  Promise.resolve({ ok: status < 300, status, json: () => Promise.resolve(body) })

let timers: { callback: () => void; ms: number }[] = []

beforeEach(() => {
  FakeSocket.all = []
  timers = []
  fetchMock.mockReset()
  fetchMock.mockImplementation((url: string) =>
    url.includes('/negotiate')
      ? json(200, { ConnectionToken: 'tok/1', KeepAliveTimeout: 20, TryWebSockets: true })
      : json(200, { Response: 'started' }),
  )
  globalThis.fetch = fetchMock
  Object.defineProperty(globalThis, 'WebSocket', { value: FakeSocket, configurable: true })
  jest.spyOn(hubTimers, 'set').mockImplementation((callback, ms) => {
    timers.push({ callback, ms })
    return timers.length as never
  })
  jest.spyOn(hubTimers, 'clear').mockImplementation(() => undefined)
})

afterEach(() => jest.restoreAllMocks())

describe('connectHub', () => {
  it('negotiates, connects over web sockets, starts and joins, then routes hub pushes', async () => {
    const push = jest.fn()
    const joined = jest.fn()
    const connection = connectHub({
      hub: 'userNotificationHub',
      handlers: { NewUserNotification: push },
      onConnected: (invoke, reconnected) => {
        joined(reconnected)
        invoke('ConnectToUserNotification', 12)
      },
    })
    await flush()
    expect(fetchMock.mock.calls[0][0]).toBe(
      '/Seats.Trunk.Admin/signalr/negotiate?clientProtocol=1.5&connectionData=%5B%7B%22name%22%3A%22usernotificationhub%22%7D%5D',
    )
    const socket = FakeSocket.all[0]
    expect(socket.url).toMatch(
      /^ws:\/\/localhost\/Seats\.Trunk\.Admin\/signalr\/connect\?transport=webSockets/,
    )
    expect(socket.url).toContain('connectionToken=tok%2F1')
    socket.receive({ C: 'x', S: 1, M: [] })
    await flush()
    expect(fetchMock.mock.calls[1][0]).toContain('/Seats.Trunk.Admin/signalr/start?transport=webSockets')
    expect(joined).toHaveBeenCalledWith(false)
    expect(JSON.parse(socket.sent[0])).toEqual({
      H: 'usernotificationhub',
      M: 'ConnectToUserNotification',
      A: [12],
      I: 0,
    })
    socket.receive({ C: 'y', M: [{ H: 'UserNotificationHub', M: 'NewUserNotification', A: [{ id: 3 }] }] })
    expect(push).toHaveBeenCalledWith({ id: 3 })
    connection.stop()
  })

  it('reconnects after the socket drops and reports it as a reconnect', async () => {
    const joined = jest.fn()
    connectHub({ hub: 'userNotificationHub', handlers: {}, onConnected: (_, again) => joined(again) })
    await flush()
    FakeSocket.all[0].receive({ S: 1, M: [] })
    await flush()
    FakeSocket.all[0].close()
    const retry = timers.find(timer => timer.ms === 1000)
    expect(retry).toBeDefined()
    retry?.callback()
    await flush()
    FakeSocket.all[1].receive({ S: 1, M: [] })
    await flush()
    expect(joined.mock.calls).toEqual([[false], [true]])
  })

  it('SF-18 waits on a slow timer when signed out and never reconnects after stop', async () => {
    fetchMock.mockImplementation(() => json(401, {}))
    const signedOut = connectHub({ hub: 'userNotificationHub', handlers: {} })
    await flush()
    expect(FakeSocket.all).toHaveLength(0)
    // A login in another tab must bring live updates back, so the retry keeps running slowly.
    expect(timers).toHaveLength(1)
    expect(timers[0].ms).toBe(30000)
    signedOut.stop()
    timers.length = 0

    fetchMock.mockImplementation((url: string) =>
      url.includes('/negotiate')
        ? json(200, { ConnectionToken: 't', KeepAliveTimeout: null, TryWebSockets: true })
        : json(200, {}),
    )
    const connection = connectHub({ hub: 'userNotificationHub', handlers: {} })
    await flush()
    connection.stop()
    expect(FakeSocket.all[0].readyState).toBe(3)
    expect(timers).toHaveLength(0)
  })

  it('SL-22 falls back to long polling when the server has no web sockets, and sends over /send', async () => {
    const push = jest.fn()
    const joined = jest.fn()
    let polls = 0
    let releasePoll: (frame: unknown) => void = () => undefined
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/negotiate'))
        return json(200, { ConnectionToken: 'tok/1', KeepAliveTimeout: null, TryWebSockets: false })
      if (url.includes('/connect?')) return json(200, { C: 'd-1', S: 1, M: [] })
      if (url.includes('/start?')) return json(200, { Response: 'started' })
      if (url.includes('/poll?')) {
        polls += 1
        if (polls === 1)
          return json(200, {
            C: 'd-2',
            G: 'grp',
            M: [{ H: 'userNotificationHub', M: 'NewUserNotification', A: [7] }],
          })
        return new Promise(resolve => (releasePoll = frame => resolve(json(200, frame))))
      }
      return json(200, {})
    })
    const connection = connectHub({
      hub: 'userNotificationHub',
      handlers: { newUserNotification: push },
      onConnected: (invoke, again) => {
        joined(again)
        invoke('ConnectToUserNotification', 42)
      },
    })
    await flush()
    await flush()
    expect(FakeSocket.all).toHaveLength(0)
    const urls = fetchMock.mock.calls.map(([url]) => String(url))
    expect(urls.some(url => url.includes('/connect?') && url.includes('transport=longPolling'))).toBe(true)
    expect(joined).toHaveBeenCalledWith(false)
    expect(push).toHaveBeenCalledWith(7)
    const send = fetchMock.mock.calls.find(([url]) => String(url).includes('/send?'))
    expect(send?.[1]).toMatchObject({ method: 'POST' })
    expect(String(send?.[1]?.body)).toContain('ConnectToUserNotification')
    // The next poll resumes from the last message id and carries the groups token.
    const lastPoll = urls.filter(url => url.includes('/poll?')).at(-1) ?? ''
    expect(lastPoll).toContain('messageId=d-2')
    expect(lastPoll).toContain('groupsToken=grp')
    connection.stop()
    releasePoll({ C: 'd-3', M: [] })
    await flush()
    expect(
      fetchMock.mock.calls.some(([url, init]) => String(url).includes('/abort?') && init?.method === 'POST'),
    ).toBe(true)
  })

  it('SL-23 tells the server to abort when a socket connection stops', async () => {
    const connection = connectHub({ hub: 'userNotificationHub', handlers: {} })
    await flush()
    FakeSocket.all[0].receive({ S: 1, M: [] })
    await flush()
    connection.stop()
    const abort = fetchMock.mock.calls.find(([url]) => String(url).includes('/abort?'))
    expect(abort?.[1]).toMatchObject({ method: 'POST', keepalive: true })
    expect(String(abort?.[0])).toContain('transport=webSockets')
  })
})
