import { act, fireEvent, render, screen } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { gearPath, LEAF_PATHS } from '../loaders/mark'
import { Pagination, pageCount } from '../Pagination'
import { SearchField } from '../SearchField'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))

jest.mock('@/shared/shell/use-more-nav', () => ({ useMoreNav: () => null }))

const labels = {
  itemsPerPage: 'Number of items per page',
  of: 'of',
  first: 'First',
  previous: 'Previous',
  next: 'Next',
  last: 'Last',
}

describe('Pagination', () => {
  it('shows the range and moves between pages', () => {
    const onPage = jest.fn()
    const onSize = jest.fn()
    render(
      <Pagination
        id="p"
        pageIndex={1}
        pageSize={10}
        total={35}
        pageSizes={[10, 20]}
        labels={labels}
        onPageChange={onPage}
        onPageSizeChange={onSize}
      />,
    )
    expect(screen.getByText('11–20 of 35')).toBeInTheDocument()
    expect(screen.getByText('2 of 4')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Last' }))
    expect(onPage).toHaveBeenCalledWith(3)
    fireEvent.change(screen.getByLabelText('Number of items per page'), { target: { value: '20' } })
    expect(onSize).toHaveBeenCalledWith(20)
  })

  it('disables first and previous on the first page', () => {
    render(
      <Pagination
        id="p"
        pageIndex={0}
        pageSize={10}
        total={5}
        pageSizes={[10]}
        labels={labels}
        onPageChange={jest.fn()}
        onPageSizeChange={jest.fn()}
      />,
    )
    // aria-disabled keeps the arrows focusable, so a press on the last page never drops focus (SL-19).
    expect(screen.getByRole('button', { name: 'First' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Next' })).toHaveAttribute('aria-disabled', 'true')
    expect(pageCount(0, 10)).toBe(1)
  })
})

describe('SearchField', () => {
  it('submits on Enter and on the submit button only', () => {
    const onSubmit = jest.fn()
    const onChange = jest.fn()
    render(
      <SearchField
        id="s"
        value="abc"
        onValueChange={onChange}
        onSubmit={onSubmit}
        onClear={jest.fn()}
        placeholder="Search..."
        submitLabel="Search"
        clearLabel="Clear search"
        showClear
      />,
    )
    const box = screen.getByRole('searchbox')
    fireEvent.change(box, { target: { value: 'abcd' } })
    expect(onChange).toHaveBeenCalledWith('abcd')
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.keyDown(box, { key: 'Enter' })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(onSubmit).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument()
  })
})

describe('AreaWorkspace', () => {
  const sections = [
    {
      id: 'user',
      labelKey: 'User',
      fallback: 'User',
      icon: 'user' as const,
      legacyRoute: '#/User',
      reactRoute: '/users',
      label: 'User',
    },
    {
      id: 'access-profile',
      labelKey: 'AccessProfile',
      fallback: 'Access Profile',
      icon: 'lock' as const,
      legacyRoute: '#/AccessProfile',
      label: 'Access Profile',
    },
  ]

  it('marks the current section, links the rest to legacy Admin and collapses', async () => {
    render(
      <AreaWorkspace
        areaLabel="Users"
        sections={sections}
        activeId="user"
        title="User"
        collapseLabel="Collapse"
        expandLabel="Expand"
      >
        <p>content</p>
      </AreaWorkspace>,
    )
    // The More navigation starts a resource read; let it settle before asserting.
    await act(async () => {})
    expect(screen.getByRole('link', { name: 'User' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'User' })).toHaveAttribute('href', '/users')
    expect(screen.getByRole('link', { name: 'Access Profile' })).toHaveAttribute(
      'href',
      '/Seats.Trunk.Admin/#/AccessProfile',
    )
    expect(screen.getByRole('heading', { level: 1, name: 'User' })).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: 'Collapse' })
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Expand' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('SL-35 names the section sidebar and the breadcrumb differently', async () => {
    render(
      <AreaWorkspace
        areaLabel="Users"
        sections={sections}
        activeId="user"
        title="User"
        collapseLabel="Collapse"
        expandLabel="Expand"
      >
        <p>content</p>
      </AreaWorkspace>,
    )
    // The More navigation starts a resource read; let it settle before asserting.
    await act(async () => {})
    expect(screen.getByRole('complementary', { name: 'Users' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Users › User' })).toBeInTheDocument()
  })
})

describe('SEAtS mark geometry', () => {
  it('draws four closed leaves and a closed gear outline', () => {
    expect(LEAF_PATHS).toHaveLength(4)
    LEAF_PATHS.forEach(path => expect(path).toMatch(/^M[\d. ]+ C.+ Z$/))
    const gear = gearPath(44, 64, 10, 30, 25)
    expect(gear.startsWith('M')).toBe(true)
    expect(gear.endsWith('Z')).toBe(true)
    expect(gear.match(/A30 30/g)).toHaveLength(10)
  })
})
