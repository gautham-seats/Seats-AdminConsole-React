import { LEGACY_ADMIN_BASE } from '@/shared/api/config'

// Values from Seats.Trunk.Contracts PermissionDefinitionItemEnum / PermissionDefinitionActionEnum.
export const PermissionItem = {
  Users: 6,
  AccessProfiles: 7,
  Rooms: 8,
  Devices: 9,
  Settings: 10,
  Rollback: 11,
  FileTemplate: 12,
  ScheduledActivityType: 13,
  ReadingsReport: 15,
  ContactGroup: 16,
  JobSchedule: 21,
  Case: 22,
  Students: 4,
  AdminCfcStudentManualIntervention: 45,
  Workflow: 54,
  CreateCase: 59,
  LessonType: 23,
  Resources: 33,
  Import: 35,
  UserNotifications: 40,
  CustomFields: 42,
  Activity: 48,
  Engagement: 50,
  StudentsAdmin: 51,
  Integration: 52,
  ConfigureAuthentication: 56,
  AdminUserMenu: 43,
} as const

export const PermissionAction = {
  Access: 1,
  Add: 2,
  Edit: 3,
  Delete: 4,
  Activity: 42,
  DeveloperKey: 53,
  Contacts: 93,
  DeveloperKeyDashboard: 112,
  ContactGroupFunctions: 129,
  Restore: 72,
  Confirm: 73,
  ReprocessDeviceSwipes: 130,
  LecturerVisibility: 158,
  ConsecAttendance: 103,
  CheckOutPolicy: 132,
  EditHoldStatus: 66,
  ReCalculateModel: 67,
} as const

export type Permission = { item: number; action: number }

export type ProfileItem = { id: string; actions: string[] }

export type MenuIcon =
  | 'users'
  | 'user'
  | 'lock'
  | 'history'
  | 'key'
  | 'cpu'
  | 'building'
  | 'calculator'
  | 'help'
  | 'settings'
  | 'fileCode'
  | 'calendarPlus'
  | 'tags'
  | 'listChecks'
  | 'mail'
  | 'cloud'
  | 'undo'
  | 'calendarClock'
  | 'fork'
  | 'branch'
  | 'book'
  | 'upload'
  | 'gauge'
  | 'check'
  | 'graduation'
  | 'recycle'
  | 'plug'

export type MenuLink = {
  id: string
  labelKey: string | null
  fallback: string
  icon: MenuIcon
  legacyRoute: string
  reactRoute?: string
  permission?: Permission
}

type TopDefinition = MenuLink & {
  unless?: readonly number[]
  children?: readonly MenuLink[]
}

export type TopEntry = MenuLink & { children: MenuLink[] }

export type MenuLayout = {
  bar: TopEntry[]
  more: TopEntry[]
}

const access = (item: number, action: number = PermissionAction.Access): Permission => ({ item, action })

// Sub-navigation pills of each area, in on-screen order (Views/<Area>/Index.cshtml).
export const USERS_ROUTE = '/users'
export const ACCESS_PROFILES_ROUTE = '/users/access-profiles'
export const CONTACT_GROUPS_ROUTE = '/users/contact-groups'
export const ACTIVITY_ROUTE = '/users/activity'
const DEVELOPER_KEYS_ROUTE = '/users/developer-keys'
const SETTINGS_ROUTE = '/settings'
const AUTHENTICATION_ROUTE = '/settings/authentication'
const GRAPH_API_ROUTE = '/settings/graph-api'
const CONTACTS_ROUTE = '/settings/contacts'
export const FILE_TEMPLATES_ROUTE = '/settings/file-templates'
export const ACTIVITY_TYPES_ROUTE = '/settings/activity-types'
const RESOURCES_ROUTE = '/settings/resources'
const CUSTOM_FIELDS_ROUTE = '/settings/custom-fields'
export const DEVICES_ROUTE = '/resources/devices'
export const ROOMS_ROUTE = '/resources/rooms'
export const LESSON_TYPES_ROUTE = '/resources/lesson-types'
const READINGS_REPORT_ROUTE = '/resources/readings-report'
const SUSPICIOUS_READINGS_ROUTE = '/resources/suspicious-readings-report'
const ROLLBACK_ROUTE = '/rollback'
export const JOB_SCHEDULE_ROUTE = '/job-schedule'
export const INTEGRATIONS_ROUTE = '/integrations'
export const IMPORTS_ROUTE = '/imports'
export const ENGAGEMENT_ROUTE = '/engagement'
const ENGAGEMENT_HISTORY_ROUTE = '/engagement/history'
const CASE_ROUTE = '/case'
const STUDENT_WORKFLOW_ROUTE = '/case/student-workflow'
export const STUDENT_DELETION_ROUTE = '/students'
export const MANUAL_STUDENT_DELETION_ROUTE = '/students/manual'
export const STUDENT_RECYCLE_BIN_ROUTE = '/students/recycle-bin'

