import {
  addPersona,
  isStrongPassword,
  movePersona,
  parseUserDetails,
  personaRowErrors,
  profileOptions,
  removePersona,
  toForm,
  toSavePayload,
  validateForm,
  validateNewPassword,
  validatePersonas,
} from '../user-form'
import { parseUserIdParam } from '../UserDetailsScreen'

const baseDetail = {
  id: 12,
  userName: 'amelia.hart',
  setPassword: null,
  accountActive: true,
  associatedStudentId: null,
  associatedStudentDescription: null,
  authenticateModeId: 0,
  isSuperUser: true,
  seatsAuthorisationByPersonas: true,
  seatsAuthenticationByOurIdentityProvider: false,
  emailAddress: 'amelia.hart@example.com',
  positionNumber: 'P-9',
  personas: [
    { id: 5, accessProfileId: 3, order: 2, userId: '12' },
    { id: 4, accessProfileId: 1, order: 1, userId: '12' },
  ],
  fullName: 'Amelia Hart',
  isMobileAppLoggingActive: false,
  displayName: 'Amelia',
  userSecurityLevelPermissionToProcess: null,
}

const raw = {
  detail: baseDetail,
  defaultPersonToAdd: { id: 0, accessProfileId: 0, order: 0, userId: null },
  accessProfileAvailables: [
    { id: 1, description: 'Admin' },
    { id: 3, description: 'Read Only' },
  ],
  accessProfileRestricted: [9],
  accessProfileAll: [
    { id: 1, description: 'Admin' },
    { id: 3, description: 'Read Only' },
    { id: 9, description: 'Restricted' },
  ],
  userSecurityLevelPermissionOverview: { userId: 12, school: 'None', isSuperUser: true, isOwnClasses: false },
}

