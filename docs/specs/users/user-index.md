# User — Index

## Route

| | Legacy | React (proposed) |
|---|---|---|
| Path | `#/User` / `#/User/Index` | `/users` |
| MVC partial | `User/Index` | — |
| Load | Hash route loads `User/Index` partial via `swRouting` | — |

Evidence: `Views/User/Index.cshtml:11`, `Views/User/Details.cshtml:22`, `Views/Shared/_Layout.cshtml:43`

## Menu

- **Main nav:** Users item (`#userMenuItem`) visible when user has `PermissionDefinitionItemEnum.Users` + `PermissionDefinitionActionEnum.Access`; links to `#/User`. Evidence: `Views/Shared/_Layout.cshtml:39-43`
- **Sub-nav (Users area pills):** User (active), Access Profile, Contact Group, Activity, Developer Key — each pill gated by its own permission. Evidence: `Views/User/Index.cshtml:8-38`
- **Focus parent:** User pill is active on this screen; other pills in the group link away. Evidence: `Views/User/Index.cshtml:10-11`

## Fields (grid columns)

| Column label | Bind field | Sort `data-column` | Conditional | Notes |
|---|---|---|---|---|
| User Name | `userName` | `userName` | Always | Evidence: `Views/User/Index.cshtml:77-83,115` |
| Access Profile(s) | `accessProfiles` | `accessProfiles` | When `seatsAuthorisationByPersonas` is true | Column and cells wrapped in `<!-- ko if: $root.seatsAuthorisationByPersonas() -->`. Evidence: `Views/User/Index.cshtml:84-92,116-118`, `Controllers/Api/UserApiController.cs:89-91,110-116,121` |
| Email | `emailAddress` | `emailAddress` | Always | Evidence: `Views/User/Index.cshtml:93-99,119` |
| Real Name | `fullName` | `fullName` | Always | Header label is Real Name; bind field is `fullName`. Evidence: `Views/User/Index.cshtml:101-107,120` |

Tenant flag `SeatsAuthorisationByPersonas` (multitenant setting) controls whether the Access Profile(s) column appears; value returned on list response as `seatsAuthorisationByPersonas`. Evidence: `Controllers/Api/UserApiController.cs:89-91,121`

## Actions + API

### Load list

- **Trigger:** Page init via `genericIndexController.load`. Evidence: `Views/User/Index.cshtml:131-141`, `Scripts/softworks/genericIndexController.js:5-38`
- **Endpoint:** `GET /Seats.Trunk.Admin/api/UserApi?currentPageIndex={n}&pageSize={n}&sortCol={col}&sortDir={asc|desc}&searchFilter={text}`
- **Handler:** `UserApiController.GetUsers` (selected when paging query params present). Evidence: `Controllers/Api/UserApiController.cs:84-85`, `Scripts/softworks/swgrid.js:655-668`
- **Pagination:** Server-side (`paginationSide: 'server'`). Evidence: `Views/User/Index.cshtml:138`
- **Initial sort:** `userName` ascending. Evidence: `Views/User/Index.cshtml:139-140`
- **Default page size:** 100 (swgrid default). Evidence: `Scripts/softworks/swgrid.js:29`
- **Response shape:** `{ items, totalRowCount, seatsAuthorisationByPersonas }` (JSON camelCase). Evidence: `Controllers/Api/UserApiController.cs:102-123`, `Scripts/softworks/swgrid.js:699-707`
- **List item fields:** `id`, `userName`, `emailAddress`, `fullName`, `realName`, `associatedStudentId`, `accessProfiles` (when personas enabled). Evidence: `Controllers/Api/UserApiController.cs:104-118`

### Search

- Search box in `_ListSearchNavBar`; submit/Enter calls `searchTrigger` → resets page index and reloads with `searchFilter`. Evidence: `Views/Shared/_ListSearchNavBar.cshtml:4-10`, `Scripts/softworks/swgrid.js:369-374,659-668`

### Row click → details

- Row click navigates to `#/User/Details/{id}`. Evidence: `Views/User/Index.cshtml:136`, `Scripts/softworks/swgrid.js:252-264`

### Add

- Button links to `#/User/Details` (no id = new). Gated by `Users` + `Add`. Evidence: `Views/User/Index.cshtml:49-52`

### Delete

