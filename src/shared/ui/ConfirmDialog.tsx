'use client'

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from './cn'
import { ButtonSpinner, buttonVariants } from './Button'
import { contentClassName, overlayClassName } from './Dialog'
import { NAV_BAND, NAV_ICON_BOX, NavBandGlow } from './nav-band'

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
          {/* Same band as Dialog, so a confirm reads like every other window. */}
          <div
            className={cn('flex items-center gap-2.5 rounded-t-2xl px-4 py-2.5 pr-12 text-left', NAV_BAND)}
          >
            <NavBandGlow />
            {/* The icon chip every other band carries; a warning when the action cannot be undone. */}
            <span aria-hidden className={cn('grid size-7 shrink-0 place-items-center', NAV_ICON_BOX)}>
              {destructive ? (
                <AlertTriangle className="size-[13px]" />
              ) : (
                <HelpCircle className="size-[13px]" />
              )}
            </span>
            <AlertDialogPrimitive.Title className="min-w-0 text-[16px] leading-[21px] font-bold tracking-[-.005em] text-white">
              {title}
            </AlertDialogPrimitive.Title>
          </div>
          <AlertDialogPrimitive.Description className="px-6 py-5 text-sm leading-6 text-slate-700">
            {message}
          </AlertDialogPrimitive.Description>
          {/* Tab order follows DOM (cancel then confirm); only the narrow layout stacks it visually reversed. */}
          <div className="flex flex-col-reverse gap-2 border-t border-border bg-page/60 px-6 py-4 sm:flex-row sm:justify-end">
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
