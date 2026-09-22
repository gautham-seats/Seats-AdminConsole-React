# Job Schedule — legacy parity audit




**Date:** 2026-09-15  

**Legacy:** `monolithic-seats-trunk-websites/Seats.Trunk.Admin` (+ shared `Seats.Trunk.Website/Scripts/softworks/*`)  

**React:** `src/features/operations/job-schedule/*`, `src/app/job-schedule/*`  

**References:** D-018, D-024, D-101, LB-051. D-052 is cited by `job-schedule.build-prompt.md` but **not present** in `docs/decisions.md`.



## Summary



| Status | Count | Meaning |

| ------ | ----- | ------- |

| ✅ | 84 | Matches legacy behaviour (or accepted React improvement noted in LB-051) |

| ❌ | 0 | Gap — fix in code (file + change noted) |

| ⚠ | 5 | Documented legacy bug / permission quirk — do not “fix” silently |



**Finish pass (2026-09-15):** Enabled column visible text, field order, `SaveActions` + Discard, dirty navigation guard, `ScheduleBuilder` Advance sync, sticky summary panel + next 3 run estimates, client cron validation, `LookupField` Gearwork loader and Reports 403 message.



---



## List (`/job-schedule`)



| Legacy behaviour | React now | Status | Fix (if ❌) |

| ---------------- | --------- | ------ | ----------- |

| Columns Description, When, Type, Enabled in that order (`Index.cshtml:39-50`) | Same four columns, same order (`JobSchedulesScreen.tsx:46-93`) | ✅ | |

| When cell shows `prettyCron.toString(cronExpression, false)` (`Index.cshtml:56`) | `describeCron(row.cronExpression)` with raw cron in `title` tooltip (`JobSchedulesScreen.tsx:57-61`) | ⚠ | Wording may differ from prettyCron library; compare runtime on Alpha sample jobs (`cron.ts:118-136`) |

| Type cell shows `typeName` (`Index.cshtml:57`) | Type pill from `row.typeName` (`JobSchedulesScreen.tsx:68-73`) | ✅ | |

| Enabled cell shows check/cross icon only (`Index.cshtml:58-64`) | Icon + visible Yes/No text (`JobSchedulesScreen.tsx:86-97`) | ✅ | |

| Initial sort `JobName` asc — not a row field, so API order kept (`Index.cshtml:81-82`, `swgrid.js:138-151`) | `useClientList(..., { column: 'JobName', direction: 'asc' })` — same missing property, stable server order (`JobSchedulesScreen.tsx:43-44`) | ⚠ | LB-051: intentional; document only |

| Type header `data-column="enabled"` sorts by Enabled, not type (`Index.cshtml:45`) | Type column sorts by `typeName` (`JobSchedulesScreen.tsx:65-67`) | ✅ | LB-051: React fixes legacy bug |

| Enabled header sorts by `enabled` (`Index.cshtml:48`) | Sort key `enabled` (`JobSchedulesScreen.tsx:76-78`) | ✅ | |
| Recipients email regex for types 103/104 (`jobScheduleDetailsController.js:507`) | Same rule with the legacy `{1, 3}` typo corrected (`job-schedule-form.ts`) | ⚠ | LB-051: typo fixed on purpose |
| No search box on legacy index | `searchable={false}` (`JobSchedulesScreen.tsx:100`) | ✅ | |

| Empty grid when no jobs (swgrid default) | `LIST_EN.noItems` via `ClientListScreen` (`ClientListScreen.tsx:196`) | ✅ | |

| Row click opens details (`genericIndexController` + `detailUrl: '/JobSchedule/Details'`, `Index.cshtml:78`) | `onOpen` → `router.push('/job-schedule/{id}')` (`JobSchedulesScreen.tsx:106`) | ✅ | |