export const USERS_GROUP: readonly MenuLink[] = [
  {
    id: 'user',
    labelKey: 'User',
    fallback: 'User',
    icon: 'user',
    legacyRoute: '#/User',
    reactRoute: USERS_ROUTE,
    permission: access(PermissionItem.Users),
  },
  {
    id: 'access-profile',
    labelKey: 'AccessProfile',
    fallback: 'Access Profile',
    icon: 'lock',
    legacyRoute: '#/AccessProfile',
    reactRoute: ACCESS_PROFILES_ROUTE,
    permission: access(PermissionItem.AccessProfiles),
  },
  {
    id: 'contact-group',
    labelKey: 'ContactGroup',
    fallback: 'Contact Group',
    icon: 'users',
    legacyRoute: '#/ContactGroup',
    reactRoute: CONTACT_GROUPS_ROUTE,
    permission: access(PermissionItem.ContactGroup),
  },
  {
    id: 'activity',
    labelKey: 'Activity',
    fallback: 'Activity Log',
    icon: 'history',
    legacyRoute: '#/Audit',
    reactRoute: ACTIVITY_ROUTE,
    permission: access(PermissionItem.Users, PermissionAction.Activity),
  },
  {
    id: 'developer-key',
    labelKey: 'DeveloperKey',
    fallback: 'Developer Key',
    icon: 'key',
    legacyRoute: '#/DeveloperKey',
    reactRoute: DEVELOPER_KEYS_ROUTE,
    permission: access(PermissionItem.Users, PermissionAction.DeveloperKeyDashboard),
  },
]

export const DEVICES_GROUP: readonly MenuLink[] = [
  {
    id: 'room',
    labelKey: 'Room',
    fallback: 'Room',
    icon: 'building',
    legacyRoute: '#/Room',
    reactRoute: ROOMS_ROUTE,
    permission: access(PermissionItem.Rooms),
  },
  {
    id: 'device',
    labelKey: 'Device',
    fallback: 'Device',
    icon: 'calculator',
    legacyRoute: '#/Device',
    reactRoute: DEVICES_ROUTE,
    permission: access(PermissionItem.Devices),
  },
  {
    id: 'readings-report',
    labelKey: 'ReadingsReport',
    fallback: 'Readings Report',
    icon: 'history',
    legacyRoute: '#/ReadingsReport',
    reactRoute: READINGS_REPORT_ROUTE,
    permission: access(PermissionItem.ReadingsReport),
  },
  {
    id: 'suspicious-readings-report',
    labelKey: null,
    fallback: 'Suspicious Readings Report',
    icon: 'help',
    legacyRoute: '#/SuspiciousReadingsReport',
    reactRoute: SUSPICIOUS_READINGS_ROUTE,
    permission: access(PermissionItem.ReadingsReport),
  },
]

