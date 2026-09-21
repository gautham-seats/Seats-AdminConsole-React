import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AnchorHTMLAttributes } from 'react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { ProfileProvider } from '@/shared/shell/profile'
import { SettingsScreen } from '../SettingsScreen'

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props} />
  ),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src }: { src: string | { src: string } }) => (
    <span data-testid="image" data-src={typeof src === 'string' ? src : src.src} />
  ),
}))

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)

const SETTINGS = [
  { id: 1, key: 'ONLINE_HELP_URL', value: 'https://help.example.com', description: null },
  { id: 2, key: 'MENU_BACKGROUND_COLOR', value: '#1566a2', description: null },
  { id: 3, key: 'MENU_CUSTOM_LOGO', value: 'logo.png', description: null },
  { id: 4, key: 'CUSTOM_ACCESSIBILITY_STATEMENT_NAME', value: '', description: null },
  { id: 5, key: 'CUSTOM_ACCESSIBILITY_STATEMENT_URL', value: '', description: null },
  { id: 6, key: 'TABLE_BACKGROUND_COLOR', value: '#1566a2', description: null },
  { id: 7, key: 'TABLE_HEADER_TEXT_COLOR', value: '#ffffff', description: null },
]

type Options = {
  actions?: number[]
  save?: () => Promise<unknown>
  loadFails?: boolean
  empty?: boolean
  settings?: typeof SETTINGS
}

function setup({
  actions = [1, 3],
  save = () => Promise.resolve(undefined),
  loadFails = false,
  empty = false,
  settings = SETTINGS,
}: Options = {}) {
  get.mockImplementation((path: string) => {
    if (path === 'UserApi/GetClaims')
      return Promise.resolve([
        { id: 10, actions: actions.map(id => ({ id })) },
        { id: 12, actions: [{ id: 1 }] },
      ])
    if (path === 'SettingsApi/MENU_CUSTOM_LOGO')
      return Promise.resolve({ ...SETTINGS[2], value: 'https://files.example.com/logo.png' })
    return Promise.resolve(null)
  })
  post.mockImplementation((path: string) => {
    if (path === 'SettingsApi/GetSettingByKeys')
      return loadFails
        ? Promise.reject(new ApiError('http', '/Seats.Trunk.Admin/api/SettingsApi/GetSettingByKeys', 500))
        : Promise.resolve(empty ? null : settings)
    if (path === 'SettingsApi') return save()
    return Promise.resolve({ 'en-GB': {} })
  })
  return render(
    <ProfileProvider>
      <SettingsScreen />
    </ProfileProvider>,
  )
}

const saveCalls = () => post.mock.calls.filter(([path]) => path === 'SettingsApi')

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
})

