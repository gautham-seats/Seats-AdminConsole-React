'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { useRef } from 'react'
import { Input } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'

// Chrome's native number spinner has no accessible name, appears only on hover, and cannot be
// focused, so it fails the keyboard and icon-label rules. This replaces it with two real buttons.
// Feature-local for now; promote to src/shared/ui when a second area needs it (job-schedule does).
const SPINNER_OFF =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

const STEP_BUTTON =
  'grid h-[17px] w-7 place-items-center text-slate-500 transition-colors duration-200 ease-premium ' +
  'hover:bg-brand/10 hover:text-brand active:bg-brand/15 ' +
  'focus-visible:relative focus-visible:z-10 focus-visible:text-brand focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-ring ' +
  'disabled:pointer-events-none disabled:opacity-40'

type Props = {
  id: string
  value: string
  unit?: string
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  increaseLabel: string
  decreaseLabel: string
  onChange: (value: string) => void
}

/** Whole-number stepper. Int32 cutoffs have no documented min or max, so neither is imposed. */
export function CutoffStepper({
  id,
  value,
  unit,
  disabled = false,
  invalid = false,
  describedBy,
  increaseLabel,
  decreaseLabel,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  // A blank or part-typed value ("-", "1e4") steps from zero rather than producing NaN.
  const step = (delta: number) => {
    const current = Number.parseInt(value, 10)
    onChange(String((Number.isFinite(current) ? current : 0) + delta))
    inputRef.current?.focus()
  }

  return (
    <div
      className={cn(
        'field-bloom relative flex h-9 items-center rounded-md border border-input bg-white shadow-sm',
        'transition-colors focus-within:ring-1 focus-within:ring-ring',
        invalid && 'border-destructive',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <Input
        ref={inputRef}
        id={id}
        type="number"
        inputMode="numeric"
        step={1}
        value={value}
        disabled={disabled}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onChange={event => onChange(event.target.value)}
        className={cn(
          SPINNER_OFF,
          'h-full border-0 bg-transparent pr-1 shadow-none tabular-nums focus-visible:ring-0',
        )}
      />
      {unit ? (
        <span
          aria-hidden
          className="shrink-0 pr-1.5 pl-1 text-xs font-medium whitespace-nowrap text-slate-500"
        >
          {unit}
        </span>
      ) : null}
      {/* Out of the tab order on purpose: the input already steps on Up/Down, so tabbable
          spinners would double every cutoff field's tab stops for no new capability. */}
      <span className="flex h-full shrink-0 flex-col justify-center overflow-hidden rounded-r-md border-l border-input">
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={increaseLabel}
          onClick={() => step(1)}
          className={cn(STEP_BUTTON, 'border-b border-input')}
        >
          <ChevronUp aria-hidden className="size-3.5" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={decreaseLabel}
          onClick={() => step(-1)}
          className={STEP_BUTTON}
        >
          <ChevronDown aria-hidden className="size-3.5" />
        </button>
      </span>
    </div>
  )
}
