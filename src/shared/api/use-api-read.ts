'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, isAbortError } from './errors'

export type ReadStatus = 'idle' | 'loading' | 'success' | 'error'

type Settled<T> =
  | { key: string; attempt: number; ok: true; data: T }
  | { key: string; attempt: number; ok: false; error: ApiError }

export type ApiRead<T> = {
  status: ReadStatus
  data: T | undefined
  error: ApiError | null
  // True while reload() fetches again; the last good data stays on screen meanwhile.
  refreshing: boolean
  reload: () => void
}

// `load` may be an inline closure; it re-runs only when `key` changes, so every input it reads belongs in the key.
export function useApiRead<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>): ApiRead<T> {
  const loadRef = useRef(load)
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const requestKey = key === null ? null : `${key}#${attempt}`

  useEffect(() => {
    loadRef.current = load
  }, [load])

  useEffect(() => {
    if (key === null) return
    const controller = new AbortController()
    loadRef.current(controller.signal).then(
      data => {
        if (!controller.signal.aborted) setSettled({ key, attempt, ok: true, data })
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return
        // A throw from our own mapping is unreadable data, not a lost connection; the original error
        // travels as `cause`, so the ErrorState and the console keep the real stack.
        setSettled({
          key,
          attempt,
          ok: false,
          error: error instanceof ApiError ? error : new ApiError('parse', key, null, null, error),
        })
      },
    )
    return () => controller.abort()
    // requestKey changes exactly when key or attempt changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])

  const reload = useCallback(() => setAttempt(value => value + 1), [])

  if (key === null) return { status: 'idle', data: undefined, error: null, refreshing: false, reload }
  const current = settled !== null && settled.key === key && settled.attempt === attempt
  if (!current) {
    // A reload of a key that already answered keeps that answer until the new one arrives.
    const previous = settled !== null && settled.key === key && settled.ok ? settled : null
    return previous
      ? { status: 'success', data: previous.data, error: null, refreshing: true, reload }
      : { status: 'loading', data: undefined, error: null, refreshing: false, reload }
  }
  return settled.ok
    ? { status: 'success', data: settled.data, error: null, refreshing: false, reload }
    : { status: 'error', data: undefined, error: settled.error, refreshing: false, reload }
}
