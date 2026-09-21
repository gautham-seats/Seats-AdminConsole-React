import { render, screen } from '@testing-library/react'
import { NavBar } from '../NavBar'

jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))
jest.mock('next/navigation', () => ({ usePathname: () => '/users' }))
jest.mock('../AccountMenu', () => ({ AccountMenu: () => <div data-testid="account" /> }))
jest.mock('../NavSearch', () => ({ NavSearch: () => <div data-testid="search" /> }))
jest.mock('@/shared/resources', () => ({
  SharedResourceKeys: { refresh: 'Refresh', noRecords: 'NoRecordsWereFound' },
  useResources: () => ({ text: (key: string) => key, status: 'success' }),
}))

const count = { value: 3 as number | null }
const status = { value: 'success' as 'success' | 'loading' }
jest.mock('../use-shell-data', () => ({
  useShellMenu: () => ({
    status: status.value,
    reload: jest.fn(),
    canSeeNotifications: true,
    layout: { bar: [], more: [] },
  }),
  useSessionHeader: () => null,
  useNotificationCount: () => count.value,
}))

describe('NavBar (SL-44, SL-45)', () => {
  it('names the bell with the unread count and drops it at zero', () => {
    const { unmount } = render(<NavBar />)
    expect(screen.getByRole('link', { name: 'User Notifications (3)' })).toBeInTheDocument()
    unmount()
    count.value = 0
    render(<NavBar />)
    expect(screen.getByRole('link', { name: 'User Notifications' })).toBeInTheDocument()
  })

  it('marks the menu busy while it loads', () => {
    status.value = 'loading'
    render(<NavBar />)
    expect(screen.getByRole('navigation', { name: 'Admin menu' })).toHaveAttribute('aria-busy', 'true')
  })
})
