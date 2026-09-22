# Readings Report — Index

Read-only report of student clockings (card reads) for a device and date/time range.

## Route

| | Legacy | React |
|---|---|---|
| Path | `#/ReadingsReport` / `#/ReadingsReport/Index` | `/resources/readings-report` |
| MVC partial | `ReadingsReport/Index` (`[AjaxOnly]`) | — |
| Page file | — | `src/app/resources/readings-report/page.tsx` |

Evidence: `Controllers/ReadingsReportController.cs:20-26`, `Views/ReadingsReport/Index.cshtml:78-92`

- `Index()` puts `ViewBag.NowWithTimeZone` (tenant time zone "now") in the view; the two date filters are seeded from `.Date` of that value. Evidence: `Controllers/ReadingsReportController.cs:24`, `Views/ReadingsReport/Index.cshtml:90-91`

## Menu

- **Main nav:** Devices area. Evidence: `Views/Shared/_Layout.cshtml:69-81`
- **Sub-nav pills:** Room, Device, Readings Report (active), Suspicious Readings Report — each gated by its own Access permission. Evidence: `Views/ReadingsReport/Index.cshtml:8-20`
- React renders the same four sections from `DEVICES_GROUP`, filtered by permission. Evidence: `src/features/devices/use-devices-sections.ts`

## Permissions

| UI element | Item | Action |
|---|---|---|
| MVC Index view | `ReadingsReport` (15) | `Access` |
| Grid data `GetStudentClockings` | `ReadingsReport` (15) | `Access` |
| `GetDevices` (filter dropdown) | `Devices` **OR** `ReadingsReport` | `Access` |
| Export PDF / CSV | No separate gate in the view — implicit via ReadingsReport Access | — |
| Sub-nav Room pill | `Rooms` | `Access` |
| Sub-nav Device pill | `Devices` | `Access` |
| Sub-nav Suspicious pill | `ReadingsReport` | `Access` |

Evidence: `Controllers/ReadingsReportController.cs:21`, `Controllers/Api/ReadingsReportApiController.cs:44-46,120-122`, `Views/ReadingsReport/Index.cshtml:8-20,33-42`

- The grid permission is a `ClaimsPrincipalPermission` demand, so no access is a **401**, not an empty page (unlike `DeviceApi/GetDevices`, LB-012).
- React gates the whole route with `DevicesGate permission={ReadingsReport + Access}`. Evidence: `src/features/devices/readings/ReadingsReportScreen.tsx:46,70`

## Filters

Filters apply immediately — every filter observable has a `subscribe` that resets the page index and reloads. There is no Search/Apply button for filters. Evidence: `Scripts/controllers/readingsReportController.js:117-142`

| Filter | Model | Default | Request field | Control |
|---|---|---|---|---|
| Device | `selectedDeviceId` | null → `[All]` caption | `deviceId` | Select of `availableDevices`, value `id`, text `serialNumber`. Evidence: `_IndexHeaderFilter.cshtml:32` |
| Start date | `dateFilter` | today (tenant time zone) | `dateFilter` | `seats-date-picker` writing a hidden input. Evidence: `_IndexHeaderFilter.cshtml:36-47`, `Index.cshtml:90` |
| Start time | `timeFilter` | empty → `[all day]` | `time` | Select 07:00–23:00 every 15 min. Evidence: `_IndexHeaderFilter.cshtml:53` |
| End date | `endDate` | today (tenant time zone) | `endDate` | `seats-date-picker` + hidden input. Evidence: `_IndexHeaderFilter.cshtml:59-70`, `Index.cshtml:91` |
| End time | `endTimeFilter` | empty → `[all day]` | `endTime` | Select 07:00–23:00 every 15 min. Evidence: `_IndexHeaderFilter.cshtml:78` |
| Include inactive devices | `includeInactive` | `false` | `includeInactive` | Checkbox; Enter toggles it and reloads. Evidence: `_IndexHeaderFilter.cshtml:86-89`, `readingsReportController.js:144-150` |

React equivalents: `initialReadingsQuery` (device null, both dates today, both times `''`, `includeInactive` false) and `TIME_OPTIONS` (65 values, 07:00 to 23:00 step 15). Evidence: `src/features/devices/readings/readings-query.ts`

### Server-side date/time handling

- Dates are parsed with `DateTime.Parse(value, CultureInfo.CurrentUICulture)` — the client short-date format must match the user's UI culture (D-076). Evidence: `Controllers/Api/ReadingsReportApiController.cs:52,67`
- `time` / `endTime` are `HH:mm`, converted to minutes past midnight and added to the corresponding date. Evidence: `ReadingsReportApiController.cs:55-59,70-76`
- With a start date and **no** end date, the end becomes start + 1 day. With an end date and no end time, the end becomes 23:59:59 of that day. Evidence: `ReadingsReportApiController.cs:78-84`
- `includeInactive` is sent to the service inverted as `DeviceIsActive = !includeInactive`. Evidence: `ReadingsReportApiController.cs:91`
- `SecurityModel = false` — this report deliberately does not apply the user's data-visibility model. Evidence: `ReadingsReportApiController.cs:93`, and again for export at `:106-107`

