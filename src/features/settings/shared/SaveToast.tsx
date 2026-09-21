'use client'

import { Toast, useToastAutoClose } from '@/shared/ui/Toast'
export type Notice = { id: number; tone: 'success' | 'error'; message: string }

// seats-toast default duration (seats-toast.html:80-83); animate-toast-timer uses the same 3000 ms.
const TOAST_MS = 3000

type SaveToastProps = { notice: Notice | null; onDismiss: () => void; dismissLabel: string }

export function SaveToast({ notice, onDismiss, dismissLabel }: SaveToastProps) {
  const durationMs = useToastAutoClose(notice !== null, TOAST_MS, onDismiss)

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
