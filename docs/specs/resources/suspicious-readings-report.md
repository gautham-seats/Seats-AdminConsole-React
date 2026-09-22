# Suspicious Readings Report — Index

Read-only report of clockings the clocking service flagged as suspicious, for a date range.

## Route

| | Legacy | React |
|---|---|---|
| Path | `#/SuspiciousReadingsReport` / `#/SuspiciousReadingsReport/Index` | `/resources/suspicious-readings-report` |
| MVC partial | `SuspiciousReadingsReport/Index` (`[AjaxOnly]`) | — |
| Page file | — | `src/app/resources/suspicious-readings-report/page.tsx` |

Evidence: `Controllers/SuspiciousReadingsReportController.cs:20-26`, `Views/SuspiciousReadingsReport/Index.cshtml:71-85`

- `Index()` supplies `ViewBag.NowWithTimeZone`; both date filters are seeded from `.Date` of it. Evidence: `Controllers/SuspiciousReadingsReportController.cs:24`, `Index.cshtml:84-85`
- **Page title is wrong in legacy:** `<title>@GeneralResources.ReadingsReport - SEAtS</title>` — the other screen's name (LB-064). Evidence: `Views/SuspiciousReadingsReport/Index.cshtml:4`

## Menu

- Same Devices-area sub-nav as the other three screens; this pill is active and is gated by `ReadingsReport` + `Access` (not a permission of its own). Evidence: `Views/SuspiciousReadingsReport/Index.cshtml:8-20`
- The pill's label and title are hard-coded English ("Suspicious Readings Report"); `GeneralResources` has no key for it. React uses `DEVICES_FALLBACK_ONLY.suspiciousReadingsReport` for the same reason. Evidence: `Index.cshtml:18`, `SuspiciousReadingsReportScreen.tsx:406`
- The pill link carries `id`/`name` `readings-report-link`, which collides with the same id on the Room and Device index pages (LB-063).

## Permissions

| UI element | Item | Action |
|---|---|---|
| MVC Index view | `ReadingsReport` (15) | `Access` |
| Grid data `GetSuspiciousClockings` | `ReadingsReport` (15) | `Access` |
| Sub-nav Room pill | `Rooms` | `Access` |
| Sub-nav Device pill | `Devices` | `Access` |
| Sub-nav Readings Report pill | `ReadingsReport` | `Access` |

Evidence: `Controllers/SuspiciousReadingsReportController.cs:21`, `Controllers/Api/SuspiciousReadingsReportApiController.cs:29-30`, `Index.cshtml:8-20`

- `ClaimsPrincipalPermission` demand — no access is a **401**, not an empty list.
- React gates the route with the shared `READINGS_ACCESS` constant (same item/action as Readings Report). Evidence: `SuspiciousReadingsReportScreen.tsx:379`

## Filters

**Two date filters only.** There is no device select, no time selects, no include-inactive checkbox and no search box on this screen. Evidence: `Views/SuspiciousReadingsReport/_IndexHeaderFilter.cshtml` (whole file — two `seats-date-picker` blocks and nothing else)

| Filter | Model | Default | Request field |
|---|---|---|---|
| Start date | `dateFilter` | today (tenant time zone) | `dateFilter` |
| End date | `endDate` | today (tenant time zone) | `endDate` |

Evidence: `_IndexHeaderFilter.cshtml:4-33`, `Index.cshtml:84-85`, `suspiciousReadingsReportController.js:92-95`

Filters apply immediately — each subscribe resets the page index and reloads. Evidence: `suspiciousReadingsReportController.js:104-129`

### Dead observables to keep out of React

The controller is a copy of the Readings one and still declares `selectedDeviceId`, `timeFilter`, `endTimeFilter`, `includeInactive`, `availableDevices` and their subscribes, plus a full set of export handlers (`exportToPdf`, `exportToCsv`, `keyPressExportToPdf`, `keyPressExportToCsv`, `exportTo`) pointing at `options.exportApiController`. None of them is bound to anything in the view, the view passes no export options, and **there is no export action on `SuspiciousReadingsReportApiController`**. `GetDevices` is never called. This is dead code (LB-075) — do not port it.

