import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { nextResourceSort, INITIAL_RESOURCES_QUERY, resourcesParams } from '../resources-query'
import { ResourcesScreen } from '../ResourcesScreen'

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

const PAGE = {
  totalRowCount: 1,
  items: [{ id: 1, key: 'Save', cultureName: 'en-GB', type: 'GeneralResources', value: 'Save' }],
}

function setup(actions = [1, 3]) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([{ id: 33, actions: actions.map(id => ({ id })) }])
    if (path === 'ResourceApi/getResources') return Promise.resolve(PAGE)
    if (path === 'ResourceApi/GetTypes')
      return Promise.resolve([{ id: 0, description: 'GeneralResources', globalId: null, visible: false }])
    return Promise.resolve(null)
  })
  post.mockResolvedValue({ 'en-GB': {} })
  return render(
    <ProfileProvider>
      <ResourcesScreen />
    </ProfileProvider>,
  )
}

const listCalls = () => get.mock.calls.filter(([path]) => path === 'ResourceApi/getResources')

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('resource query rules', () => {
  it('always sends all seven parameters and cycles sort', () => {
    expect(Object.keys(resourcesParams(INITIAL_RESOURCES_QUERY))).toEqual([
      'value',
      'cultureName',
      'pageNumber',
      'pageSize',
      'sortCol',
      'sortDir',
      'type',
    ])
    const once = nextResourceSort(INITIAL_RESOURCES_QUERY, 'key')
    expect([once.sortCol, once.sortDir]).toEqual(['key', 'asc'])
    expect(nextResourceSort(once, 'key').sortDir).toBe('desc')
  })
})

describe('ResourcesScreen', () => {
  it('searches from page 0, filters by type and saves edited text', async () => {
    setup()
    expect(await screen.findByText('GeneralResources', { selector: 'span' })).toBeInTheDocument()
    expect(listCalls()[0][1]?.query).toMatchObject({ pageNumber: 0, pageSize: 100, value: '' })
    fireEvent.change(screen.getByLabelText('Text'), { target: { value: 'Sav' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(listCalls().at(-1)?.[1]?.query).toMatchObject({ value: 'Sav', pageNumber: 0 })
    fireEvent.change(screen.getByLabelText('Types'), { target: { value: 'GeneralResources' } })
    expect(listCalls().at(-1)?.[1]?.query).toMatchObject({ type: 'GeneralResources' })

    fireEvent.click(await screen.findByText('Save', { selector: 'code' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Text'), { target: { value: 'Store' } })
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    })
    expect(post).toHaveBeenCalledWith('ResourceApi/updateResource', {
      body: { key: 'Save', value: 'Store', cultureName: 'en-GB', type: 'GeneralResources' },
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Actions updated successfully')
  })

  it('opens text read-only without Resources edit', async () => {
    setup([1])
    fireEvent.click(await screen.findByText('Save', { selector: 'code' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Text')).toHaveAttribute('readonly')
    expect(within(dialog).queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })
})

describe('resource sorting', () => {
  it('starts again on page 1 when the sort changes', () => {
    const onPageThree = { ...INITIAL_RESOURCES_QUERY, pageNumber: 2 }
    expect(nextResourceSort(onPageThree, 'key')).toMatchObject({
      sortCol: 'key',
      sortDir: 'asc',
      pageNumber: 0,
    })
  })
})
