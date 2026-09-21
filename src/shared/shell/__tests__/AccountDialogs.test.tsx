import { act, fireEvent, render, screen } from '@testing-library/react'
import { api, ApiError } from '@/shared/api'
import { clearResourceCache } from '@/shared/resources'
import { AccessibilityDialog, ChangePasswordDialog, LanguageDialog } from '../AccountDialogs'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const get = jest.mocked(api.get)
const post = jest.mocked(api.post)

const clearCookies = () =>
  ['_accset_hc', '_accset_acb', '_cultureInfo'].forEach(name => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  })

beforeEach(() => {
  jest.clearAllMocks()
  clearResourceCache()
  clearCookies()
  post.mockImplementation((path: string) =>
    path === 'SettingsApi/GetSettingByKeys'
      ? Promise.resolve([
          { key: 'CUSTOM_ACCESSIBILITY_STATEMENT_NAME', value: 'Our statement' },
          { key: 'CUSTOM_ACCESSIBILITY_STATEMENT_URL', value: 'https://uni.example/a11y' },
        ])
      : Promise.resolve({ 'en-GB': {} }),
  )
  get.mockImplementation(() => Promise.resolve({ key: 'CultureInfo', value: 'en-US' }))
})

describe('AccessibilityDialog', () => {
  it('shows both statements and saves the choices as cookies', async () => {
    const onOpenChange = jest.fn()
    render(<AccessibilityDialog open onOpenChange={onOpenChange} />)
    expect(screen.getByRole('link', { name: 'SEAtS Accessibility Statement' })).toHaveAttribute(
      'href',
      'https://www.seatssoftware.com/accessibility-statement/',
    )
    expect(await screen.findByRole('link', { name: /Our statement/ })).toHaveAttribute(
      'href',
      'https://uni.example/a11y',
    )
    expect(screen.getByLabelText('High Contrast')).toHaveTextContent('No')
    expect(screen.getByLabelText('Auto close banner messages')).toHaveTextContent('Yes')
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(document.cookie).toContain('_accset_hc=false')
    expect(document.cookie).toContain('_accset_acb=true')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('ChangePasswordDialog', () => {
  const setup = () => {
    const onNotice = jest.fn()
    const onOpenChange = jest.fn()
    render(<ChangePasswordDialog open onOpenChange={onOpenChange} userName="jo" onNotice={onNotice} />)
    const type = (label: string, value: string) =>
      fireEvent.change(screen.getByLabelText(label), { target: { value } })
    return { onNotice, onOpenChange, type }
  }

  it('checks the rules before sending anything', async () => {
    setup()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(screen.getByText('Enter your old password.')).toBeInTheDocument()
    expect(screen.getByText('Enter a new password.')).toBeInTheDocument()
    expect(screen.getByText('Confirm your new password.')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalledWith('UserApi/ChangePassword', expect.anything())
  })

  // Requirements 8.1 and 8.2: errors clear while typing; the mismatch flags both new and confirm.
  it('clears errors as the user types and flags both boxes on a mismatch', async () => {
    const { type } = setup()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    type('Old Password', 'Old-Pass-123')
    expect(screen.queryByText('Enter your old password.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Old Password')).not.toHaveAttribute('aria-invalid')
    type('New Password', 'Strong-Pass-123')
    type('Confirm Password', 'Strong-Pass-12')
    expect(screen.getByText('The confirmation does not match the password.')).toBeInTheDocument()
    expect(screen.getByLabelText('New Password')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Confirm Password')).toHaveAttribute('aria-invalid', 'true')
    type('Confirm Password', 'Strong-Pass-123')
    expect(screen.queryByText('The confirmation does not match the password.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('New Password')).not.toHaveAttribute('aria-invalid')
  })

  it('sends the legacy body and shows the safe mode message when blocked', async () => {
    const { onNotice, type } = setup()
    type('Old Password', 'Old-Pass-123')
    type('New Password', 'Strong-Pass-123')
    type('Confirm Password', 'Strong-Pass-123')
    post.mockImplementation((path: string) =>
      path === 'UserApi/ChangePassword'
        ? Promise.reject(new ApiError('blocked', '/api/UserApi/ChangePassword'))
        : Promise.resolve({ 'en-GB': {} }),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    expect(post).toHaveBeenCalledWith('UserApi/ChangePassword', {
      body: {
        userName: 'jo',
        oldPassword: 'Old-Pass-123',
        newPassword: 'Strong-Pass-123',
        confirmPassword: 'Strong-Pass-123',
      },
    })
    expect(onNotice).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('safe mode') }),
    )
  })
})

describe('LanguageDialog', () => {
  it('starts from the server culture and writes the cookie before reloading', async () => {
    const reload = jest.fn()
    render(<LanguageDialog open onOpenChange={jest.fn()} reload={reload} />)
    expect(await screen.findByLabelText('Language')).toHaveTextContent('English - US')
    expect(get).toHaveBeenCalledWith('SettingsApi/CultureInfo', expect.anything())
    fireEvent.click(screen.getByRole('button', { name: 'Ok' }))
    expect(document.cookie).toContain('_cultureInfo=en-US')
    expect(reload).toHaveBeenCalled()
  })

  it('SF-48 does not write a blank culture cookie when the server setting is empty', async () => {
    get.mockImplementation((path: string) =>
      Promise.resolve(path === 'SettingsApi/CultureInfo' ? { key: 'CultureInfo', value: '' } : null),
    )
    const reload = jest.fn()
    render(<LanguageDialog open onOpenChange={jest.fn()} reload={reload} />)
    await screen.findByLabelText('Language')
    const ok = screen.getByRole('button', { name: 'Ok' })
    expect(ok).toBeDisabled()
    fireEvent.click(ok)
    expect(document.cookie).not.toContain('_cultureInfo=;')
    expect(reload).not.toHaveBeenCalled()
  })
})
