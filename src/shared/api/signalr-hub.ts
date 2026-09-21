import { LEGACY_ADMIN_BASE } from './config'

// The legacy site runs ASP.NET SignalR 2 (Startup.cs MapSignalR), which @microsoft/signalr cannot speak (D-115).
const SIGNALR_PATH = `${LEGACY_ADMIN_BASE}/signalr`
const CLIENT_PROTOCOL = '1.5'
const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]

export type HubHandlers = Record<string, (...args: unknown[]) => void>

export type HubOptions = {
  hub: string
  handlers: HubHandlers
  // Runs after every (re)connect, such as joining a group.
  onConnected?: (invoke: (method: string, ...args: unknown[]) => void, reconnected: boolean) => void
}

type Negotiate = { ConnectionToken: string; KeepAliveTimeout: number | null; TryWebSockets: boolean }

type HubMessage = { H?: string; M?: string; A?: unknown[] }
// One transport frame: C = message id to resume from, G = groups token, M = hub messages, S = start marker.
type Frame = { C?: string; G?: string; S?: number; M?: HubMessage[] }

export type HubConnection = { stop: () => void }

export const hubTimers = {
  set: (callback: () => void, ms: number) => setTimeout(callback, ms),
  clear: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
}

function query(params: Record<string, string>) {
  return new URLSearchParams(params).toString()
}

// Opens one hub connection with automatic reconnect; stop() ends it for good.
export function connectHub({ hub, handlers, onConnected }: HubOptions): HubConnection {
  const connectionData = JSON.stringify([{ name: hub.toLowerCase() }])
  const lowerHandlers = new Map(Object.entries(handlers).map(([name, fn]) => [name.toLowerCase(), fn]))
  let stopped = false
  let socket: WebSocket | null = null
  let attempt = 0
  let connectedOnce = false
  let invocation = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let aliveTimer: ReturnType<typeof setTimeout> | null = null
  // The live transport's parameters, so stop() can tell the server to drop the connection (SL-23).
  let liveParams: Record<string, string> | null = null
  let polling: AbortController | null = null

  const dispatch = (frame: Frame) => {
    for (const message of frame.M ?? []) {
      const handler = message.M ? lowerHandlers.get(message.M.toLowerCase()) : undefined
      handler?.(...(message.A ?? []))
    }
  }

  const finishStart = (
    params: Record<string, string>,
    invoke: (method: string, ...args: unknown[]) => void,
  ) =>
    fetch(`${SIGNALR_PATH}/start?${query(params)}`, { credentials: 'same-origin', cache: 'no-store' }).then(
      () => {
        if (stopped) return false
        const reconnected = connectedOnce
        connectedOnce = true
        attempt = 0
        onConnected?.(invoke, reconnected)
        return true
      },
    )

  // SignalR 2 long polling (SL-22): connect, start, then poll /poll with the last message id until stopped;
  // invocations go through /send as form data, exactly as the legacy jQuery client does without sockets.
  const openLongPolling = async (negotiate: Negotiate) => {
    const params = {
      transport: 'longPolling',
      clientProtocol: CLIENT_PROTOCOL,
      connectionToken: negotiate.ConnectionToken,
      connectionData,
    }
    liveParams = params
    const controller = new AbortController()
    polling = controller
    let messageId = ''
    let groupsToken = ''
    const invoke = (method: string, ...args: unknown[]) => {
      const data = JSON.stringify({ H: hub.toLowerCase(), M: method, A: args, I: invocation++ })
      void fetch(`${SIGNALR_PATH}/send?${query(params)}`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data }).toString(),
      }).catch(() => undefined)
    }
    const readFrame = async (path: string): Promise<Frame | null> => {
      const extra = { ...(messageId ? { messageId } : {}), ...(groupsToken ? { groupsToken } : {}) }
      const response = await fetch(`${SIGNALR_PATH}/${path}?${query({ ...params, ...extra })}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error(String(response.status))
      const frame = (await response.json()) as Frame
      if (frame.C) messageId = frame.C
      if (frame.G) groupsToken = frame.G
      return frame
    }
    try {
      const first = await readFrame('connect')
      if (stopped || controller.signal.aborted || !first) return
      dispatch(first)
      if (!(await finishStart(params, invoke))) return
      while (!stopped && !controller.signal.aborted) {
        const frame = await readFrame('poll')
        if (frame) dispatch(frame)
      }
    } catch {
      if (stopped || controller.signal.aborted) return
      polling = null
      scheduleRetry()
    }
  }

  const scheduleRetry = () => {
    if (stopped) return
    const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)]
    attempt += 1
    retryTimer = hubTimers.set(() => void open(), delay)
  }

  const watchAlive = (timeoutSeconds: number | null) => {
    if (aliveTimer) hubTimers.clear(aliveTimer)
    if (!timeoutSeconds) return
    aliveTimer = hubTimers.set(() => socket?.close(), timeoutSeconds * 1500)
  }

  const open = async () => {
    if (stopped) return
    let negotiate: Negotiate
    try {
      const response = await fetch(
        `${SIGNALR_PATH}/negotiate?${query({ clientProtocol: CLIENT_PROTOCOL, connectionData })}`,
        { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } },
      )
      // Signed out: keep a slow retry so a login in another tab brings live updates back.
      if (response.status === 401 || response.status === 403) {
        attempt = RETRY_DELAYS.length - 1
        scheduleRetry()
        return
      }
      if (!response.ok) throw new Error(String(response.status))
      negotiate = (await response.json()) as Negotiate
    } catch {
      scheduleRetry()
      return
    }
    if (stopped) return
    if (!negotiate.TryWebSockets || typeof WebSocket === 'undefined') {
      await openLongPolling(negotiate)
      return
    }

    const params = {
      transport: 'webSockets',
      clientProtocol: CLIENT_PROTOCOL,
      connectionToken: negotiate.ConnectionToken,
      connectionData,
    }
    liveParams = params
    const { protocol, host } = window.location
    const ws = new WebSocket(
      `${protocol === 'https:' ? 'wss' : 'ws'}://${host}${SIGNALR_PATH}/connect?${query({ ...params, tid: String(Math.floor(Math.random() * 11)) })}`,
    )
    socket = ws
    let started = false

    const invoke = (method: string, ...args: unknown[]) => {
      if (ws.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify({ H: hub.toLowerCase(), M: method, A: args, I: invocation++ }))
    }

    ws.onmessage = event => {
      watchAlive(negotiate.KeepAliveTimeout)
      let payload: Frame
      try {
        payload = JSON.parse(String(event.data)) as Frame
      } catch {
        return
      }
      if (payload.S === 1 && !started) {
        started = true
        finishStart(params, invoke).then(
          ok => {
            if (!ok || socket !== ws) return
          },
          () => ws.close(),
        )
      }
      dispatch(payload)
    }
    ws.onclose = () => {
      if (aliveTimer) hubTimers.clear(aliveTimer)
      if (socket === ws) socket = null
      scheduleRetry()
    }
    ws.onerror = () => ws.close()
  }

  void open()

  return {
    stop: () => {
      stopped = true
      if (retryTimer) hubTimers.clear(retryTimer)
      if (aliveTimer) hubTimers.clear(aliveTimer)
      polling?.abort()
      polling = null
      socket?.close()
      socket = null
      // Tells the server to drop the connection now instead of waiting for its timeout (SL-23).
      if (liveParams)
        void fetch(`${SIGNALR_PATH}/abort?${query(liveParams)}`, {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          keepalive: true,
        }).catch(() => undefined)
      liveParams = null
    },
  }
}
