'use client'

import type { ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from './cn'

export type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  closeLabel: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
  onEscapeKeyDown?: (event: KeyboardEvent) => void
}

export const overlayClassName = 'modal-overlay fixed inset-0 z-50'
export const contentClassName =
  'modal-content fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-lg -translate-x-1/2 overflow-y-auto -translate-y-1/2 gap-4 border border-slate-200/80 bg-background p-6 shadow-[0_0_0_1px_rgba(15,23,42,.04),0_30px_70px_-24px_rgba(15,23,42,.45)] sm:rounded-2xl'

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
  footer,
  className,
  onEscapeKeyDown,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayClassName} />
        <DialogPrimitive.Content
          className={cn(contentClassName, className)}
          onEscapeKeyDown={event => {
            // An open portalled picker takes the Escape; the dialog stays for the next one.
            if (document.querySelector('[data-floating-layer]')) event.preventDefault()
            else onEscapeKeyDown?.(event)
          }}
          // A portalled picker (time panel) is part of the dialog's work, not a click outside it.
          onInteractOutside={event => {
            if ((event.target as Element | null)?.closest?.('[data-floating-layer]')) event.preventDefault()
          }}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className="flex flex-col space-y-1.5 text-center sm:text-left">
            <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-sm text-muted-foreground">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          {children}
          {footer ? (
            // Tab order follows DOM (cancel then confirm); only the narrow layout stacks it visually reversed.
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
          ) : null}
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="absolute right-4 top-4 grid size-7 place-items-center rounded-lg text-slate-500 transition-[background-color,color,rotate] duration-300 ease-premium hover:rotate-90 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
