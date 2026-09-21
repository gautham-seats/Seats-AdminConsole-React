import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import type { CustomFieldGroupDto } from '@/types/custom-fields'
import {
  buildSchemaFields,
  changeDataType,
  groupErrors,
  groupFieldErrors,
  newGroup,
  sanitizeName,
  toGroupDraft,
  visibilityCheck,
} from '../custom-fields-form'
import { CustomFieldsScreen } from '../CustomFieldsScreen'

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

const GUID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
const GROUP: CustomFieldGroupDto = {
  Id: 12,
  GlobalId: 'a1b2',
  EntityType: 'Student',
  Title: 'Placement',
  SchemaFields: [
    {
      Id: GUID,
      Name: 'Company &amp; site',
      DataType: 1,
      SensitivityLevel: 2,
      Options: ['A', 'B'],
      Visibility: true,
    },
  ],
}

function setup(actions = [1, 2, 3, 4], limit: number | null = null) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 42, actions: actions.map(id => ({ id })) }])
    if (path === 'CustomFieldGroupApi/') return Promise.resolve({ Items: [GROUP], TotalRowCount: 1 })
    if (path === 'CustomFieldGroupApi/CountCustomFields') return Promise.resolve(limit)
    return Promise.resolve(null)
  })
  post.mockResolvedValue({ 'en-GB': {} })
  return render(
    <ProfileProvider>
      <CustomFieldsScreen />
    </ProfileProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('custom field rules', () => {
  it('loads fields decoded, builds legacy schema strings and validates', () => {
    const draft = toGroupDraft(GROUP)
    expect(draft.entityType).toBe('STUDENT')
    expect(draft.rows[0].name).toBe('Company & site')
    expect(buildSchemaFields(draft)[0]).toEqual({
      Id: GUID,
      Name: 'Company & site',
      DataType: '1',
      SensitivityLevel: '2',
      Visibility: true,
      Options: ['A', 'B'],
    })
    expect(groupErrors(newGroup(), buildSchemaFields(newGroup()))).toEqual([
      'Field is required.',
      'Entity Type is required.',
      'Errors in row (0): Name is required.',
    ])
    expect(groupFieldErrors(newGroup(), buildSchemaFields(newGroup()))).toEqual({
      title: true,
      entityType: true,
      rows: [{ id: false, name: true, dataType: false }],
    })
    expect(sanitizeName('A-b<c>!')).toBe('A-bc')
    expect(changeDataType({ ...draft.rows[0], visibility: true }, 4).visibility).toBe(false)
  })

  it('checks the visible field limit only when a field is newly visible', () => {
    const draft = toGroupDraft(GROUP)
    expect(visibilityCheck(0, draft, buildSchemaFields(draft)).needed).toBe(false)
    const added = {
      ...draft,
      rows: [
        ...draft.rows,
        { ...draft.rows[0], key: 'x', id: '00000000-0000-0000-0000-000000000000', wasVisible: false },
      ],
    }
    expect(visibilityCheck(0, added, buildSchemaFields(added))).toEqual({
      needed: true,
      available: 0,
      allowed: false,
    })
    expect(visibilityCheck(1, added, buildSchemaFields(added)).allowed).toBe(true)
  })
})

describe('CustomFieldsScreen', () => {
  it('opens a group and saves it with PUT and a stringified schema', async () => {
    put.mockResolvedValue(undefined)
    setup()
    fireEvent.click(await screen.findByText('Placement'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Name 1')).toHaveValue('Company & site')
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    })
    const body = put.mock.calls[0][1]?.body as { id: number; schemaFields: string }
    expect(put.mock.calls[0][0]).toBe('CustomFieldGroupApi/')
    expect(body.id).toBe(12)
    expect(JSON.parse(body.schemaFields)[0].Options).toEqual(['A', 'B'])
    expect(await screen.findByRole('status')).toHaveTextContent('Actions updated successfully')
  })

  it('shows validation errors for an empty new group', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Add' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('All fields must have a valid value.')
  })

  it('shows each field error inline and clears it as soon as the value is valid', async () => {
    setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Add' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    const title = within(dialog).getByLabelText('Group Name')
    const entity = within(dialog).getByLabelText('Entity Type')
    const name = within(dialog).getByLabelText('Name 1')
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(title).toHaveAccessibleDescription('Enter a name.')
    expect(entity).toHaveAccessibleDescription('Select an entity type.')
    expect(name).toHaveAccessibleDescription('Enter a field name.')

    fireEvent.change(title, { target: { value: 'Placement' } })
    expect(title).not.toHaveAttribute('aria-invalid')
    expect(entity).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(entity, { target: { value: 'STUDENT' } })
    fireEvent.change(name, { target: { value: 'Company' } })
    expect(name).not.toHaveAttribute('aria-invalid')
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('is read-only without edit and hides Add without add', async () => {
    setup([1])
    fireEvent.click(await screen.findByText('Placement'))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Name 1')).toBeDisabled()
    expect(within(dialog).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add' })).not.toBeInTheDocument()
  })
})
