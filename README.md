# SEAtS Admin Console

The web console SEAtS administrators use to manage users, access profiles, devices, rooms, settings, imports,
integrations, job schedules and student workflows. A Next.js / React rewrite of the legacy Admin site
(`Seats.Trunk.Admin`) that runs beside it, calls the same API and shares its sign-in and permissions.

[![CI](https://github.com/gautham-seats/Seats-AdminConsole-React/actions/workflows/ci.yml/badge.svg)](https://github.com/gautham-seats/Seats-AdminConsole-React/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-24-339933?logo=node.js&logoColor=white)](.nvmrc)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](tsconfig.json)
[![Safe mode](https://img.shields.io/badge/writes-off%20by%20default-b45309)](#safe-mode)

History begins on 22 September 2026 as a structured import of the rewrite, landed in reviewable slices.

## Quick start

Requirements: Node 24 ([`.nvmrc`](.nvmrc)), npm, and a local SEAtS environment that serves the legacy Admin on
`https://dev.seats.local` and proxies `/admin-next` to port 3001.

```bash
npm ci
cp .env.example .env.local   # ADMIN_ALLOW_WRITES=false
npm run dev                  # http://localhost:3001/admin-next
```

Sign in on the legacy site first; the console reuses that session cookie and has no login form of its own.

## Commands

| Command                           | Purpose                                                      |
| --------------------------------- | ------------------------------------------------------------ |
| `npm run dev`                     | Start the app on port 3001                                   |
| `npm run check`                   | Format check, typecheck, lint, tests, production build       |
| `npm test` / `npm run test:watch` | Jest + Testing Library                                       |
| `npm run test:coverage`           | Coverage report (a floor is enforced in `jest.config.ts`)    |
| `npm run lint` / `npm run format` | ESLint (zero warnings, includes jsx-a11y) / Prettier         |
| `npm run typecheck`               | `next typegen` + `tsc --noEmit`                              |
| `npm run build`                   | Production bundle (fails unless `ADMIN_ALLOW_WRITES` is set) |

A pre-commit hook formats and lints staged files, typechecks, and runs the tests related to the change.

## Safe mode

`ADMIN_ALLOW_WRITES` is compiled into the bundle. With `false` the shared client refuses every non-GET request in
the browser (except a short allow-list of side-effect-free calls), so the console can be pointed at a real tenant
without changing data. A production build fails unless the value is set explicitly.

## Pipeline

| Check                                                                                | Where                                 |
| ------------------------------------------------------------------------------------ | ------------------------------------- |
| Install, audit, Prettier, typecheck, ESLint (jsx-a11y, jest rules, parsed API reads) | `ci.yml` on every PR and push to main |
| type-coverage floor, import boundaries (dependency-cruiser), dead code (knip)        | `ci.yml`                              |
| Jest with a coverage floor; console output fails a test                              | `ci.yml`                              |
| Production build, bundle budget per route, unreferenced CSS tokens                   | `ci.yml`, sizes in the summary        |
| Secret scan (gitleaks), static security analysis (Semgrep)                           | `ci.yml`                              |
| Advisory two-model review with inline comments                                       | `ai-review.yml` on every PR           |
| Oversized pull requests labelled `needs-split`                                       | `pr-size.yml`                         |
| Bundle attached to the GitHub Release                                                | `release.yml` on every `v*` tag       |
| Dependabot, grouped minor/patch, weekly                                              | `dependabot.yml`                      |

Locally: the commit hook formats, lints, typechecks and runs related tests; the commit message is checked against Conventional Commits; the push hook runs the full check and, once the end-to-end suite exists, the browser sweep.

Pull requests are merged with rebase only, so every commit on `main` is the one that was reviewed.
