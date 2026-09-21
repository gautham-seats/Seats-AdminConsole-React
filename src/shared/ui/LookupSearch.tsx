'use client'

import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useId, useState, type KeyboardEvent } from 'react'
import { ERROR_KIND_FALLBACK_ONLY } from './ErrorState'
import { useApiRead } from '../api'
import { cn } from './cn'
import { GearworkLoader } from './loaders'

// `text` is what the input shows once the option is picked; it defaults to the list label.
export type LookupOption = { id: number; label: string; text?: string }

export type LookupSearchProps = {
  id: string
  label: string
  placeholder: string
  clearLabel: string
  cacheKey: string
  minLength: number
  selected: LookupOption | null
  search: (query: string, signal: AbortSignal) => Promise<LookupOption[]>
  onSelect: (option: LookupOption | null) => void
  className?: string
  delayMs?: number
  maxResults?: number
  hideEmptyList?: boolean
  narrowSearchLabel?: string
  // Shown when the search itself fails; the row offers a retry (SL-17).
  errorLabel?: string
  retryLabel?: string
}

const SEARCH_DELAY_MS = 300
const RENDER_CAP = 100
const NARROW_FALLBACK = 'Narrow your search to see more results'

const optionText = (option: LookupOption) => option.text ?? option.label

// Type-ahead that picks one item from a remote search; clearing the text clears the pick.
export function LookupSearch({
  id,
  label,
  placeholder,
  clearLabel,
  cacheKey,
  minLength,
  selected,
  search,
  onSelect,
  className,
  delayMs = SEARCH_DELAY_MS,
  maxResults,
  hideEmptyList = false,
  narrowSearchLabel,
  errorLabel,
  retryLabel,
}: LookupSearchProps) {
  const listId = useId()
  const [text, setText] = useState(selected ? optionText(selected) : '')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActive] = useState(0)
  const [query, setQuery] = useState<string | null>(null)
  const shownText = open ? text : selected ? optionText(selected) : text

  useEffect(() => {
    const timer = setTimeout(() => setQuery(open && text.length >= minLength ? text : null), delayMs)
    return () => clearTimeout(timer)
  }, [text, open, minLength, delayMs])

  const load = useCallback((signal: AbortSignal) => search(query ?? '', signal), [query, search])
  const results = useApiRead(query === null ? null : `${cacheKey}:${query}`, load)
  const all = results.data ?? []
  const base = maxResults === undefined ? all : all.slice(0, maxResults)
  const items = base.slice(0, RENDER_CAP)
  // A shorter answer must not leave the highlight past the end, where Enter would pick nothing.
  const active = Math.min(activeIndex, Math.max(items.length - 1, 0))
  const capped = base.length > RENDER_CAP
  const narrowText = narrowSearchLabel ?? NARROW_FALLBACK
  const failed = open && query !== null && results.status === 'error'
  // The error row lives outside the listbox: a listbox may only hold options (SL-50).
  const showList =
    open && query !== null && results.status === 'success' && (!hideEmptyList || items.length > 0)
  const errorText = errorLabel ?? ERROR_KIND_FALLBACK_ONLY.network.message

  const choose = (option: LookupOption) => {
    onSelect(option)
    setText(optionText(option))
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(index => Math.min(index + 1, Math.max(items.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(index => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && showList && items[active]) {
      event.preventDefault()
      choose(items[active])
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={showList}
        aria-controls={showList ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={showList && items[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={shownText}
        onChange={event => {
          setText(event.target.value)
          setActive(0)
          setOpen(true)
          if (selected) onSelect(null)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="field-bloom h-10 w-full rounded-md border border-input bg-white pr-9 pl-9 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none"
      />
      {results.status === 'loading' && query !== null ? (
        <GearworkLoader className="absolute top-1/2 right-2 h-5 w-6 -translate-y-1/2" />
      ) : shownText ? (
        <button
          type="button"
          aria-label={clearLabel}
          onMouseDown={event => event.preventDefault()}
          onClick={() => {
            setText('')
            onSelect(null)
          }}
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
      {failed ? (
        <div
          role="alert"
          className="absolute top-[calc(100%+4px)] right-0 left-0 z-30 flex animate-menu-in items-center justify-between gap-2 rounded-md border border-border bg-popover px-3.5 py-2.5 text-sm text-red-700 shadow-card-lift motion-reduce:animate-none"
        >
          <span>{errorText}</span>
          {retryLabel ? (
            <button
              type="button"
              onMouseDown={event => event.preventDefault()}
              onClick={results.reload}
              className="rounded-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {retryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute top-[calc(100%+4px)] right-0 left-0 z-30 max-h-72 animate-menu-in overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-card-lift motion-reduce:animate-none"
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(item)}
              className={cn(
                'cursor-pointer rounded-sm px-2.5 py-1.5 text-sm',
                index === active ? 'bg-accent text-brand' : 'text-foreground',
              )}
            >
              {item.label}
            </li>
          ))}
          {capped ? (
            <li className="px-2.5 py-1.5 text-xs text-muted-foreground" role="status">
              {narrowText}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
