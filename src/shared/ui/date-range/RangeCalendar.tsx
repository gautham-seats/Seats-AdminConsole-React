'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { cn } from '../cn'
import { cultureDateFormat, firstDayOfWeek } from '@/shared/i18n/culture'

// Exact port of website-2026 SeatsMatCalendar and its globals.css:8169-8209 styles (Angular mat-calendar).
const MULTI_YEAR_PAGE = 24
const MULTI_YEAR_ROW = 4
const LABEL_MIN_REQUIRED_CELLS = 3
const INK = 'text-ink-muted'
const CELL_PAD: CSSProperties = { padding: '7.1428571429% 1px' }

type View = 'month' | 'year' | 'multi-year'

const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
export const sameDay = (a: Date, b: Date) => dayStart(a).getTime() === dayStart(b).getTime()
export const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
export const beforeDay = (a: Date, b: Date) => dayStart(a).getTime() < dayStart(b).getTime()

// Names and long dates follow the UI culture, like every short date (D-111, SL-11).
const shortMonth = (date: Date) => cultureDateFormat({ month: 'short' }).format(date)
// Full names so screen readers hear the whole date, not just the day number.
const fullDate = (date: Date) => cultureDateFormat({ dateStyle: 'full' }).format(date)
const monthYear = (date: Date) => cultureDateFormat({ month: 'long', year: 'numeric' }).format(date)
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1'

// Column order starts on the culture's first weekday; 1 January 2017 was a Sunday.
export function weekdayNames(weekday: 'narrow' | 'long', firstDay = firstDayOfWeek()): string[] {
  const format = cultureDateFormat({ weekday, timeZone: 'utc' })
  return Array.from({ length: 7 }, (_, index) =>
    format.format(new Date(Date.UTC(2017, 0, ((index + firstDay) % 7) + 1))),
  )
}

export function monthRows(month: Date, firstDay = firstDayOfWeek()) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const offset = (first.getDay() - firstDay + 7) % 7
  const weeks: Date[][] = [[]]
  for (let day = 1, cell = offset; day <= days; day += 1, cell += 1) {
    if (cell === 7) {
      weeks.push([])
      cell = 0
    }
    weeks[weeks.length - 1].push(new Date(month.getFullYear(), month.getMonth(), day))
  }
  return { label: shortMonth(first).toLocaleUpperCase(), offset, weeks }
}

type RangeCalendarProps = {
  selected: Date
  minDate?: Date | null
  label: string
  labels: { chooseMonthYear: string; previous: string; next: string }
  onSelect: (date: Date) => void
}

