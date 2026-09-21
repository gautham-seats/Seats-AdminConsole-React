// Import boundaries the codebase promises in the README. Run: npm run lint:deps
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'shared-stays-independent',
      comment: 'src/shared must not know about features or app routes.',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/(features|app)/' },
    },
    {
      name: 'features-do-not-cross',
      comment:
        'A feature may import another feature only through settings/shared, operations/job-schedule, students/shared or errors.',
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: {
        path: '^src/features/(?!$1/)([^/]+)/',
        pathNot: '^src/features/(settings/shared|operations/job-schedule|students/shared|errors)/',
      },
    },
    {
      name: 'app-is-thin',
      comment: 'Route files compose a feature screen; they never reach into shared/api directly.',
      severity: 'error',
      from: { path: '^src/app/' },
      to: { path: '^src/shared/api/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      comment: 'Every file must be imported by something (tests, stubs and route files excepted).',
      severity: 'error',
      from: {
        orphan: true,
        pathNot: [
          '__tests__',
          '\.d\.ts$',
          '^src/shared/testing/',
          '^src/app/.*/(page|layout|error|global-error|not-found|loading)\.tsx$',
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
}
