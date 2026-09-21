# Audit — Activity Log

Written on 2026-09-15 from legacy source only. Paths are relative to `Seats.Trunk.Admin\`.

## Route

| | Legacy | React |
|---|---|---|
| Path | `#/Audit` | `/users/activity` |
| MVC partial | `Audit/Index` (AjaxOnly) | — |
| Page component | `seats-admin-audit` (Polymer) | — |

Evidence: `Controllers/AuditController.cs:15-22`, `Views/Audit/Index.cshtml:10,38-40`, `Views/Shared/_Layout.cshtml:67`

## Menu

- **Main nav:** Audit item gated `Users` + `Activity`. Evidence: `Views/Shared/_Layout.cshtml:67`
- **Users sub-nav:** Activity pill active; the other four pills keep their own gates (User `Users`+`Access`, Access Profile `AccessProfiles`+`Access`, Contact Group `ContactGroup`+`Access`, Developer Key `Users`+`DeveloperKeyDashboard`). Evidence: `Views/Audit/Index.cshtml:15-31`

## Filters

All filters apply immediately; there is no Search button. Evidence: `seats-admin-audit.html:373-374,586-609`

| Filter | Control | Options / behaviour | Body field | Evidence |
|---|---|---|---|---|
| Site | select | All `''`, Admin `admin`, Web `web` | `site` | `seats-admin-audit.html:141-147` |
| Type | select | All `''`, Logon `Login`, Page `Page`, Action `Action`, Cancel `Cancel` | `type` | `:150-157` |
| User | remote autocomplete, placeholder All | Typing calls `GET api/Audit/GetUser?query={text}`; selecting sets the user id and reloads; clearing resets to all users and page 0 | `user` (int?) | `:160-171,464-478,577-594`, `Controllers/Api/AuditController.cs:199-211` |
| Select Range | date range (From / To) | Defaults to today–today; end date cannot be before start; no preset buttons (`hidden-section-button`) | `from`, `to` as `YYYY-MM-DD` | `:174-182,381-382,555-566`, `seats-range-date-picker.html:124-150,331-334` |
| Clean | button | Resets sort to `accessDate desc`, site/type/user to all, range to today, page 0, then reloads | — | `:187-189,487-516` |

User lookup (`GetUser`): server returns up to 10 users ordered by user name as `{ id, description }`, hiding the tenant super user. Evidence: `Controllers/Api/AuditController.cs:199-211`

## Grid

Server-side paging and sort, no row selection. Evidence: `seats-admin-audit.html:213-257`

| Column | Bind / sort field | Display | Evidence |
|---|---|---|---|
| Item (with type icon) | `auditType` | Page → `SeatsPageview`; Action → `SeatsAction`; Cancel → `SeatsCancel`; otherwise `SeatsLogon`. Icon: page-visit for Page, log-in for others | `:222-231,442-444,517-519` |
| Detail | `detail` | Text from `detail.detail` JSON, see rules below | `:232-241,389-431` |
| Date | `accessDate` | Server string `dd/MM/yyyy HH:mm` | `:242-246`, `Controllers/Api/AuditController.cs:146` |
| User Name | `userName` | Server; `UserSystem` ("System") for user 0 or unknown | `:247-251`, `AuditController.cs:150` |
| User Full Name | `userFullName` | Same rule | `:252-256`, `AuditController.cs:151` |

Header click: first click on a column sorts ascending, next click descending; any sort resets to page 0. Evidence: `seats-grid-sortable-behaviour.html:10-31`, `seats-admin-audit.html:523-530`

Page sizes 10, 20, 30, 50, 100, 200; default 100. Pager shows only when total is greater than the page size. Evidence: `seats-grid.html:201-214`, `seats-grid-paginator-behaviour.html:48`, `seats-admin-audit.html:334`

### Detail text rules (`_detail`, `seats-admin-audit.html:389-431`)

`detail.detail` is JSON. For `Login`: `site == 'admin'` → `AdminSite`, else `WebSite`.

For `Action` or `Cancel` with `extra.type`:

| extra.type | Text |
|---|---|
| ROOM | `{ACTION}  Room {roomCode} - {roomName}` |
| DEVICE | `{ACTION}  Device {serial}` |
| DEVICE-ROOM | `{ACTION} room {roomCode} - {roomName} from device {serial}` when action is DELETED, otherwise `... to device {serial}` |
| LECTURE | `{ACTION}  lecture {lecture}` |
| STUDENTSCHEDULE | `{ACTION}  lecture {lecture}  student {student}` + ` removeType {removeType}` + ` module {module}` when present |
| QR-OPENED | `{ACTION} type {qr} lecture {timetableId}` + ` room {roomId}` when present + ` duration {n} minutes` (rounded minutes end − start) |
| ATTACHMENT | `{ACTION} {detail} {student or N/A} - attachment {attachement}` |
| other / no extra | `({ACTION}) ` + `Room: {room} ` when room is set + `/` + path without `#/`, first letter upper-cased |

For `Page` (and anything else): a path starting with HTTP/HTTPS is shown as is; `#` → `DefaultPage  ({SITE})`; otherwise `/` + path without `#/`, first letter upper-cased.

