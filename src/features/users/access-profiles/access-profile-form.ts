import type {
  AccessProfileContainerViewModel,
  AccessProfileEventTypes,
  AccessProfilePermissionNode,
  AccessProfileViewModel,
  AccessProfileVisibilityList,
  EventTypeInAccessProfileDto,
  ItemTypeViewModel,
  LandingPageViewModel,
  PermissionDefinitionItemDto,
} from '@/types/access-profiles'

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)
const int = (value: unknown): number | null => (typeof value === 'number' ? value : null)
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const ints = (value: unknown): number[] => list(value).filter((id): id is number => typeof id === 'number')

function parseEvent(raw: unknown): EventTypeInAccessProfileDto | null {
  const r = record(raw)
  if (typeof r.type !== 'number' || typeof r.subType !== 'number') return null
  return {
    id: int(r.id) ?? 0,
    accessProfileId: int(r.accessProfileId) ?? 0,
    type: r.type,
    subType: r.subType,
    detail: r.detail === true,
    comment: r.comment === true,
  }
}

const parseEvents = (value: unknown) =>
  list(value)
    .map(parseEvent)
    .filter((item): item is EventTypeInAccessProfileDto => item !== null)

function parsePermission(raw: unknown): PermissionDefinitionItemDto | null {
  const r = record(raw)
  if (typeof r.id !== 'number') return null
  return {
    id: r.id,
    name: text(r.name),
    permissionDefinitionActions: Array.isArray(r.permissionDefinitionActions)
      ? r.permissionDefinitionActions.flatMap(action => {
          const a = record(action)
          return typeof a.id === 'number' && typeof a.permissionDefinitionActionInItemId === 'number'
            ? [
                {
                  id: a.id,
                  name: text(a.name),
                  permissionDefinitionActionInItemId: a.permissionDefinitionActionInItemId,
                },
              ]
            : []
        })
      : null,
  }
}

function parseNode(raw: unknown): AccessProfilePermissionNode {
  const r = record(raw)
  return {
    id: int(r.id) ?? 0,
    description: text(r.description),
    expanded: r.expanded !== false,
    childNodes: list(r.childNodes).map(parseNode),
    permissions: Array.isArray(r.permissions)
      ? r.permissions.map(parsePermission).filter((p): p is PermissionDefinitionItemDto => p !== null)
      : null,
  }
}

export function parseAccessProfileContainer(raw: unknown): AccessProfileContainerViewModel {
  const root = record(raw)
  const d = record(root.details)
  return {
    details: {
      id: int(d.id) ?? 0,
      name: text(d.name),
      externalKey: text(d.externalKey),
      isGeneralStudentProfile: d.isGeneralStudentProfile === true,
      isGeneralStaffProfile: d.isGeneralStaffProfile === true,
      isRestricted: d.isRestricted === true,
      selectedPermissions: ints(d.selectedPermissions),
      selectedEvents: Array.isArray(d.selectedEvents) ? parseEvents(d.selectedEvents) : null,
      isEventTypeVisible: d.isEventTypeVisible === true,
      isCaseVisible: d.isCaseVisible === true,
      isWorkflowVisible: d.isWorkflowVisible === true,
      selectedCases: Array.isArray(d.selectedCases) ? ints(d.selectedCases) : null,
      selectedWorkflows: Array.isArray(d.selectedWorkflows) ? ints(d.selectedWorkflows) : null,
      forceNewUI: d.forceNewUI === true,
      defaultLandingPage: int(d.defaultLandingPage),
    },
    nodes: list(root.nodes).map(parseNode),
  }
}

export function parseLandingPages(raw: unknown): LandingPageViewModel[] {
  return list(raw).flatMap(item => {
    const r = record(item)
    const id = int(r.id)
    return id === null
      ? []
      : [
          {
            id,
            description: text(r.description),
            permissionDefinitionItemId: int(r.permissionDefinitionItemId),
            permissionDefinitionActionId: int(r.permissionDefinitionActionId),
          },
        ]
  })
}