export const SETTINGS_GROUP: readonly MenuLink[] = [
  {
    id: 'settings-general',
    labelKey: 'Settings',
    fallback: 'Settings',
    icon: 'settings',
    legacyRoute: '#/Settings',
    reactRoute: SETTINGS_ROUTE,
    permission: access(PermissionItem.Settings),
  },
  {
    id: 'file-template',
    labelKey: 'FileTemplate',
    fallback: 'File Template',
    icon: 'fileCode',
    legacyRoute: '#/FileTemplate',
    reactRoute: FILE_TEMPLATES_ROUTE,
    permission: access(PermissionItem.FileTemplate),
  },
  {
    id: 'activity-types',
    labelKey: 'ActivityTypes',
    fallback: 'Activity Types',
    icon: 'calendarPlus',
    legacyRoute: '#/ScheduledActivityType',
    reactRoute: ACTIVITY_TYPES_ROUTE,
    permission: access(PermissionItem.ScheduledActivityType),
  },
  {
    id: 'resources',
    labelKey: 'Resources',
    fallback: 'Resources',
    icon: 'tags',
    legacyRoute: '#/Resource',
    reactRoute: RESOURCES_ROUTE,
    permission: access(PermissionItem.Resources),
  },
  {
    id: 'custom-fields',
    labelKey: 'CustomFields',
    fallback: 'Custom Fields',
    icon: 'listChecks',
    legacyRoute: '#/CustomField',
    reactRoute: CUSTOM_FIELDS_ROUTE,
    permission: access(PermissionItem.CustomFields),
  },
  {
    id: 'authentication',
    labelKey: 'Authentication',
    fallback: 'Authentication',
    icon: 'key',
    legacyRoute: '#/Authentication',
    reactRoute: AUTHENTICATION_ROUTE,
    permission: access(PermissionItem.ConfigureAuthentication),
  },
  {
    id: 'contacts',
    labelKey: 'Contacts',
    fallback: 'Contacts',
    icon: 'mail',
    legacyRoute: '#/Contact',
    reactRoute: CONTACTS_ROUTE,
    permission: access(PermissionItem.Settings, PermissionAction.Contacts),
  },
  {
    id: 'graph-api',
    labelKey: null,
    fallback: 'Graph API',
    icon: 'cloud',
    legacyRoute: '#/GraphAPI',
    reactRoute: GRAPH_API_ROUTE,
    permission: access(PermissionItem.Settings, PermissionAction.Contacts),
  },
]

// Rollback and Job Schedule are separate legacy bar entries; React groups them in one workspace sidebar.
export const OPERATIONS_GROUP: readonly MenuLink[] = [
  {
    id: 'rollback',
    labelKey: 'Rollback',
    fallback: 'Rollback',
    icon: 'undo',
    legacyRoute: '#/Rollback',
    reactRoute: ROLLBACK_ROUTE,
    permission: access(PermissionItem.Rollback),
  },
  {
    id: 'job-schedule',
    labelKey: 'Jobs',
    fallback: 'Jobs',
    icon: 'calendarClock',
    legacyRoute: '#/JobSchedule',
    reactRoute: JOB_SCHEDULE_ROUTE,
    permission: access(PermissionItem.JobSchedule),
  },
]

export const CASES_GROUP: readonly MenuLink[] = [
  {
    id: 'workflow-admin',
    labelKey: 'WorkflowAdmin',
    fallback: 'Workflow Admin',
    icon: 'fork',
    legacyRoute: '#/Case',
    reactRoute: CASE_ROUTE,
    permission: access(PermissionItem.Case),
  },
  {
    id: 'student-workflow',
    labelKey: 'StudentWorkflow',
    fallback: 'Student Workflow',
    icon: 'branch',
    legacyRoute: '#/Case/StudentWorkflow',
    reactRoute: STUDENT_WORKFLOW_ROUTE,
    permission: access(PermissionItem.Case),
  },
]

export const ENGAGEMENT_GROUP: readonly MenuLink[] = [
  {
    id: 'engagement-configuration',
    labelKey: 'Configuration',
    fallback: 'Configuration',
    icon: 'settings',
    legacyRoute: '#/Engagement',
    reactRoute: ENGAGEMENT_ROUTE,
    permission: access(PermissionItem.Engagement),
  },
  {
    id: 'engagement-history',
    labelKey: 'History',
    fallback: 'History',
    icon: 'fork',
    legacyRoute: '#/Engagement/HistoryIndex',
    reactRoute: ENGAGEMENT_HISTORY_ROUTE,
    permission: access(PermissionItem.Engagement),
  },
]

export const STUDENTS_GROUP: readonly MenuLink[] = [
  {
    id: 'student-delete',
    labelKey: 'GdprStudentDeleteMenu',
    fallback: 'Student Deletion',
    icon: 'check',
    legacyRoute: '#/StudentDelete',
    reactRoute: STUDENT_DELETION_ROUTE,
    permission: access(PermissionItem.StudentsAdmin),
  },
  {
    id: 'student-manual-deletion',
    labelKey: 'GdprManualStudentDeletion',
    fallback: 'Manual Student Deletion',
    icon: 'graduation',
    legacyRoute: '#/Student',
    reactRoute: MANUAL_STUDENT_DELETION_ROUTE,
    permission: access(PermissionItem.StudentsAdmin),
  },
  {
    id: 'student-recycle-bin',
    labelKey: 'GdprStudentRecycleBinMenu',
    fallback: 'Recycle Bin',
    icon: 'recycle',
    legacyRoute: '#/StudentRecycleBin',
    reactRoute: STUDENT_RECYCLE_BIN_ROUTE,
    permission: access(PermissionItem.StudentsAdmin),
  },
]