### Detail link (`_isAction`, `_linkDetail`, `:445-451,483-486`)

- Non-Action rows render the text as a link to `url` in a new tab.
- Action rows are a link only when `extra` and `url` exist and the type is DEVICE-ROOM or the action is not DELETED; otherwise plain text.

## Actions + API

### Load

- **Endpoint:** `POST /Seats.Trunk.Admin/api/audit/GetAudit`
- **Body:** `{ pageNumber, pageSize, sortCol, sortDir, type, user, site, from, to }`; initial `{0, 100, 'accessDate', 'desc', '', '', '', today, today}`. Evidence: `seats-admin-audit.html:330-343,555-568`, `ViewModels/Audit/AuditParameters.cs`
- **Response:** `{ items: AuditViewModel[], totalRowCount }`; item `{ id, userName, userFullName, userId, accessDate, auditType, detail: { auditType, detail } }`. Evidence: `ViewModels/User/AuditViewModel.cs`, `AuditController.cs:155-159`
- **Side effects:** none; read only (`_auditApiClient.GetAsync`). Evidence: `AuditController.cs:133`
- **Server error:** caught and returned as an empty page with HTTP 200. Evidence: `AuditController.cs:162-166`
- **Permission:** `Users` + `Activity`. Evidence: `AuditController.cs:118`

### Export

- **UI:** "+" Actions dropdown with one Export item, hidden when the grid total is 0. Opens a dialog: Export As (Pdf / Csv) with Save and Cancel. Evidence: `seats-admin-audit.html:194-208,260-264,633-644`, `seats-website-export/seats-website-export.html:30-75`
- **Endpoint:** `POST /Seats.Trunk.Admin/api/audit/Export`
- **Body:** current filters + `exportTo` (Pdf 0, Csv 1), `from`/`to` recomputed. Evidence: `seats-admin-audit.html:610-628`, `Views/Audit/Index.cshtml:61-62`
- **Side effect:** enqueues an export report (`EnqueueExportAudit`). This is a write. Evidence: `AuditController.cs:191`
- **Success:** info toast `ReportProcessing`. Evidence: `seats-admin-audit.html:629-632`
- **Failure:** 400 with the server message. Evidence: `AuditController.cs:193-194`
- **Permission:** `Users` + `Activity`. Evidence: `AuditController.cs:172`

## Permissions

| UI element | Item | Action |
|---|---|---|
| Menu, sub-nav pill, page | `Users` | `Activity` |
| GetAudit, GetUser, Export APIs | `Users` | `Activity` |

## States

| State | Legacy | React |
|---|---|---|
| Loading | Grid loading flag | Shared delayed loader |
| Empty | "There are no items to show." | Same text |
| Error | Toast bound to the wrong property (empty) | Error + Retry |
| Export pending | none | Save disabled while pending |

## Legacy bugs — do not copy

| Bug | Class | Evidence | React |
|---|---|---|---|
| Error toast sets `toastMessage` instead of `_toastMessage`, so errors show an empty toast | B | `seats-admin-audit.html:479-482` | Show the error with Retry |
| Enter in the user box calls `_search()` with no event and throws | B | `:595-600` | Enter picks the highlighted user |
| GetAudit swallows service errors as an empty 200 page | B | `AuditController.cs:162-166` | Cannot be told apart on the client; report only |
| Detail links open any stored `url` (including `javascript:`) in a new tab without `noopener` | C | `:235,483-486` | Only http(s) links, with `rel="noopener noreferrer"` |
| Export dialog shows an empty radio row (`hiddenSelectedItem === 0` is never true) | B | `seats-website-export.html:47,150-152` | Not shown |
| Changing Site, Type, User or dates keeps the current page number, so page 3 of the old results is requested while the pager shows page 1 | B | `seats-admin-audit.html:555-568,586-609` | Every filter change returns to page 0 |
| Header sort direction is remembered per column instead of from the current sort | B | `seats-grid-sortable-behaviour.html:13-30` | Copied as legacy (2026-09-15 parity pass) |
| Clean writes `filters.selectedStartDate`, so the picker shows today but the old range is still requested | B | `seats-admin-audit.html:500-501,564-565` | Clean really resets the range to today |
| Developer key dialog ignores load errors and Clipboard.js copies with no feedback | B | `developerKeyGeneratorController.js:48-73,84` | Error with Refresh; "Copied" feedback for 2 s |

## Checklist

- [x] Route `/users/activity` gated by `Users` + `Activity`; menu and sub-nav link to it
- [x] Site, Type, User and date range filters with legacy options and defaults
- [x] User lookup via `GET api/Audit/GetUser?query=`; select and clear reload from page 0
- [x] Clean resets every filter, sort and page
- [x] `POST api/audit/GetAudit` body matches legacy field names and date format
- [x] Grid columns, Item names, type icon and Detail text rules
- [x] Detail link rule with safe links only
- [x] Server sort and paging (sizes 10–200, default 100)
- [x] Export dialog (Pdf/Csv) hidden when empty; `POST api/audit/Export`; ReportProcessing notice
- [x] Loading / empty / error states distinct
