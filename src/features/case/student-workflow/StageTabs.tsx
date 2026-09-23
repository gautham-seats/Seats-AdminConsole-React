'use client'

import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/shared/ui/cn'

export type StageTab = {
  id: string
  stageId: number | null
  label: string
  count: number | null
}

type StageTabsProps = {
  label: string
  tabs: readonly StageTab[]
  activeId: string
  panelId: string
  onSelect: (tab: StageTab) => void
}

const TAB = cn(
  'relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-medium whitespace-nowrap outline-none',
  'border border-border bg-white text-muted-foreground shadow-sm',
  'transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-premium',
  'hover:-translate-y-px hover:border-brand/40 hover:bg-brand/[0.05] hover:text-foreground',
  'active:translate-y-0 active:scale-[.98] active:duration-100',
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'motion-reduce:transform-none motion-reduce:transition-none',
)

const TAB_ACTIVE =
  'border-brand bg-brand/[0.08] text-brand shadow-[inset_0_0_0_1px_var(--color-brand),0_1px_2px_rgba(15,23,42,.08)]'

// APG tablist: the buttons are direct children of the tablist, focus roves, activation follows focus.
export function StageTabs({ label, tabs, activeId, panelId, onSelect }: StageTabsProps) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  const move = (event: KeyboardEvent<HTMLButtonElement>, from: number) => {
    const last = tabs.length - 1
    let next = from
    if (event.key === 'ArrowRight') next = from === last ? 0 : from + 1
    else if (event.key === 'ArrowLeft') next = from === 0 ? last : from - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else return
    event.preventDefault()
    const tab = tabs[next]
    if (!tab) return
    onSelect(tab)
    buttons.current[next]?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      className="-mx-1 flex flex-wrap items-center gap-2 px-1 pb-3"
    >
      {tabs.map((tab, index) => {
        const active = tab.id === activeId
        return (
          <button
            key={tab.id}
            ref={element => {
              buttons.current[index] = element
            }}
            type="button"
            role="tab"
            id={`${panelId}-tab-${tab.id}`}
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            onKeyDown={event => move(event, index)}
            onClick={() => onSelect(tab)}
            className={cn(TAB, active && TAB_ACTIVE)}
          >
            {tab.label}
            {tab.count === null ? null : (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums transition-colors duration-200',
                  active ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
