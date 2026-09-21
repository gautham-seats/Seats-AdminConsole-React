import type { ReactNode } from 'react'
import { cn } from './cn'

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONES: Record<StatusTone, { box: string; dot: string }> = {
  success: { box: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15', dot: 'bg-emerald-500' },
  warning: { box: 'bg-amber-50 text-amber-800 ring-amber-600/20', dot: 'bg-amber-500' },
  danger: { box: 'bg-red-50 text-red-700 ring-red-600/15', dot: 'bg-red-500' },
  info: { box: 'bg-sky-50 text-sky-700 ring-sky-600/15', dot: 'bg-sky-500' },
  neutral: { box: 'bg-slate-100 text-slate-600 ring-slate-500/15', dot: 'bg-slate-400' },
}

// Status pill with a glowing dot; one look for Yes/No, Active and state labels on every page.
export function StatusBadge({
  tone,
  children,
  pulse = false,
  className,
}: {
  tone: StatusTone
  children: ReactNode
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
        TONES[tone].box,
        className,
      )}
    >
      <span className="relative flex size-1.5">
        {pulse ? (
          <span
            aria-hidden
            className={cn(
              'absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:animate-none',
              TONES[tone].dot,
            )}
          />
        ) : null}
        <span aria-hidden className={cn('relative size-1.5 rounded-full', TONES[tone].dot)} />
      </span>
      {children}
    </span>
  )
}
