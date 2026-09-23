'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../cn'
import { NAV_BAND } from '../nav-band'
import { addDays, beforeDay, RangeCalendar, sameDay } from './RangeCalendar'

export type DateRangeLabels = {
  dateRange: string
  startDate: string
  endDate: string
  close: string
  cancel: string
  selectRange: string
  chooseMonthYear: string
  previous: string
  next: string
  today: string
  last7Days: string
  last14Days: string
  last30Days: string
  // Announced when picking a start date after the end date moves the end date too.
  endMoved?: string
}

// Used until callers pass the endMoved resource word.
export const DATE_RANGE_NOTE_FALLBACK = { endMoved: 'End date moved to match the start date' }

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'

// website-2026 SeatsCalendarPicker quick buttons.
const QUICK = [
  { key: 'today', back: 0 },
  { key: 'last7Days', back: 6 },
  { key: 'last14Days', back: 13 },
  { key: 'last30Days', back: 29 },
] as const

const MAT_SHADOW =
  'shadow-[0_3px_1px_-2px_var(--shadow-mat-1),0_2px_2px_0_var(--shadow-mat-2),0_1px_5px_0_var(--shadow-mat-3)]'

export type DateRangeDialogProps = {
  start: Date
  end: Date
  today: Date
  labels: DateRangeLabels
  onClose: () => void
  onSelect: (start: Date, end: Date) => void
  // Pages whose legacy picker sets hidden-section-button="true".
  hidePresets?: boolean
}

// website-2026 .date-modalbox dialog (globals.css:8114-8166).
export function DateRangeDialog({
  start: initialStart,
  end: initialEnd,
  today,
  labels,
  onClose,
  onSelect,
  hidePresets = false,
}: DateRangeDialogProps) {
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(initialEnd)
  const [endMoved, setEndMoved] = useState(false)
  const calendarLabels = {
    chooseMonthYear: labels.chooseMonthYear,
    previous: labels.previous,
    next: labels.next,
  }
  const quick = QUICK.find(item => sameDay(end, today) && sameDay(start, addDays(today, -item.back)))?.key

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={next => {
        if (!next) onClose()
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-overlay-in bg-black/40 backdrop-blur-[2px] motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={event => event.preventDefault()}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-48px)] w-[min(1167px,calc(100vw-32px))] animate-dialog-in flex-col overflow-hidden rounded-2xl bg-white shadow-[0_11px_15px_-7px_var(--shadow-mat-1),0_24px_38px_3px_var(--shadow-mat-2),0_9px_46px_8px_var(--shadow-mat-3)] motion-reduce:animate-none"
        >
          <DialogPrimitive.Title
            className={cn(
              'relative m-0 flex shrink-0 items-center px-4 py-2.5 text-[14.5px] leading-[19px] font-bold tracking-[-.005em] text-white',
              NAV_BAND,
            )}
          >
            {labels.dateRange}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            aria-label={labels.close}
            className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full text-white transition-[background-color,transform] duration-300 hover:rotate-90 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X aria-hidden className="size-5" />
          </DialogPrimitive.Close>

          <div className="min-h-0 overflow-y-auto pr-[13px] pb-6 pl-px">
            <div className="mt-5 mb-[5px] flex flex-col sm:flex-row">
              <div
                hidden={hidePresets}
                className="mb-5 w-full min-w-[150px] animate-field-in sm:w-1/5 motion-reduce:animate-none"
                style={{ animationDelay: '120ms' }}
              >
                {QUICK.map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    aria-pressed={quick === item.key}
                    onClick={() => {
                      setStart(addDays(today, -item.back))
                      setEnd(today)
                      setEndMoved(false)
                    }}
                    className={cn(
                      'mr-[5px] ml-2.5 block h-[37px] w-[91%] cursor-pointer rounded-lg border-0 text-[13.33px] leading-[15px] tracking-[0.2506px] transition-[box-shadow,background-color,color,transform] duration-300 ease-premium active:scale-[.98]',
                      MAT_SHADOW,
                      FOCUS,
                      index === 0 ? 'mt-0' : 'mt-5',
                      quick === item.key
                        ? 'bg-brand text-white'
                        : 'bg-white text-ink-muted hover:shadow-[0_5px_5px_-3px_var(--shadow-mat-1),0_8px_10px_1px_var(--shadow-mat-2),0_3px_14px_2px_var(--shadow-mat-3)]',
                    )}
                  >
                    {labels[item.key]}
                  </button>
                ))}
              </div>
              {[
                {
                  label: labels.startDate,
                  selected: start,
                  min: null,
                  pick: (date: Date) => {
                    const moves = beforeDay(end, date)
                    if (moves) setEnd(date)
                    setEndMoved(moves)
                    setStart(date)
                  },
                },
                {
                  label: labels.endDate,
                  selected: end,
                  min: start,
                  pick: (date: Date) => {
                    setEnd(date)
                    setEndMoved(false)
                  },
                },
              ].map((card, index) => (
                <div
                  key={card.label}
                  className="mx-0.5 mb-5 w-full animate-field-in overflow-hidden rounded-xl bg-white shadow-[0_2px_1px_-1px_var(--shadow-mat-1),0_1px_1px_0_var(--shadow-mat-2),0_1px_3px_0_var(--shadow-mat-3)] sm:w-2/5 motion-reduce:animate-none"
                  style={{ animationDelay: `${200 + index * 90}ms` }}
                >
                  <RangeCalendar
                    selected={card.selected}
                    minDate={card.min}
                    label={card.label}
                    labels={calendarLabels}
                    onSelect={card.pick}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mb-2 flex min-h-[54px] shrink-0 flex-wrap items-center justify-end gap-y-2 px-2 pt-[9px] pb-[7px]">
            {/* Polite note so the automatic end-date change is never silent. */}
            <p role="status" className="mr-auto min-w-0 pl-[30px] text-sm text-ink-muted">
              {endMoved ? (labels.endMoved ?? DATE_RANGE_NOTE_FALLBACK.endMoved) : null}
            </p>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'mx-[9.1px] h-9 min-w-16 cursor-pointer rounded-lg border border-[var(--color-border-faint)] bg-white px-4 text-sm font-medium text-ink-muted transition-colors duration-200 hover:bg-slate-50',
                FOCUS,
              )}
            >
              {labels.cancel}
            </button>
            <button
              type="button"
              onClick={() => onSelect(start, end)}
              className={cn(
                'mx-[9.1px] h-[37px] min-w-16 cursor-pointer rounded-lg border-0 bg-brand px-4 text-sm leading-5 font-medium text-white transition-[box-shadow,transform] duration-300 ease-premium hover:-translate-y-px hover:shadow-[0_5px_5px_-3px_var(--shadow-mat-1),0_8px_10px_1px_var(--shadow-mat-2),0_3px_14px_2px_var(--shadow-mat-3)] active:translate-y-0',
                MAT_SHADOW,
                FOCUS,
              )}
            >
              {labels.selectRange}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
