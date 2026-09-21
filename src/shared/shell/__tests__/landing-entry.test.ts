import { landingEntry, PermissionItem } from '../admin-menu'

const item = (id: number) => ({ id: String(id), actions: ['1'] })

describe('landingEntry', () => {
  it('opens Users when the user can see it', () => {
    expect(landingEntry([item(PermissionItem.Settings), item(PermissionItem.Users)])?.id).toBe('users')
  })

  it('falls back to the first visible menu entry', () => {
    expect(landingEntry([item(PermissionItem.JobSchedule), item(PermissionItem.Settings)])?.id).toBe(
      'settings',
    )
  })

  it('returns null when nothing is visible', () => {
    expect(landingEntry([])).toBeNull()
  })
})