| Route gated JobSchedule + Access (item 21, action 1) (`JobScheduleApiController.cs:65`) | `SettingsGate` + `PermissionItem.JobSchedule` + `Access` (`JobSchedulesScreen.tsx:17-20,31-34`) | ✅ | |
| jquery-cron periods: the SEAtS build only offers day/week/month (`Scripts/thirdParty/jquery-cron.js:146-147`) | `CRON_PERIODS = day, week, month`; other shapes open in Advance (`cron.ts`) | ✅ | Fixed 2026-09-15 (was minute/hour/year too) |
| Day: `m h * * *`; week: `m h * * dow`; month: `m h dom * *` | `buildCron` / `parseCron` round-trip (`cron.ts`) | ✅ | `Operations.test.tsx` cron tests |

| Delete + checkboxes with Delete (action 4) (`Index.cshtml:27-30`) | `canDelete` + `ClientListScreen` selection (`JobSchedulesScreen.tsx:107-108`) | ✅ | |

| Bulk delete confirm “Are you sure…” (`_DeleteConfirmationPartial` via `ClientListScreen.tsx:34,232`) | Same resource key `DeleteConfirmationMsg` | ✅ | |

| DELETE `JobScheduleApi?ids=` (`JobScheduleApiController.cs:93-95`, `JobSchedulesScreen.tsx:27`) | `idsQuery('JobScheduleApi', ids)` | ✅ | |

| Success `AlertDeleteSuccessDefault`; 400 server message; else `AlertDeleteErrorDefault` (swgrid delete + `ClientListScreen.tsx:93-101`) | Same toast pattern | ✅ | |
| Unticking Advance on an expression the builder cannot show | Advance stays on and locked with a hint; the expression is never replaced | ✅ | Fixed 2026-09-15 (used to reset to every minute) |

| After delete: reload list, reset page/search (`swgrid.js:436-456`, `ClientListScreen.tsx:91-92,67-71`) | `read.reload()` + `list.resetAfterDelete()` | ✅ | |

| Safe mode blocks delete with message | `FRAME_EN.safeMode` on `blocked` (`ClientListScreen.tsx:97-98`) | ✅ | |



---



## Details — Job card



| Legacy behaviour | React now | Status | Fix (if ❌) |

| ---------------- | --------- | ------ | ----------- |

| Existing job: read-only Name = `typeName` (`Details.cshtml:34-38`) | Disabled `Input` with `job.typeName` (`JobScheduleDetailsScreen.tsx:302-310`) | ✅ | |

| New job: Type select from `jobTypeAvailables` (`Details.cshtml:40-44`, `JobScheduleApiController.cs:299`) | `NativeSelect` over `details.jobTypeAvailables` (`JobScheduleDetailsScreen.tsx:312-325`) | ✅ | |

| All `ExportTypeEnum` values in type list (`JobScheduleApiController.cs:372-385`) | Populated from API (not hard-coded subset) | ✅ | |

| Enabled checkbox (`Details.cshtml:47-50`) | `ToggleRow` (`JobScheduleDetailsScreen.tsx:343-349`) | ✅ | |

| “Generate if no results” = `emptyEmail` (`Details.cshtml:53-56`) | `ToggleRow` `emptyEmail` (`JobScheduleDetailsScreen.tsx:350-356`) | ✅ | |

| Description textarea max 100 (`Details.cshtml:59-63`) | `maxLength={100}` (`JobScheduleDetailsScreen.tsx:332-341`) | ✅ | |

| Field order: Enabled → emptyEmail → Description (`Details.cshtml:47-64`) | Same order (`JobScheduleDetailsScreen.tsx:327-356`) | ✅ | |

| Send to Tutor only for Attendance export type 2 (`Details.cshtml:79-84`) | `showsAttendance(typeId)` (`JobScheduleDetailsScreen.tsx:357-365`, `job-schedule-form.ts:19`) | ✅ | |

