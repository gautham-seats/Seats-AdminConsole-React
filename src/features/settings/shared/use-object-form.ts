'use client'

import { useCallback, useMemo, useState } from 'react'
import { toApiError, useApiRead, type ApiError } from '@/shared/api'
import type { Notice } from './SaveToast'
import { ERROR_KIND_FALLBACK_ONLY } from '@/shared/ui/ErrorState'
import { FRAME_EN } from './SettingsFrame'

type ObjectFormOptions<T> = {
  key: string
  load: (signal: AbortSignal) => Promise<T>
  submit: (values: T) => Promise<T | undefined | null>
  successMessage: string
  errorMessage: string
}

type Draft<T> = { source: T | undefined; values: T; baseline: T }

export function saveFailureMessage(error: ApiError, fallback: string): string {
  if (error.kind === 'blocked') return FRAME_EN.safeMode
  if (error.kind === 'token' || (error.kind === 'auth' && error.status === 401))
    return ERROR_KIND_FALLBACK_ONLY.session.message
  if (error.kind === 'http' && error.status === 400 && error.serverMessage) return error.serverMessage
  return fallback
}

// Load one settings object, edit a copy, send it back and show the server's version afterwards.
export function useObjectForm<T>({ key, load, submit, successMessage, errorMessage }: ObjectFormOptions<T>) {
  const read = useApiRead(key, load)
  const [draft, setDraft] = useState<Draft<T> | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const current = useMemo<Draft<T> | null>(() => {
    if (draft && draft.source === read.data) return draft
    return read.data === undefined ? null : { source: read.data, values: read.data, baseline: read.data }
  }, [draft, read.data])

  const update = useCallback(
    (change: (values: T) => T) => {
      if (!current) return
      setDraft({ ...current, values: change(current.values) })
    },
    [current],
  )

  const dirty = current !== null && JSON.stringify(current.values) !== JSON.stringify(current.baseline)

  const save = async () => {
    if (saving || !current) return
    setSaving(true)
    try {
      const response = await submit(current.values)
      const next = response ?? current.values
      setDraft({ source: current.source, values: next, baseline: next })
      setNotice({ id: Date.now(), tone: 'success', message: successMessage })
    } catch (error) {
      setNotice({
        id: Date.now(),
        tone: 'error',
        message: saveFailureMessage(toApiError(error), errorMessage),
      })
    } finally {
      setSaving(false)
    }
  }

  const reload = useCallback(() => {
    setDraft(null)
    read.reload()
  }, [read])

  const dismissNotice = useCallback(() => setNotice(null), [])

  return { read, values: current?.values ?? null, dirty, saving, notice, update, save, reload, dismissNotice }
}
