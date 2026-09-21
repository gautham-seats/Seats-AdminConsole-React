'use client'

import { cn } from './cn'

export type SwitchProps = {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  className?: string
}

export function Switch({ id, checked, onCheckedChange, label, disabled = false, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-brand' : 'bg-slate-500',
        // Windows High Contrast removes backgrounds, so the state is drawn with system colours there.
        'forced-colors:border-[ButtonText]',
        checked ? 'forced-colors:bg-[Highlight]' : 'forced-colors:bg-[ButtonFace]',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,.3)] transition-transform duration-300 ease-premium forced-colors:bg-[ButtonText]',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}
