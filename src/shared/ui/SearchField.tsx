'use client'

import { CornerDownLeft, Search, X } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { cn } from './cn'

export type SearchFieldProps = {
  id: string
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  onClear: () => void
  placeholder: string
  submitLabel: string
  clearLabel: string
  showClear: boolean
  className?: string
}

// Submits on Enter or the submit button only, like the legacy list search (swgrid.js:369-374).
export function SearchField({
  id,
  value,
  onValueChange,
  onSubmit,
  onClear,
  placeholder,
  submitLabel,
  clearLabel,
  showClear,
  className,
}: SearchFieldProps) {
  return (
    <div
      role="search"
      className={cn(
        'group relative flex w-full min-w-0 max-w-72 items-center transition-[max-width] duration-300 ease-premium focus-within:max-w-96',
        className,
      )}
    >
      <Search
        aria-hidden
        className="pointer-events-none absolute left-3 size-4 text-muted-foreground transition-[color,transform] duration-300 ease-premium group-focus-within:scale-110 group-focus-within:text-brand"
      />
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        onChange={event => onValueChange(event.target.value)}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            // Enter that commits an IME composition (Japanese, Chinese input) is not a search.
            if (!event.nativeEvent.isComposing) onSubmit()
          }
          // Legacy list search is a plain text box, so Escape must not clear it.
          if (event.key === 'Escape') event.preventDefault()
        }}
        className="field-bloom h-9 w-full rounded-md border border-input bg-white pl-9 pr-24 text-sm shadow-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 [&::-webkit-search-cancel-button]:hidden"
      />
      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className="absolute right-[4.25rem] grid size-6 animate-fade-in place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onSubmit}
        className="absolute right-1.5 inline-flex h-6 items-center gap-1 rounded-sm border border-border bg-muted px-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-brand hover:bg-brand hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CornerDownLeft aria-hidden className="size-3" />
        {submitLabel}
      </button>
    </div>
  )
}