Evidence: `suspiciousReadingsReportController.js:39-49` (observables), `:51-88` (export handlers), `:104-129` (subscribes); `SuspiciousReadingsReportApiController.cs` has exactly one action.

### Server-side date handling

- Both dates default server-side too: start = today, end = tomorrow, if the parameter is blank. Evidence: `SuspiciousReadingsReportApiController.cs:37-47`
- Parsed with `DateTime.Parse(value, CultureInfo.CurrentUICulture)` — the client format must match the user's UI culture (D-076). Evidence: `:41,:49`
- The end date always gets `+1 day` and is truncated to `.Date`, so the range is inclusive of the chosen end day. Evidence: `:51`
- The page index is converted to 1-based for the service (`currentPageIndex + 1`) — unlike the Readings report, which passes it through 0-based. Evidence: `:53`

## Columns and order

| # | Column (hard-coded English) | Bind field | Sort `data-column` |
|---|---|---|---|
| 1 | Reason | `reason` | `reason` |
| 2 | Reading Id | `clockingId` | `clockingId` |
| 3 | Created Date | `createdDate` (`dateText`) | `createdDate` |
| 4 | Reading Date | `clockingDate` (`dateText`) | `clockingDate` |
| 5 | Class Id | `classId` | `classId` |
| 6 | Class Start | `allocationStartDateTime` (`dateText`) | `allocationStartDateTime` |
| 7 | Class End | `allocationEndDateTime` (`dateText`) | `allocationEndDateTime` |
| 8 | Device | `deviceId` | `deviceId` |
| 9 | Student Number | `studentNumber` | `studentNumber` |

Evidence: `Views/SuspiciousReadingsReport/Index.cshtml:34-42` (headers), `:45-55` (cells)

- Every header label is hard-coded English, not a resource key (LB-075). React keeps them as fallback text in `DEVICES_FALLBACK_ONLY` and says so. Evidence: `SuspiciousReadingsReportScreen.tsx:344-375`
- The Device column shows `deviceId`, a raw id, not a serial number. Keep it — the response has no serial.
- Rows are `cursor: default`, `isSelectable: false`, `isMultiSelectable: false` — not selectable, not clickable. Evidence: `Index.cshtml:44`, `:76-77`

## Initial sort

- `initialSortColumn: 'date'`, `initialSortDirection: 'desc'`. Evidence: `Views/SuspiciousReadingsReport/Index.cshtml:78-79`
- **`date` is not one of the nine columns.** The first request therefore goes out as `sortCol=date&sortDir=desc` and no header shows a sort arrow, because no `data-column` matches (LB-075).
- This is **deliberately preserved**: the value is part of the wire contract to `GetSuspiciousClockingsAsync` and whatever the clocking service does with an unknown sort column is what legacy users see today. React sends `sortCol: 'date'` on the first request and shows no active sort arrow until the user clicks a header. Evidence: `initialSuspiciousQuery` in `readings-query.ts`, `ReportTable.tsx:571`
- Header clicks behave as elsewhere: same column flips asc/desc, a new column starts ascending (`swgrid.js:344-350`). Legacy does not reset the page index (LB-073); React does (D-070).

## Paging

- Server-side (`paginationSide: 'server'`). Evidence: `Index.cshtml:77`
- Default page size **100** (no `pageSize` passed; swgrid default). Evidence: `swgrid.js:29`
- Page-size options: 10, 15, 20, 50, 100, 200. Evidence: `swgrid.js:832-838`
- Pager and page-size selector render only when `totalRowCount > 9`. Evidence: `swgrid.js:828`
- The client sends a 0-based `currentPageIndex`; the controller adds 1 for the service. Evidence: `swgrid.js:656`, `SuspiciousReadingsReportApiController.cs:53`
- React: same `PAGE_SIZES` / `PAGER_MIN_ROWS` as the other Devices lists. Evidence: `SuspiciousReadingsReportScreen.tsx:444-446`

## Search

**None on this screen.** The view does not render `_ListSearchNavBar`, and the controller's `getQueryStringParams` sends only the two dates. Evidence: `Views/SuspiciousReadingsReport/Index.cshtml:26-33` (no search partial), `suspiciousReadingsReportController.js:92-95`