// Views/Shared/_Layout.cshtml:38-151 in order; `unless` mirrors data-screen-code-no. Analytics is `hidden` there.
const TOP_MENU: readonly TopDefinition[] = [
  {
    id: 'users',
    labelKey: 'Users',
    fallback: 'Users',
    icon: 'users',
    legacyRoute: '#/User',
    reactRoute: USERS_ROUTE,
    permission: access(PermissionItem.Users),
    children: USERS_GROUP,
  },
  {
    id: 'access-profile',
    labelKey: 'AccessProfile',
    fallback: 'Access Profile',
    icon: 'users',
    legacyRoute: '#/AccessProfile',
    reactRoute: ACCESS_PROFILES_ROUTE,
    permission: access(PermissionItem.AccessProfiles),
    unless: [PermissionItem.Users],
    children: USERS_GROUP,
  },
  {
    id: 'contact-group',
    labelKey: 'ContactGroup',
    fallback: 'Contact Group',
    icon: 'users',
    legacyRoute: '#/ContactGroup',
    reactRoute: CONTACT_GROUPS_ROUTE,
    permission: access(PermissionItem.ContactGroup),
    unless: [PermissionItem.Users, PermissionItem.AccessProfiles],
    children: USERS_GROUP,
  },
  {
    id: 'audit',
    labelKey: 'Audit',
    fallback: 'Audit',
    icon: 'users',
    legacyRoute: '#/Audit',
    reactRoute: ACTIVITY_ROUTE,
    permission: access(PermissionItem.Activity),
    unless: [PermissionItem.Users, PermissionItem.AccessProfiles, PermissionItem.ContactGroup],
    children: USERS_GROUP,
  },
  {
    id: 'devices',
    labelKey: 'Devices',
    fallback: 'Devices',
    icon: 'calculator',
    legacyRoute: '#/Device',
    reactRoute: DEVICES_ROUTE,
    permission: access(PermissionItem.Devices),
    children: DEVICES_GROUP,
  },
  {
    id: 'room',
    labelKey: 'Room',
    fallback: 'Room',
    icon: 'calculator',
    legacyRoute: '#/Room',
    reactRoute: ROOMS_ROUTE,
    permission: access(PermissionItem.Rooms),
    unless: [PermissionItem.Devices],
    children: DEVICES_GROUP,
  },
  {
    id: 'readings-report',
    labelKey: 'ReadingsReport',
    fallback: 'Readings Report',
    icon: 'calculator',
    legacyRoute: '#/ReadingsReport',
    reactRoute: READINGS_REPORT_ROUTE,
    permission: access(PermissionItem.ReadingsReport),
    unless: [PermissionItem.Devices, PermissionItem.Rooms],
    children: DEVICES_GROUP,
  },
  {
    id: 'settings',
    labelKey: 'Settings',
    fallback: 'Settings',
    icon: 'settings',
    legacyRoute: '#/Settings',
    reactRoute: SETTINGS_ROUTE,
    permission: access(PermissionItem.Settings),
    children: SETTINGS_GROUP,
  },
  {
    id: 'rollback',
    labelKey: 'Rollback',
    fallback: 'Rollback',
    icon: 'undo',
    legacyRoute: '#/Rollback',
    reactRoute: ROLLBACK_ROUTE,
    permission: access(PermissionItem.Rollback),
  },
  {
    id: 'job-schedule',
    labelKey: 'JobSchedule',
    fallback: 'Job Schedule',
    icon: 'calendarClock',
    legacyRoute: '#/JobSchedule',
    reactRoute: JOB_SCHEDULE_ROUTE,
    permission: access(PermissionItem.JobSchedule),
  },
  {
    id: 'cases',
    labelKey: 'Cases',
    fallback: 'Cases',
    icon: 'fork',
    legacyRoute: '#/Case',
    reactRoute: CASE_ROUTE,
    permission: access(PermissionItem.Case),
    children: CASES_GROUP,
  },
  {
    id: 'lesson-type',
    labelKey: 'LessonType',
    fallback: 'Lesson Type',
    icon: 'book',
    legacyRoute: '#/LessonType',
    reactRoute: LESSON_TYPES_ROUTE,
    permission: access(PermissionItem.LessonType),
  },
  {
    id: 'imports',
    labelKey: 'Imports',
    fallback: 'Imports',
    icon: 'upload',
    legacyRoute: '#/Import',
    reactRoute: IMPORTS_ROUTE,
    permission: access(PermissionItem.Import),
  },
  {
    id: 'engagement',
    labelKey: 'Engagement',
    fallback: 'Engagement',
    icon: 'gauge',
    legacyRoute: '#/Engagement',
    reactRoute: ENGAGEMENT_ROUTE,
    permission: access(PermissionItem.Engagement),
    children: ENGAGEMENT_GROUP,
  },
  {
    id: 'students',
    labelKey: 'Students',
    fallback: 'Students',
    icon: 'graduation',
    legacyRoute: '#/StudentDelete',
    reactRoute: STUDENT_DELETION_ROUTE,
    permission: access(PermissionItem.StudentsAdmin),
    children: STUDENTS_GROUP,
  },
  {
    id: 'integrations',
    labelKey: 'Integrations',
    fallback: 'Integrations',
    icon: 'plug',
    legacyRoute: '#/Integration',
    reactRoute: INTEGRATIONS_ROUTE,
    permission: access(PermissionItem.Integration),
  },
]

