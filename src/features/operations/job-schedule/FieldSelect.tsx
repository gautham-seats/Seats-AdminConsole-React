'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'

type FieldSelectOption = { value: string; label: string }

type FieldSelectProps = {
  id: string
  /** Accessible name when the control has no visible <label for>. */
  label?: string
  value: string
  options: readonly FieldSelectOption[]
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  className?: string
  onChange: (value: string) => void
}

// Every dropdown on this screen is the shared Radix Select, so the open animation, the focus ring and
// the keyboard behaviour match the rest of the console instead of the browser's native list.
export function FieldSelect({
  id,
  label,
  value,
  options,
  placeholder,
  disabled = false,
  invalid = false,
  describedBy,
  className,
  onChange,
}: FieldSelectProps) {
  return (
    <Select value={value} disabled={disabled} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-9 bg-white font-medium text-slate-800 hover:border-brand/80 data-[state=open]:border-brand data-[state=open]:ring-2 data-[state=open]:ring-brand/20',
          invalid && 'border-destructive/60',
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
