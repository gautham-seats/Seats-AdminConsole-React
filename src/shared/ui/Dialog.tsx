'use client'

import type { ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from './cn'
import { NAV_BAND, NavBandGlow } from './nav-band'

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
  'modal-content fixed left-1/2 top-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-lg -translate-x-1/2 overflow-y-auto -translate-y-1/2 gap-0 overflow-hidden border border-slate-900/20 bg-background shadow-[0_0_0_1px_rgba(15,23,42,.06),0_30px_70px_-24px_rgba(15,23,42,.45)] sm:rounded-2xl'

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
          {/* The same band as the nav bar and the card headers, so a dialog is titled like every other surface. */}
          <div
            className={cn(
              'flex flex-col justify-center gap-0.5 rounded-t-2xl px-5 py-3 pr-12 text-left',
              NAV_BAND,
            )}
          >
            <NavBandGlow />
            <DialogPrimitive.Title className="text-[16px] leading-[21px] font-bold tracking-[-.005em] text-white">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-[12.5px] leading-[17px] font-medium text-white/85">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <div className="grid gap-4 p-6">{children}</div>
          {footer ? (
            // Tab order follows DOM (cancel then confirm); only the narrow layout stacks it visually reversed.
            <div className="flex flex-col-reverse gap-2 border-t border-border bg-page/60 px-6 py-4 sm:flex-row sm:justify-end">
              {footer}
            </div>
          ) : null}
          <DialogPrimitive.Close
            aria-label={closeLabel}
            className="absolute top-3.5 right-3.5 grid size-8 place-items-center rounded-lg text-white/85 transition-[background-color,color,rotate] duration-300 ease-premium hover:rotate-90 hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <X aria-hidden className="h-4 w-4" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
