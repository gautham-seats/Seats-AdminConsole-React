'use client'

import { Check, Copy, KeyRound, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { toApiError, useApiRead } from '@/shared/api'
import { SharedResourceKeys, useResources } from '@/shared/resources'
import { Button, Dialog, GearworkLoader } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { Toast, useToastAutoClose } from '@/shared/ui/Toast'
import {
  currentKeyStatus,
  DEVELOPER_KEY_TEXT,
  fetchCurrentDeveloperKey,
  generateDeveloperKey,
  newKeyStatus,
  type KeyStatus,
} from './developer-key'

const KEYS = [
  'DeveloperKey',
  'DevKeyWarning',
  'Key',
  'New',
  'CopyToClipboard',
  'AlertGeneralErrorDefault',
  'Refresh',
]
const FALLBACK: Record<string, string> = {
  DeveloperKey: 'Developer Key',
  DevKeyWarning: DEVELOPER_KEY_TEXT.keyWarning,
  Key: 'Key',
  New: 'New',
  CopyToClipboard: 'Copy to clipboard',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
  Refresh: 'Refresh',
  [SharedResourceKeys.cancel]: 'Cancel',
  [SharedResourceKeys.close]: 'Close',
}
const COPIED_MS = 2000
// swapp.js:557-560 shows generate failures for 10 s.
const ERROR_MS = 10000
// swalert.js:70-88: only a missing or exact 'true' _accset_acb cookie auto-closes alerts.
// swapp.js:168-206 global handler: statuses outside this list replace the message with the general error.
const HANDLED_STATUSES: readonly number[] = [200, 400, 401, 403, 408, 428]
const isGeneralStatus = (kind: string, status: number | null) =>
  kind === 'http' && status !== null && status !== 0 && !HANDLED_STATUSES.includes(status)

type Generated = { key: string; status: KeyStatus }
type Failure = { id: number; message: string }

// Views/Login/_DeveloperKeyGenerator.cshtml: current expiry, New Key, then the new key once with Copy.
export function DeveloperKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return open ? <DeveloperKeyContent onOpenChange={onOpenChange} /> : null
}

