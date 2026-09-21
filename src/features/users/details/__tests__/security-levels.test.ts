import {
  addLevelPermission,
  applyLevel,
  applyOwnClasses,
  parseLevelPermissions,
  removeLevelPermissions,
  summarizeLevel,
} from '../security-levels'
import { validateNewPassword } from '../user-form'

const school = (id: number, schoolId: number, name: string) =>
  parseLevelPermissions({
    userSecurityLevelPermissions: [{ id, schoolId, name, school: { id: schoolId } }],
  })[0]

describe('security level helpers', () => {
  it('parses the level response, keeps nested fields and treats null as empty', () => {
    expect(parseLevelPermissions({ securityLevel: 'school', userSecurityLevelPermissions: null })).toEqual([])
    const item = school(4, 30, 'Law')
    expect(item).toMatchObject({ id: 4, schoolId: 30, name: 'Law', courseId: null, isSuperUser: false })
    expect(item.school).toEqual({ id: 30 })
  })

  it('adds a picked level once with a negative temporary id', () => {
    const start = [school(4, 30, 'Law')]
    const once = addLevelPermission(start, 'school', { id: 31, description: 'Business' }, 12)
    expect(once[1]).toMatchObject({ id: -1, schoolId: 31, name: 'Business', userId: 12, userName: '' })
    const twice = addLevelPermission(once, 'school', { id: 32, description: 'Arts' }, 12)
    expect(twice[2].id).toBe(-2)
    expect(addLevelPermission(twice, 'school', { id: 31, description: 'Business' }, 12)).toHaveLength(3)
    expect(removeLevelPermissions(twice, new Set([-1, 4])).map(item => item.name)).toEqual(['Arts'])
  })

  it('replaces an applied level or appends a new one', () => {
    const first = applyLevel([], 'school', [school(4, 30, 'Law')])
    const second = applyLevel(first, 'course', [])
    const replaced = applyLevel(second, 'school', [])
    expect(replaced.map(entry => [entry.securityLevel, entry.userSecurityLevelPermissions.length])).toEqual([
      ['school', 0],
      ['course', 0],
    ])
  })

  it('stores lecturer visibility as its own entry', () => {
    expect(applyOwnClasses([], true, 12)[0]).toMatchObject({
      securityLevel: 'isOwnClasses',
      userSecurityLevelPermissions: [{ id: 0, isOwnClasses: true, isSuperUser: false }],
    })
    expect(applyOwnClasses(applyOwnClasses([], true, 12), false, 12)[0].userSecurityLevelPermissions).toEqual(
      [],
    )
  })

  it('summarises names like the legacy overview', () => {
    expect(summarizeLevel([])).toBeNull()
    expect(summarizeLevel([school(1, 1, 'Law'), school(2, 2, 'Arts')])).toBe('Law;Arts;')
    const long = summarizeLevel([
      school(1, 1, 'School of Business and Management'),
      school(2, 2, 'School of Engineering'),
    ])
    expect(long).toBe('School of Business and Management;School...')
  })
})

describe('validateNewPassword', () => {
  it('requires a strong password without the user name and a matching confirmation', () => {
    expect(validateNewPassword('', '', 'amelia')).toEqual({
      password: 'passwordRequired',
      confirm: 'confirmRequired',
    })
    expect(validateNewPassword('short1!A', 'short1!A', 'amelia')).toEqual({ password: 'passwordPolicy' })
    expect(validateNewPassword('Amelia-amelia-1', 'Amelia-amelia-1', 'amelia')).toEqual({
      password: 'passwordPolicy',
    })
    expect(validateNewPassword('Str0ng!Passw0rd', 'other', 'amelia')).toEqual({
      confirm: 'passwordConfirmation',
    })
    expect(validateNewPassword('Str0ng!Passw0rd', 'Str0ng!Passw0rd', 'amelia')).toEqual({})
  })
})
