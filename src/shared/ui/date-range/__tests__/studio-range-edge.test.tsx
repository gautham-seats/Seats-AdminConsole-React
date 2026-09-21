import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState, type ComponentProps } from 'react'
import { countDays } from '../studio-dates'
import type { DateRangeLabels } from '../DateRangeDialog'
import { StudioRangeDialog, STUDIO_FALLBACK } from '../StudioRangeDialog'

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

function dayButton(date: Date) {
  return screen.getByRole('gridcell', { name: format(date) })
}

function mount(
  props: Partial<ComponentProps<typeof StudioRangeDialog>> & {
    start?: Date
    end?: Date
    today?: Date
  } = {},
) {
  const onClose = props.onClose ?? jest.fn()
  const onSelect = props.onSelect ?? jest.fn()
  const view = render(
    <StudioRangeDialog
      start={props.start ?? d(2026, 9, 1)}
      end={props.end ?? d(2026, 9, 10)}
      today={props.today ?? d(2026, 9, 17)}
      labels={labels}
      formatDate={format}
      onClose={onClose}
      onSelect={onSelect}
      hidePresets={props.hidePresets}
      initialFocus={props.initialFocus}
    />,
  )
  return { onClose, onSelect, unmount: view.unmount }
}

describe('StudioRangeDialog edge cases', () => {
  it('1 single-day range start equals end', () => {
    mount({ start: d(2026, 9, 5), end: d(2026, 9, 5) })
    expect(screen.getByRole('button', { name: labels.selectRange })).toBeEnabled()
    expect(screen.getAllByText(format(d(2026, 9, 5))).length).toBeGreaterThan(0)
  })

  it('2 second click earlier swaps and shows a visible message', () => {
    mount({ start: d(2026, 9, 10), end: d(2026, 9, 10) })
    fireEvent.click(dayButton(d(2026, 9, 10)))
    fireEvent.click(dayButton(d(2026, 9, 3)))
    expect(screen.getByRole('status')).toHaveTextContent(STUDIO_FALLBACK.rangeReordered)
    expect(screen.getByText(format(d(2026, 9, 3)))).toBeInTheDocument()
    expect(screen.getByText(format(d(2026, 9, 10)))).toBeInTheDocument()
  })

  it('3 only start picked blocks Apply', () => {
    mount()
    fireEvent.click(dayButton(d(2026, 9, 12)))
    expect(screen.getByRole('button', { name: labels.selectRange })).toBeDisabled()
    expect(screen.getByText(STUDIO_FALLBACK.pickEnd)).toBeInTheDocument()
  })

  it('4 incomplete range blocks Apply', () => {
    mount()
    fireEvent.click(dayButton(d(2026, 9, 12)))
    expect(screen.getByRole('button', { name: labels.selectRange })).toBeDisabled()
    expect(screen.getByText(STUDIO_FALLBACK.pickEnd)).toBeInTheDocument()
  })

  it('5 month boundary Jan 31 to Feb 1', () => {
    mount({ start: d(2026, 1, 31), end: d(2026, 2, 1), today: d(2026, 1, 15) })
    expect(screen.getByRole('button', { name: labels.selectRange })).toBeEnabled()
    expect(countDays(d(2026, 1, 31), d(2026, 2, 1))).toBe(2)
  })

  it('6 year boundary Dec 31 to Jan 1', () => {
    mount({ start: d(2025, 12, 31), end: d(2026, 1, 1), today: d(2025, 12, 15) })
    expect(screen.getByRole('button', { name: labels.selectRange })).toBeEnabled()
    expect(countDays(d(2025, 12, 31), d(2026, 1, 1))).toBe(2)
  })

  it('7 leap day Feb 29', () => {
    mount({ start: d(2024, 2, 29), end: d(2024, 2, 29), today: d(2024, 2, 29) })
    expect(screen.getByRole('button', { name: labels.selectRange })).toBeEnabled()
  })

  it('8 UK spring-forward DST calendar count', () => {
    // UK clocks spring forward on 30 March 2026; calendar days stay inclusive.
    mount({ start: d(2026, 3, 28), end: d(2026, 3, 31), today: d(2026, 3, 30) })
    expect(screen.getByRole('button', { name: labels.selectRange })).toBeEnabled()
    expect(countDays(d(2026, 3, 28), d(2026, 3, 31))).toBe(4)
  })

  it('9 keyboard Enter picks, Escape closes and focus returns', async () => {
    function Host() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" id="range-trigger" onClick={() => setOpen(true)}>
            Open picker
          </button>
          {open ? (
            <StudioRangeDialog
              start={d(2026, 9, 1)}
              end={d(2026, 9, 10)}
              today={d(2026, 9, 17)}
              labels={labels}
              formatDate={format}
              onClose={() => setOpen(false)}
              onSelect={() => setOpen(false)}
            />
          ) : null}
        </>
      )
    }
    render(<Host />)
    const trigger = screen.getByRole('button', { name: 'Open picker' })
    act(() => {
      trigger.focus()
      fireEvent.click(trigger)
    })
    const dialog = await waitFor(() => screen.getByRole('dialog'))
    const focused = dayButton(d(2026, 9, 10))
    focused.focus()
    fireEvent.keyDown(focused, { key: 'Enter' })
    expect(screen.getByText(STUDIO_FALLBACK.pickEnd)).toBeInTheDocument()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(trigger))
  })

  it('10 hidePresets true hides the preset rail', () => {
    mount({ hidePresets: true })
    expect(screen.queryByText(STUDIO_FALLBACK.quick)).not.toBeInTheDocument()
    expect(screen.queryByText(STUDIO_FALLBACK.academic)).not.toBeInTheDocument()
  })

  it('11 apply then unmount leaves no stray timers', () => {
    const timers = jest.spyOn(global, 'setTimeout')
    const { unmount, onSelect } = mount()
    fireEvent.click(screen.getByRole('button', { name: labels.selectRange }))
    expect(onSelect).toHaveBeenCalled()
    const scheduled = timers.mock.calls.length
    unmount()
    const active = timers.mock.calls
      .slice(scheduled)
      .filter(([, delay]) => typeof delay === 'number' && delay > 0)
    expect(active).toHaveLength(0)
    timers.mockRestore()
  })

  it('12 initial prop range end before start is normalised', () => {
    mount({ start: d(2026, 9, 20), end: d(2026, 9, 5) })
    expect(screen.getAllByText(format(d(2026, 9, 5))).length).toBeGreaterThan(0)
    expect(screen.getAllByText(format(d(2026, 9, 20))).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: labels.selectRange })).toBeEnabled()
  })
})

