import {
  BAR_LIMIT,
  buildMenu,
  hasPermission,
  legacyHref,
  normalizeProfile,
  NOTIFICATIONS_PERMISSION,
  PermissionAction,
  PermissionItem,
  type ProfileItem,
} from '../admin-menu'

const grant = (item: number, ...actions: number[]): ProfileItem => ({
  id: String(item),
  actions: (actions.length ? actions : [PermissionAction.Access]).map(String),
})

// Permissions matching Gautham's screenshot: no Rollback.
const SCREENSHOT_PROFILE: ProfileItem[] = [
  grant(
    PermissionItem.Users,
    PermissionAction.Access,
    PermissionAction.Activity,
    PermissionAction.DeveloperKeyDashboard,
  ),
  grant(PermissionItem.AccessProfiles),
  grant(PermissionItem.ContactGroup),
  grant(PermissionItem.Activity),
  grant(PermissionItem.Devices),
  grant(PermissionItem.Rooms),
  grant(PermissionItem.ReadingsReport),
  grant(PermissionItem.Settings, PermissionAction.Access, PermissionAction.Contacts),
  grant(PermissionItem.FileTemplate),
  grant(PermissionItem.JobSchedule),
  grant(PermissionItem.Case),
  grant(PermissionItem.LessonType),
  grant(PermissionItem.Import),
  grant(PermissionItem.Engagement),
  grant(PermissionItem.StudentsAdmin),
  grant(PermissionItem.Integration),
  grant(PermissionItem.UserNotifications),
]

describe('legacy Admin menu rules', () => {
  it('matches the legacy bar: six entries, then More, bell kept out of both', () => {
    const { bar, more } = buildMenu(SCREENSHOT_PROFILE)
    expect(bar.map(e => e.fallback)).toEqual([
      'Users',
      'Devices',
      'Settings',
      'Job Schedule',
      'Cases',
      'Lesson Type',
    ])
    expect(more.map(e => e.fallback)).toEqual(['Imports', 'Engagement', 'Students', 'Integrations'])
    expect(bar).toHaveLength(BAR_LIMIT)
    expect(hasPermission(SCREENSHOT_PROFILE, NOTIFICATIONS_PERMISSION)).toBe(true)
  })

  it('shows only one entry per group slot, falling back like data-screen-code-no', () => {
    const onlyContactGroup = buildMenu([grant(PermissionItem.ContactGroup), grant(PermissionItem.Rooms)])
    expect(onlyContactGroup.bar.map(e => e.fallback)).toEqual(['Contact Group', 'Room'])

    const usersAndProfiles = buildMenu([grant(PermissionItem.Users), grant(PermissionItem.AccessProfiles)])
    expect(usersAndProfiles.bar.map(e => e.fallback)).toEqual(['Users'])
  })

  it('filters dropdown entries by their own permission and keeps unguarded ones', () => {
    const { bar } = buildMenu([
      grant(PermissionItem.Users),
      grant(PermissionItem.Settings),
      grant(PermissionItem.Case),
    ])
    const users = bar.find(e => e.id === 'users')
    const settings = bar.find(e => e.id === 'settings')
    const cases = bar.find(e => e.id === 'cases')
    expect(users?.children.map(c => c.fallback)).toEqual(['User'])
    expect(settings?.children.map(c => c.fallback)).toEqual(['Settings'])
    expect(cases?.children.map(c => c.fallback)).toEqual(['Workflow Admin', 'Student Workflow'])
  })

  it('shows Rollback when granted and hides Analytics as legacy does', () => {
    const { bar } = buildMenu([grant(PermissionItem.Rollback), grant(36)])
    expect(bar.map(e => e.fallback)).toEqual(['Rollback'])
  })

  it('gives an empty menu without a profile', () => {
    expect(buildMenu(normalizeProfile(null))).toEqual({ bar: [], more: [] })
  })

  it('normalizes camelCase and PascalCase claim payloads', () => {
    expect(
      normalizeProfile([{ Id: 6, Actions: [{ Id: 1 }] }, { id: '9', actions: [{ id: '1' }] }, 'junk']),
    ).toEqual([
      { id: '6', actions: ['1'] },
      { id: '9', actions: ['1'] },
    ])
  })

  it('links to the legacy Admin route', () => {
    expect(legacyHref('#/User')).toBe('/Seats.Trunk.Admin/#/User')
  })

  it('SL-34 finds an action on a repeated claim item, like swapp.js:674', () => {
    const profile = [
      { id: '43', actions: ['1'] },
      { id: '43', actions: ['53'] },
    ]
    expect(hasPermission(profile, { item: 43, action: 53 })).toBe(true)
    expect(hasPermission(profile, { item: 43, action: 99 })).toBe(false)
  })
})
