import fs from 'node:fs'
import path from 'node:path'
import { extractSessionHeader } from '../session-header'
import { extractVerificationToken } from '../verification-token'

const LOGIN_PARTIAL = `
  <span class="content-text" style="font-weight: bold; height: 30px;">AO</span>
  <ul class="dropdown-menu pull-right content" style="min-width: 14em">
    <li style="text-align: center;" role="none"><div class="menu-text-container">Ada O&#39;Leary</div></li>
    <li style="text-align: center;" role="none"><div class="menu-text-container">test.user@example.com</div></li>
    <li class="divider"></li>
  </ul>
  <script>swapp.init({ userId: parseInt('4821') })</script>`

describe('session header from the legacy layout', () => {
  it('reads name, email and initials rendered by _LoginPartial', () => {
    expect(extractSessionHeader(LOGIN_PARTIAL)).toEqual({
      fullName: "Ada O'Leary",
      email: 'test.user@example.com',
      initials: 'AO',
      userId: '4821',
    })
  })

  it('has no user id when the claim is missing', () => {
    expect(
      extractSessionHeader(
        `${LOGIN_PARTIAL.split('<script>')[0]}<script>swapp.init({ userId: parseInt('') })</script>`,
      )?.userId,
    ).toBeNull()
  })

  it('returns null for a page without the login partial', () => {
    expect(extractSessionHeader('<html>sign in</html>')).toBeNull()
  })

  it('SL-09 decodes every entity Razor can emit', () => {
    const html = LOGIN_PARTIAL.replace('Ada O&#39;Leary', 'Zo&#xEB; &amp; S&#248;ren&nbsp;Müller')
    expect(extractSessionHeader(html)?.fullName).toBe('Zoë & Søren Müller')
  })
})

// SL-08: the regexes are only as good as the real markup; this reads the legacy corpus when it is present.
const CORPUS = path.resolve(__dirname, '../../../../../_graphs/admin-legacy/corpus/views/Shared')
const corpusPresent = fs.existsSync(path.join(CORPUS, '_LoginPartial.cshtml'))

;(corpusPresent ? describe : describe.skip)('session header against the legacy corpus markup', () => {
  const razor = (file: string, values: Record<string, string>) =>
    Object.entries(values).reduce(
      (html, [token, value]) => html.split(token).join(value),
      fs.readFileSync(path.join(CORPUS, file), 'utf8'),
    )

  it('SL-08 reads name, e-mail, initials, user id and the token from _LoginPartial and _Layout', () => {
    const partial = razor('_LoginPartial.cshtml', {
      '@initials': 'AO',
      '@fullName': 'Ada O&#39;Leary',
      '@email': 'ada@example.com',
    })
    const layout = razor('_Layout.cshtml', {
      '@Html.RequestVerificationToken()': 'cookieToken:formToken',
      '@(userId)': '4821',
    })
    const header = extractSessionHeader(`${layout}${partial}`)
    expect(header).toMatchObject({
      fullName: "Ada O'Leary",
      email: 'ada@example.com',
      initials: 'AO',
      userId: '4821',
    })
    expect(extractVerificationToken(layout)).toBe('cookieToken:formToken')
  })
})
