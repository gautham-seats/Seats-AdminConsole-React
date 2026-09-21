'use client'

import type { ReactNode } from 'react'
import { cn } from '@/shared/ui/cn'

type ToggleRowProps = {
  id: string
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  children?: ReactNode
}

// A labelled on/off switch row; children appear under it while it is on.
export function ToggleRow({
  id,
  label,
  hint,
  checked,
  disabled = false,
  onChange,
  children,
}: ToggleRowProps) {
  return (
    <div className="px-5 py-3.5 transition-colors duration-200 focus-within:bg-brand/[0.02]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <label htmlFor={id} className="text-[13.5px] leading-5 font-semibold text-slate-800">
            {label}
          </label>
          {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
        </div>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ease-premium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            checked ? 'bg-brand shadow-[inset_0_1px_2px_rgba(0,0,0,.2)]' : 'bg-slate-200',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(.3,1.6,.5,1)] motion-reduce:transition-none',
              checked && 'translate-x-5',
            )}
          />
        </button>
      </div>
      {checked && children ? (
        <div className="mt-3 animate-rise-in border-l-2 border-brand/25 pl-4 motion-reduce:animate-none">
          {children}
        </div>
      ) : null}
    </div>
  )
}
