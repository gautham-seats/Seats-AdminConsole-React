import { fireEvent, render, screen } from '@testing-library/react'
import { Pagination, visiblePages } from '../Pagination'

const labels = {
  itemsPerPage: 'Items',
  of: 'of',
  first: 'First',
  previous: 'Previous',
  next: 'Next',
  last: 'Last',
}

describe('visiblePages', () => {
  it('shows up to five pages around the current one like swgrid', () => {
    expect(visiblePages(0, 2)).toEqual([1, 2])
    expect(visiblePages(2, 12)).toEqual([1, 2, 3, 4, 5])
    expect(visiblePages(5, 12)).toEqual([4, 5, 6, 7, 8])
    expect(visiblePages(9, 12)).toEqual([8, 9, 10, 11, 12])
    expect(visiblePages(3, 4)).toEqual([1, 2, 3, 4])
  })
})

describe('Pagination page numbers', () => {
  it('renders numbered pages only when a page label is given', () => {
    const onPageChange = jest.fn()
    const props = {
      id: 'p',
      pageIndex: 5,
      pageSize: 10,
      total: 120,
      pageSizes: [10],
      labels,
      onPageChange,
      onPageSizeChange: jest.fn(),
    }
    const { rerender } = render(<Pagination {...props} />)
    expect(screen.queryByRole('button', { name: 'Page 6' })).not.toBeInTheDocument()

    rerender(<Pagination {...props} pageLabel={page => `Page ${page}`} />)
    expect(screen.getByRole('button', { name: 'Page 6' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: 'Page 8' }))
    expect(onPageChange).toHaveBeenCalledWith(7)
  })

  it('SL-19 is a navigation landmark whose disabled arrows keep focus', () => {
    render(
      <Pagination
        id="p"
        pageIndex={0}
        pageSize={10}
        total={5}
        pageSizes={[10]}
        labels={{ ...labels, pagination: 'Pages' }}
        onPageChange={jest.fn()}
        onPageSizeChange={jest.fn()}
      />,
    )
    expect(screen.getByRole('navigation', { name: 'Pages' })).toBeInTheDocument()
    const next = screen.getByRole('button', { name: 'Next' })
    expect(next).toHaveAttribute('aria-disabled', 'true')
    expect(next).not.toBeDisabled()
    next.focus()
    expect(next).toHaveFocus()
  })

  it('SL-20 clamps a page index past the end instead of printing an impossible range', () => {
    const onPageChange = jest.fn()
    render(
      <Pagination
        id="p"
        pageIndex={5}
        pageSize={100}
        total={250}
        pageSizes={[100]}
        labels={labels}
        onPageChange={onPageChange}
        onPageSizeChange={jest.fn()}
      />,
    )
    expect(screen.getByText('201–250 of 250')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
})
