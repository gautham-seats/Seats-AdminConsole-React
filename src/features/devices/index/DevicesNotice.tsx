'use client'

import { Toast, useToastAutoClose } from '@/shared/ui/Toast'

export type DevicesNoticeTone = 'success' | 'error' | 'info'

export type DevicesNoticeState = { id: number; tone: DevicesNoticeTone; message: string; durationMs: number }

type DevicesNoticeProps = { notice: DevicesNoticeState | null; onDismiss: () => void; dismissLabel: string }

export function DevicesNotice({ notice, onDismiss, dismissLabel }: DevicesNoticeProps) {
  const durationMs = useToastAutoClose(notice !== null, notice?.durationMs ?? 0, onDismiss)

  if (!notice) return null
  return (
    <Toast
      id={notice.id}
      tone={notice.tone}
      message={notice.message}
      durationMs={durationMs}
      dismissLabel={dismissLabel}
      onDismiss={onDismiss}
    />
  )
}
