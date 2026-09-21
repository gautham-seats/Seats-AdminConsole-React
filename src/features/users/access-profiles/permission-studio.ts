import type { AccessProfilePermissionNode, PermissionDefinitionItemDto } from '@/types/access-profiles'

export type PermissionLevel = 'none' | 'view' | 'edit' | 'full'
export const PERMISSION_LEVELS: readonly PermissionLevel[] = ['none', 'view', 'edit', 'full']

export type StudioPermission = {
  id: number
  name: string
  actions: { id: number; name: string }[]
}

export type StudioGroup = { key: string; area: string; title: string; permissions: StudioPermission[] }

const VIEW = /^(access|view|read)$/i
const EDIT = /^(add|edit|create|update)$/i

const toPermission = (item: PermissionDefinitionItemDto): StudioPermission => ({
  id: item.id,
  name: item.name ?? '',
  actions: (item.permissionDefinitionActions ?? []).map(action => ({
    id: action.permissionDefinitionActionInItemId,
    name: action.name ?? '',
  })),
})

// AccessProfile/Details.cshtml:76-100: every tree node that carries permissions becomes one titled group.
export function flattenPermissionGroups(nodes: readonly AccessProfilePermissionNode[]): StudioGroup[] {
  const groups: StudioGroup[] = []
  const walk = (items: readonly AccessProfilePermissionNode[], path: string[], keyPath: number[]) =>
    items.forEach((node, index) => {
      const nextPath = node.description ? [...path, node.description] : path
      const nextKey = [...keyPath, index]
      const permissions = (node.permissions ?? []).map(toPermission).filter(item => item.actions.length > 0)
      if (permissions.length > 0)
        groups.push({
          key: nextKey.join('.'),
          area: nextPath[0] ?? '',
          title: nextPath.join(' › '),
          permissions,
        })
      walk(node.childNodes, nextPath, nextKey)
    })
  walk(nodes, [], [])
  return groups
}

export type StudioArea = { key: string; area: string; permissions: StudioPermission[] }

// The legacy tree rail: one entry per top node (Seats Website, Admin Website, Mobile App…).
export function groupByArea(groups: readonly StudioGroup[]): StudioArea[] {
  const areas = new Map<string, StudioArea>()
  for (const group of groups) {
    const area = group.area || group.title
    const found = areas.get(area) ?? { key: group.key, area, permissions: [] }
    found.permissions.push(...group.permissions)
    areas.set(area, found)
  }
  return [...areas.values()]
}

export const countActions = (permissions: readonly StudioPermission[]) =>
  permissions.reduce((total, permission) => total + permission.actions.length, 0)

export const countGranted = (permissions: readonly StudioPermission[], selected: readonly number[]) =>
  permissions.reduce((total, permission) => total + grantedActions(permission, selected).length, 0)

export function filterPermissions(permissions: readonly StudioPermission[], query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return [...permissions]
  return permissions.filter(
    permission =>
      permission.name.toLowerCase().includes(needle) ||
      permission.actions.some(action => action.name.toLowerCase().includes(needle)),
  )
}

const viewActions = (permission: StudioPermission) => {
  const named = permission.actions.filter(action => VIEW.test(action.name))
  return named.length > 0 ? named : permission.actions.slice(0, 1)
}

// View and Edit only make sense when they pick a different set than None or Full.
export function levelsFor(permission: StudioPermission): PermissionLevel[] {
  const total = permission.actions.length
  const view = viewActions(permission).length
  const edit =
    view + permission.actions.filter(action => EDIT.test(action.name) && !VIEW.test(action.name)).length
  return PERMISSION_LEVELS.filter(level => {
    if (level === 'view') return view < total
    if (level === 'edit') return edit > view && edit < total
    return true
  })
}

const idsFor = (permission: StudioPermission, level: PermissionLevel) => {
  if (level === 'none') return []
  if (level === 'full') return permission.actions.map(action => action.id)
  const view = viewActions(permission)
  if (level === 'view') return view.map(action => action.id)
  return permission.actions
    .filter(action => view.includes(action) || EDIT.test(action.name))
    .map(action => action.id)
}

// Returns null when the ticked actions match no preset level (a custom mix).
export function levelOf(permission: StudioPermission, selected: readonly number[]): PermissionLevel | null {
  const on = new Set(
    permission.actions.filter(action => selected.includes(action.id)).map(action => action.id),
  )
  return (
    levelsFor(permission).find(level => {
      const ids = idsFor(permission, level)
      return ids.length === on.size && ids.every(id => on.has(id))
    }) ?? null
  )
}

export function applyLevel(
  permission: StudioPermission,
  selected: readonly number[],
  level: PermissionLevel,
): number[] {
  const own = new Set(permission.actions.map(action => action.id))
  return [...selected.filter(id => !own.has(id)), ...idsFor(permission, level)]
}

export const grantedActions = (permission: StudioPermission, selected: readonly number[]) =>
  permission.actions.filter(action => selected.includes(action.id))

export function filterGroups(groups: readonly StudioGroup[], query: string): StudioGroup[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return [...groups]
  return groups
    .map(group =>
      group.title.toLowerCase().includes(needle)
        ? group
        : {
            ...group,
            permissions: group.permissions.filter(permission =>
              permission.name.toLowerCase().includes(needle),
            ),
          },
    )
    .filter(group => group.permissions.length > 0)
}
