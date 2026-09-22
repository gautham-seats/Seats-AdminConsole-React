'use client'

import { Check, Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { api, ApiError } from '@/shared/api'
import { GearworkLoader, Input } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { useDelayedFlag } from '@/shared/ui/use-delayed-flag'
import type { JobOptionDto } from '@/types/operations'

const SEARCH_DELAY_MS = 250

type LookupFieldProps = {
  id: string
  label: string
  placeholder: string
  clearLabel: string
  noResults: string
  permissionDeniedMessage?: string
  // JobScheduleApiController.cs:222 caps some option lists server-side, with nothing on the wire to say so.
  cap?: number
  cappedMessage?: string
  path: string
  query: (text: string) => Record<string, string>
  filterKey?: string
  selectedId: number | null
  text: string
  disabled: boolean
  /** Id of a message about this field, such as a failed description load. */
  describedBy?: string
  onTextChange: (text: string) => void
  onSelect: (option: JobOptionDto | null) => void
}

// Typeahead from Details.cshtml (minLength 0): options load on focus and while typing.
export function LookupField({
  id,
  label,
  placeholder,
  clearLabel,
  noResults,
  permissionDeniedMessage,
  cap,
  cappedMessage,
  path,
  query,
  filterKey,
  selectedId,
  text,
  disabled,
  describedBy,
  onTextChange,
  onSelect,
}: LookupFieldProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<JobOptionDto[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [active, setActive] = useState(0)
  const [committed, setCommitted] = useState(text)
  const queryRef = useRef(query)
  const fetchKey = `${path}\0${text}\0${filterKey ?? ''}`

  useEffect(() => {
    queryRef.current = query
  }, [query])

  useEffect(() => {
    if (!open || loadedKey === fetchKey) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      api
        .get<JobOptionDto[] | null>(path, { query: queryRef.current(text), signal: controller.signal })
        .then(result => {
          if (controller.signal.aborted) return
          setOptions(result ?? [])
          setActive(0)
          setPermissionDenied(false)
          setLoadedKey(fetchKey)
        })
        .catch(error => {
          if (controller.signal.aborted) return
          if (permissionDeniedMessage && error instanceof ApiError && error.status === 403) {
            setPermissionDenied(true)
            setOptions([])
          } else {
            setOptions([])
          }
          setLoadedKey(fetchKey)
        })
    }, SEARCH_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [open, fetchKey, loadedKey, path, text, permissionDeniedMessage])

  const loading = open && loadedKey !== fetchKey
  const showLoader = useDelayedFlag(loading)
  const items = loadedKey === fetchKey ? options : []
  const panelOpen = open && (loading || loadedKey === fetchKey)
  const showList = panelOpen && !loading && !permissionDenied

  const choose = (option: JobOptionDto) => {
    onSelect(option)
    setCommitted(option.description ?? '')
    setOpen(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      if (items.length) setActive(index => Math.min(index + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (items.length) setActive(index => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && showList && items.length) {
      event.preventDefault()
      choose(items[active])
    } else if (event.key === 'Escape' && panelOpen) {
      event.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-500"
      />
      <Input
        id={id}
        role="combobox"
        aria-label={label}
        aria-expanded={panelOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && items.length ? `${listId}-${active}` : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        value={text}
        disabled={disabled}
        placeholder={placeholder}
        onFocus={() => {
          setCommitted(text)
          setOpen(true)
          setLoadedKey(null)
        }}
        onBlur={() => {
          setOpen(false)
          if (text !== committed) onTextChange(committed)
        }}
        onChange={event => {
          onTextChange(event.target.value)
          if (!event.target.value) {
            onSelect(null)
            setCommitted('')
          }
          setActive(0)
          setOpen(true)
          setLoadedKey(null)
        }}
        onKeyDown={onKeyDown}
        className={cn(
          'h-9 w-full bg-white pl-8 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring',
          (text || showLoader) && 'pr-8',
        )}
      />
      {showLoader ? (
        <GearworkLoader
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2 h-5 w-6 -translate-y-1/2"
        />
      ) : text && !disabled ? (
        <button
          type="button"
          aria-label={clearLabel}
          onMouseDown={event => event.preventDefault()}
          onClick={() => {
            onTextChange('')
            onSelect(null)
            setCommitted('')
            setOpen(false)
          }}
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
      {panelOpen ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 animate-rise-in overflow-auto rounded-lg border border-border bg-white p-1 shadow-[0_18px_40px_-20px_rgba(15,23,42,.45)] motion-reduce:animate-none"
        >
          {loading ? (
            <li className="flex justify-center px-3 py-3" role="presentation">
              <GearworkLoader className="h-5 w-6" />
            </li>
          ) : permissionDenied && permissionDeniedMessage ? (
            <li role="presentation" className="px-3 py-2 text-xs text-destructive">
              {permissionDeniedMessage}
            </li>
          ) : items.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-xs text-slate-500">
              {noResults}
            </li>
          ) : (
            items.map((option, index) => (
              <li
                key={option.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.id === selectedId}
                onMouseDown={event => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-3 py-1.5 text-sm text-slate-700',
                  index === active && 'bg-brand/[0.07] text-brand',
                )}
              >
                <span className="min-w-0 flex-1 break-words">{option.description}</span>
                {option.id === selectedId ? <Check aria-hidden className="size-3.5 text-brand" /> : null}
              </li>
            ))
          )}
          {showList && cap && cappedMessage && items.length === cap ? (
            <li role="presentation" className="border-t border-border px-3 py-1.5 text-[11px] text-slate-500">
              {cappedMessage}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