export const NOTIFICATIONS_PERMISSION = access(PermissionItem.UserNotifications)
const USER_NOTIFICATIONS_ROUTE = '/notifications'
export const NOTIFICATIONS_ROUTE = USER_NOTIFICATIONS_ROUTE

// swapp.js:388 keeps six entries on the bar and moves the rest into More.
export const BAR_LIMIT = 6

export function normalizeProfile(raw: unknown): ProfileItem[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(entry => {
    if (!entry || typeof entry !== 'object') return []
    const record = entry as Record<string, unknown>
    const id = record.id ?? record.Id
    const actions = record.actions ?? record.Actions
    if (id === undefined || id === null) return []
    const actionIds = Array.isArray(actions)
      ? actions.flatMap(action => {
          if (!action || typeof action !== 'object') return []
          const actionId = (action as Record<string, unknown>).id ?? (action as Record<string, unknown>).Id
          return actionId === undefined || actionId === null ? [] : [String(actionId)]
        })
      : []
    return [{ id: String(id), actions: actionIds }]
  })
}

export function hasPermission(profile: readonly ProfileItem[], permission: Permission): boolean {
  // Claims can repeat an item (one per access profile), so every copy is checked like swapp.js:674-703.
  const item = String(permission.item)
  const action = String(permission.action)
  return profile.some(entry => entry.id === item && entry.actions.includes(action))
}

function visible(profile: readonly ProfileItem[], link: MenuLink): boolean {
  return !link.permission || hasPermission(profile, link.permission)
}

export function buildMenu(profile: readonly ProfileItem[]): MenuLayout {
  const entries = TOP_MENU.filter(entry => {
    if (!visible(profile, entry)) return false
    return !(entry.unless ?? []).some(item => hasPermission(profile, access(item)))
  }).map(entry => ({
    id: entry.id,
    labelKey: entry.labelKey,
    fallback: entry.fallback,
    icon: entry.icon,
    legacyRoute: entry.legacyRoute,
    reactRoute: entry.reactRoute,
    permission: entry.permission,
    children: (entry.children ?? []).filter(child => visible(profile, child)),
  }))
  return { bar: entries.slice(0, BAR_LIMIT), more: entries.slice(BAR_LIMIT) }
}

// _Layout.cshtml:371 + swapp.js getDefaultLandingPage: Users when visible, otherwise the first visible menu entry.
export function landingEntry(profile: readonly ProfileItem[]): TopEntry | null {
  const { bar, more } = buildMenu(profile)
  const entries = [...bar, ...more]
  return entries.find(entry => entry.legacyRoute.toLowerCase() === '#/user') ?? entries[0] ?? null
}

export function legacyHref(route: string): string {
  return `${LEGACY_ADMIN_BASE}/${route}`
}

export function menuResourceKeys(): string[] {
  const keys = new Set<string>(['More', 'SignOut', 'UserNotifications', 'Search'])
  for (const entry of TOP_MENU) {
    if (entry.labelKey) keys.add(entry.labelKey)
    for (const child of entry.children ?? []) if (child.labelKey) keys.add(child.labelKey)
  }
  return [...keys]
}
