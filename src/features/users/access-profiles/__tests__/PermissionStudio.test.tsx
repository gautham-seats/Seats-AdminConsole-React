import { fireEvent, render, screen, within } from '@testing-library/react'
import { PermissionStudio } from '../PermissionStudio'
import type { StudioGroup } from '../permission-studio'

const GROUPS: StudioGroup[] = [
  {
    key: 'website',
    area: 'Seats Website',
    title: 'Seats Website',
    permissions: [
      {
        id: 1,
        name: 'Approval',
        actions: [
          { id: 11, name: 'Access' },
          { id: 12, name: 'Edit' },
        ],
      },
      { id: 2, name: 'Calendar', actions: [{ id: 31, name: 'View' }] },
      {
        id: 3,
        name: 'Students',
        actions: [
          { id: 21, name: 'Access' },
          { id: 22, name: 'Export' },
        ],
      },
    ],
  },
]

const TEXT = {
  search: 'Search',
  levels: { none: 'None', view: 'View', edit: 'Edit', full: 'Full' },
  noMatches: 'No matches',
}

function setup(selected: number[] = [11, 12, 21, 22, 31]) {
  const onChange = jest.fn()
  const onFocus = jest.fn()
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({ matches: true, media: query }),
  })
  render(
    <PermissionStudio
      groups={GROUPS}
      selected={selected}
      label="Permissions"
      text={TEXT}
      onChange={onChange}
      onFocus={onFocus}
    />,
  )
  return { onChange, onFocus }
}

const railRow = (name: string) =>
  screen
    .getAllByRole('button')
    .find(button => button.getAttribute('title')?.startsWith(`${name} ·`)) as HTMLElement

// Ledger rows carry their permission name in a <p>; the rail uses a <span>.
const ledgerNames = () =>
  screen.queryAllByText(/^(Approval|Calendar|Students)$/, { selector: 'p' }).map(node => node.textContent)

const ledgerRow = (name: string) =>
  screen.getByText(name, { selector: 'p' }).closest('section') as HTMLElement

describe('PermissionStudio rail', () => {
  it('lifts the clicked permission to the top, keeps the rest, and changes no grant', () => {
    const { onChange, onFocus } = setup()
    expect(ledgerNames()).toEqual(['Approval', 'Calendar', 'Students'])

    fireEvent.click(railRow('Students'))

    expect(ledgerNames()).toEqual(['Students', 'Approval', 'Calendar'])
    expect(onChange).not.toHaveBeenCalled()
    expect(onFocus).toHaveBeenCalledWith(3)
    expect(railRow('Students')).toHaveAttribute('aria-current', 'true')
    expect(ledgerRow('Students').className).toContain('bg-brand/[0.08]')
    expect(ledgerRow('Approval').className).not.toContain('bg-brand/[0.08]')
  })

  it('lifts the clicked permission even when a search had hidden it', () => {
    const { onChange } = setup()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Approval' } })
    expect(ledgerNames()).toEqual(['Approval'])

    fireEvent.click(railRow('Students'))

    expect(ledgerNames()).toEqual(['Students', 'Approval', 'Calendar'])
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('returns to the normal order when the search is used', () => {
    setup()
    fireEvent.click(railRow('Students'))

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'a' } })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })

    expect(ledgerNames()).toEqual(['Approval', 'Calendar', 'Students'])
  })

  it('still changes grants from the ledger itself', () => {
    const { onChange } = setup([11])
    fireEvent.click(railRow('Students'))

    fireEvent.click(within(ledgerRow('Students')).getByRole('button', { name: 'Access' }))

    expect(onChange).toHaveBeenCalledWith([11, 21])
  })
})
