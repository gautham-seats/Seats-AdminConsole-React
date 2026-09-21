'use client'

import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/shared/ui/cn'

export type Choice = { value: string; label: string }

type ChoiceGroupProps = {
  id: string
  label: string
  labelledBy?: string
  value: string | null
  choices: readonly Choice[]
  disabled?: boolean
  onChange: (value: string) => void
}

// Segmented radio group with a sliding highlight; arrow keys move between choices.
export function ChoiceGroup({
  id,
  label,
  labelledBy,
  value,
  choices,
  disabled = false,
  onChange,
}: ChoiceGroupProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = choices.findIndex(choice => choice.value === value)
  const focusIndex = selectedIndex < 0 ? 0 : selectedIndex

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0
    if (!step) return
    event.preventDefault()
    const next = (index + step + choices.length) % choices.length
    onChange(choices[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-disabled={disabled || undefined}
      className={cn(
        'relative inline-grid w-full max-w-md auto-cols-fr grid-flow-col rounded-lg border border-border bg-page p-1',
        disabled && 'opacity-60',
      )}
    >
      {selectedIndex >= 0 ? (
        <span
          aria-hidden
          className="absolute inset-y-1 rounded-md bg-white shadow-sm ring-1 ring-brand/25 transition-[left] duration-300 ease-premium motion-reduce:transition-none"
          style={{
            width: `calc((100% - 0.5rem) / ${choices.length})`,
            left: `calc(0.25rem + (100% - 0.5rem) / ${choices.length} * ${selectedIndex})`,
          }}
        />
      ) : null}
      {choices.map((choice, index) => {
        const checked = choice.value === value
        return (
          <button
            key={choice.value}
            ref={element => {
              refs.current[index] = element
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === focusIndex ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(choice.value)}
            onKeyDown={event => onKeyDown(event, index)}
            className={cn(
              'relative h-8 rounded-md px-3 text-[13px] font-semibold transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed',
              checked ? 'text-brand' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {choice.label}
          </button>
        )
      })}
    </div>
  )
}
