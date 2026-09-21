import { renderHook } from '@testing-library/react'
import { buildMenu, PermissionItem, type ProfileItem } from '../admin-menu'
import { useMoreNav } from '../use-more-nav'

const everything: ProfileItem[] = Object.values(PermissionItem).map(id => ({
  id: String(id),
  actions: Array.from({ length: 15 }, (_, index) => String(index + 1)),
}))

jest.mock('../use-shell-data', () => ({
  useShellMenu: () => ({ layout: jest.requireActual('../admin-menu').buildMenu(everythingProfile()) }),
}))
jest.mock('@/shared/resources', () => ({ useResources: () => ({ text: (key: string) => key }) }))

function everythingProfile() {
  return everything
}

describe('useMoreNav', () => {
  const more = buildMenu(everything).more

  it('keeps every More area in the sidebar for a single-page area', () => {
    const { result } = renderHook(() => useMoreNav('imports', []))
    expect(result.current?.sections.map(section => section.id)).toEqual(more.map(entry => entry.id))
  })

  it('nests the open area pages under their area', () => {
    const { result } = renderHook(() => useMoreNav('engagement-history', []))
    const ids = result.current?.sections.map(section => section.id) ?? []
    const at = ids.indexOf('engagement')
    expect(ids.slice(at + 1, at + 3)).toEqual(['engagement-configuration', 'engagement-history'])
    expect(result.current?.sections.find(section => section.id === 'engagement-history')?.nested).toBe(true)
  })

  it('leaves areas outside More alone', () => {
    const { result } = renderHook(() => useMoreNav('device', []))
    expect(result.current).toBeNull()
  })
})
