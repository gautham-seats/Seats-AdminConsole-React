'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronsUpDown, Minus, Search } from 'lucide-react'
import { useState } from 'react'
import { fold } from '@/shared/i18n/fold'
import { cn } from './cn'

export type MultiSelectOption = { value: string; label: string }

export type MultiSelectProps = {
  id: string
  options: readonly MultiSelectOption[]
  value: readonly string[]
  onChange: (value: string[]) => void
  labels: {
    all: string
    placeholder: string
    selected: (count: number) => string
    // Shown when more options match than are drawn; the filter box takes its placeholder from `placeholder`.
    narrowSearch?: string
  }
  /** Accessible name when no visible label points at the trigger. */
  label?: string
  /** Id of the visible label element that names the trigger. */
  labelledBy?: string
  disabled?: boolean
  className?: string
}

const ITEM_CLASS =
  'flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 text-sm outline-none transition-[background-color,box-shadow] duration-150 focus:bg-brand/[.07] focus:shadow-[inset_3px_0_0_var(--color-brand)] motion-reduce:transition-none'

const RENDER_CAP = 100
// A filter box appears from this many options, so every option stays reachable (SL-16).
const FILTER_FROM = 12

function Tick({ state }: { state: boolean | 'mixed' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors duration-150',
        state ? 'border-brand bg-brand text-white' : 'border-slate-500 bg-white',
      )}
    >
      {state === 'mixed' ? <Minus className="size-3" /> : state ? <Check className="size-3" /> : null}
    </span>
  )
}

// Checkbox list with an "All" row, for filters that accept several ids.
export function MultiSelect({
  id,
  options,
  value,
  onChange,
  labels,
  label,
  labelledBy,
  disabled,
  className,
}: MultiSelectProps) {
  const [filter, setFilter] = useState('')
  const chosen = new Set(value)
  const summary = chosen.size === 0 ? labels.placeholder : labels.selected(chosen.size)
  const term = fold(filter.trim())
  const matching = term ? options.filter(option => fold(option.label).includes(term)) : options
  const visible = matching.slice(0, RENDER_CAP)
  // With a filter typed, "All" means every option that matches it, not the whole list.
  const pool = term ? matching : options
  const chosenInPool = pool.filter(option => chosen.has(option.value)).length
  const allState: boolean | 'mixed' =
    pool.length > 0 && chosenInPool === pool.length ? true : chosenInPool > 0 ? 'mixed' : false
  const capped = matching.length > RENDER_CAP
  const filterable = options.length >= FILTER_FROM
  const narrowText = labels.narrowSearch ?? labels.placeholder

  const toggle = (option: string) =>
    onChange(chosen.has(option) ? value.filter(item => item !== option) : [...value, option])

  return (
    <DropdownMenu.Root
      modal={false}
      onOpenChange={open => {
        if (!open) setFilter('')
      }}
    >
      <DropdownMenu.Trigger
        id={id}
        data-field-trigger=""
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        disabled={disabled}
        className={cn(
          'field-bloom flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3 text-left text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          chosen.size === 0 && 'text-muted-foreground',
          className,
        )}
      >
        <span className="min-w-0 truncate">{summary}</span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 opacity-50" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 max-h-80 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-lg border border-slate-200/80 bg-popover p-1 shadow-float data-[state=open]:animate-[picker-in_380ms_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
        >
          {filterable ? (
            <div className="relative mb-1 px-1 pt-0.5">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={filter}
                aria-label={labels.placeholder}
                placeholder={labels.placeholder}
                autoComplete="off"
                // The menu's own typeahead and arrow handling must not swallow typing; Escape still closes.
                onKeyDown={event => {
                  if (event.key !== 'Escape') event.stopPropagation()
                }}
                onChange={event => setFilter(event.target.value)}
                className="field-bloom h-8 w-full rounded-md border border-input bg-white pr-2 pl-8 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
              />
            </div>
          ) : null}
          <DropdownMenu.CheckboxItem
            checked={allState === 'mixed' ? 'indeterminate' : allState}
            onSelect={event => event.preventDefault()}
            onCheckedChange={() =>
              onChange(
                allState === true
                  ? value.filter(item => !pool.some(option => option.value === item))
                  : [...new Set([...value, ...pool.map(option => option.value)])],
              )
            }
            className={cn(ITEM_CLASS, 'font-medium')}
          >
            <Tick state={allState} />
            {labels.all}
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
          {visible.map(option => (
            <DropdownMenu.CheckboxItem
              key={option.value}
              checked={chosen.has(option.value)}
              onSelect={event => event.preventDefault()}
              onCheckedChange={() => toggle(option.value)}
              title={option.label}
              className={cn(ITEM_CLASS, 'data-[state=checked]:text-foreground')}
            >
              <Tick state={chosen.has(option.value)} />
              <span className="min-w-0 truncate">{option.label}</span>
            </DropdownMenu.CheckboxItem>
          ))}
          {capped ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground" role="status">
              {narrowText}
            </p>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
