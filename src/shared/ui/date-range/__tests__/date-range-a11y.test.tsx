import { monthRows, weekdayNames } from '../RangeCalendar'
import { resetUiCulture, setUiCulture } from '@/shared/i18n/culture'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { DateRangeDialog, type DateRangeLabels } from '../DateRangeDialog'
import { DateRangeField } from '../DateRangeField'
import { RangeCalendar } from '../RangeCalendar'
import { StudioRangeDialog } from '../StudioRangeDialog'

const labels: DateRangeLabels = {
  dateRange: 'Date range',
  startDate: 'Start date',
  endDate: 'End date',
  close: 'Close',
  cancel: 'Cancel',
  selectRange: 'Select',
  chooseMonthYear: 'Choose month and year',
  previous: 'Previous',
  next: 'Next',
  today: 'Today',
  last7Days: 'Last 7 days',
  last14Days: 'Last 14 days',
  last30Days: 'Last 30 days',
}

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)
const format = (date: Date) => `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`

describe('StudioRangeDialog grid structure', () => {
  it('renders named grids with header row, week rows and blank gridcells', () => {
    render(
      <StudioRangeDialog
        start={d(2026, 9, 1)}
        end={d(2026, 9, 10)}
        today={d(2026, 9, 17)}
        labels={labels}
        formatDate={format}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    )
    const grid = screen.getByRole('grid', { name: 'September 2026' })
    const rows = within(grid).getAllByRole('row')
    expect(rows).toHaveLength(6)
    expect(within(rows[0]).getAllByRole('columnheader')).toHaveLength(7)
    rows.slice(1).forEach(row => expect(within(row).getAllByRole('gridcell')).toHaveLength(7))
    expect(within(rows[1]).getByRole('gridcell', { name: '1/9/2026' })).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'August 2026' })).toBeInTheDocument()
  })
})

describe('DateRangeField', () => {
  it('names each date button by its label and describes it with the chosen date', () => {
    render(
      <DateRangeField
        id="range"
        start={d(2026, 9, 1)}
        end={d(2026, 9, 10)}
        labels={labels}
        formatDate={format}
        onChange={jest.fn()}
        time={{ start: '', end: '', options: ['08:00'], onChange: jest.fn() }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Start date' })).toHaveAccessibleDescription('1/9/2026')
    expect(screen.getByRole('button', { name: 'End date' })).toHaveAccessibleDescription('10/9/2026')
    expect(screen.getByRole('button', { name: 'Start time' })).toHaveAccessibleDescription('All day')
    expect(screen.getByRole('button', { name: 'End time' })).toBeInTheDocument()
  })
})

describe('RangeCalendar', () => {
  it('names day buttons with the full date', () => {
    render(
      <RangeCalendar
        selected={d(2026, 9, 17)}
        label="Start date"
        labels={{ chooseMonthYear: 'Choose', previous: 'Previous', next: 'Next' }}
        onSelect={jest.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Thursday, 17 September 2026' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

describe('DateRangeDialog', () => {
  it('still moves the end date but announces it', () => {
    const onSelect = jest.fn()
    render(
      <DateRangeDialog
        start={d(2026, 9, 1)}
        end={d(2026, 9, 5)}
        today={d(2026, 9, 17)}
        labels={labels}
        onClose={jest.fn()}
        onSelect={onSelect}
      />,
    )
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    const startCalendar = screen.getByRole('group', { name: 'Start date' })
    fireEvent.click(within(startCalendar).getByRole('button', { name: 'Tuesday, 8 September 2026' }))
    expect(screen.getByRole('status')).toHaveTextContent('End date moved to match the start date')
    fireEvent.click(screen.getByRole('button', { name: 'Select' }))
    expect(onSelect).toHaveBeenCalledWith(d(2026, 9, 8), d(2026, 9, 8))
  })

  it('SL-11 lays the month out from the culture first weekday with culture names', () => {
    resetUiCulture()
    expect(weekdayNames('long')[0]).toBe('Monday')
    // 1 September 2026 is a Tuesday: one blank before it when Monday starts the week, two when Sunday does.
    expect(monthRows(new Date(2026, 8, 1)).offset).toBe(1)
    setUiCulture('en-US')
    expect(weekdayNames('long')[0]).toBe('Sunday')
    expect(monthRows(new Date(2026, 8, 1)).offset).toBe(2)
    setUiCulture('es-ES')
    expect(weekdayNames('long')[0]).toBe('lunes')
    resetUiCulture()
  })
})

describe('StudioRangeDialog culture names (SL-27)', () => {
  afterEach(() => resetUiCulture())

  it('names the weekday columns, month title and month picker from the UI culture', () => {
    setUiCulture('de-DE')
    render(
      <StudioRangeDialog
        start={d(2026, 9, 1)}
        end={d(2026, 9, 10)}
        today={d(2026, 9, 17)}
        labels={labels}
        formatDate={format}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />,
    )
    const grid = screen.getByRole('grid', { name: 'September 2026' })
    const headers = within(within(grid).getAllByRole('row')[0]).getAllByRole('columnheader')
    expect(headers[0]).toHaveAccessibleName('Montag')
    expect(headers[0]).toHaveTextContent(/^Mo\.?$/)
    expect(screen.getByRole('grid', { name: 'August 2026' })).toBeInTheDocument()
  })
})
