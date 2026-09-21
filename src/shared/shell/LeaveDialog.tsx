'use client'

import { useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { registerLeaveDialog } from './use-leave-guard'

export const LEAVE_EN = {
  title: 'Unsaved changes',
  message: 'You have unsaved changes. Leave this page?',
  stay: 'Stay on page',
  leave: 'Leave page',
}

// Styled replacement for the browser confirm when a form with unsaved changes is left.
export function LeaveDialog() {
  const [message, setMessage] = useState<string | null>(null)
  const resolver = useRef<((leave: boolean) => void) | null>(null)

  useEffect(() => {
    registerLeaveDialog(
      text =>
        new Promise<boolean>(resolve => {
          resolver.current?.(false)
          resolver.current = resolve
          setMessage(text)
        }),
    )
    return () => registerLeaveDialog(null)
  }, [])

  const finish = (leave: boolean) => {
    resolver.current?.(leave)
    resolver.current = null
    setMessage(null)
  }

  return (
    <ConfirmDialog
      open={message !== null}
      onOpenChange={open => {
        if (!open) finish(false)
      }}
      title={LEAVE_EN.title}
      message={message ?? ''}
      confirmLabel={LEAVE_EN.leave}
      cancelLabel={LEAVE_EN.stay}
      onConfirm={() => finish(true)}
    />
  )
}