const parseItemType = (raw: unknown): ItemTypeViewModel | null => {
  const r = record(raw)
  return typeof r.id === 'number'
    ? { id: r.id, type: int(r.type) ?? 0, subType: int(r.subType) ?? r.id, description: text(r.description) }
    : null
}

const itemTypes = (value: unknown) =>
  list(value)
    .map(parseItemType)
    .filter((item): item is ItemTypeViewModel => item !== null)

export function parseEventTypes(raw: unknown): AccessProfileEventTypes {
  const r = record(raw)
  return {
    events: itemTypes(r.events),
    caseSteps: itemTypes(r.caseSteps),
    general: list(r.general).flatMap(group => {
      const g = record(group)
      return typeof g.id === 'string' ? [{ id: g.id, value: itemTypes(g.value) }] : []
    }),
    selected: parseEvents(r.selected),
  }
}

export function parseVisibilityList(raw: unknown, key: 'cases' | 'workflows'): AccessProfileVisibilityList {
  const r = record(raw)
  return {
    items: list(r[key]).flatMap(item => {
      const i = record(item)
      return typeof i.id === 'number' ? [{ id: i.id, description: text(i.description) }] : []
    }),
    selected: ints(r.selected),
  }
}

// accessProfileDetailsController.js:40-88: permission item + action -> the action-in-item id that is saved.
export function buildPermissionLookup(nodes: readonly AccessProfilePermissionNode[]): Map<string, number> {
  const lookup = new Map<string, number>()
  const walk = (items: readonly AccessProfilePermissionNode[]) => {
    for (const node of items) {
      for (const permission of node.permissions ?? []) {
        for (const action of permission.permissionDefinitionActions ?? []) {
          if (action.permissionDefinitionActionInItemId && permission.id && action.id)
            lookup.set(`${permission.id}_${action.id}`, action.permissionDefinitionActionInItemId)
        }
      }
      walk(node.childNodes)
    }
  }
  walk(nodes)
  return lookup
}

// accessProfileDetailsController.js:92-117: a landing page is available when its Access permission is ticked.
export function isLandingPageEnabled(
  page: LandingPageViewModel,
  lookup: ReadonlyMap<string, number>,
  selectedPermissions: readonly number[],
): boolean {
  if (!page.permissionDefinitionItemId || !page.permissionDefinitionActionId) return false
  const actionInItemId = lookup.get(`${page.permissionDefinitionItemId}_${page.permissionDefinitionActionId}`)
  return actionInItemId !== undefined && selectedPermissions.includes(actionInItemId)
}

export function landingPageValid(
  landingPageId: number | null,
  pages: readonly LandingPageViewModel[],
  lookup: ReadonlyMap<string, number>,
  selectedPermissions: readonly number[],
): boolean {
  if (landingPageId === null) return true
  const page = pages.find(item => item.id === landingPageId)
  return page ? isLandingPageEnabled(page, lookup, selectedPermissions) : false
}

// Details.cshtml:61 knockout select (knockout-3.2.0.debug.js:4376-4379) resets an id missing from the options to Not Set.
export function isUnknownLandingPage(
  landingPageId: number | null,
  pages: readonly LandingPageViewModel[],
): boolean {
  return landingPageId !== null && !pages.some(page => page.id === landingPageId)
}

export function togglePermission(selected: readonly number[], actionInItemId: number): number[] {
  return selected.includes(actionInItemId)
    ? selected.filter(id => id !== actionInItemId)
    : [...selected, actionInItemId]
}

// accessProfileDetailsController.js:279-282.
export function copyProfile(details: AccessProfileViewModel): AccessProfileViewModel {
  return { ...details, id: 0, name: `${details.name ?? ''} (1)` }
}

// AccessProfile/Details.cshtml:103-142,185-205: the three visibility components always load and push their lists.
export function toSaveBody(details: AccessProfileViewModel): AccessProfileViewModel {
  return {
    ...details,
    selectedEvents: details.selectedEvents ?? [],
    selectedCases: details.selectedCases ?? [],
    selectedWorkflows: details.selectedWorkflows ?? [],
  }
}

const SPECIAL = /[<>]/

export type AccessProfileField = 'name' | 'externalKey'