`swgrid` still appends `searchFilter=` (always empty) to every request because `searchingIsClientSide` is false, and the controller signature does not declare the parameter — it is accepted and ignored by Web API. Keep sending it for request parity. Evidence: `swgrid.js:661-668`, `toSuspiciousParams` in `readings-query.ts`

## Export

**None on this screen.** No export icons in the view, no export options passed to `init`, and no export action on the API controller. The export handlers left in the controller are dead code (see above). Evidence: `Views/SuspiciousReadingsReport/Index.cshtml:26-33`, `:71-85`, `Controllers/Api/SuspiciousReadingsReportApiController.cs`

React renders no export control on this screen. Evidence: `SuspiciousReadingsReportScreen.tsx:401-416` (no `actions` prop)

## Request

`GET api/SuspiciousReadingsReportApi/GetSuspiciousClockings`

| Param | Source |
|---|---|
| `currentPageIndex` | 0-based page |
| `pageSize` | 100 by default |
| `sortCol` | `date` initially (not a column) |
| `sortDir` | `desc` initially |
| `searchFilter` | always empty; not declared server-side |
| `dateFilter` | short date string |
| `endDate` | short date string |

Evidence: `Controllers/Api/SuspiciousReadingsReportApiController.cs:31-36`, `swgrid.js:655-668`, `suspiciousReadingsReportController.js:92-95`. React mirror: `toSuspiciousParams` in `readings-query.ts`.

**Response:** `ServerSidePagedListDto<SuspiciousClocking>` → `{ items, totalRowCount }`, with `totalRowCount` from `IPagedEnumerable.TotalCount`. Evidence: `SuspiciousReadingsReportApiController.cs:55-59`

Item fields consumed: `reason`, `clockingId`, `createdDate`, `clockingDate`, `classId`, `allocationStartDateTime`, `allocationEndDateTime`, `deviceId`, `studentNumber`. React parses each as a nullable string. Evidence: `parseSuspiciousPage` in `readings-query.ts`

## States

| State | Legacy | React |
|---|---|---|
| Loading | `wasLoaded` false; shared loading modal (LB-001) | Shared `DelayedLoading` (400 ms); dimmed overlay when rows are already shown. Evidence: `ReportTable.tsx:502-524` |
| Empty | "There are no items to show." Evidence: `swgrid.js:808-822` | `EmptyState`, same text |
| Error | **None.** A failed GET leaves the grid empty or stale, indistinguishable from "no suspicious readings" | `ErrorState` with `AlertGeneralErrorDefault` + Refresh. Evidence: `ReportTable.tsx:508-518` |
| No permission | 401 from the API demand | Route-level no-access message via `DevicesGate` |

Unlike the Readings screen, this one cannot fail on a device lookup — it makes exactly one request.

## Side effects

None. The screen is read-only: no create, update, delete, export, selection or row navigation.

## Legacy bugs — do not copy

| Bug | Entry |
|---|---|
| Page title uses the Readings Report resource | LB-064 |
| Initial sort `date` is not a column (contract kept, arrow not shown) | LB-075 |
| Hard-coded English headers and pill label | LB-075 |
| Dead export handlers and device observables with no export API | LB-075 |
| Duplicate `readings-report-link` id across the area's pages | LB-063 |
| Sorting does not reset the page index | LB-073 |
| No error state for a failed list load | LB-062 (same swgrid path) |

## Checklist

- [ ] Route `/resources/suspicious-readings-report` gated by ReadingsReport + Access
- [ ] Own page title, not the Readings Report one
- [ ] Two date filters only, both defaulting to today, applied immediately
- [ ] Nine columns in order, with the legacy English labels as fallback text
- [ ] First request sends `sortCol=date&sortDir=desc`; no header shows an active arrow until one is clicked
- [ ] Server paging: 0-based index sent, default 100, options 10/15/20/50/100/200, pager above 9 rows
- [ ] `searchFilter` still sent (empty) for request parity; no search box
- [ ] No export control, no device filter, no include-inactive, no selection
- [ ] Short dates formatted for the user's UI culture (D-076)
- [ ] Loading / empty / error states distinct