export function RangeCalendar({ selected, minDate = null, label, labels, onSelect }: RangeCalendarProps) {
  const [view, setView] = useState<View>('month')
  const [active, setActive] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))
  const [syncedWith, setSyncedWith] = useState(selected)
  if (!sameDay(syncedWith, selected)) {
    setSyncedWith(selected)
    setActive(new Date(selected.getFullYear(), selected.getMonth(), 1))
    setView('month')
  }

  const narrow = useMemo(() => weekdayNames('narrow'), [])
  const long = useMemo(() => weekdayNames('long'), [])
  const today = new Date()
  const year = active.getFullYear()
  const multiStart = year - (year % MULTI_YEAR_PAGE)
  const period =
    view === 'month'
      ? `${shortMonth(active)} ${year}`
      : view === 'year'
        ? `${year}`
        : `${multiStart} – ${multiStart + MULTI_YEAR_PAGE - 1}`

  const navigate = (dir: -1 | 1) => {
    if (view === 'month') setActive(new Date(year, active.getMonth() + dir, 1))
    else if (view === 'year') setActive(new Date(year + dir, active.getMonth(), 1))
    else setActive(new Date(year + dir * MULTI_YEAR_PAGE, active.getMonth(), 1))
  }

  const { label: monthLabel, offset, weeks } = monthRows(active)
  const arrowButton = cn(
    'relative size-[46px] shrink-0 cursor-pointer rounded-full transition-colors duration-200 hover:bg-[rgba(44,44,44,0.04)] focus-visible:bg-[rgba(44,44,44,0.04)]',
    FOCUS,
    'after:absolute after:inset-0 after:m-[19px] after:border-0 after:border-solid after:border-current after:content-[""]',
    INK,
  )

  return (
    <div role="group" aria-label={label} className="mx-[5px] flow-root text-[13px] leading-normal">
      <div className="mx-[calc(4.7142857143%-16px)] my-[5%] flex items-center">
        <button
          type="button"
          aria-label={labels.chooseMonthYear}
          onClick={() => setView(view === 'month' ? 'multi-year' : 'month')}
          className={cn(
            'mx-2 inline-flex h-10 min-w-0 cursor-pointer items-center rounded px-2 text-xs font-bold uppercase transition-colors duration-200 hover:bg-[rgba(44,44,44,0.04)] focus-visible:bg-[rgba(44,44,44,0.04)]',
            FOCUS,
            INK,
          )}
        >
          {period}
          <svg
            viewBox="0 0 10 5"
            aria-hidden
            className={cn(
              'ml-[5px] h-[5px] w-2.5 fill-ink-muted transition-transform duration-300',
              view !== 'month' && 'rotate-180',
            )}
          >
            <polygon points="0,0 5,5 10,0" />
          </svg>
        </button>
        <span className="flex-auto" />
        <button
          type="button"
          aria-label={labels.previous}
          onClick={() => navigate(-1)}
          className={cn(
            arrowButton,
            'after:translate-x-[2px] after:-rotate-45 after:border-t-2 after:border-l-2',
          )}
        />
        <button
          type="button"
          aria-label={labels.next}
          onClick={() => navigate(1)}
          className={cn(
            arrowButton,
            'after:-translate-x-[2px] after:rotate-45 after:border-t-2 after:border-r-2',
          )}
        />
      </div>

      <div key={`${view}-${period}`} className="animate-fade-in px-2 pb-2 motion-reduce:animate-none">
        {view === 'month' ? (
          <table data-row-hover="off" className="m-0 w-full table-fixed border-collapse">
            <thead className="border-b-[0.5px] border-[var(--color-table-line)]">
              <tr>
                {narrow.map((day, index) => (
                  <th key={long[index]} scope="col" className={cn('p-0 text-center text-xs font-bold', INK)}>
                    <span className="sr-only">{long[index]}</span>
                    <span aria-hidden>{day}</span>
                  </th>
                ))}
              </tr>
              <tr aria-hidden>
                <th
                  colSpan={7}
                  className="relative h-px p-0 after:absolute after:inset-x-[-8px] after:top-0 after:h-px after:bg-[var(--color-table-line)] after:content-['']"
                />
              </tr>
            </thead>
            <tbody className="min-w-[224px]">
              {offset < LABEL_MIN_REQUIRED_CELLS ? (
                <tr aria-hidden>
                  <td
                    colSpan={7}
                    className={cn('h-0 text-start text-xs leading-none font-bold', INK)}
                    style={{ padding: '7.1428571429% 4.7142857143%' }}
                  >
                    {monthLabel}
                  </td>
                </tr>
              ) : null}
              {weeks.map((week, row) => (
                <tr key={row}>
                  {row === 0 && offset > 0 ? (
                    <td
                      colSpan={offset}
                      aria-hidden
                      className={cn('h-0 text-start text-xs leading-none font-bold', INK)}
                      style={{ padding: '7.1428571429% 4.7142857143%' }}
                    >
                      {offset >= LABEL_MIN_REQUIRED_CELLS ? monthLabel : ''}
                    </td>
                  ) : null}
                  {week.map(date => (
                    <DayCell
                      key={date.getTime()}
                      text={String(date.getDate())}
                      label={fullDate(date)}
                      selected={sameDay(date, selected)}
                      today={sameDay(date, today)}
                      disabled={Boolean(minDate && beforeDay(date, minDate))}
                      onClick={() => onSelect(date)}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table data-row-hover="off" className="m-0 w-full table-fixed border-collapse">
            <tbody>
              {view === 'year'
                ? [0, 4, 8].map(rowStart => (
                    <tr key={rowStart}>
                      {[0, 1, 2, 3].map(col => {
                        const month = rowStart + col
                        return (
                          <DayCell
                            key={month}
                            compact
                            text={shortMonth(new Date(year, month, 1))}
                            label={monthYear(new Date(year, month, 1))}
                            selected={selected.getFullYear() === year && selected.getMonth() === month}
                            onClick={() => {
                              setActive(new Date(year, month, 1))
                              setView('month')
                            }}
                          />
                        )
                      })}
                    </tr>
                  ))
                : Array.from({ length: MULTI_YEAR_PAGE / MULTI_YEAR_ROW }, (_, row) => (
                    <tr key={row}>
                      {Array.from({ length: MULTI_YEAR_ROW }, (_, col) => {
                        const value = multiStart + row * MULTI_YEAR_ROW + col
                        return (
                          <DayCell
                            key={value}
                            compact
                            text={String(value)}
                            selected={selected.getFullYear() === value}
                            onClick={() => {
                              setActive(new Date(value, active.getMonth(), 1))
                              setView('year')
                            }}
                          />
                        )
                      })}
                    </tr>
                  ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

type DayCellProps = {
  text: string
  label?: string
  selected: boolean
  today?: boolean
  disabled?: boolean
  compact?: boolean
  onClick: () => void
}

function DayCell({
  text,
  label,
  selected,
  today = false,
  disabled = false,
  compact = false,
  onClick,
}: DayCellProps) {
  return (
    <td
      className="relative box-content h-0 leading-none"
      style={{ ...CELL_PAD, width: compact ? 'calc(25% - 2px)' : 'calc(14.2857142857% - 2px)' }}
    >
      <button
        type="button"
        disabled={disabled}
        aria-pressed={selected}
        aria-label={label}
        onClick={onClick}
        className="group/cell absolute inset-0 m-0 size-full cursor-pointer select-none border-none bg-transparent p-0 text-center text-[13px] outline-none disabled:cursor-default disabled:opacity-[.38]"
      >
        <span
          className={cn(
            'absolute top-[5%] left-[5%] z-[1] box-border flex h-[90%] w-[90%] items-center justify-center rounded-full border border-solid border-transparent leading-none transition-[background-color,box-shadow] duration-200',
            compact && 'uppercase',
            'group-focus-visible/cell:ring-2 group-focus-visible/cell:ring-ring group-focus-visible/cell:ring-offset-1',
            selected
              ? 'bg-[var(--color-calendar-selected)] text-white group-hover/cell:shadow-[0_0_5px_rgba(0,0,0,0.5)] group-focus-visible/cell:shadow-[0_0_5px_rgba(0,0,0,0.5)]'
              : cn(
                  INK,
                  'group-enabled:group-hover/cell:bg-[rgba(44,44,44,0.04)] group-focus-visible/cell:bg-[rgba(44,44,44,0.08)]',
                ),
            today &&
              (selected ? 'shadow-[inset_0_0_0_1px_var(--color-calendar-today-ring)]' : 'border-slate-500'),
          )}
        >
          {text}
        </span>
      </button>
    </td>
  )
}
