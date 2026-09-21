import { act, fireEvent, render, screen } from '@testing-library/react'
import { api } from '@/shared/api'
import type { MenuLink, TopEntry } from '../admin-menu'
import { NavSearch } from '../NavSearch'

const push = jest.fn()
let allowed = true
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('../profile', () => ({ useProfile: () => ({ can: () => allowed }) }))
jest.mock('../use-shell-data', () => ({ useSessionHeader: () => null }))
jest.mock('../use-typewriter', () => ({ useTypewriter: () => '' }))
jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const link = (id: string, fallback: string, reactRoute?: string): MenuLink => ({
  id,
  labelKey: null,
  fallback,
  icon: 'users',
  legacyRoute: `#/${id}`,
  reactRoute,
})
const ENTRIES: TopEntry[] = [
  { ...link('users', 'Users', '/users'), children: [] },
  { ...link('imports', 'Imports', '/imports'), children: [] },
]

function setup() {
  render(<NavSearch entries={ENTRIES} label={item => item.fallback} searchLabel="Search" emptyText="None" />)
  const input = screen.getByRole('combobox', { name: 'Search' })
  fireEvent.focus(input)
  return input
}

beforeEach(() => {
  jest.useFakeTimers()
  push.mockClear()
  get.mockReset()
  allowed = true
  get.mockResolvedValue({
    items: [
      { id: 42, userName: 'ada', fullName: 'Ada Lovelace', emailAddress: 'ada@example.org' },
      { id: 43, userName: 'alan', fullName: null, emailAddress: null },
    ],
    totalRowCount: 2,
  })
})
afterEach(() => jest.useRealTimers())

describe('NavSearch people', () => {
  it('U1-2 lists matching users under People after the typing pause and opens their page', async () => {
    const input = setup()
    fireEvent.change(input, { target: { value: 'a' } })
    fireEvent.change(input, { target: { value: 'ad' } })
    expect(get).not.toHaveBeenCalled()
    await act(async () => {
      jest.advanceTimersByTime(300)
    })
    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith(
      'UserApi',
      expect.objectContaining({ query: expect.objectContaining({ searchFilter: 'ad', pageSize: 5 }) }),
    )
    const group = await screen.findByRole('group', { name: 'People' })
    expect(screen.getByRole('option', { name: /Ada Lovelace/ })).toHaveTextContent('ada@example.org')
    expect(group).toContainElement(screen.getByRole('option', { name: /^alan/ }))
    fireEvent.click(screen.getByRole('option', { name: /Ada Lovelace/ }))
    expect(push).toHaveBeenCalledWith('/users/42')
  })

  it('U1-2 never searches without Users access, in action mode or under two characters', async () => {
    allowed = false
    const input = setup()
    fireEvent.change(input, { target: { value: 'ada' } })
    await act(async () => {
      jest.advanceTimersByTime(400)
    })
    expect(get).not.toHaveBeenCalled()
    allowed = true
    fireEvent.change(input, { target: { value: '>ada' } })
    await act(async () => {
      jest.advanceTimersByTime(400)
    })
    fireEvent.change(input, { target: { value: 'a' } })
    await act(async () => {
      jest.advanceTimersByTime(400)
    })
    expect(get).not.toHaveBeenCalled()
  })
})