| Save gated Add (new) / Edit (existing) (`Details.cshtml:11-15`) | `canSave` = ADD or EDIT (`JobScheduleDetailsScreen.tsx:134,280-292`) | ✅ | |

| Access-only users: no Save button (security binding) | Fields `disabled={locked}` when `!canSave` (`JobScheduleDetailsScreen.tsx:230,337`) | ✅ | Stricter than legacy (OK) |

| `< >` rejected on text fields (`swapp.js:2641-2644`, `jobScheduleDetailsController.js:28-38`) | `validateJob` + field error `specialCharacters` (`job-schedule-form.ts:90-94`, `JobScheduleDetailsScreen.tsx:231-232`) | ✅ | |
| Next 3 run times estimate (build-prompt §3) | `estimateNextCronRuns`, browser local time, months without the day skipped (`cron.ts`) | ✅ | Fixed 2026-09-15; real-date tests added |
| Validation toast `FieldsWithInputValidations` for KO group (`swapp.js:574`, `_Layout.cshtml:216`) | Toast `RequiredMessage` for `special` kind (`JobScheduleDetailsScreen.tsx:206-210`) | ✅ | Same resource family |

| Recipients email regex for types 103/104 (`jobScheduleDetailsController.js:16-25`) | Same regex in `validateJob` (`job-schedule-form.ts:83-99`) | ✅ | |



---

| Body includes scalar detail fields; `percentageAttended`/`minutes` as number or null | `numberOrNull`; non-numeric percentage is now a field error before POST (`job-schedule-form.ts`) | ✅ | Fixed 2026-09-15 |

## Details — Schedule card



| Invalid cron: `BadRequest(GeneralResources.CronExpressionIncorrect)` (`JobScheduleApiController.cs:423-424`) | Client only checks five fields; Cronos validation stays on the server; empty cron shows `CronExpressionIncorrect` | ✅ | Fixed 2026-09-15 (client check was stricter than the server) |

| ---------------- | --------- | ------ | ----------- |

| jquery-cron periods minute/hour/day/week/month/year (`jobScheduleDetailsController.js:177-197`, `_references.js:123`) | `CRON_PERIODS` + `ScheduleBuilder` chips (`cron.ts:12`, `ScheduleBuilder.tsx:163-234`) | ✅ | |

| Minute: `* * * * *`; hour: `m * * * *`; day: `m h * * *`; week: `m h * * dow`; month: `m h dom * *`; year: `m h dom mon *` (jquery-cron shapes) | `buildCron` matches (`cron.ts:86-101`) | ✅ | Covered in `Operations.test.tsx:94-105` |

| Advance checkbox toggles raw cron input (`Details.cshtml:69-75`, `jobScheduleDetailsController.js:200-204`) | Advance mode + `Input` (`ScheduleBuilder.tsx:143-160,239-251`) | ✅ | |

| Non-simple cron opens Advance (`jobScheduleDetailsController.js:177-187`) | `parseCron === null` → `advanced` true (`JobScheduleDetailsScreen.tsx:146-147`, `cron.ts:56-84`) | ✅ | |

| Cancel link, no confirm (`Details.cshtml:17-19`) | Cancel goes through the unsaved-changes guard | ⚠ | Enhancement: asks to confirm when there are changes |

| No navigation guard | `useDirtyNavigationGuard`: browser unload plus every in-app link click while dirty | ✅ | Fixed 2026-09-15 (sidebar links were not covered) |

| Day-of-week 0–6, day-of-month 1–31, hour 0–23, minute 0–59 | `range()` selects in `ScheduleBuilder.tsx` | ✅ | |

| Human schedule in list via prettyCron | `describeCron` in list + builder preview (`cron.ts:118-136`, `ScheduleBuilder.tsx:134-135`) | ⚠ | Verify wording vs prettyCron on live data |

| Unchecking Advance copies widget value back (`jobScheduleDetailsController.js:200-204`) | `parts` synced from `parseCron(value)` when Advance turns off (`ScheduleBuilder.tsx`) | ✅ | |

