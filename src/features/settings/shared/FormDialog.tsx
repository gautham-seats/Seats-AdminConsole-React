'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { CircleAlert, X, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/ui/cn'
import { NAV_BAND, NAV_ICON_BOX, NavBandGlow } from '@/shared/ui/nav-band'

type FormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  icon: LucideIcon
  title: string
  hint?: string
  closeLabel: string
  footer: ReactNode
  busy?: boolean
  error?: string | null
  className?: string
  onSubmit: () => void
  children: ReactNode
}

// Dialog with the nav-bar blue header used by every Settings add/edit form.
export function FormDialog({
  open,
  onOpenChange,
  icon: Icon,
  title,
  hint,
  closeLabel,
  footer,
  busy = false,
  error = null,
  className,
  onSubmit,
  children,
}: FormDialogProps) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={next => {
        if (!busy) onOpenChange(next)
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={event => event.preventDefault()}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-3rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-dialog outline-none data-[state=open]:animate-zoom-in motion-reduce:animate-none',
            className,
          )}
        >
          <form
            noValidate
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={event => {
              event.preventDefault()
              onSubmit()
            }}
          >
            <div
              className={cn(
                'relative flex shrink-0 items-center gap-2.5 rounded-t-2xl px-4 py-2.5',
                NAV_BAND,
              )}
            >
              <NavBandGlow />
              <span className={cn('grid size-7 shrink-0 place-items-center', NAV_ICON_BOX)}>
                <Icon aria-hidden className="size-[13px]" />
              </span>
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="text-[14.5px] leading-[19px] font-bold tracking-[-.005em] text-white">
                  {title}
                </DialogPrimitive.Title>
                {hint ? (
                  <p className="text-[11.5px] leading-[15px] font-medium text-white/85">{hint}</p>
                ) : null}
              </div>
              <DialogPrimitive.Close
                type="button"
                disabled={busy}
                aria-label={closeLabel}
                className="grid size-8 place-items-center rounded-md text-white/80 transition-[background-color,color,transform] hover:rotate-90 hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none disabled:opacity-50"
              >
                <X aria-hidden className="size-4" />
              </DialogPrimitive.Close>
            </div>
            <div className="min-h-0 flex-1 divide-y divide-border/70 overflow-auto">
              {error ? (
                <p
                  role="alert"
                  className="flex animate-rise-in items-start gap-2.5 bg-red-50 px-5 py-3 text-sm whitespace-pre-line text-red-900 motion-reduce:animate-none"
                >
                  <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-red-600" />
                  {error}
                </p>
              ) : null}
              {children}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-slate-50/80 px-5 py-3">
              {footer}
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
