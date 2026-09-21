import type { AccessProfilePermissionNode } from '@/types/access-profiles'
import {
  applyLevel,
  filterGroups,
  flattenPermissionGroups,
  levelOf,
  levelsFor,
  type StudioPermission,
} from '../permission-studio'

const action = (id: number, name: string) => ({ id, name, permissionDefinitionActionInItemId: id })

const NODES: AccessProfilePermissionNode[] = [
  {
    id: 0,
    description: null,
    expanded: true,
    permissions: null,
    childNodes: [
      {
        id: 1,
        description: 'Users',
        expanded: true,
        childNodes: [],
        permissions: [
          {
            id: 10,
            name: 'User',
            permissionDefinitionActions: [
              action(101, 'Access'),
              action(102, 'Add'),
              action(103, 'Edit'),
              action(104, 'Delete'),
            ],
          },
          { id: 11, name: 'Empty', permissionDefinitionActions: [] },
        ],
      },
    ],
  },
]

const user = (): StudioPermission => flattenPermissionGroups(NODES)[0].permissions[0]

describe('permission studio', () => {
  it('turns each node with permissions into a titled group and skips permissions without actions', () => {
    const groups = flattenPermissionGroups(NODES)
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ area: 'Users', title: 'Users' })
    expect(groups[0].permissions.map(permission => permission.name)).toEqual(['User'])
  })

  it('offers View and Edit only when they differ from None and Full', () => {
    expect(levelsFor(user())).toEqual(['none', 'view', 'edit', 'full'])
    const accessEdit: StudioPermission = {
      id: 1,
      name: 'X',
      actions: [
        { id: 1, name: 'Access' },
        { id: 2, name: 'Edit' },
      ],
    }
    expect(levelsFor(accessEdit)).toEqual(['none', 'view', 'full'])
    const single: StudioPermission = { id: 2, name: 'Y', actions: [{ id: 3, name: 'Run' }] }
    expect(levelsFor(single)).toEqual(['none', 'full'])
  })

  it('applies a level without touching other permissions and keeps their order', () => {
    const selected = applyLevel(user(), [900, 104], 'edit')
    expect(selected).toEqual([900, 101, 102, 103])
    expect(levelOf(user(), selected)).toBe('edit')
    expect(applyLevel(user(), selected, 'none')).toEqual([900])
    expect(levelOf(user(), [101, 104])).toBeNull()
    expect(levelOf(user(), [101, 102, 103, 104])).toBe('full')
  })

  it('filters by group title or permission name', () => {
    const groups = flattenPermissionGroups(NODES)
    expect(filterGroups(groups, 'users')).toHaveLength(1)
    expect(filterGroups(groups, 'nothing')).toEqual([])
    expect(filterGroups(groups, ' user ')[0].permissions).toHaveLength(1)
  })
})