describe('StudioRangeDialog keyboard ownership (SL-47, SL-48)', () => {
  it('SL-48 PageUp from 31 May lands on 30 April, not the 28th', () => {
    mount({ start: d(2026, 5, 1), end: d(2026, 5, 31) })
    const cell = dayButton(d(2026, 5, 31))
    cell.focus()
    fireEvent.keyDown(cell, { key: 'PageUp' })
    expect(dayButton(d(2026, 4, 30))).toHaveAttribute('tabindex', '0')
  })

  it('SL-47 arrow keys on a preset button leave the day focus alone', () => {
    mount({ start: d(2026, 9, 1), end: d(2026, 9, 10) })
    const preset = screen.getAllByRole('button', { name: /Today/ })[0]
    preset.focus()
    fireEvent.keyDown(preset, { key: 'ArrowDown' })
    fireEvent.keyDown(preset, { key: 'Home' })
    expect(dayButton(d(2026, 9, 10))).toHaveAttribute('tabindex', '0')
  })
})

describe('StudioRangeDialog initial focus (SL-51)', () => {
  it('opens on the start date when the Start box was pressed', () => {
    mount({ start: d(2026, 3, 5), end: d(2026, 9, 10), initialFocus: 'start' })
    expect(dayButton(d(2026, 3, 5))).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('grid', { name: 'March 2026' })).toBeInTheDocument()
  })
})