describe('SettingsScreen', () => {
  it('loads the settings with the legacy keys and fills the form', async () => {
    setup()
    expect(await screen.findByLabelText('Online Help Url')).toHaveValue('https://help.example.com')
    expect(post).toHaveBeenCalledWith(
      'SettingsApi/GetSettingByKeys',
      expect.objectContaining({
        body: expect.arrayContaining(['MENU_CUSTOM_LOGO', 'TABLE_HEADER_TEXT_COLOR']),
      }),
    )
    expect(screen.getByText('logo.png')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'File Template' })).toHaveAttribute(
      'href',
      '/settings/file-templates',
    )
    expect(screen.queryByRole('link', { name: 'Resources' })).not.toBeInTheDocument()
  })

  it('blocks save with the legacy message when only one statement field is filled', async () => {
    setup()
    fireEvent.change(await screen.findByLabelText('Custom accessibility statement name'), {
      target: { value: 'Statement' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There are fields with input validation errors.',
    )
    expect(screen.getByLabelText('Custom accessibility statement URL')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(saveCalls()).toHaveLength(0)
  })

  it('posts the changed settings, confirms and clears the unsaved state', async () => {
    setup()
    fireEvent.change(await screen.findByLabelText('Menu color'), { target: { value: '#e91e63' } })
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saveCalls()).toHaveLength(1)
    expect(saveCalls()[0][1]?.body).toContainEqual({ id: 2, value: '#e91e63', key: 'MENU_BACKGROUND_COLOR' })
    expect(await screen.findByRole('status')).toHaveTextContent('The item was saved successfully.')
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('explains safe mode instead of a generic save error', async () => {
    setup({ save: () => Promise.reject(new ApiError('blocked', '/Seats.Trunk.Admin/api/SettingsApi')) })
    await screen.findByLabelText('Menu color')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('safe mode')
  })

  it('names the missing statement field and rechecks every field while typing', async () => {
    setup()
    const name = await screen.findByLabelText('Custom accessibility statement name')
    const url = screen.getByLabelText('Custom accessibility statement URL')
    const help = screen.getByLabelText('Online Help Url')
    fireEvent.change(name, { target: { value: 'Statement' } })
    fireEvent.change(url, { target: { value: '' } })
    fireEvent.change(help, { target: { value: 'nope' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Enter the accessibility statement web address.')).toBeInTheDocument()
    expect(help).toHaveAttribute('aria-invalid', 'true')
    expect(url).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(url, { target: { value: 'bad' } })
    expect(screen.queryByText('Enter the accessibility statement web address.')).not.toBeInTheDocument()
    expect(url).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(url, { target: { value: 'https://site.example.com/a11y' } })
    expect(url).not.toHaveAttribute('aria-invalid')
    expect(help).toHaveAttribute('aria-invalid', 'true')
    fireEvent.change(name, { target: { value: '' } })
    expect(screen.getByText('Enter a name for the accessibility statement link.')).toBeInTheDocument()
    expect(saveCalls()).toHaveLength(0)
  })

  it('discard puts back the loaded values', async () => {
    setup()
    const help = await screen.findByLabelText('Online Help Url')
    fireEvent.change(help, { target: { value: 'https://other.example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(help).toHaveValue('https://help.example.com')
  })

  it('is read-only without Settings edit', async () => {
    setup({ actions: [1] })
    expect(await screen.findByLabelText('Online Help Url')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.getByText('View only')).toBeInTheDocument()
  })

  it('shows an error with retry when settings cannot load', async () => {
    setup({ loadFails: true })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument())
  })

  it('keeps fields editable when the server returns no settings, and refuses to save them', async () => {
    setup({ empty: true })
    const help = await screen.findByLabelText('Online Help Url')
    expect(help).toBeEnabled()
    expect(screen.getByRole('note')).toHaveTextContent('not found on the server')
    fireEvent.change(help, { target: { value: 'https://help.example.com' } })
    expect(help).toHaveValue('https://help.example.com')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('cannot be saved')
    expect(saveCalls()).toHaveLength(0)
  })

  it('D-125 G4 saves the rows that exist and reports the field with no setting row', async () => {
    setup({ settings: SETTINGS.filter(setting => setting.key !== 'ONLINE_HELP_URL') })
    const help = await screen.findByLabelText('Online Help Url')
    fireEvent.change(help, { target: { value: 'https://help.example.com' } })
    fireEvent.change(screen.getByLabelText('Table header text color'), { target: { value: '#000000' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(saveCalls()).toHaveLength(1)
    const body = saveCalls()[0][1]?.body as Array<{ key: string; value: string | null }>
    expect(body.map(row => row.key)).not.toContain('ONLINE_HELP_URL')
    expect(body.find(row => row.key === 'TABLE_HEADER_TEXT_COLOR')?.value).toBe('#000000')
    expect(await screen.findByRole('alert')).toHaveTextContent('left unchanged')
    expect(help).toHaveValue('')
  })

  it('offers default colours, an open link button and a readability warning', async () => {
    setup()
    const text = await screen.findByLabelText('Table header text color')
    expect(screen.getByRole('link', { name: 'Open link' })).toHaveAttribute(
      'href',
      'https://help.example.com/',
    )
    expect(screen.getByRole('link', { name: 'Open link' })).toHaveAttribute('rel', 'noopener noreferrer')
    fireEvent.change(text, { target: { value: '#1e88e5' } })
    expect(await screen.findByText(/Hard to read/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Use default colours' }))
    expect(screen.getByLabelText('Menu color')).toHaveValue('')
    expect(screen.getByLabelText('Menu color')).toHaveAttribute('placeholder', 'Default · #1566a2')
    expect(screen.queryByText(/Hard to read/)).not.toBeInTheDocument()
  })

  it('shows no access without Settings access', async () => {
    setup({ actions: [] })
    expect(await screen.findByText('You do not have permission to view this page.')).toBeInTheDocument()
  })
})
