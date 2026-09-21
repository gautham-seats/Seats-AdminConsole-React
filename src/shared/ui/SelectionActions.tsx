'use client'

import { X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from './cn'

type Tone = 'destructive' | 'brand' | 'outline'

const BASE = [
  'group/sel relative isolate inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-lg px-3.5',
  'text-sm font-semibold whitespace-nowrap outline-none select-none',
  'transition-[background-color,color,box-shadow,transform,filter] duration-300 ease-premium',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-premium',
  "after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-1/2 after:-skew-x-12 after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent)] after:content-['']",
  'motion-reduce:transition-none motion-reduce:after:hidden',
].join(' ')

const ENABLED = [
  'cursor-pointer after:translate-x-[260%] after:transition-transform after:duration-700 after:ease-out',
  'hover:-translate-y-px active:translate-y-0 active:scale-[.97] active:brightness-95 active:duration-100',
  'motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100',
].join(' ')

const DISABLED =
  'cursor-not-allowed bg-slate-100 text-slate-500 shadow-[inset_0_0_0_1px_rgba(148,163,184,.25)] after:-translate-x-full after:duration-0'

const TONES: Record<Tone, string> = {
  destructive:
    'bg-linear-to-b from-red-600 to-red-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_1px_2px_rgba(127,29,29,.25),0_4px_12px_-6px_rgba(220,38,38,.55)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_2px_4px_rgba(127,29,29,.2),0_10px_20px_-8px_rgba(220,38,38,.6)] hover:[&_svg]:-rotate-12',
  brand:
    'bg-[linear-gradient(180deg,#2a7fbd_0%,#1566a2_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_1px_2px_rgba(15,23,42,.15),0_4px_12px_-6px_rgba(21,102,162,.55)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,.25),0_2px_4px_rgba(15,23,42,.12),0_10px_20px_-8px_rgba(21,102,162,.6)]',
  outline:
    'bg-white text-brand shadow-[inset_0_0_0_1px_rgba(21,102,162,.35),0_1px_2px_rgba(15,23,42,.06)] after:bg-[linear-gradient(90deg,transparent,rgba(21,102,162,.12),transparent)] hover:bg-brand/[0.05] hover:shadow-[inset_0_0_0_1px_rgba(21,102,162,.6),0_6px_14px_-8px_rgba(21,102,162,.45)]',
}

// Class for an action that stays in place, greyed out until rows are selected, and lights up with a sheen.
export function selectionButtonClass(active: boolean, tone: Tone = 'destructive', className?: string) {
  return cn(BASE, active ? cn(TONES[tone], ENABLED) : DISABLED, className)
}

type SelectionActionsProps = {
  count: number
  selectedLabel: string
  clearLabel: string
  onClear: () => void
  children?: ReactNode
  divider?: boolean
  /** False when the screen places SelectionClear itself. */
  showClear?: boolean
  groupLabel?: string
  className?: string
}

// Clear on its own, for bars that place it away from the selection chip.
export function SelectionClear({
  active,
  label,
  onClear,
}: {
  active: boolean
  label: string
  onClear: () => void
}) {
  return (
    <button
      type="button"
      onClick={active ? onClear : undefined}
      aria-disabled={!active}
      className={cn(
        'group/clear inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium outline-none',
        'transition-[background-color,color,opacity] duration-300 ease-premium focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
        '[&_svg]:size-4 [&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-premium',
        active
          ? 'cursor-pointer text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:[&_svg]:rotate-90 active:[&_svg]:scale-90'
          : 'cursor-not-allowed text-slate-300',
      )}
    >
      <X aria-hidden />
      {label}
    </button>
  )
}

// Always-visible selection chip, Clear and the given actions; nothing moves, only state and colour change.
export function SelectionActions({
  count,
  selectedLabel,
  clearLabel,
  onClear,
  children,
  divider = false,
  showClear = true,
  groupLabel,
  className,
}: SelectionActionsProps) {
  const active = count > 0
  const [seen, setSeen] = useState({ count, direction: 'up' as 'up' | 'down' })
  if (seen.count !== count) setSeen({ count, direction: count > seen.count ? 'up' : 'down' })
  const direction = seen.count !== count ? (count > seen.count ? 'up' : 'down') : seen.direction

  return (
    <div
      role="group"
      aria-label={groupLabel ?? selectedLabel}
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      <span
        aria-live="polite"
        className={cn(
          'relative inline-flex h-8 min-w-[7rem] items-center justify-center gap-2 overflow-hidden rounded-full px-3 text-xs font-semibold tabular-nums',
          'transition-[background-color,color,box-shadow] duration-300 ease-premium motion-reduce:transition-none',
          active
            ? 'bg-brand/[0.08] text-brand shadow-[inset_0_0_0_1px_rgba(21,102,162,.25),0_0_0_4px_rgba(21,102,162,.06)]'
            : 'bg-slate-50 text-slate-500 shadow-[inset_0_0_0_1px_rgba(148,163,184,.3)]',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'size-1.5 rounded-full transition-[background-color,transform,box-shadow] duration-300 ease-premium',
            active ? 'scale-100 bg-brand shadow-[0_0_0_3px_rgba(21,102,162,.18)]' : 'scale-75 bg-slate-300',
          )}
        />
        <span className="relative inline-flex h-[1.5em] items-center overflow-hidden">
          <span
            key={count}
            className={cn(
              'inline-block motion-reduce:animate-none',
              direction === 'up'
                ? 'animate-[sel-count-up_320ms_var(--ease-premium)_both]'
                : 'animate-[sel-count-down_320ms_var(--ease-premium)_both]',
            )}
          >
            {selectedLabel}
          </span>
        </span>
      </span>
      {showClear ? <SelectionClear active={active} label={clearLabel} onClear={onClear} /> : null}
      {children}
      {divider ? <span aria-hidden className="mx-1 h-6 w-px bg-border" /> : null}
    </div>
  )
}
