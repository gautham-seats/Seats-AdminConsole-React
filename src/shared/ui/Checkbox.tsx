'use client'

import type { MouseEvent } from 'react'
import { cn } from './cn'

export type CheckboxState = boolean | 'mixed'

export type CheckboxProps = {
  checked: CheckboxState
  onCheckedChange: () => void
  label: string
  id?: string
  disabled?: boolean
  className?: string
  title?: string
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  id,
  disabled = false,
  className,
  title,
}: CheckboxProps) {
  const on = checked !== false
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        onCheckedChange()
      }}
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-sm border border-primary bg-white text-white transition-[background-color,transform,box-shadow] duration-200 ease-premium hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100',
        on && 'bg-primary forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]',
        className,
      )}
    >
      {on ? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d={checked === 'mixed' ? 'M5 12h14' : 'M20 6 9 17l-5-5'}
            className="animate-tick motion-reduce:animate-none"
            style={{ strokeDasharray: 22 }}
          />
        </svg>
      ) : null}
    </button>
  )
}