| New job default cron preserved when switching period | `withPeriod` keeps time/day (`cron.ts:104-107`) | ✅ | |

| Two-column layout ≥1280px | One column of cards plus the sticky summary column | ✅ | |

---



## Details — Parameters



| Legacy behaviour | React now | Status | Fix (if ❌) |

| ---------------- | --------- | ------ | ----------- |

| Date range hidden for types 101, 103, 104 (`Details.cshtml:100`) | `showsDateRange` (`job-schedule-form.ts:16`) | ✅ | |

| Date range select from `dateRangeAvailables` (`Details.cshtml:103-107`) | `NativeSelect` (`JobScheduleDetailsScreen.tsx:406-418`) | ✅ | |

| Academic School/Course/Module hidden for 102, 103, 104 (`Details.cshtml:130`) | `showsAcademic` (`job-schedule-form.ts:17`) | ✅ | |

| Location Site/Building/Room only for Room utilisation (`Details.cshtml:156-177`, type == `ReportGroupEnum.RoomUtilisation`) | `showsLocation` — type 4 only (`job-schedule-form.ts:18`) | ✅ | D-101: value 4 |

| Attendance % operator + value only for type 2 (`Details.cshtml:180-188`) | Inside date-range card when `showsAttendance` (`JobScheduleDetailsScreen.tsx:420-457`) | ✅ | |

| Monitoring minutes (1–60) + recipients for 103/104 (`Details.cshtml:191-203`) | `showsMonitor` card (`JobScheduleDetailsScreen.tsx:473-506`) | ✅ | |

| Minutes placeholder `Default: {minutesDefault}` (`Details.cshtml:195`, `JobScheduleApiController.cs:283-286`) | Same placeholder pattern (`JobScheduleDetailsScreen.tsx:483`) | ✅ | |

| Lookup placeholders `[All]` (`Details.cshtml:135,144,152,160,167,174`) | `` `[${t('All')}]` `` (`JobScheduleDetailsScreen.tsx:235,246`) | ✅ | |

| School search filters by courseId, moduleId (`jobScheduleDetailsController.js:96-100`) | `lookupQuery('school', ...)` (`job-schedule-form.ts:71-72`) | ✅ | |

| Course search filters by schoolId, moduleId (`jobScheduleDetailsController.js:103-107`) | `lookupQuery('course', ...)` (`job-schedule-form.ts:73-74`) | ✅ | |

| Module search filters by schoolId, courseId (`jobScheduleDetailsController.js:110-114`) | `lookupQuery('module', ...)` (`job-schedule-form.ts:75-76`) | ✅ | |

| Site/Building/Room search query only (`jobScheduleDetailsController.js:117-127`) | `lookupQuery` default `{ query }` (`job-schedule-form.ts:77-78`) | ✅ | |

| Typeahead minLength 0, load on focus (`Details.cshtml:135` bindings) | `onFocus` opens; debounced GET 250ms (`LookupField.tsx:48-66,92`) | ✅ | |

| Clear lookup id when text cleared (typeahead) | `onChange` clears selection when text empty (`LookupField.tsx:94-97`) | ✅ | LB-051 notes runtime not verified |

| Select first option when visible select has no match (KO options binding) | `withVisibleDefaults` (`job-schedule-form.ts:48-64`) | ✅ | D-101 |

| Hidden fields keep values in POST when type changes (no KO reset) | `withVisibleDefaults` on type change only adjusts visible selects; ids retained (`JobScheduleDetailsScreen.tsx:192`, `Operations.test.tsx:228`) | ✅ | D-101 |

| `GetBuildingOptions` / `GetRoomOptions` require **Reports** Access, not JobSchedule (`JobScheduleApiController.cs:181-182,199-200`) | Same API paths; 403 shows `reportsPermissionRequired` in dropdown (`LookupField.tsx`, `JobScheduleDetailsScreen.tsx:310-311`) | ⚠ | LB-051: backend still requires Reports |

