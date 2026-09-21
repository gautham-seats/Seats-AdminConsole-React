'use client'

import { ChevronDown, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../cn'

const SETTLE_MS = 420

export type FilterViewTone = 'blue' | 'sky' | 'emerald' | 'amber' | 'rose' | 'slate'

export type FilterView = { id: string; label: string; tone?: FilterViewTone; count?: number | null }

export type FilterChip = { id: string; label: string; value: string; onRemove?: () => void }

export type FilterPanelLabels = {
  title: string
  views: string
  reset: string
  expand: string
  collapse: string
  activeFilters: string
  remove: (chipLabel: string) => string
}

export type FilterPanelProps = {
  labels: FilterPanelLabels
  views?: readonly FilterView[]
  activeView?: string | null
  onViewChange?: (id: string) => void
  chips: readonly FilterChip[]
  canReset: boolean
  onReset: () => void
  defaultCollapsed?: boolean
  gridClassName?: string
  children: ReactNode
}

// Scheduler palette (seats-scheduler-v1 Dashboard cards): primary blue, sky, emerald, amber.
const TONE: Record<FilterViewTone, { dot: string; glow: string }> = {
  blue: { dot: 'bg-blue-600', glow: 'bg-blue-500' },
  sky: { dot: 'bg-sky-500', glow: 'bg-sky-400' },
  emerald: { dot: 'bg-emerald-500', glow: 'bg-emerald-400' },
  amber: { dot: 'bg-amber-500', glow: 'bg-amber-400' },
  rose: { dot: 'bg-rose-500', glow: 'bg-rose-400' },
  slate: { dot: 'bg-slate-400', glow: 'bg-slate-300' },
}

// Polishes the page's own inputs and select triggers without changing them.
const FIELD_POLISH = cn(
  '[&_input:not([type=checkbox],[type=radio])]:h-10 [&_input]:transition-[border-color,box-shadow] [&_input]:duration-200',
  '[&_input:hover]:border-slate-500 [&_input:focus-visible]:border-brand/60 [&_input:focus-visible]:shadow-[0_0_0_4px_rgba(21,102,162,.1)]',
  '[&_button[role=combobox]]:transition-[border-color,box-shadow] [&_button[role=combobox]]:duration-200',
  '[&_button[role=combobox]:hover]:border-slate-500 [&_button[role=combobox]:hover]:shadow-[0_2px_6px_-2px_rgba(15,23,42,.12)]',
  '[&_button[role=combobox][data-state=open]]:border-brand/60 [&_button[role=combobox][data-state=open]]:shadow-[0_0_0_4px_rgba(21,102,162,.1)]',
  '[&_button[data-field-trigger]]:transition-[border-color,box-shadow] [&_button[data-field-trigger]]:duration-200',
  '[&_button[data-field-trigger]:hover]:border-slate-500 [&_button[data-field-trigger]:hover]:shadow-[0_2px_6px_-2px_rgba(15,23,42,.12)]',
  '[&_button[data-field-trigger][data-state=open]]:border-brand/60 [&_button[data-field-trigger][data-state=open]]:shadow-[0_0_0_4px_rgba(21,102,162,.1)]',
)

// Each chip's remove button must name its chip, even when a caller's label ignores it.
function removeName(label: string, chipLabel: string) {
  return label.includes(chipLabel) ? label : `${label} ${chipLabel}`
}

// Each field drifts in one after another when the panel opens.
const EXPAND_STAGGER = cn(
  '[&>*]:animate-field-in motion-reduce:[&>*]:animate-none',
  '[&>*:nth-child(1)]:[animation-delay:90ms] [&>*:nth-child(2)]:[animation-delay:170ms]',
  '[&>*:nth-child(3)]:[animation-delay:250ms] [&>*:nth-child(4)]:[animation-delay:330ms] [&>*:nth-child(n+5)]:[animation-delay:400ms]',
)

export function FilterPanel({
  labels,
  views,
  activeView = null,
  onViewChange,
  chips,
  canReset,
  onReset,
  defaultCollapsed = false,
  gridClassName,
  children,
}: FilterPanelProps) {
  const bodyId = useId()
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [settled, setSettled] = useState(!defaultCollapsed)

  // Pop-ups inside open past the panel edge, so overflow shows only once the open animation ends.
  useEffect(() => {
    if (collapsed) return
    const timer = window.setTimeout(() => setSettled(true), SETTLE_MS)
    return () => window.clearTimeout(timer)
  }, [collapsed])

  const [openCount, setOpenCount] = useState(0)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const chipsRef = useRef<HTMLUListElement>(null)

  // Removing a chip unmounts its button, so focus moves to the next chip, else back to the toggle.
  const removeChip = (index: number, remove: () => void) => {
    const buttons = chipsRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []
    const next = buttons[index + 1] ?? buttons[index - 1]
    remove()
    ;(next ?? toggleRef.current)?.focus()
  }

  const toggle = () => {
    setSettled(false)
    if (collapsed) setOpenCount(count => count + 1)
    setCollapsed(value => !value)
  }

  // Tab order is grouped by logic, matching the visual order: toggle, views, reset, chips, fields.
  return (
    <section
      data-filter-panel=""
      aria-label={labels.title}
      className="relative z-10 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_28px_-18px_rgba(15,23,42,.22)] transition-shadow duration-500 ease-premium hover:shadow-[0_1px_2px_rgba(15,23,42,.05),0_18px_40px_-20px_rgba(15,23,42,.3)] motion-reduce:transition-none"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-4">
        <button
          ref={toggleRef}
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          title={collapsed ? labels.expand : labels.collapse}
          className="group/toggle -ml-1.5 flex h-9 items-center gap-2 rounded-lg px-1.5 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SlidersHorizontal
            aria-hidden
            className="size-4 text-slate-500 transition-[color,transform] duration-500 ease-premium group-hover/toggle:rotate-180 group-hover/toggle:text-brand motion-reduce:transform-none"
          />
          {labels.title}
          {chips.length ? (
            <span
              key={chips.length}
              className="flex h-[18px] min-w-[18px] animate-[badge-in_380ms_cubic-bezier(0.3,1.8,0.5,1)_both] items-center justify-center rounded-full bg-slate-900 px-1 text-[10.5px] font-semibold tabular-nums text-white motion-reduce:animate-none"
            >
              {chips.length}
              <span className="sr-only"> {labels.activeFilters}</span>
            </span>
          ) : null}
          <ChevronDown
            aria-hidden
            className={cn(
              'size-4 text-slate-500 transition-transform duration-500 ease-premium group-hover/toggle:text-slate-600 motion-reduce:transition-none',
              collapsed && '-rotate-90',
            )}
          />
        </button>

        <div className="ml-auto flex min-w-0 max-w-full items-center gap-1.5">
          {views?.length ? (
            <ViewTabs
              label={labels.views}
              views={views}
              activeView={activeView}
              onViewChange={onViewChange}
            />
          ) : null}
          <button
            type="button"
            onClick={canReset ? onReset : undefined}
            aria-disabled={!canReset}
            aria-label={labels.reset}
            title={labels.reset}
            className="group/reset flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-[background-color,color,opacity] duration-200 hover:bg-slate-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95 aria-disabled:cursor-default aria-disabled:opacity-35 aria-disabled:hover:bg-transparent aria-disabled:hover:text-slate-500"
          >
            <RotateCcw
              aria-hidden
              className="size-4 transition-transform duration-700 ease-premium group-hover/reset:-rotate-[270deg] motion-reduce:transition-none"
            />
          </button>
        </div>
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-500 ease-premium motion-reduce:transition-none',
          collapsed && chips.length ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul
            ref={chipsRef}
            aria-label={labels.activeFilters}
            className="flex flex-wrap gap-1.5 border-t border-slate-100 px-3 py-2.5 sm:px-4"
            inert={!collapsed}
          >
            {collapsed
              ? chips.map((chip, index) => (
                  <li
                    key={chip.id}
                    className="animate-rise-in motion-reduce:animate-none"
                    style={{ animationDelay: `${120 + index * 45}ms` }}
                  >
                    <Chip
                      chip={chip}
                      removeLabel={removeName(labels.remove(chip.label), chip.label)}
                      onRemove={chip.onRemove ? () => removeChip(index, chip.onRemove!) : undefined}
                    />
                  </li>
                ))
              : null}
          </ul>
        </div>
      </div>

      <div
        id={bodyId}
        className={cn(
          'grid transition-[grid-template-rows] duration-500 ease-premium motion-reduce:transition-none',
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
        )}
        inert={collapsed}
      >
        <div
          className={cn('@container min-h-0', settled && !collapsed ? 'overflow-visible' : 'overflow-hidden')}
        >
          <div
            key={openCount}
            className={cn(
              'grid grid-cols-1 items-end gap-x-4 gap-y-3 border-t border-slate-100 px-3 pt-3 pb-3.5 sm:px-4',
              collapsed
                ? '-translate-y-2 opacity-0 blur-[2px] transition-[opacity,transform,filter] duration-500 ease-premium motion-reduce:transition-none'
                : 'opacity-100',
              !collapsed && openCount > 0 && EXPAND_STAGGER,
              FIELD_POLISH,
              gridClassName,
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}

type ViewTabsProps = {
  label: string
  views: readonly FilterView[]
  activeView: string | null
  onViewChange?: (id: string) => void
}

function ViewTabs({ label, views, activeView, onViewChange }: ViewTabsProps) {
  const refs = useRef(new Map<string, HTMLButtonElement>())
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const button = activeView ? refs.current.get(activeView) : undefined
      const next = button ? { left: button.offsetLeft, width: button.offsetWidth } : null
      setIndicator(current =>
        current?.left === next?.left && current?.width === next?.width ? current : next,
      )
    }
    measure()
    // Labels arrive from resources after the first paint, so the pill follows the tab as it grows.
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    refs.current.forEach(button => observer.observe(button))
    return () => observer.disconnect()
  }, [activeView, views])

  return (
    <div role="group" aria-label={label} className="min-w-0 overflow-x-auto py-0.5">
      <div className="relative flex w-max items-center gap-0.5 rounded-[10px] bg-slate-100/80 p-1 ring-1 ring-inset ring-slate-900/[.04]">
        {indicator ? (
          <span
            aria-hidden
            className="absolute top-1 bottom-1 left-0 rounded-md bg-white shadow-[0_1px_2px_rgba(15,23,42,.08),0_3px_10px_-4px_rgba(15,23,42,.18)] ring-1 ring-slate-900/[.06] transition-[transform,width] duration-500 ease-premium motion-reduce:transition-none"
            style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
          />
        ) : null}
        {views.map(view => {
          const active = view.id === activeView
          const tone = TONE[view.tone ?? 'slate']
          return (
            <button
              key={view.id}
              ref={node => {
                if (node) refs.current.set(view.id, node)
                else refs.current.delete(view.id)
              }}
              type="button"
              aria-pressed={active}
              onClick={() => onViewChange?.(view.id)}
              className={cn(
                'group/view relative z-10 inline-flex h-7 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'text-foreground' : 'text-slate-600 hover:text-foreground',
              )}
            >
              <span aria-hidden className="relative flex size-2 items-center justify-center">
                {active ? (
                  <span
                    className={cn(
                      'absolute inset-0 animate-breathe rounded-full motion-reduce:animate-none',
                      tone.glow,
                    )}
                  />
                ) : null}
                <span
                  className={cn(
                    'relative size-1.5 rounded-full transition-[transform,opacity] duration-300 ease-premium',
                    tone.dot,
                    active
                      ? 'scale-110'
                      : 'opacity-70 group-hover/view:scale-125 group-hover/view:opacity-100',
                  )}
                />
              </span>
              {view.label}
              {typeof view.count === 'number' ? (
                <span
                  key={view.count}
                  className="animate-fade-in rounded-full bg-slate-900/[.06] px-1.5 text-[11px] font-semibold tabular-nums text-slate-600"
                >
                  {view.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Chip({
  chip,
  removeLabel,
  onRemove,
}: {
  chip: FilterChip
  removeLabel: string
  onRemove?: () => void
}) {
  return (
    <span className="lift-chip inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 pr-1 pl-2.5 text-xs text-slate-700 hover:border-slate-300 hover:bg-white">
      <span className="text-slate-500">{chip.label}</span>
      <span className="font-semibold tabular-nums text-foreground">{chip.value}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="flex size-5 items-center justify-center rounded-full text-slate-500 transition-[background-color,color,transform] duration-300 ease-premium hover:rotate-90 hover:bg-slate-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90 motion-reduce:transform-none"
        >
          <X aria-hidden className="size-3" />
        </button>
      ) : (
        <span aria-hidden className="w-1.5" />
      )}
    </span>
  )
}