function DeveloperKeyContent({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const { text } = useResources(
    useMemo(() => [...KEYS, SharedResourceKeys.cancel, SharedResourceKeys.close], []),
  )
  const t = useCallback(
    (key: string) => {
      const value = text(key)
      return !value.trim() || value === key ? (FALLBACK[key] ?? key) : value
    },
    [text],
  )
  const current = useApiRead('developer-key-current', fetchCurrentDeveloperKey)
  const [generated, setGenerated] = useState<Generated | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<Failure | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_MS)
    return () => clearTimeout(timer)
  }, [copied])

  const dismissError = useCallback(() => setError(null), [])
  const errorMs = useToastAutoClose(error !== null, ERROR_MS, dismissError)

  // A 400 means the user has no key yet; legacy then shows no expiry line (developerKeyGeneratorController.js:52).
  const noKey = current.status === 'error' && current.error?.kind === 'http' && current.error.status === 400
  const status =
    generated?.status ??
    (current.status === 'success' ? currentKeyStatus(current.data ?? null, new Date()) : null)
  // Legacy keeps the DevKeyWarning resource label when no expiry arrives (developerKeyGeneratorController.js:92-102).
  const warning = status ? status.warning : current.status === 'loading' ? null : t('DevKeyWarning')

  const requestKey = async () => {
    setPending(true)
    setError(null)
    try {
      const result = await generateDeveloperKey()
      if (!result?.developerKey) throw new Error('empty')
      setGenerated({ key: result.developerKey, status: newKeyStatus(result) })
    } catch (failure) {
      const problem = toApiError(failure)
      setError({
        id: Date.now(),
        message:
          problem.kind === 'blocked'
            ? DEVELOPER_KEY_TEXT.safeMode
            : isGeneralStatus(problem.kind, problem.status)
              ? t('AlertGeneralErrorDefault')
              : problem.kind === 'http' &&
                  problem.status !== null &&
                  problem.status < 500 &&
                  problem.serverMessage
                ? problem.serverMessage
                : DEVELOPER_KEY_TEXT.saveError,
      })
    } finally {
      setPending(false)
    }
  }

  const copy = async () => {
    if (!generated) return
    try {
      await navigator.clipboard.writeText(generated.key)
      setCopied(true)
    } catch {
      document.getElementById('developer-key-value')?.focus()
    }
  }

  const close = () => {
    if (!pending) onOpenChange(false)
  }

  const newKeyLabel = `${t('New')} ${t('Key')}`

  return (
    <Dialog
      open
      onOpenChange={next => {
        if (!next) close()
      }}
      title={t('DeveloperKey')}
      closeLabel={t(SharedResourceKeys.close)}
      className="max-w-md"
      footer={
        generated ? (
          <Button variant="outline" onClick={close}>
            {t(SharedResourceKeys.close)}
          </Button>
        ) : (
          <>
            <Button variant="outline" disabled={pending} onClick={close}>
              {t(SharedResourceKeys.cancel)}
            </Button>
            <Button
              disabled={current.status === 'loading'}
              loading={pending}
              onClick={() => void requestKey()}
            >
              {pending ? (
                <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <KeyRound aria-hidden className="size-4" />
              )}
              {newKeyLabel}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-4">
        {current.status === 'loading' && !generated ? (
          <div className="flex h-16 items-center justify-center">
            <GearworkLoader className="h-8 w-10" />
          </div>
        ) : null}

        {current.status === 'error' && !noKey && !generated ? (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
          >
            <span>{t('AlertGeneralErrorDefault')}</span>
            <Button variant="outline" size="sm" onClick={current.reload} className="bg-white">
              {t('Refresh')}
            </Button>
          </div>
        ) : null}

        {status ? (
          <div className="flex animate-fade-in items-start gap-3 rounded-lg border border-border bg-page px-4 py-3 motion-reduce:animate-none">
            <span
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-md',
                generated ? 'bg-brand text-white' : 'bg-white text-slate-600 ring-1 ring-border',
              )}
            >
              <KeyRound aria-hidden className="size-4" />
            </span>
            <p className="pt-2 text-sm font-medium tabular-nums text-foreground">{status.message}</p>
          </div>
        ) : null}

        {generated ? (
          <div className="flex animate-rise-in flex-col gap-2 motion-reduce:animate-none">
            <label
              htmlFor="developer-key-value"
              className="text-xs font-semibold tracking-wide text-muted-foreground"
            >
              {t('Key')}
            </label>
            <div className="flex gap-2">
              <input
                id="developer-key-value"
                readOnly
                value={generated.key}
                onFocus={event => event.currentTarget.select()}
                className="field-bloom h-10 min-w-0 flex-1 rounded-md border border-input bg-white px-3 font-mono text-[13px] tracking-tight text-foreground shadow-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none"
              />
              <Button
                variant={copied ? 'default' : 'outline'}
                onClick={() => void copy()}
                className="w-40 shrink-0 transition-colors"
              >
                {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
                <span aria-live="polite">{copied ? DEVELOPER_KEY_TEXT.copied : t('CopyToClipboard')}</span>
              </Button>
            </div>
          </div>
        ) : null}

        {warning ? (
          <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-700" />
            {warning}
          </p>
        ) : null}

        {/* Portalled so the page toast floats above the modal while staying in its React tree. */}
        {error && typeof document !== 'undefined'
          ? createPortal(
              <Toast
                id={error.id}
                tone="error"
                message={error.message}
                durationMs={errorMs}
                dismissLabel={t(SharedResourceKeys.close)}
                onDismiss={dismissError}
              />,
              document.body,
            )
          : null}
      </div>
    </Dialog>
  )
}
