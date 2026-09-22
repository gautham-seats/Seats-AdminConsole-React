# Local environment — how Admin gets its data, and what is currently wired where

State as of 2026-09-16, after a day of fixing the local setup. Read this before touching anything under
`C:\Code`, and before concluding that a screen is "broken".

**Rule that still holds: the legacy Admin, IIS and every `Web.config` are read-only for this project.** Everything
in this file that changed was changed with Gautham present, one step at a time, with a backup first. Do not
repeat any of it on your own initiative.

## 1. The request path

```
Browser  https://dev.seats.local/admin-next/<page>
  → IIS on dev.seats.local rewrites /admin-next/* to http://localhost:3001  (Next dev server)
  → React renders, then calls RELATIVE urls:  /Seats.Trunk.Admin/api/<controller>
  → IIS routes those to the legacy .NET Admin (app pool: DefaultAppPool)
  → the legacy Admin authenticates the cookie, resolves the tenant FROM THE SITE URL,
    and asks a service for the data
  → the service answers from a mock file, a local service, or Alpha — see section 2
```

Consequences worth remembering:

- **Never open `localhost:3001` directly.** The sign-in cookie is bound to `dev.seats.local`, and the
  multi-tenant resolver reads the site URL. On localhost you get the wrong tenant and no session.
- **React holds no environment configuration.** It only calls the legacy Admin on the same origin, so where
  data comes from is decided entirely in the legacy `Web.config`. No React change is ever needed to switch
  environment.
- The legacy Admin's **API is pre-compiled in `bin`**; its **UI pages compile at runtime**. That is why the
  old Admin UI can be broken while React Admin works perfectly.

## 2. Where each screen's data comes from today

| Source                                                             | Services                                                                                            | Screens                                                                         |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Real Alpha**                                                     | Device, Location, Clocking, Staff, Student and 12 more                                              | Devices, Rooms — genuinely real data (64 devices)                               |
| **Local service + Gautham's own database**                         | Configuration                                                                                       | Settings — plumbing verified end to end, but the database copy has no rows yet  |
| **Mock files** (`C:\SEAtS\Mocks`)                                  | Security, Localisation, JobSchedule                                                                 | Users, Access Profiles, permissions, menu labels                                |
| **Nothing** (address points at `localhost`, service not installed) | ScheduledActivity, Import, GDPR, Event, Catalog, Cfc, Notification, Timeline, StudentSchedule, Misc | Lesson Types, Job Schedule, Imports, Students queue/recycle bin, parts of Cases |

So: a screen showing "no items" is usually **not a bug**. Check this table first.

The single user `seats.admin` on the Users screen is `C:\SEAtS\Mocks\Security\User.json`, not a real account.

## 3. Route status, measured 2026-09-16

29 of 32 static routes render with zero failed API calls. The three that do not:

- `settings/resources` — `ResourceApi/GetTypes` and `getResources` return 500. The local Configuration
  database is empty.
- `students` — `StudentDeleteApi/GetStudentsConfirm` returns 500 (GDPR service not installed).
- `students/recycle-bin` — same cause.

## 4. What was changed on the backend today, and why

All four items are in `C:\Code\monolithic-seats-trunk-websites\Seats.Trunk.Admin`.

1. **`bin\System.Runtime.CompilerServices.Unsafe.dll` → the `net462` build (6.0.3.0)**, copied from
   `packages\System.Runtime.CompilerServices.Unsafe.6.1.2\lib\net462\`. The binding redirect in `Web.config`
   points at 6.0.3.0; a build puts the `netstandard2.0` fallback (6.0.0.0) there instead, and the app then
   fails to start with a `FileLoadException` — which takes the API down with it, so React breaks too.
2. **`<compilation>` gained an `<assemblies>` entry for `netstandard, Version=2.0.0.0`.** Without it the
   Razor pages fail to compile with `CS0012` and the old Admin UI returns 500 while the API keeps working.
3. **`ConfigurationAddressKey` → `http://localhost/Seats.Service.Configuration.Web/`** and
   **`Mock.Configuration` → `false`**, so Settings reads from the locally hosted Configuration service.
4. A new IIS application, `Seats.Service.Configuration.Web`, in its **own app pool** (`SeatsConfigService`),
   pointing at
   `C:\Code\Seats.Trunk.Service.Configuration 2\Seats.Trunk.Service.Configuration\Seats.Trunk.Service.Configuration.Api.Web`.
   Its own pool matters: a fault there can never take DefaultAppPool, and therefore Admin, down with it.

**Root cause behind items 1 and 2:** the Admin project targets .NET Framework **4.6.1**, while its NuGet
packages need **4.7.2+**. The package ships `net462` (6.0.3.0) and a `netstandard2.0` fallback (6.0.0.0);
at 4.6.1 the build takes the fallback while the generated redirect names 6.0.3.0, and 4.6.1 also predates
`netstandard 2.0` support. Retargeting to 4.7.2/4.8 is the permanent fix and is a team decision.

**A Visual Studio rebuild of Seats.Trunk.Admin undoes item 1** and the app stops starting. The recovery is
one command:

```powershell
Copy-Item "C:\Code\monolithic-seats-trunk-websites\packages\System.Runtime.CompilerServices.Unsafe.6.1.2\lib\net462\System.Runtime.CompilerServices.Unsafe.dll" "C:\Code\monolithic-seats-trunk-websites\Seats.Trunk.Admin\bin\" -Force
```

## 5. Known traps

- **Never run `iisreset`.** Four or five app pools run on this machine and the setup took months. To restart
  the Admin app, recycle **DefaultAppPool** only, or drop an `App_Offline.htm` into the Admin folder for ten
  seconds. Saving `Web.config` already restarts that application on its own.
- **Turning all four mocks off and pointing everything at Alpha does not work.** Every request then fails with
  ASP.NET event 4011, "Attempted to perform an unauthorized operation", raised under
  `IIS APPPOOL\DefaultAppPool` before the request leaves the machine. It is a local permission on that
  account, not an Alpha or account problem; Gautham has raised it. The intended developer setup is to run the
  services locally against your own database.
- **Change one thing at a time, and verify before the next.** Two backend changes at once cost hours today.
- **Devices is the canary.** `/admin-next/resources/devices` showing 64 rows means the legacy Admin, the
  cookie and Alpha are all healthy.
- The Configuration service's `Web.config` contains a database user and password in plain text. Never copy,
  log or screenshot that file.

## 6. Verifying without the browser

`docs/pw` equivalents live in the session scratchpad, not the repo. A signed-in session is saved there as
`admin-state.json` (gitignored location, outside the repo) and Playwright scripts reuse it to load pages as
Gautham. If that session expires, open a browser with `chromium.launch({ headless: false })`, sign in at
`https://dev.seats.local/Seats.Trunk.Admin/`, and save `storageState` again.

Do not attempt to sign in headlessly inside a test; it stalls at the Microsoft login page. That is what left
an earlier audit with every runtime check marked NOT RUN.

## 7. Open items owned by other people

- **DevOps / Rodrigo:** the `DefaultAppPool` permission that blocks the real service clients; whether Admin
  should be retargeted from 4.6.1; how to get the remaining services (Security, Localisation, JobSchedule,
  ScheduledActivity) installed locally; and a way to seed the Configuration database, which is currently
  empty.
- **Gautham:** whether to keep `Mock.Configuration=false` while his database has no rows. Setting it back to
  `true` restores this morning's behaviour and is safe.