- Visible when `selectedItems().length > 0`; opens `#deleteModal`; confirm calls `confirmDelete`. Evidence: `Views/User/Index.cshtml:55-62,128`, `Scripts/softworks/swgrid.js:420-458`
- **Endpoint:** `DELETE /Seats.Trunk.Admin/api/UserApi?ids={id}&ids={id}…` (repeated `ids` query param). Evidence: `Scripts/softworks/swgrid.js:421-432`, `Controllers/Api/UserApiController.cs:440-441`
- **Success:** Reset page, clear search filter, clear selection, reload grid, show delete success toast. Evidence: `Scripts/softworks/swgrid.js:435-440`
- **Error:** 400 shows warning with `response.message`; other statuses show generic delete error. Evidence: `Scripts/softworks/swgrid.js:442-449`, `Controllers/Api/UserApiController.cs:468-470`
- **Backend side effect on delete:** If user has `StaffId`, removes matching staff checksum before delete. Evidence: `Controllers/Api/UserApiController.cs:449-464`

### Pagination / sort

- Server-side pagination; footer shown when `totalRowCount > 9`. Page-size options: 10, 15, 20, 50, 100, 200. Evidence: `Scripts/softworks/swgrid.js:828-851`
- Column header click toggles asc/desc and reloads (server). Evidence: `Scripts/softworks/swgrid.js:335-360`

## Permissions

| UI element | Permission item | Action |
|---|---|---|
| Main menu Users | `Users` | `Access` |
| Sub-nav User pill | `Users` | `Access` |
| Sub-nav Access Profile pill | `AccessProfiles` | `Access` |
| Sub-nav Contact Group pill | `ContactGroup` | `Access` |
| Sub-nav Activity pill | `Users` | `Activity` |
| Sub-nav Developer Key pill | `Users` | `DeveloperKeyDashboard` |
| Add button | `Users` | `Add` |
| Delete button | `Users` | `Delete` |
| MVC partial load | `Users` | `Access` |
| Grid data API (`GetUsers`) | `Users` | `Access` |
| Delete API | `Users` | `Delete` |

Evidence: `Views/User/Index.cshtml:10-37,49-56`, `Controllers/UserController.cs:17-18`, `Controllers/Api/UserApiController.cs:84-85,440`

## States

| State | Behaviour |
|---|---|
| Loading | Grid `wasLoaded` false until AJAX completes; container visible after bind. Evidence: `Scripts/softworks/swgrid.js:688-701` |
| Empty | Footer message "There are no items to show." when `totalRowCount == 0 && wasLoaded`. Evidence: `Scripts/softworks/swgrid.js:808-822` |
| Populated | Rows bound via `itemsToShow`; Access Profile column only when `seatsAuthorisationByPersonas` true. Evidence: `Views/User/Index.cshtml:84-92`, `Scripts/softworks/swgrid.js:699-707` |
| Error | No dedicated error UI in legacy grid — failed GET leaves grid empty/stale |
| Delete in progress | Modal confirm; no explicit disable on confirm button |

## Side effects

- **Delete user:** May remove staff checksum entry when deleted user is linked to staff. Evidence: `Controllers/Api/UserApiController.cs:449-464`
- **Create/update:** Not on index screen.

## Legacy bugs — do not copy

| Bug | Evidence | React approach |
|---|---|---|
| No error state for failed list load | `Scripts/softworks/swgrid.js:693-720` | Show error + Retry per the error-state convention |
| Activity sub-nav uses `Users` + `Activity` permission but links to Audit area (out of scope here) | `Views/User/Index.cshtml:28-31` | Gate Activity pill correctly; route to audit spec when implemented |
| Hard-coded English in some related screens (not index) | — | Use resource keys |

## Checklist

- [x] Route `/users` gated by `Users` + `Access`
- [x] Users-area sub-nav pills with correct permission gates
- [x] Grid columns: userName, emailAddress, fullName; accessProfiles when tenant flag on
- [x] Server paging/sort/search against `UserApi` with paging query params
- [x] Initial sort `userName` asc
- [x] Add → details (id 0 / no id)
- [x] Multi-select delete with confirmation
- [x] Delete API `DELETE api/UserApi?ids=…`
- [x] Loading / empty / error states distinct
- [x] Add/Delete buttons hidden without rights (backend still enforces)
