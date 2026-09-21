'use client'

import type { LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useApiRead, type ApiError } from '@/shared/api'
import { GearworkLoader } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import type { SimpleListItemDto } from '@/types/users'
import { rankLookupItems } from './lookup-rank'
import { stepIndex } from './lookup-keys'

const SEARCH_DELAY_MS = 250

export type LookupTypeaheadProps = {
  id: string
  label: string
  placeholder: string
  text: string
  icon: LucideIcon
  cacheKey: string
  maxResults: number
  search: (query: string, signal: AbortSignal) => Promise<SimpleListItemDto[]>
  invalid?: boolean
  describedBy?: string
  minLength?: 0 | 1
  // False keeps every server result, for screens that override the typeahead matcher.
  clientFilter?: boolean
  serverOrder?: boolean
  // True for screens with their own focus handler that runs a lookup (UserSecurityLevelPermission/Index.cshtml:119-144).
  searchOnFocus?: boolean
  // False where the legacy widget ignores the Down key (seats-autocomplete.html:458-472).
  arrowOpens?: boolean
  onTextChange: (text: string) => void
  onSelect: (item: SimpleListItemDto) => void
  // Fires on blur when the text differs from the text at focus, like the input's change event.
  onCommit?: () => void
  onError?: (error: ApiError) => void
}

// Bootstrap typeahead binding in legacy: min length 1, selecting sets the id (swapp.js:767-825).
export function LookupTypeahead({
  id,
  label,
  placeholder,
  text,
  icon: Icon,
  cacheKey,
  maxResults,
  search,
  invalid = false,
  describedBy,
  minLength = 1,
  clientFilter = true,
  serverOrder = false,
  searchOnFocus = false,
  arrowOpens = true,
  onTextChange,
  onSelect,
  onCommit,
  onError,
}: LookupTypeaheadProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [query, setQuery] = useState<string | null>(null)
  const [emptyLookup, setEmptyLookup] = useState(false)
  const focusText = useRef('')
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    const timer = setTimeout(
      () => setQuery(!open ? null : emptyLookup ? '' : text.length >= minLength ? text : null),
      SEARCH_DELAY_MS,
    )
    return () => clearTimeout(timer)
  }, [text, open, minLength, emptyLookup])

  const load = useCallback((signal: AbortSignal) => search(query ?? '', signal), [query, search])
  const results = useApiRead(query === null ? null : `${cacheKey}:${query}`, load)
  const ranked = rankLookupItems(results.data ?? [], query ?? '', maxResults, clientFilter, serverOrder)
  // bootstrap3-typeahead.js:126-130 caps an empty lookup only while the box has text.
  const items = query === '' && text !== '' ? ranked.slice(0, maxResults) : ranked
  const showList = open && query !== null
  // bootstrap3-typeahead.js:122-124 hides the menu when a lookup returns nothing.
  const shown = showList && results.status === 'success' && items.length > 0

  // swapp.js:801 has no error callback, so the global ajaxError handler reports failed searches.
  useEffect(() => {
    if (results.status === 'error' && results.error) onErrorRef.current?.(results.error)
  }, [results.status, results.error])

  const choose = (index: number) => {
    const item = items[index]
    if (!item) return
    onSelect(item)
    setOpen(false)
  }

  // bootstrap3-typeahead.js:236-287: keys act on an open menu; Down on a closed one looks up an empty query.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!shown) {
      if (event.key === 'ArrowDown' && minLength === 0 && arrowOpens) {
        setEmptyLookup(true)
        setActive(0)
        setOpen(true)
      }
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(index => stepIndex(index, event.key === 'ArrowDown' ? 1 : -1, items.length))
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      choose(active)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <Icon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        id={id}
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={shown && items[active] ? `${listId}-option-${active}` : undefined}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        onChange={event => {
          onTextChange(event.target.value)
          setEmptyLookup(false)
          setActive(0)
          setOpen(true)
        }}
        onFocus={event => {
          focusText.current = event.currentTarget.value
          // bootstrap3-typeahead.js:301-308 looks up on focus only for min length 0 with an empty box.
          if (searchOnFocus || (minLength === 0 && event.currentTarget.value === '')) {
            setActive(0)
            setOpen(true)
          }
        }}
        onBlur={event => {
          setOpen(false)
          setEmptyLookup(false)
          if (event.currentTarget.value !== focusText.current) onCommit?.()
        }}
        onKeyDown={onKeyDown}
        className={cn(
          'field-bloom h-9 w-full rounded-md border border-input bg-white pr-9 pl-9 text-sm shadow-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none',
          invalid && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
        )}
      />
      {results.status === 'loading' && query !== null ? (
        <GearworkLoader className="absolute top-1/2 right-2 h-5 w-6 -translate-y-1/2" />
      ) : null}
      {shown ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute top-[calc(100%+4px)] right-0 left-0 z-30 max-h-72 animate-menu-in overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-card-lift motion-reduce:animate-none"
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={event => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
              style={{ animationDelay: `${Math.min(index, 12) * 20}ms` }}
              className={cn(
                'animate-item-in cursor-pointer rounded-sm px-2.5 py-1.5 text-sm transition-colors motion-reduce:animate-none',
                index === active ? 'bg-accent text-brand' : 'text-foreground',
              )}
            >
              {item.description}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
