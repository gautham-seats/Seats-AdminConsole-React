'use client'

import { CircleAlert, Hourglass, X } from 'lucide-react'
import { useEffect } from 'react'
import { autoCloseMessages, STILL_TIMER_MS } from './accessibility-prefs'
import { cn } from './cn'
import { announceSaveSuccess } from './feedback-bus'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export type ToastProps = {
  id: number
  tone: ToastTone
  message: string
  durationMs: number
  dismissLabel: string
  onDismiss: () => void
  placement?: 'floating' | 'inline'
}

// Closes an open message after `durationMs` unless the Accessibility Settings keep messages open; returns
// the timer-bar duration so the bar and the close agree. One place for every toast host.
export function useToastAutoClose(open: boolean, durationMs: number, onDismiss: () => void): number {
  const auto = autoCloseMessages()
  useEffect(() => {
    if (!open || !auto) return
    const timer = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(timer)
  }, [open, auto, durationMs, onDismiss])
  return auto ? durationMs : STILL_TIMER_MS
}

const TONES = {
  success: {
    ring: 'bg-emerald-50 text-emerald-600 ring-emerald-200/70',
    bar: 'from-emerald-400 to-emerald-600',
  },
  error: { ring: 'bg-red-50 text-red-600 ring-red-200/70', bar: 'from-red-400 to-red-600' },
  info: { ring: 'bg-slate-100 text-slate-500 ring-slate-200/80', bar: 'from-slate-300 to-slate-500' },
  warning: { ring: 'bg-amber-50 text-amber-700 ring-amber-200/70', bar: 'from-amber-300 to-amber-500' },
} as const

// One toast look for every screen: frosted card, drawn tick, draining timer.
export function Toast({
  id,
  tone,
  message,
  durationMs,
  dismissLabel,
  onDismiss,
  placement = 'floating',
}: ToastProps) {
  useEffect(() => {
    if (tone === 'success') announceSaveSuccess()
  }, [id, tone])

  const card = (
    <div
      key={id}
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto relative flex max-w-lg animate-[toast-in_520ms_cubic-bezier(0.34,1.4,0.64,1)_both] items-center gap-3 overflow-hidden rounded-2xl border border-white/70 bg-white/90 py-3 pr-2 pl-3 text-sm text-slate-800 shadow-[0_0_0_1px_rgba(15,23,42,.06),0_22px_44px_-18px_rgba(15,23,42,.45)] backdrop-blur-xl motion-reduce:animate-none',
        placement === 'inline' && 'max-w-none',
      )}
    >
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-full ring-1', TONES[tone].ring)}>
        {tone === 'success' ? (
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              d="M20 6 9 17l-5-5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-[tick_520ms_180ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
              style={{ strokeDasharray: 22 }}
            />
          </svg>
        ) : tone === 'error' || tone === 'warning' ? (
          <CircleAlert aria-hidden className="size-4" />
        ) : (
          <Hourglass aria-hidden className="size-4" />
        )}
      </span>
      <span className="flex-1 font-medium">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        className="lift-icon grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <X aria-hidden className="size-4" />
      </button>
      <span
        aria-hidden
        style={{ animationDuration: `${durationMs}ms` }}
        className={cn(
          'absolute inset-x-0 bottom-0 h-[3px] origin-left animate-toast-timer bg-gradient-to-r motion-reduce:hidden',
          TONES[tone].bar,
        )}
      />
    </div>
  )

  if (placement === 'inline') return card
  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">{card}</div>
  )
}
