import { render, screen } from '@testing-library/react'
import { EmptyState } from '../EmptyState'
import { SelectionClear } from '../SelectionActions'
import { Table, TableBody, TableCell, TableRow } from '../Table'

const rows = (
  <TableBody>
    <TableRow>
      <TableCell>a</TableCell>
    </TableRow>
  </TableBody>
)

const size = (scroll: number, client: number) => {
  Object.defineProperty(HTMLDivElement.prototype, 'scrollWidth', { configurable: true, value: scroll })
  Object.defineProperty(HTMLDivElement.prototype, 'clientWidth', { configurable: true, value: client })
}

describe('Table scroller (SL-40)', () => {
  afterEach(() => size(0, 0))

  it('gets a tab stop only when the table overflows sideways', () => {
    size(400, 400)
    const { container, unmount } = render(<Table>{rows}</Table>)
    expect(container.firstElementChild).not.toHaveAttribute('tabindex')
    unmount()
    size(900, 400)
    const wide = render(<Table>{rows}</Table>)
    expect(wide.container.firstElementChild).toHaveAttribute('tabindex', '0')
  })
})

describe('SelectionClear (SL-39)', () => {
  it('stays focusable once the selection is empty', () => {
    const onClear = jest.fn()
    render(<SelectionClear active={false} label="Clear" onClear={onClear} />)
    const clear = screen.getByRole('button', { name: 'Clear' })
    clear.focus()
    expect(clear).toHaveFocus()
    expect(clear).toHaveAttribute('aria-disabled', 'true')
    clear.click()
    expect(onClear).not.toHaveBeenCalled()
  })
})

describe('EmptyState (SL-41)', () => {
  it('takes the results word from the caller', () => {
    render(<EmptyState kind="results" title="Nothing" resultsLabel="Keine Ergebnisse" />)
    expect(screen.getByText('Keine Ergebnisse')).toBeInTheDocument()
  })
})
