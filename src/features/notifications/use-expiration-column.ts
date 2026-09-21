'use client'

import { useCallback } from 'react'
import { useApiRead } from '@/shared/api'
import { getLegacyViewHtml } from '@/shared/api/legacy-view'

const VIEW_PATH = 'UserNotification/Index'

export function parseShowExpirationColumn(html: string): boolean {
  const match = /showExpirationColumn:\s*(true|false)/i.exec(html)
  return match?.[1]?.toLowerCase() === 'true'
}

export function useExpirationColumn(): {
  show: boolean
  status: 'loading' | 'success' | 'error'
  reload: () => void
} {
  const load = useCallback((signal: AbortSignal) => getLegacyViewHtml(VIEW_PATH, signal), [])
  const read = useApiRead('notifications-expiration-column', load)
  if (read.status === 'success') {
    return { show: parseShowExpirationColumn(read.data ?? ''), status: 'success', reload: read.reload }
  }
  if (read.status === 'error') {
    return { show: false, status: 'error', reload: read.reload }
  }
  return { show: false, status: 'loading', reload: read.reload }
}