### Device options

- `GET api/ReadingsReportApi/GetDevices` returns `DeviceDto[]` (all devices). When the tenant setting `OnlineResource.MarkAttendance` is false, virtual devices (`DeviceTypeEnum.Virtual`) are filtered out. Evidence: `ReadingsReportApiController.cs:118-132`
- Legacy binds the grid **inside** this call's success handler, so a failed device list leaves the page blank (LB-065). React loads the two independently. Evidence: `readingsReportController.js:101-109`, `src/features/devices/readings/ReadingsReportScreen.tsx:80-86,190-197`

## Columns and order

| # | Column | Bind field | Sort `data-column` |
|---|---|---|---|
| 1 | Date | `date` (`dateText`) | `date` |
| 2 | Room | `roomName` | `roomName` |
| 3 | Device Serial Number | `deviceSerialNumber` | `deviceSerialNumber` |
| 4 | Student No | `studentNumber` | `studentNumber` |
| 5 | Badge Number | `badgeNumber` | `badgeNumber` |
| 6 | Name | `studentName` | `studentName` |
| 7 | Type | `clockingTypeDescription` | `clockingTypeDescription` |

Evidence: `Views/ReadingsReport/Index.cshtml:50-58` (headers), `:61-70` (cells). Labels come from `GeneralResources`; the Device column label is `Device` + `SerialNumber` concatenated (`:52`).

- A commented-out `ClockingId` column sits first in both the header and the row (`:49`, `:62`). Not ported.
- Rows are `style="cursor: default"`, not selectable and not clickable — `isSelectable: false`, `isMultiSelectable: false`. Evidence: `Index.cshtml:60`, `:82-83`
- React column list: `readingsColumns()` in the same order with the same sort keys. Evidence: `src/features/devices/readings/ReadingsReportScreen.tsx:52-66`

## Initial sort

- `initialSortColumn: 'date'`, `initialSortDirection: 'desc'`. Evidence: `Views/ReadingsReport/Index.cshtml:85-86`
- `date` is a real column here, so the arrow shows on Date.
- Clicking the same header flips asc/desc; a different header starts **ascending**. Evidence: `Scripts/softworks/swgrid.js:344-350`
- Legacy does **not** reset the page index on sort (LB-073); React does (D-070). Evidence: `nextReportSort` in `readings-query.ts`

## Paging

- Server-side (`paginationSide: 'server'`). Evidence: `Index.cshtml:84`
- Default page size **100** — the view passes no `pageSize`, so swgrid's default applies. Evidence: `Scripts/softworks/swgrid.js:29`
- Page-size options: 10, 15, 20, 50, 100, 200. Evidence: `swgrid.js:832-838`
- The pager and the page-size selector are only rendered when `totalRowCount > 9`. Evidence: `swgrid.js:828`
- `currentPageIndex` is **0-based** and sent through unchanged to the service as `PageNumber`. Evidence: `swgrid.js:656`, `ReadingsReportApiController.cs:95`
- React: `PAGE_SIZES = [10, 15, 20, 50, 100, 200]`, `PAGER_MIN_ROWS = 10`, default page size 100. Evidence: `src/features/devices/index/device-query.ts:14,16`, `readings-query.ts` `initialReadingsQuery`

## Search

- Readings Report **has** the shared search box (`_ListSearchNavBar`); Suspicious does not. Evidence: `Views/ReadingsReport/Index.cshtml:31`
- It requires a submit: typing does nothing until the form is submitted or the search button is clicked (`data-bind="submit: searchTrigger"` / `click: searchTrigger`). Evidence: `Views/Shared/_ListSearchNavBar.cshtml:4-10`
- `searchTrigger` resets `currentPageIndex` to 0 and reloads. Evidence: `swgrid.js:369-374`
- The value is trimmed and runs of spaces collapsed to one before it is appended as `searchFilter`. Evidence: `swgrid.js:663-668`
- Legacy appends it **unencoded** (LB-061); React URL-encodes it through the shared API client.
- Passed to the service as `SearchFilter`. Evidence: `ReadingsReportApiController.cs:92`
- React: `SearchField` with `onSubmit={list.submitSearch}`. Evidence: `ReadingsReportScreen.tsx:255-266`

## Export (Readings only)

