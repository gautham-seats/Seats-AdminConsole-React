import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { MenuLink, TopEntry } from '@/shared/shell/admin-menu'
import { useShellMenu } from '@/shared/shell/use-shell-data'
import { MoreScreen } from '../MoreScreen'

jest.mock('@/shared/shell/use-shell-data', () => ({ useShellMenu: jest.fn() }))
jest.mock('@/shared/resources', () => ({
  SharedResourceKeys: { refresh: 'Refresh', noRecords: 'NoRecords' },
  useResources: () => ({ text: (key: string) => key }),
}))
jest.mock('@/shared/shell/AreaWorkspace', () => ({
  AreaWorkspace: ({
    title,
    actions,
    children,
  }: {
    title: string
    actions: ReactNode
    children: ReactNode
  }) => (
    <section>
      <h1>{title}</h1>
      {actions}
      {children}
    </section>
  ),
}))

const menu = jest.mocked(useShellMenu)

const link = (id: string, fallback: string, reactRoute?: string): MenuLink => ({
  id,
  labelKey: null,
  fallback,
  icon: 'users',
  legacyRoute: `#/${id}`,
  reactRoute,
})
const entry = (base: MenuLink, children: MenuLink[] = []): TopEntry => ({ ...base, children })

const MORE: TopEntry[] = [
  entry(link('imports', 'Imports', '/imports')),
  entry(link('students', 'Students'), [
    link('student-delete', 'Student Deletion', '/students'),
    link('student-recycle-bin', 'Recycle Bin'),
  ]),
]

const ready = (more: TopEntry[]) =>
  menu.mockReturnValue({
    status: 'success',
    error: null,
    reload: jest.fn(),
    layout: { bar: [], more },
    canSeeNotifications: false,
  })

describe('MoreScreen', () => {
  it('shows one tile per page, grouped, with React and legacy links', () => {
    ready(MORE)
    render(<MoreScreen />)
    expect(screen.getByRole('link', { name: /Imports/ })).toHaveAttribute('href', '/imports')
    expect(screen.getByRole('link', { name: /Student Deletion/ })).toHaveAttribute('href', '/students')
    expect(screen.getByRole('link', { name: /Recycle Bin/ }).getAttribute('href')).toContain(
      '#/student-recycle-bin',
    )
    expect(screen.getByRole('heading', { name: 'Students' })).toBeInTheDocument()
  })

  it('filters tiles by search and hides empty groups', () => {
    ready(MORE)
    render(<MoreScreen />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'recycle' } })
    expect(screen.getByRole('link', { name: /Recycle Bin/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Imports/ })).not.toBeInTheDocument()
  })

  it('says so when nothing matches', () => {
    ready(MORE)
    render(<MoreScreen />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    expect(screen.getByText('NoRecords')).toBeInTheDocument()
  })
})