describe('user details form rules', () => {
  const view = parseUserDetails(raw)

  it('parses the view model and sorts personas by order', () => {
    const form = toForm(view)
    expect(form.personas.map(row => row.id)).toEqual([4, 5])
    expect(form.userName).toBe('amelia.hart')
    expect(view.userSecurityLevelPermissionOverview?.school).toBe('None')
  })

  it('treats accessProfileId 0 as the empty [None] choice', () => {
    const created = parseUserDetails({
      ...raw,
      detail: { ...baseDetail, id: 0, personas: [{ id: 0, accessProfileId: 0, order: 0, userId: null }] },
    })
    expect(toForm(created).personas[0].accessProfileId).toBeNull()
    expect(validatePersonas(toForm(created), created.detail)).toBe('accessProfileRequired')
  })

  it('rejects duplicate access profiles only in personas mode', () => {
    const form = toForm(view)
    const duplicate = { ...form, personas: form.personas.map(row => ({ ...row, accessProfileId: 1 })) }
    expect(validatePersonas(duplicate, view.detail)).toBe('accessProfileDuplicate')
    expect(validatePersonas(duplicate, { ...view.detail, seatsAuthorisationByPersonas: false })).toBeNull()
  })

  it('adds, reorders and removes personas like legacy', () => {
    const rows = toForm(view).personas
    const added = addPersona(rows, view.defaultPersonToAdd)
    expect(added.at(-1)).toMatchObject({ id: 0, accessProfileId: null, order: 3 })
    const moved = movePersona(rows, rows[1].key, -1)
    expect(moved.map(row => row.id)).toEqual([5, 4])
    expect(moved.map(row => row.order)).toEqual([1, 2])
    expect(removePersona([rows[0]], rows[0].key)).toHaveLength(1)
    expect(removePersona(rows, rows[0].key)).toHaveLength(1)
  })

  it('flags each empty or repeated persona row for its inline message', () => {
    const rows = toForm(view).personas
    const errors = personaRowErrors([
      { ...rows[0], accessProfileId: 1 },
      { ...rows[1], accessProfileId: 1 },
      { ...rows[1], key: 'third', accessProfileId: null },
    ])
    expect([...errors]).toEqual([
      [rows[1].key, 'accessProfileDuplicate'],
      ['third', 'accessProfileRequired'],
    ])
    expect(personaRowErrors(rows).size).toBe(0)
  })

  it('offers all profiles only for a restricted selection', () => {
    expect(profileOptions(view, 9).map(item => item.id)).toEqual([1, 3, 9])
    expect(profileOptions(view, 1).map(item => item.id)).toEqual([1, 3])
  })

  it('requires user name and full name and blocks < and > only after Save', () => {
    const form = { ...toForm(view), userName: ' ', fullName: 'A <b>', emailAddress: 'x>y' }
    expect(validateForm(form, view.detail)).toEqual({ userName: 'required' })
    expect(validateForm(form, view.detail, true)).toEqual({
      userName: 'required',
      fullName: 'specialCharacters',
      emailAddress: 'specialCharacters',
    })
  })

  it('applies the < > rule to student text and the password confirmation', () => {
    const form = { ...toForm(view), studentDescription: 'Ben <', studentId: 7, passwordConfirmation: 'a>' }
    expect(validateForm(form, view.detail, true)).toEqual({
      student: 'specialCharacters',
      passwordConfirmation: 'specialCharacters',
    })
  })

  it('reports the first persona problem in legacy loop order', () => {
    const form = toForm(view)
    const rows = [
      { ...form.personas[0], accessProfileId: 1 },
      { ...form.personas[1], accessProfileId: 1 },
      { ...form.personas[1], key: 'third', accessProfileId: null },
    ]
    expect(validatePersonas({ ...form, personas: rows }, view.detail)).toBe('accessProfileDuplicate')
    expect(validatePersonas({ ...form, personas: [rows[2], ...rows] }, view.detail)).toBe(
      'accessProfileRequired',
    )
  })

  it('applies the password policy only when creating with our identity provider', () => {
    const creating = { ...view.detail, id: 0, seatsAuthenticationByOurIdentityProvider: true }
    const form = { ...toForm(view), userName: 'maya' }
    expect(validateForm({ ...form, setPassword: '' }, creating)).toMatchObject({
      setPassword: 'passwordRequired',
      passwordConfirmation: 'confirmRequired',
    })
    expect(
      validateForm({ ...form, setPassword: 'Str0ngPass!', passwordConfirmation: '' }, creating)
        .passwordConfirmation,
    ).toBe('confirmRequired')
    expect(validateForm({ ...form, setPassword: 'short1!A' }, creating).setPassword).toBe('passwordPolicy')
    expect(validateForm({ ...form, setPassword: 'Strongmaya1!' }, creating).setPassword).toBe(
      'passwordPolicy',
    )
    expect(
      validateForm({ ...form, setPassword: 'Str0ngPass!', passwordConfirmation: 'nope' }, creating)
        .passwordConfirmation,
    ).toBe('passwordConfirmation')
    expect(
      validateForm({ ...form, setPassword: 'Str0ngPass!', passwordConfirmation: 'Str0ngPass!' }, creating),
    ).toEqual({})
    expect(validateForm({ ...form, setPassword: '' }, view.detail).setPassword).toBeUndefined()
    expect(isStrongPassword('Abcdefgh1!')).toBe(true)
  })

  it('gives the set-password dialog a specific message per empty box and the mismatch only once confirm is filled', () => {
    expect(validateNewPassword('', '', 'maya')).toEqual({
      password: 'passwordRequired',
      confirm: 'confirmRequired',
    })
    expect(validateNewPassword('Str0ngPass!', '', 'maya')).toEqual({ confirm: 'confirmRequired' })
    expect(validateNewPassword('Str0ngPass!', 'other', 'maya')).toEqual({ confirm: 'passwordConfirmation' })
    expect(validateNewPassword('Str0ngPass!', 'Str0ngPass!', 'maya')).toEqual({})
  })

  it('needs a picked student when student text is typed', () => {
    const form = { ...toForm(view), studentDescription: 'Ben', studentId: null }
    expect(validateForm(form, view.detail).student).toBe('studentNotSelected')
    expect(validateForm({ ...form, studentId: 7 }, view.detail).student).toBeUndefined()
  })

  it('builds the UserDto payload untrimmed, keeping the loaded fields the form does not edit', () => {
    const form = { ...toForm(view), fullName: ' Amelia J Hart ', setPassword: 'ignored' }
    const payload = toSavePayload(form, view.detail)
    expect(payload).toMatchObject({
      id: 12,
      fullName: ' Amelia J Hart ',
      setPassword: null,
      isSuperUser: true,
      positionNumber: 'P-9',
      displayName: 'Amelia',
      userSecurityLevelPermissionToProcess: null,
      associatedStudentDescription: null,
    })
    expect(payload.personas).toEqual([
      { id: 4, accessProfileId: 1, order: 1, userId: '12' },
      { id: 5, accessProfileId: 3, order: 2, userId: '12' },
    ])
  })

  it('sends the password only when creating with our identity provider', () => {
    const creating = { ...view.detail, id: 0, seatsAuthenticationByOurIdentityProvider: true }
    expect(toSavePayload({ ...toForm(view), setPassword: 'Str0ngPass!' }, creating).setPassword).toBe(
      'Str0ngPass!',
    )
  })

  it('parses the route id', () => {
    expect(parseUserIdParam('new')).toBeNull()
    expect(parseUserIdParam('42')).toBe(42)
    expect(parseUserIdParam('0')).toBe('invalid')
    expect(parseUserIdParam('abc')).toBe('invalid')
  })
})
