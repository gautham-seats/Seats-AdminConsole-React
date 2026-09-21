'use client'

import { useCallback, useMemo } from 'react'
import { useApiRead, type ApiRead } from '@/shared/api'
import { loadScreenResources } from './resources'

export type Resources = Omit<ApiRead<Record<string, string>>, 'data'> & {
  text: (key: string) => string
}

export function useResources(keys: readonly string[]): Resources {
  const requestKey = useMemo(() => [...new Set(keys)].sort().join('|'), [keys])
  const load = useCallback(
    (signal: AbortSignal) => loadScreenResources(requestKey ? requestKey.split('|') : [], signal),
    [requestKey],
  )
  const { data, ...read } = useApiRead(requestKey || null, load)
  const text = useCallback((key: string) => data?.[key] ?? key, [data])
  // Nothing to fetch is already "loaded": no loading state and no empty POST for an empty key list.
  if (!requestKey) return { ...read, status: 'success', text }
  return { ...read, text }
}
