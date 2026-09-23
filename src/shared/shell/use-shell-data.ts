'use client'

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import { api, ApiError, useApiRead, type ReadStatus } from '@/shared/api'
import { loadSessionHeader, type SessionHeader } from '@/shared/api/session-header'
import { connectHub, type HubConnection } from '@/shared/api/signalr-hub'
import { buildMenu, hasPermission, NOTIFICATIONS_PERMISSION, type MenuLayout } from './admin-menu'
import { useProfile } from './profile'

export type ShellMenu = {
  status: ReadStatus
  error: ApiError | null
  reload: () => void
  layout: MenuLayout
  canSeeNotifications: boolean
}

let notificationRefresh = 0
const notificationSubs = new Set<() => void>()

function subscribeNotificationRefresh(onStoreChange: () => void) {
  notificationSubs.add(onStoreChange)
  return () => {
    notificationSubs.delete(onStoreChange)
  }
}

function getNotificationRefresh() {
  return notificationRefresh
}

let notificationPushes = 0
const pushSubs = new Set<() => void>()

function subscribePushes(onStoreChange: () => void) {
  pushSubs.add(onStoreChange)
  return () => {
    pushSubs.delete(onStoreChange)
  }
}

const getPushes = () => notificationPushes

// Counts server pushes only, so a list can reload for new items without reacting to its own actions.
export function useNotificationPushes(): number {
  return useSyncExternalStore(subscribePushes, getPushes, getPushes)
}

export function receiveNotificationPush() {
  notificationPushes += 1
  pushSubs.forEach(fn => fn())
  refreshNotificationCount()
}

export function refreshNotificationCount() {
  notificationRefresh += 1
  notificationSubs.forEach(fn => fn())
}

// Bumps on every count change: a user action, or a server push through the hub.
function useNotificationRefresh(): number {
  return useSyncExternalStore(subscribeNotificationRefresh, getNotificationRefresh, getNotificationRefresh)
}

let live: { userId: string; users: number; connection: HubConnection } | null = null

// userNotificationMenuController.js:10-28: join the user's group, then count up on NewUserNotification.
function joinLiveNotifications(userId: string) {
  if (live && live.userId !== userId) {
    live.connection.stop()
    live = null
  }
  if (live) {
    live.users += 1
  } else {
    live = {
      userId,
      users: 1,
      connection: connectHub({
        hub: 'userNotificationHub',
        handlers: { NewUserNotification: receiveNotificationPush },
        onConnected: (invoke, reconnected) => {
          invoke('ConnectToUserNotification', Number(userId))
          // Pushes sent while the socket was down are lost, so reload once back.
          if (reconnected) receiveNotificationPush()
        },
      }),
    }
  }
  return () => {
    if (!live || live.userId !== userId) return
    live.users -= 1
    if (live.users > 0) return
    live.connection.stop()
    live = null
  }
}

function useLiveNotifications(enabled: boolean, userId: string | null) {
  useEffect(() => (enabled && userId ? joinLiveNotifications(userId) : undefined), [enabled, userId])
}

export function useShellMenu(): ShellMenu {
  const { status, error, reload, profile } = useProfile()
  return useMemo(
    () => ({
      status,
      error,
      reload,
      layout: buildMenu(profile),
      canSeeNotifications: hasPermission(profile, NOTIFICATIONS_PERMISSION),
    }),
    [status, error, reload, profile],
  )
}

export function useNotificationCount(enabled: boolean): number | null {
  const generation = useNotificationRefresh()
  const session = useSessionHeader()
  useLiveNotifications(enabled, session?.userId ?? null)
  const load = useCallback(async (signal: AbortSignal) => {
    const raw = await api.get<unknown>('usernotificationapi/count', { signal })
    // The badge hides on failure, so an unreadable body must fail loudly rather than pass as "none".
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0)
      throw new ApiError('parse', 'usernotificationapi/count')
    return raw
  }, [])
  const { data, reload } = useApiRead(enabled ? 'shell-notification-count' : null, load)
  // A push reloads under the same key, so the badge keeps the last count until the new one lands.
  useEffect(() => {
    if (generation > 0) reload()
  }, [generation, reload])
  return typeof data === 'number' ? data : null
}

export function useSessionHeader(): SessionHeader | null {
  const load = useCallback(() => loadSessionHeader(), [])
  const { data } = useApiRead('shell-session-header', load)
  return data ?? null
}
