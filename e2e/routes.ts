/** All App Router pages under src/app (every page.tsx). */

export type RouteBucket = 'data' | 'empty' | 'not-authorised' | 'server-error'
export type FailureBucket = 'our-bug' | 'service-missing' | 'empty-data' | 'mock-data' | 'unknown'

export interface RouteEntry {
  /** Path after basePath, e.g. `/resources/devices`. */
  path: string
  source: string
  dynamic?: boolean
  /** List route used to discover a real identifier. */
  resolveFrom?: string
  /** Expected local result from docs/local-environment.md and the signed-in sweep. */
  expectedBucket: RouteBucket
}

export const ROUTES: RouteEntry[] = [
  { path: '/', source: 'src/app/page.tsx', expectedBucket: 'data' },
  { path: '/case', source: 'src/app/case/page.tsx', expectedBucket: 'empty' },
  {
    path: '/case/student-workflow',
    source: 'src/app/case/student-workflow/page.tsx',
    expectedBucket: 'empty',
  },
  { path: '/imports', source: 'src/app/imports/page.tsx', expectedBucket: 'server-error' },
  { path: '/notifications', source: 'src/app/notifications/page.tsx', expectedBucket: 'server-error' },
  { path: '/integrations', source: 'src/app/integrations/page.tsx', expectedBucket: 'data' },
  { path: '/integrations/zoom', source: 'src/app/integrations/zoom/page.tsx', expectedBucket: 'data' },
  {
    path: '/error/unsupported-browser',
    source: 'src/app/error/unsupported-browser/page.tsx',
    expectedBucket: 'data',
  },
  { path: '/error/not-active', source: 'src/app/error/not-active/page.tsx', expectedBucket: 'data' },
  {
    path: '/error/not-authorised',
    source: 'src/app/error/not-authorised/page.tsx',
    expectedBucket: 'not-authorised',
  },
  { path: '/more', source: 'src/app/more/page.tsx', expectedBucket: 'data' },
  { path: '/engagement', source: 'src/app/engagement/page.tsx', expectedBucket: 'server-error' },
  {
    path: '/engagement/history',
    source: 'src/app/engagement/history/page.tsx',
    expectedBucket: 'server-error',
  },
  {
    path: '/engagement/{id}',
    source: 'src/app/engagement/[id]/page.tsx',
    dynamic: true,
    resolveFrom: '/engagement',
    expectedBucket: 'server-error',
  },
  {
    path: '/resources/lesson-types',
    source: 'src/app/resources/lesson-types/page.tsx',
    expectedBucket: 'server-error',
  },
  {
    path: '/resources/lesson-types/{id}',
    source: 'src/app/resources/lesson-types/[id]/page.tsx',
    dynamic: true,
    resolveFrom: '/resources/lesson-types',
    expectedBucket: 'server-error',
  },
  {
    path: '/students/recycle-bin',
    source: 'src/app/students/recycle-bin/page.tsx',
    expectedBucket: 'server-error',
  },
  { path: '/students', source: 'src/app/students/page.tsx', expectedBucket: 'server-error' },
  { path: '/students/manual', source: 'src/app/students/manual/page.tsx', expectedBucket: 'server-error' },
  {
    path: '/job-schedule/{id}',
    source: 'src/app/job-schedule/[id]/page.tsx',
    dynamic: true,
    resolveFrom: '/job-schedule',
    expectedBucket: 'data',
  },
  { path: '/job-schedule/new', source: 'src/app/job-schedule/new/page.tsx', expectedBucket: 'data' },
  { path: '/job-schedule', source: 'src/app/job-schedule/page.tsx', expectedBucket: 'empty' },
  { path: '/rollback', source: 'src/app/rollback/page.tsx', expectedBucket: 'not-authorised' },
  {
    path: '/resources/suspicious-readings-report',
    source: 'src/app/resources/suspicious-readings-report/page.tsx',
    expectedBucket: 'data',
  },
  {
    path: '/resources/readings-report',
    source: 'src/app/resources/readings-report/page.tsx',
    expectedBucket: 'data',
  },
  { path: '/users/activity', source: 'src/app/users/activity/page.tsx', expectedBucket: 'data' },
  {
    path: '/users/access-profiles/{id}',
    source: 'src/app/users/access-profiles/[id]/page.tsx',
    dynamic: true,
    resolveFrom: '/users/access-profiles',
    expectedBucket: 'data',
  },
  {
    path: '/users/contact-groups/{id}',
    source: 'src/app/users/contact-groups/[id]/page.tsx',
    dynamic: true,
    resolveFrom: '/users/contact-groups',
    expectedBucket: 'data',
  },
  {
    path: '/settings/custom-fields',
    source: 'src/app/settings/custom-fields/page.tsx',
    expectedBucket: 'empty',
  },
  {
    path: '/settings/resources',
    source: 'src/app/settings/resources/page.tsx',
    expectedBucket: 'server-error',
  },
  {
    path: '/settings/file-templates/new',
    source: 'src/app/settings/file-templates/new/page.tsx',
    expectedBucket: 'data',
  },
  {
    path: '/settings/file-templates/{id}',
    source: 'src/app/settings/file-templates/[id]/page.tsx',
    dynamic: true,
    resolveFrom: '/settings/file-templates',
    expectedBucket: 'data',
  },
  {
    path: '/settings/activity-types/new',
    source: 'src/app/settings/activity-types/new/page.tsx',
    expectedBucket: 'data',
  },
  {
    path: '/settings/activity-types/{id}',
    source: 'src/app/settings/activity-types/[id]/page.tsx',
    dynamic: true,
    resolveFrom: '/settings/activity-types',
    expectedBucket: 'data',
  },
  {
    path: '/resources/rooms/{id}',
    source: 'src/app/resources/rooms/[id]/page.tsx',
    dynamic: true,
    resolveFrom: '/resources/rooms',
    expectedBucket: 'data',
  },
  {
    path: '/settings/activity-types',
    source: 'src/app/settings/activity-types/page.tsx',
    expectedBucket: 'empty',
  },
  {
    path: '/settings/file-templates',
    source: 'src/app/settings/file-templates/page.tsx',
    expectedBucket: 'empty',
  },
  { path: '/settings/contacts', source: 'src/app/settings/contacts/page.tsx', expectedBucket: 'empty' },
  { path: '/users/developer-keys', source: 'src/app/users/developer-keys/page.tsx', expectedBucket: 'data' },
  { path: '/users/contact-groups', source: 'src/app/users/contact-groups/page.tsx', expectedBucket: 'data' },
  {
    path: '/users/access-profiles',
    source: 'src/app/users/access-profiles/page.tsx',
    expectedBucket: 'data',
  },
  { path: '/settings/graph-api', source: 'src/app/settings/graph-api/page.tsx', expectedBucket: 'empty' },
  {
    path: '/settings/authentication',
    source: 'src/app/settings/authentication/page.tsx',
    expectedBucket: 'empty',
  },
  {
    path: '/resources/devices/{id}',
    source: 'src/app/resources/devices/[id]/page.tsx',
    dynamic: true,
    resolveFrom: '/resources/devices',
    expectedBucket: 'data',
  },
  { path: '/resources/devices', source: 'src/app/resources/devices/page.tsx', expectedBucket: 'data' },
  { path: '/settings', source: 'src/app/settings/page.tsx', expectedBucket: 'empty' },
  {
    path: '/users/{id}',
    source: 'src/app/users/[id]/page.tsx',
    dynamic: true,
    resolveFrom: '/users',
    expectedBucket: 'data',
  },
  { path: '/users', source: 'src/app/users/page.tsx', expectedBucket: 'data' },
  { path: '/resources/rooms', source: 'src/app/resources/rooms/page.tsx', expectedBucket: 'data' },
]

export const ROUTE_COUNT = ROUTES.length
