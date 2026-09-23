'use client'

import { Toast, useToastAutoClose, type ToastTone } from '@/shared/ui/Toast'

type NoticeTone = 'success' | 'error' | 'warning' | 'gray'

export type Notice = { id: number; tone: NoticeTone; message: string; duration?: number }

// Mirrors swAlert timings: success 2.5 s, warnings and errors 5 s (swgrid.js:440-450).
const DURATION: Record<NoticeTone, number> = { success: 2500, error: 5000, warning: 5000, gray: 5000 }

const TOAST_TONE: Record<NoticeTone, ToastTone> = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  gray: 'info',
}

export function StatusNotice({
  notice,
  onDismiss,
  dismissLabel,
}: {
  notice: Notice | null
  onDismiss: () => void
  dismissLabel: string
}) {
  const duration = notice ? (notice.duration ?? DURATION[notice.tone]) : 0
  const durationMs = useToastAutoClose(notice !== null, duration, onDismiss)

  if (!notice) return null
  return (
    <Toast
      id={notice.id}
      tone={TOAST_TONE[notice.tone]}
      message={notice.message}
      durationMs={durationMs}
      dismissLabel={dismissLabel}
      onDismiss={onDismiss}
    />
  )
}