| No Group lookup in legacy view | No Group field | ✅ | Build prompt “Group” not in `Details.cshtml` |

| Types Academic (5), Absence (6) supported server-side (`JobScheduleApiController.cs:482-485`) | Visibility via `showsDateRange` / `showsAcademic` (not limited to hard-coded `JOB_TYPE` constants) | ✅ | |



---



## Output / view model fields



| Legacy behaviour | React now | Status | Fix (if ❌) |

| ---------------- | --------- | ------ | ----------- |

| `JobScheduleViewModel` fields (`JobScheduleViewModel.cs:5-29`) | `JobScheduleDto` (`operations.ts:10-36`) | ✅ | |

| `from` / `to` date parameters commented out in UI (`Details.cshtml:114-128`, `JobScheduleApiController.cs:516-525`) | Not shown; fields exist on type | ✅ | |

| `code`, `jobClass` set server-side on save (`JobScheduleApiController.cs:471-472,648`) | Sent if present in draft; server overwrites | ✅ | |

| `minutesDefault` display-only from tenant config (`JobScheduleApiController.cs:283-286`) | Shown in placeholder only | ✅ | |

| No export-format / file-template / delivery UI in legacy | Not shown | ✅ | Server derives from `TypeId` / `GetJobRequest` |

| `JobDetailsViewModel` option lists (`JobDetailsViewModel.cs:13-16`) | `JobDetailsDto` (`operations.ts:43-48`) | ✅ | |

| Sticky summary: type, schedule sentence, scope chips, next runs (build-prompt §3 target) | Right sticky summary panel (`JobScheduleDetailsScreen.tsx`) | ✅ | |

| Next 3 run times estimate (build-prompt §3) | `estimateNextCronRuns` in summary (`cron.ts`, `JobScheduleDetailsScreen.tsx:336-338`) | ✅ | |



---



## Save



| Legacy behaviour | React now | Status | Fix (if ❌) |

| ---------------- | --------- | ------ | ----------- |

| POST `JobScheduleApi/` JSON body = `ko.toJSON(detail)` (`jobScheduleDetailsController.js:28-33`, `swapp.js:530-533`) | POST `toJobBody(job)` (`JobScheduleDetailsScreen.tsx:216`, `job-schedule-form.ts:110-116`) | ✅ | |

| Body includes scalar detail fields; `percentageAttended`/`minutes` as number or null | `numberOrText` conversion | ✅ | `Operations.test.tsx:125-128` |

| Hidden parameter values still sent (e.g. `dateRangeId` when type 103) | Test asserts `dateRangeId: 1` on monitor save (`Operations.test.tsx:228`) | ✅ | |

| `emptyEmail`, `recipients` always in server params (`JobScheduleApiController.cs:619-639`) | Included in the spread body | ✅ | |

| `sendToTutor` only if has value (`JobScheduleApiController.cs:592-598`) | `null` when not attendance | ✅ | |

| Success toast then navigate to index (`jobScheduleDetailsController.js:32-33`) | `setFlash(AlertSaveSucceededDefault)` + `router.push` (`JobScheduleDetailsScreen.tsx:217-218`) | ✅ | |

| 400: show `responseJSON.message` (`jobScheduleDetailsController.js:35-37`) | `saveFailureMessage` for 400 (`JobScheduleDetailsScreen.tsx:220-224`, `use-object-form.ts:18-21`) | ✅ | |

| Invalid cron: `BadRequest(GeneralResources.CronExpressionIncorrect)` (`JobScheduleApiController.cs:423-424`) | `validateJob` + `isValidCronExpression` before POST; field shows `CronExpressionIncorrect` (`job-schedule-form.ts`, `JobScheduleDetailsScreen.tsx`) | ✅ | |

