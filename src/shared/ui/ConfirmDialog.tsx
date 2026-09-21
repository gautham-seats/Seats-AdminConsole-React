'use client'

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { useEffect, useRef } from 'react'
import { cn } from './cn'
import { ButtonSpinner, buttonVariants } from './Button'
import { contentClassName, overlayClassName } from './Dialog'

export type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  pending?: boolean
  destructive?: boolean
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  pending = false,
  destructive = true,
}: ConfirmDialogProps) {
  const returnFocus = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (open)
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }, [open])

  return (
    <AlertDialogPrimitive.Root
      open={open}
      onOpenChange={next => {
        if (!pending) onOpenChange(next)
      }}
    >
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className={overlayClassName} />
        <AlertDialogPrimitive.Content
          className={contentClassName}
          onCloseAutoFocus={event => {
            event.preventDefault()
            returnFocus.current?.focus()
          }}
        >
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <AlertDialogPrimitive.Title className="text-lg font-semibold">{title}</AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-sm text-muted-foreground">
              {message}
            </AlertDialogPrimitive.Description>
          </div>
          {/* Tab order follows DOM (cancel then confirm); only the narrow layout stacks it visually reversed. */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogPrimitive.Cancel
              aria-disabled={pending || undefined}
              onClick={pending ? event => event.preventDefault() : undefined}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                pending && 'pointer-events-none opacity-70',
              )}
            >
              {cancelLabel}
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action
              aria-disabled={pending || undefined}
              aria-busy={pending}
              onClick={pending ? event => event.preventDefault() : onConfirm}
              className={cn(
                buttonVariants({ variant: destructive ? 'destructive' : 'default' }),
                pending && 'pointer-events-none opacity-70',
              )}
            >
              {pending ? <ButtonSpinner /> : null}
              {confirmLabel}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  )
}
