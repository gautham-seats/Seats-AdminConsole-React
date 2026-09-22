'use client'

import { GraduationCap } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useApiRead } from '@/shared/api'
import { GearworkLoader } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import type { SimpleListItemDto } from '@/types/users'
import { searchStudentsByName, searchStudentsByNumber } from '../case-api'
import { useFixedWindow } from '../workflow-admin/use-fixed-window'

const MIN_LENGTH = 2
const SEARCH_DELAY_MS = 300
// Every option is h-9, so the list can be windowed by a fixed row height.
const OPTION_HEIGHT = 36

type StudentSearchFieldProps = {
  id: string
  label: string
  placeholder: string
  value: string
  onValueChange: (value: string) => void
  onSubmit?: () => void
  disabled?: boolean
}

export function StudentSearchField({
  id,
  label,
  placeholder,
  value,
  onValueChange,
  onSubmit,
  disabled = false,
}: StudentSearchFieldProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [mode, setMode] = useState<'name' | 'number'>('name')

  const load = useCallback(
    (signal: AbortSignal) => {
      const query = value.trim()
      if (query.length < MIN_LENGTH) return Promise.resolve([])
      return (mode === 'number' ? searchStudentsByNumber : searchStudentsByName)(query, signal)
    },
    [mode, value],
  )

  // …student.html:199-242: the lookups are debounced 300 ms; the key only moves once typing pauses.
  const [settled, setSettled] = useState('')
  useEffect(() => {
    const next = value.trim()
    if (next === settled) return
    const timer = window.setTimeout(() => setSettled(next), SEARCH_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [settled, value])
  const readKey =
    open && settled.length >= MIN_LENGTH && settled === value.trim() ? `${mode}:${settled}` : null
  const read = useApiRead(readKey, load)
  const items = read.data ?? []
  const showList = open && value.trim().length >= MIN_LENGTH && read.status !== 'idle'
  const scroller = useRef<HTMLUListElement>(null)
  const optionWindow = useFixedWindow(items.length, OPTION_HEIGHT, scroller)
  const optionId = (index: number) => `${listId}-option-${index}`
  const activeIndex = Math.min(active, items.length - 1)
  const listed = showList && read.status !== 'loading' && items.length > 0

  // Keeps the keyboard-active option scrolled into view, including rows outside the rendered window.
  useEffect(() => {
    const node = scroller.current
    if (!node || activeIndex < 0) return
    const top = activeIndex * OPTION_HEIGHT
    if (top < node.scrollTop) node.scrollTop = top
    else if (top + OPTION_HEIGHT > node.scrollTop + node.clientHeight)
      node.scrollTop = top + OPTION_HEIGHT - node.clientHeight
  }, [activeIndex, listed])

  const choose = (item: SimpleListItemDto) => {
    onValueChange(item.description ?? '')
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
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (listed && activeIndex >= 0) choose(items[activeIndex])
      else onSubmit?.()
    } else if (event.key === 'Escape' && showList) {
      event.stopPropagation()
      setOpen(false)
    }
  }

  const useNumber = /\d/.test(value)

  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <GraduationCap
        aria-hidden
        className="pointer-events-none absolute top-[calc(50%+0.5rem)] left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={listed && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        autoComplete="off"
        disabled={disabled}
        value={value}
        minLength={MIN_LENGTH}
        placeholder={placeholder}
        onFocus={() => {
          setMode(useNumber ? 'number' : 'name')
          setOpen(true)
        }}
        onChange={event => {
          const next = event.target.value
          onValueChange(next)
          setMode(/\d/.test(next) ? 'number' : 'name')
          setOpen(true)
          setActive(0)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        className="h-10 w-full rounded-md border border-input bg-white py-2 pr-3 pl-9 text-sm shadow-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50"
      />
      {showList ? (
        <ul
          id={listId}
          ref={scroller}
          role="listbox"
          aria-label={label}
          onScroll={optionWindow.onScroll}
          className="absolute top-full z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-white py-1 shadow-lg"
        >
          {read.status === 'loading' ? (
            <li role="presentation" className="flex items-center justify-center py-4">
              <GearworkLoader />
            </li>
          ) : items.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-sm text-muted-foreground">
              {placeholder}
            </li>
          ) : (
            <>
              {optionWindow.padTop > 0 ? (
                <li role="presentation" aria-hidden style={{ height: `${optionWindow.padTop}px` }} />
              ) : null}
              {items.slice(optionWindow.start, optionWindow.end).map((item, offset) => {
                const index = optionWindow.start + offset
                const current = index === activeIndex
                return (
                  <li
                    key={item.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={current}
                    aria-setsize={items.length}
                    aria-posinset={index + 1}
                    title={item.description ?? undefined}
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => choose(item)}
                    className={cn(
                      'block h-9 cursor-pointer truncate px-3 text-left text-sm leading-9 transition-colors hover:bg-brand/[0.07]',
                      current && 'bg-brand/[0.07] ring-2 ring-ring ring-inset',
                    )}
                  >
                    {item.description}
                  </li>
                )
              })}
              {optionWindow.padBottom > 0 ? (
                <li role="presentation" aria-hidden style={{ height: `${optionWindow.padBottom}px` }} />
              ) : null}
            </>
          )}
        </ul>
      ) : null}
    </div>
  )
}
