import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { isValidMailList, toContactBody, validateContact } from '../contacts-form'
import { ContactsScreen } from '../ContactsScreen'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)
const put = jest.mocked(api.put)
const del = jest.mocked(api.delete)

const CONTACTS = [
  { id: 3, name: 'Registry', mail: 'registry@uni.example.com', globalId: 'g-3' },
  { id: 7, name: 'Wellbeing', mail: 'care@uni.example.com;help@uni.example.com', globalId: 'g-7' },
]

function setup(actions = [1, 93]) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 10, actions: actions.map(id => ({ id })) }])
    if (path === 'ContactApi') return Promise.resolve({ items: CONTACTS, totalRowCount: 2 })
    return Promise.resolve(null)
  })
  post.mockImplementation((path: string) =>
    path === 'ContactApi' ? Promise.resolve(undefined) : Promise.resolve({ 'en-GB': {} }),
  )
  return render(
    <ProfileProvider>
      <ContactsScreen />
    </ProfileProvider>,
  )
}

const contactCalls = () => get.mock.calls.filter(([path]) => path === 'ContactApi')

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('contact rules', () => {
  it('validates in legacy order and accepts semicolon lists', () => {
    expect(validateContact({ id: 0, name: '', mail: '', globalId: null })?.messageKey).toBe('NameIsRequired')
    expect(validateContact({ id: 0, name: 'A', mail: '', globalId: null })?.messageKey).toBe(
      'EmailIsRequired',
    )
    expect(validateContact({ id: 0, name: 'A', mail: 'a@b', globalId: null })?.messageKey).toBe(
      'EmailValidationMessage',
    )
    expect(isValidMailList('a@b.com; c.d@e.org;')).toBe(true)
    expect(isValidMailList('a+b@c.com')).toBe(false)
    expect(toContactBody({ id: 0, name: 'A', mail: 'a@b.com', globalId: 'x' }).globalId).toBeNull()
  })
})

describe('ContactsScreen', () => {
  it('loads page 0 with 100 rows and adds a contact with POST', async () => {
    setup()
    expect(await screen.findByText('Registry')).toBeInTheDocument()
    expect(contactCalls()[0][1]?.query).toEqual({ page: 0, pageSize: 100 })
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('The Name is required.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Name')).toHaveAccessibleDescription('The Name is required.')
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Library' } })
    expect(within(dialog).queryByText('The Name is required.')).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByText('The E-mail is required.')).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('E-mail'), {
      target: { value: 'library@uni.example.com' },
    })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    })
    expect(post).toHaveBeenCalledWith('ContactApi', {
      body: { id: 0, name: 'Library', mail: 'library@uni.example.com', globalId: null },
    })
    expect(await screen.findByRole('status')).toHaveTextContent('The item was saved successfully.')
  })

  it('opens a row for editing and saves with PUT', async () => {
    put.mockResolvedValue(undefined)
    setup()
    fireEvent.click(await screen.findByText('Wellbeing'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('E-mail')).toHaveValue('care@uni.example.com;help@uni.example.com')
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    })
    expect(put).toHaveBeenCalledWith('ContactApi', { body: CONTACTS[1] })
  })

  it('deletes the selected contacts after Yes', async () => {
    del.mockResolvedValue(undefined)
    setup()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Select Registry' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Yes' }))
    })
    expect(del).toHaveBeenCalledWith('ContactApi', { body: [3] })
  })

  it('needs the Settings contacts permission', async () => {
    setup([1])
    expect(await screen.findByText('You do not have permission to view this page.')).toBeInTheDocument()
  })
})
