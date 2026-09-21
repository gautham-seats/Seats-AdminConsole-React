import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api } from '@/shared/api'
import { ProfileProvider } from '@/shared/shell/profile'
import { clearResourceCache } from '@/shared/resources'
import { ContactGroupsScreen } from '../ContactGroupsScreen'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)
const del = jest.mocked(api.delete)

const GROUPS = [
  {
    id: 11,
    name: 'Registry',
    groupEmailAddress: 'registry@example.com',
    sendEmailsToTypeDescription: 'Group email',
    functionName: 'Attendance',
    associatedToDescription: 'School of Law',
    description: 'Front office',
  },
  {
    id: 12,
    name: 'Advisers',
    groupEmailAddress: null,
    sendEmailsToTypeDescription: 'Users',
    functionName: null,
    associatedToDescription: null,
  },
]

function setup(contactGroupActions: number[], deviceActions: number[] = []) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([
        { id: 16, actions: contactGroupActions.map(id => ({ id })) },
        { id: 9, actions: deviceActions.map(id => ({ id })) },
      ])
    if (path === 'ContactGroupApi') return Promise.resolve(GROUPS)
    return Promise.resolve(null)
  })
  post.mockResolvedValue({ 'en-GB': {} })
  render(
    <ProfileProvider>
      <ContactGroupsScreen />
    </ProfileProvider>,
  )
}

const headers = () => screen.getAllByRole('columnheader').map(th => th.textContent)

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('ContactGroupsScreen', () => {
  it('shows the base columns sorted by name and opens the editor', async () => {
    setup([1])
    expect(await screen.findByRole('link', { name: 'Registry' })).toHaveAttribute(
      'href',
      '/users/contact-groups/11',
    )
    expect(headers()).toEqual(['', 'Name', 'Group Email Address', 'Send Emails To'])
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Advisers')
  })

  it('adds Function and Associated To with the functions right and searches them', async () => {
    setup([1, 129])
    await screen.findByRole('link', { name: 'Registry' })
    expect(headers()).toEqual([
      '',
      'Name',
      'Group Email Address',
      'Send Emails To',
      'Function',
      'Associated To',
    ])
    const box = screen.getByRole('searchbox')
    fireEvent.change(box, { target: { value: 'law' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(screen.getAllByRole('row')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'Advisers' })).not.toBeInTheDocument()
  })

  it('keeps row checkboxes but gates delete with Contact Group + Delete, not the legacy Devices right', async () => {
    setup([1], [4])
    await screen.findByRole('link', { name: 'Registry' })
    expect(screen.getByRole('checkbox', { name: 'Select All' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select All' }))
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('deletes selected groups with repeated ids', async () => {
    setup([1, 4])
    await screen.findByRole('link', { name: 'Registry' })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select All' }))
    del.mockResolvedValue(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await act(async () => {
      fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Confirm' }))
    })
    expect(del).toHaveBeenCalledWith('ContactGroupApi?ids=12&ids=11')
  })
})