| Safe mode blocks POST | API client `blocked` → `FRAME_EN.safeMode` | ✅ | |

| Edit loads `GET JobScheduleApi/{id}` (`JobScheduleApiController.cs:271-369`) | `loadDetails(id)` (`JobScheduleDetailsScreen.tsx:115-116,135-137`) | ✅ | |

| Lookup descriptions via `Get{X}Description?id=` (`jobScheduleDetailsController.js:77-94`) | `useEffect` per lookup (`JobScheduleDetailsScreen.tsx:162-185`) | ✅ | |



---



## Unsaved changes



| Legacy behaviour | React now | Status | Fix (if ❌) |

| ---------------- | --------- | ------ | ----------- |

| No unsaved indicator | `FormStatusPill` when dirty (`JobScheduleDetailsScreen.tsx:148,271`) | ✅ | Enhancement |

| Cancel link, no confirm (`Details.cshtml:17-19`) | `Link` to list (`JobScheduleDetailsScreen.tsx:274-279`) | ✅ | Legacy parity |

| No Discard control to revert edits | `SaveActions` with `onDiscard` resetting draft to `initial` (`JobScheduleDetailsScreen.tsx`) | ✅ | Enhancement over legacy |

| No navigation guard | `useDirtyNavigationGuard` + `beforeunload` when dirty (`JobScheduleDetailsScreen.tsx:128-129,190`) | ✅ | Enhancement over legacy |

| Ctrl+S save | `useSaveShortcut` (`JobScheduleDetailsScreen.tsx:228`, `SettingsFrame.tsx:234-249`) | ✅ | Enhancement over legacy |



---



## UI / frame (D-018, D-024, build-prompt §3)



| Target | React now | Status | Fix (if ❌) |

| ------ | --------- | ------ | ----------- |

| Operations area sidebar (`D-101`) | `useOperationsArea` + section list (`operations-area.ts`, `SettingsLayout`) | ✅ | D-024: section list OK for Operations |

| Two-column form ≥1280px | Job + Schedule row; parameters grid; summary column (`JobScheduleDetailsScreen.tsx`) | ✅ | |

| Lookup Gearwork while searching (§3) | `GearworkLoader` in input + dropdown while fetching (`LookupField.tsx`) | ✅ | |

| Enabled icon + visible text in list (§3) | Icon + Yes/No text (`JobSchedulesScreen.tsx:86-97`) | ✅ | |

| Breadcrumb Operations › Jobs | Via `AreaWorkspace` area label + section | ✅ | |



---



## Permissions reference



| Item | Action | Value | Legacy | React |

| ---- | ------ | ----- | ------ | ----- |

| JobSchedule | Access | 1 | `JobScheduleApiController` GET | `SettingsGate` ACCESS |

| JobSchedule | Add | 2 | Save new (`Details.cshtml:11`) | `ADD` |

| JobSchedule | Edit | 3 | Save existing (`Details.cshtml:14`) | `EDIT` |

| JobSchedule | Delete | 4 | Delete button (`Index.cshtml:27`) | `DELETE` |

| Reports | Access | — | Building/Room **options** only (`JobScheduleApiController.cs:182,200`) | Same endpoints ⚠ LB-051 |



---



## Files reviewed



**React:** `JobSchedulesScreen.tsx`, `JobScheduleDetailsScreen.tsx`, `job-schedule-form.ts`, `cron.ts`, `ScheduleBuilder.tsx`, `LookupField.tsx`, `operations-area.ts`, `operations.ts`, `Operations.test.tsx`, `LookupField.test.tsx`, `ClientListScreen.tsx`, app routes.



**Legacy:** `Views/JobSchedule/Index.cshtml`, `Details.cshtml`, `JobScheduleApiController.cs`, `JobScheduleViewModel.cs`, `JobDetailsViewModel.cs`, `jobScheduleDetailsController.js`, `swgrid.js`, `swapp.js`.