- Two icon links: PDF then CSV, each also firing on Enter. Evidence: `Views/ReadingsReport/Index.cshtml:33-42`
- `ExportToEnum`: **Pdf = 0, Csv = 1**, passed into the controller as `exportToPdfEnum` / `exportToCsvEnum`. Evidence: `Views/ReadingsReport/Index.cshtml:87-88`
- **Endpoint:** `POST api/ReadingsReportApi/Export`. Evidence: `Index.cshtml:89`, `ReadingsReportApiController.cs:102-116`
- **Body** (`ExportStudentClockingDto`), in this order: `deviceId`, `dateFilter`, `time`, `endDate`, `endTime`, `includeInactive`, `searchFilter`, `exportTo`, `sortColumn`, `sortDirection`. Every null value is sent as `''`. Evidence: `readingsReportController.js:66-78`
- The server overwrites `SecurityModel = false`, `UserId` and `UserCultureInfo` (current UI culture name) before enqueuing. Evidence: `ReadingsReportApiController.cs:106-109`
- **Success:** no file — the report is queued and mailed/notified. A grey `ReportProcessing` alert shows for **6000 ms**. Evidence: `readingsReportController.js:82-85`, `Index.cshtml:89`
- **Failure:** `result.Code != Ok` → 400 with `result.Message`. Evidence: `ReadingsReportApiController.cs:112-113`
- Legacy exports the **typed** search text rather than the applied one (LB-075); React exports the applied query. Evidence: `readingsExportBody` in `readings-query.ts`
- React: `ExportMenu`, one request at a time (`inFlight` ref), success notice 6000 ms, failure notice 10000 ms. Evidence: `ReadingsReportScreen.tsx:49,124-151`

## Requests

### List

`GET api/ReadingsReportApi/GetStudentClockings`

| Param | Source |
|---|---|
| `currentPageIndex` | 0-based page |
| `pageSize` | 100 by default |
| `sortCol` | column key, `date` initially |
| `sortDir` | `asc` / `desc`, `desc` initially |
| `searchFilter` | trimmed search text |
| `deviceId` | nullable int |
| `dateFilter` | short date string |
| `time` | `HH:mm` or empty |
| `endDate` | short date string |
| `includeInactive` | bool |
| `endTime` | `HH:mm` or empty |

Evidence: `Controllers/Api/ReadingsReportApiController.cs:47-48`, `Scripts/softworks/swgrid.js:655-668`, `readingsReportController.js:92-99`. React mirror: `toReadingsParams` in `readings-query.ts`.

**Response:** `ServerSidePagedListDto<ReadingReportResponse>` → `{ items, totalRowCount }`. Evidence: `ReadingsReportApiController.cs:47`, `swgrid.js:703-707`

Note the parameter-order quirk to keep: `includeInactive` comes **before** `endTime` in the signature, and `endTime` is not nullable-checked before `int.Parse` on its split parts — a malformed value throws a 500.

### Device options

`GET api/ReadingsReportApi/GetDevices` → `DeviceDto[]`; React keeps `id` and `serialNumber` only. Evidence: `parseReadingsDevices` in `readings-query.ts`

### Export

`POST api/ReadingsReportApi/Export` (body above).

## States

| State | Legacy | React |
|---|---|---|
| Loading | `wasLoaded` false; the shared loading modal is shown by every ajax call (LB-001) | Shared `DelayedLoading` (400 ms), full table on first load, dimmed overlay when rows are already shown. Evidence: `ReportTable.tsx:502-524` |
| Empty | "There are no items to show." in the grid footer. Evidence: `swgrid.js:808-822` | `EmptyState` with the same text. Evidence: `ReportTable.tsx:525-530` |
| Error (list) | **None.** A failed GET leaves the grid empty or stale — indistinguishable from "no readings" | `ErrorState` with `AlertGeneralErrorDefault` and a Refresh button. Evidence: `ReportTable.tsx:508-518` |
| Error (device list) | **None.** The grid is never bound at all (LB-065) | Inline error + Refresh beside the Device filter; the table still loads. Evidence: `ReadingsReportScreen.tsx:190-197` |
| Export queued | Grey alert, 6000 ms | Info notice, 6000 ms |
| Export failed | Legacy `swapp.handleSaveEvent` default error handling | Error notice, 10000 ms; safe-mode and auth failures handled separately |
| No permission | 401 from the API demand | Route-level no-access message via `DevicesGate` |

## Side effects

- **Export:** enqueues an async report for the signed-in user through `IUserNotificationServiceClient`. Nothing is written by the list itself. Evidence: `ReadingsReportApiController.cs:110-115`
- The list is read-only: no create, update, delete or selection anywhere on this screen.

## Legacy bugs — do not copy

| Bug | Entry |
|---|---|
| A failed `GetDevices` leaves the whole grid unbound and the page blank | LB-065 |
| Export sends the typed, unsubmitted search text | LB-075 |
| Sorting does not reset the page index | LB-073 |
| `searchFilter` appended unencoded | LB-061 |
| Loading modal can stick open | LB-001 |
| No error state for a failed list load | LB-062 (same swgrid path) |

## Checklist

- [ ] Route `/resources/readings-report` gated by ReadingsReport + Access
- [ ] Sub-nav sections, each permission-gated
- [ ] Filters: device, start/end date, start/end time, include inactive — defaults as above, applied immediately
- [ ] Device options from `GetDevices`, independent of the grid load
- [ ] Seven columns in order, initial sort `date` desc
- [ ] Server paging: 0-based index, default 100, options 10/15/20/50/100/200, pager above 9 rows
- [ ] Search requires submit, resets to page 1, trimmed and encoded
- [ ] Export PDF (0) / CSV (1) with the exact body field names and the applied query
- [ ] Short dates formatted for the user's UI culture (D-076)
- [ ] Loading / empty / error states distinct, including a failed device list
