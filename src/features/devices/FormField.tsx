import type { ReactNode } from 'react'
import { Label } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'

type FormFieldProps = {
  id: string
  label: string
  error: string | null
  required?: boolean
  children: ReactNode
}

export function FormField({ id, label, error, required = false, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        htmlFor={id}
        className={cn(
          'text-[13px] font-medium text-slate-700',
          required && "after:ml-0.5 after:text-destructive after:content-['*']",
        )}
      >
        {label}
      </Label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="animate-rise-in text-xs font-medium text-destructive motion-reduce:animate-none"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