export type AccessProfileErrors = Partial<Record<AccessProfileField, 'required' | 'specialCharacters'>>

// accessProfileDetailsController.js:9-14; swapp.js:506-526 adds the special character rule on the first Save.
export function validateAccessProfile(
  details: AccessProfileViewModel,
  checkSpecialCharacters = false,
): AccessProfileErrors {
  const errors: AccessProfileErrors = {}
  const special = (value: string) => checkSpecialCharacters && SPECIAL.test(value)
  const name = details.name ?? ''
  if (!name.trim()) errors.name = 'required'
  else if (special(name)) errors.name = 'specialCharacters'
  if (special(details.externalKey ?? '')) errors.externalKey = 'specialCharacters'
  return errors
}

const sameType = (item: { type: number; subType: number }) => (event: EventTypeInAccessProfileDto) =>
  event.type === item.type && event.subType === item.subType

export type EventColumn = 'event' | 'detail' | 'comment'

// seats-admin-security-event.html:474-507: Event adds or removes the row; Details and Comment flip on a selected row.
export function toggleEventColumn(
  selected: readonly EventTypeInAccessProfileDto[],
  item: ItemTypeViewModel,
  column: EventColumn,
  accessProfileId: number,
): EventTypeInAccessProfileDto[] {
  const current = selected.find(sameType(item))
  if (!current) {
    return column === 'event'
      ? [
          ...selected,
          { id: 0, type: item.type, subType: item.subType, accessProfileId, detail: false, comment: false },
        ]
      : [...selected]
  }
  if (column === 'event') return selected.filter(event => event !== current)
  return selected.map(event => (event === current ? { ...event, [column]: !event[column] } : event))
}

export const findEvent = (selected: readonly EventTypeInAccessProfileDto[], item: ItemTypeViewModel) =>
  selected.find(sameType(item))

export function allEventRows(types: AccessProfileEventTypes): ItemTypeViewModel[] {
  return [...types.caseSteps, ...types.general.flatMap(group => group.value), ...types.events]
}

// seats-admin-security-event.html:508-528: the header boxes click only the rows currently shown after search.
export function setEventColumn(
  selected: readonly EventTypeInAccessProfileDto[],
  shownRows: readonly ItemTypeViewModel[],
  column: EventColumn,
  on: boolean,
  accessProfileId: number,
): EventTypeInAccessProfileDto[] {
  const isShown = (event: EventTypeInAccessProfileDto) => shownRows.some(row => sameType(row)(event))
  if (column === 'event') {
    if (!on) return selected.filter(event => !isShown(event))
    const missing = shownRows.filter(row => !findEvent(selected, row))
    return [
      ...selected,
      ...missing.map(row => ({
        id: 0,
        type: row.type,
        subType: row.subType,
        accessProfileId,
        detail: false,
        comment: false,
      })),
    ]
  }
  return selected.map(event => (isShown(event) ? { ...event, [column]: on } : event))
}

// seats-admin-security-event.html:371-393 header box states.
export function eventHeaderState(selected: readonly EventTypeInAccessProfileDto[], rowCount: number) {
  if (selected.length === 0) return { event: false, detail: false, comment: false, detailDisabled: true }
  return {
    event: rowCount === selected.length,
    detail: selected.every(event => event.detail),
    comment: selected.every(event => event.comment),
    detailDisabled: false,
  }
}

const matches = (value: string | null | undefined, query: string) =>
  (value ?? '').toLowerCase().includes(query.toLowerCase())

// seats-admin-security-event.html:445-467 also keeps a whole list when the query matches its section title.
export function filterEventTypes(
  types: AccessProfileEventTypes,
  query: string,
  eventsTitle: string,
): AccessProfileEventTypes {
  if (!query) return types
  const keep = (row: ItemTypeViewModel) => matches(row.description, query) || matches(eventsTitle, query)
  return {
    ...types,
    caseSteps: types.caseSteps.filter(keep),
    events: types.events.filter(keep),
    general: types.general.filter(
      group => matches(group.value[0]?.description, query) || matches(group.id, query),
    ),
  }
}

export function toggleId(selected: readonly number[], id: number): number[] {
  return selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id]
}
