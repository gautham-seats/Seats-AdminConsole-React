import { fireEvent, render, screen, within } from '@testing-library/react'
import type { MenuLink, TopEntry } from '../admin-menu'
import { NavSearch } from '../NavSearch'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('../profile', () => ({ useProfile: () => ({ can: () => true }) }))
jest.mock('../use-shell-data', () => ({ useSessionHeader: () => null }))
jest.mock('../use-typewriter', () => ({ useTypewriter: () => '' }))

const link = (id: string, fallback: string, reactRoute?: string): MenuLink => ({
  id,
  labelKey: null,
  fallback,
  icon: 'users',
  legacyRoute: `#/${id}`,
  reactRoute,
})
const ENTRIES: TopEntry[] = [
  { ...link('imports', 'Imports', '/imports'), children: [] },
  {
    ...link('students', 'Students'),
    children: [link('delete', 'Student Deletion', '/students/delete'), link('bin', 'Recycle Bin')],
  },
]

function setup() {
  render(<NavSearch entries={ENTRIES} label={item => item.fallback} searchLabel="Search" emptyText="None" />)
  const input = screen.getByRole('combobox', { name: 'Search' })
  fireEvent.focus(input)
  return input
}

// The side panel repeats the toggle; the row star is the one outside the aside.
const rowStar = (name: string) => {
  const star = screen.getAllByRole('button', { name }).find(button => !button.closest('aside'))
  if (!star) throw new Error(`No row star named ${name}`)
  return star
}

beforeEach(() => push.mockClear())

describe('NavSearch listbox structure', () => {
  it('holds only named groups of options, with no links or buttons inside', () => {
    setup()
    const listbox = screen.getByRole('listbox', { name: 'Search' })
    const groups = Array.from(listbox.children)
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      expect(group).toHaveAttribute('role', 'group')
      expect(group).toHaveAttribute('aria-label')
      const owned = Array.from(group.children).filter(child => child.getAttribute('aria-hidden') !== 'true')
      expect(owned.every(child => child.getAttribute('role') === 'option')).toBe(true)
    }
    expect(within(listbox).queryAllByRole('link')).toHaveLength(0)
    expect(within(listbox).queryAllByRole('button')).toHaveLength(0)
    expect(
      within(listbox)
        .getAllByRole('group')
        .map(group => group.getAttribute('aria-label')),
    ).toEqual(['Students', 'Pages'])
  })

  it('opens a React page from its option and keeps the favourite toggle outside the listbox', () => {
    setup()
    const star = rowStar('Add to favourites')
    expect(screen.getByRole('listbox')).not.toContainElement(star)
    fireEvent.click(star)
    expect(rowStar('Remove from favourites')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('option', { name: 'Imports' }))
    expect(push).toHaveBeenCalledWith('/imports')
  })

  it('shows the no-match state beside an empty listbox', () => {
    const input = setup()
    fireEvent.change(input, { target: { value: 'qqqq' } })
    const listbox = screen.getByRole('listbox')
    expect(listbox.children).toHaveLength(0)
    const chip = screen.getByRole('button', { name: '@students' })
    expect(listbox).not.toContainElement(chip)
  })
})
