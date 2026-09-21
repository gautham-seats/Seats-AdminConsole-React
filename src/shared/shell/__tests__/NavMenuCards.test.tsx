import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { render, screen, within } from '@testing-library/react'
import type { MenuLink } from '../admin-menu'
import { isCurrent, MenuCard, MenuCardGrid } from '../NavMenuCards'

jest.mock('next/navigation', () => ({ usePathname: () => '/users' }))

const link = (id: string, fallback: string, reactRoute?: string): MenuLink => ({
  id,
  labelKey: null,
  fallback,
  icon: 'users',
  legacyRoute: `#/${id}`,
  reactRoute,
})

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('MenuCardGrid', () => {
  it('wraps menu items in a named group instead of a bare layout div', () => {
    render(
      <DropdownMenu.Root open modal={false}>
        <DropdownMenu.Trigger>{'Users'}</DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <MenuCardGrid title="Users">
            <MenuCard link={link('user', 'User', '/users')} label="User" index={0} />
            <MenuCard link={link('profiles', 'Access Profile')} label="Access Profile" index={1} />
          </MenuCardGrid>
        </DropdownMenu.Content>
      </DropdownMenu.Root>,
    )
    const group = screen.getByRole('group', { name: 'Users' })
    expect(screen.getByRole('menu')).toContainElement(group)
    const items = within(group).getAllByRole('menuitem')
    expect(items.map(item => item.parentElement)).toEqual([group, group])
    expect(items[0]).toHaveAttribute('aria-current', 'page')
  })
})

describe('isCurrent (SL-46)', () => {
  it('marks only the deepest matching sibling', () => {
    const users = link('user', 'User', '/users')
    const profiles = link('profiles', 'Access Profile', '/users/access-profiles')
    const siblings = [users, profiles]
    expect(isCurrent('/users/access-profiles', users.reactRoute, siblings)).toBe(false)
    expect(isCurrent('/users/access-profiles', profiles.reactRoute, siblings)).toBe(true)
    expect(isCurrent('/users/42', users.reactRoute, siblings)).toBe(true)
    expect(isCurrent('/users', users.reactRoute, siblings)).toBe(true)
  })
})
