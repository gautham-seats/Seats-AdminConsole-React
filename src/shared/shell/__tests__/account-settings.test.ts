import { extractPasswordAccount, readAccessibility, validatePassword } from '../account-settings'

describe('account settings', () => {
  it('defaults accessibility like legacy when the cookies are missing', () => {
    expect(readAccessibility('')).toEqual({ highContrast: 'false', autoCloseBanner: 'true' })
    expect(readAccessibility('_accset_hc=true; _accset_acb=false')).toEqual({
      highContrast: 'true',
      autoCloseBanner: 'false',
    })
  })

  it('shows Change Password only when the layout renders it, with the user name', () => {
    const html = `<li id="changePassContainer" role="none"></li><script>changePasswordController.init({ userName:  'jo&#39;s.user', })</script>`
    expect(extractPasswordAccount(html)).toEqual({ canChangePassword: true, userName: "jo's.user" })
    expect(extractPasswordAccount('<ul></ul>').canChangePassword).toBe(false)
  })

  it('applies the legacy password rules', () => {
    const empty = validatePassword({ oldPassword: '', newPassword: '', confirmPassword: '' }, 'jo')
    expect(empty.oldPassword).toBe('Enter your old password.')
    expect(empty.newPassword).toBe('Enter a new password.')
    expect(empty.confirmPassword).toBe('Confirm your new password.')
    expect(
      validatePassword({ oldPassword: 'a', newPassword: 'short1!A', confirmPassword: 'short1!A' }, 'jo')
        .newPassword,
    ).toMatch(/ten characters/)
    expect(
      validatePassword(
        { oldPassword: 'a', newPassword: 'Hello-jo-12345', confirmPassword: 'Hello-jo-12345' },
        'jo',
      ).newPassword,
    ).toMatch(/ten characters/)
    expect(
      validatePassword({ oldPassword: 'a', newPassword: 'Strong-Pass-123', confirmPassword: 'x' }, 'jo'),
    ).toEqual({
      confirmPassword: 'The confirmation does not match the password.',
    })
    expect(
      validatePassword(
        { oldPassword: 'a', newPassword: 'Strong-Pass-123', confirmPassword: 'Strong-Pass-123' },
        'jo',
      ),
    ).toEqual({})
  })
})
