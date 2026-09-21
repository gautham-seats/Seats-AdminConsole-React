import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { FilterPanel, type FilterPanelLabels } from '../FilterPanel'
import { sameFilters } from '../use-filter-draft'

const labels: FilterPanelLabels = {
  title: 'Filters',
  views: 'Views',
  reset: 'Reset',
  expand: 'Expand',
  collapse: 'Collapse',
  activeFilters: 'Active filters',
  remove: label => `Remove ${label}`,
}

function setup(overrides: Partial<Parameters<typeof FilterPanel>[0]> = {}) {
  const props = {
    labels,
    chips: [
      { id: 'device', label: 'Device', value: 'SN-4', onRemove: jest.fn() },
      { id: 'range', label: 'Date Range', value: '15/09/2026' },
    ],
    views: [
      { id: 'today', label: 'Today', count: 12 },
      { id: 'week', label: 'Last 7 days' },
    ],
    activeView: 'today',
    onViewChange: jest.fn(),
    canReset: true,
    onReset: jest.fn(),
    ...overrides,
  }
  render(
    <FilterPanel {...props}>
      <label htmlFor="field">Field</label>
      <input id="field" />
    </FilterPanel>,
  )
  return props
}

describe('FilterPanel', () => {
  it('resets and switches views', () => {
    const props = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(props.onReset).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Today/ })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: /Last 7 days/ }))
    expect(props.onViewChange).toHaveBeenCalledWith('week')
  })

  it('disables Reset when there is nothing to reset', () => {
    const props = setup({ canReset: false })
    const reset = screen.getByRole('button', { name: 'Reset' })
    expect(reset).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(reset)
    expect(props.onReset).not.toHaveBeenCalled()
  })

  it('shows removable chips only when collapsed', () => {
    const props = setup()
    expect(screen.queryByRole('button', { name: 'Remove Device' })).not.toBeInTheDocument()
    const toggle = screen.getByRole('button', { expanded: true })
    expect(toggle).toHaveAccessibleName('Filters 2 Active filters')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAccessibleName('Filters 2 Active filters')
    fireEvent.click(screen.getByRole('button', { name: 'Remove Device' }))
    expect(props.chips[0].onRemove).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Remove Date Range' })).not.toBeInTheDocument()
  })

  it('gives every chip remove button a unique name, even with a label that ignores the chip', () => {
    setup({
      labels: { ...labels, remove: () => 'Remove' },
      chips: [
        { id: 'device', label: 'Device', value: 'SN-4', onRemove: jest.fn() },
        { id: 'room', label: 'Room', value: 'R1', onRemove: jest.fn() },
      ],
    })
    fireEvent.click(screen.getByRole('button', { expanded: true }))
    const names = screen
      .getAllByRole('button', { name: /^Remove/ })
      .map(button => button.getAttribute('aria-label'))
    expect(names).toEqual(['Remove Device', 'Remove Room'])
    expect(new Set(names).size).toBe(names.length)
  })

  it('compares filter values', () => {
    expect(sameFilters({ a: 1 }, { a: 1 })).toBe(true)
    expect(sameFilters({ a: 1 }, { a: 2 })).toBe(false)
  })

  it('SL-30 keeps focus on the chip list after a chip is removed', () => {
    function Host() {
      const [ids, setIds] = useState(['Device', 'Room'])
      return (
        <FilterPanel
          labels={labels}
          chips={ids.map(id => ({
            id,
            label: id,
            value: 'x',
            onRemove: () => setIds(current => current.filter(item => item !== id)),
          }))}
          canReset
          onReset={jest.fn()}
        >
          <input aria-label="Field" />
        </FilterPanel>
      )
    }
    render(<Host />)
    const toggle = screen.getByRole('button', { expanded: true })
    fireEvent.click(toggle)
    const first = screen.getByRole('button', { name: 'Remove Device' })
    first.focus()
    fireEvent.click(first)
    expect(screen.getByRole('button', { name: 'Remove Room' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Room' }))
    expect(toggle).toHaveFocus()
  })

  it('SL-31 keeps focus on Reset once nothing is left to reset', () => {
    setup({ canReset: false })
    const reset = screen.getByRole('button', { name: 'Reset' })
    reset.focus()
    expect(reset).toHaveFocus()
  })
})
