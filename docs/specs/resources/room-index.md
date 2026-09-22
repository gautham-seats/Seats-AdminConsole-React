# Room — Index

## Route

| | Legacy | React (proposed) |
|---|---|---|
| Path | `#/Room` / `#/Room/Index` | `/resources/rooms` |
| MVC partial | `Room/Index` | — |
| Load | Hash route loads `Room/Index` partial via `swRouting` | — |

Evidence: `Views/Room/Index.cshtml:10`, `Views/Room/Index.cshtml:71-78`

## Menu

- **Main nav:** Room item visible when user has `PermissionDefinitionItemEnum.Rooms` + `PermissionDefinitionActionEnum.Access`; links to `#/Room`. Evidence: `Views/Shared/_Layout.cshtml:75-81`
- **Sub-nav (Physical resources pills):** Room (active), Device, Readings Report, Suspicious Readings Report — each pill gated by its own Access permission. Evidence: `Views/Room/Index.cshtml:8-20`
- **Focus parent:** Sub-nav pills do not set `focusParentMenuElement` (unlike Settings sub-screens).

## Fields (grid columns)

| Column label | Bind field | Sort `data-column` | Notes |
|---|---|---|---|
| Room Code | `externalCode` | `externalCode` | Evidence: `Views/Room/Index.cshtml:47-48,55` |
| Room Name | `name` | `name` | Evidence: `Views/Room/Index.cshtml:48,56` |
| Room Capacity | `capacity` | `capacity` | Evidence: `Views/Room/Index.cshtml:49,57` |
| Building | `buildingName` | `name` (legacy bug — wrong column key) | Display field is `buildingName`; sort key incorrectly set to `name`. Evidence: `Views/Room/Index.cshtml:50,58` |

## Actions + API

### Load list

- **Trigger:** Page init via `genericIndexController.load`. Evidence: `Views/Room/Index.cshtml:69-78`
- **Endpoint:** `GET api/RoomApi/GetRooms`
- **Query params (server-side paging):** `currentPageIndex`, `pageSize`, `sortCol`, `sortDir`, `searchFilter` — built by `swgrid.reLoadGrid`. Evidence: `Scripts/softworks/swgrid.js:655-668`, `Scripts/softworks/genericIndexController.js:23-37`
- **Initial sort:** `externalCode` descending. Evidence: `Views/Room/Index.cshtml:76-77`
- **Default page size:** 100 (swgrid default). Evidence: `Scripts/softworks/swgrid.js:29`
- **Response shape:** `{ items, totalRowCount }` (PascalCase keys normalised to camelCase by JSON). Evidence: `Scripts/softworks/swgrid.js:703-707`, `Controllers/Api/RoomApiController.cs:57-65`

### Search

- Search box in `_ListSearchNavBar`; submit/Enter calls `searchTrigger` → resets page index and reloads with `searchFilter`. Evidence: `Views/Shared/_ListSearchNavBar.cshtml:4-10`, `Scripts/softworks/swgrid.js:369-374,659-668`

### Row click → details

- Row click navigates to `#/Room/Details/{id}`. Evidence: `Scripts/softworks/swgrid.js:252-264`, `Views/Room/Index.cshtml:73`

### Add

- Button links to `#/Room/Details` (no id = new). Gated by Rooms + Add. Evidence: `Views/Room/Index.cshtml:29-32`

### Delete

- Visible when `selectedItems().length > 0`; opens `#deleteModal`; confirm calls `confirmDelete`. Evidence: `Views/Room/Index.cshtml:34-37,64`, `Scripts/softworks/swgrid.js:420-458`
- **Endpoint:** `DELETE api/RoomApi?ids={id}&ids={id}…` (repeated `ids` query param). Evidence: `Scripts/softworks/swgrid.js:421-432`, `Controllers/Api/RoomApiController.cs:133-134`
- **Success:** Reset page, clear selection, reload grid, show delete success toast. Evidence: `Scripts/softworks/swgrid.js:452-457`
- **Conflict (409):** Generic delete error toast. Evidence: `Controllers/Api/RoomApiController.cs:141-142`, `Scripts/softworks/swgrid.js:449-450`

### Pagination / sort

- Server-side pagination; footer shown when `totalRowCount > 9`. Page-size options: 10, 15, 20, 50, 100, 200. Evidence: `Scripts/softworks/swgrid.js:828-851`
- Column header click toggles asc/desc and reloads (server). Evidence: `Scripts/softworks/swgrid.js:335-360`
- **React difference (D-070):** sorting returns to page 1. Legacy keeps `currentPageIndex`, so sorting from page 5 lands on page 5 of a different ordering (LB-073). Evidence: `Scripts/softworks/swgrid.js:335-360`

## React differences on this screen

Each one is a deliberate difference from legacy, recorded in `docs/decisions.md`.

| Behaviour | Legacy | React | Decision |
|---|---|---|---|
| Total count | No count anywhere on the screen | `Total {n}` badge next to the Rooms heading, from `totalRowCount` on the list response already fetched — no extra request | D-072 |
| Row selection checkboxes | Rendered for everyone; only the Delete button is permission-gated. Evidence: `Views/Room/Index.cshtml:34-37` | Selection column rendered only with Rooms + Delete | D-073 |
| Delete button | `visible: selectedItems().length > 0` — appears and disappears as rows are ticked | Always mounted, `disabled` with the reason in its accessible name when nothing is selected | D-071 |
| Sort | Keeps the current page index | Returns to page 1 | D-070 |
| Delete success toast | `swAlert.showDeleteSuccess()` with no duration — never auto-closes (LB-074). The 2500 ms quoted elsewhere is the dead `.error(status === 200)` branch at `swgrid.js:434-440` | Toast auto-dismisses after 2500 ms | D-075 |
| List load failure | No error UI; empty or stale grid | `ErrorState` + Retry | error-state convention |

## Open question — is the Building column sortable?

Unresolved. Do not guess either way in code.

- Legacy sends `sortCol=name` for the Building header (`data-column="name"` on `Views/Room/Index.cshtml:50`), so clicking it sorts by **room name** while the header says Building (LB-063).
- The display field is `buildingName`.
- What is **not** established: whether `RoomApi/GetRooms` and the room service behind it accept `buildingName` (or any building sort key) as `sortCol`. Nothing in `Controllers/Api/RoomApiController.cs:56-65` validates or maps the sort column — it is passed through to the service, so the answer lives in the room service, not in this repo.
- Consequence: this spec's Fields table says the sort key is wrong, and `docs/legacy-bugs.md` LB-063 says "Building header is not sortable until a real server sort key is confirmed". The React code currently renders the Building header as **not sortable**. Spec and code agree on the outcome but not on the reason, and none of them is evidence that `buildingName` works.
- To close it: send `GET api/RoomApi/GetRooms?sortCol=buildingName&sortDir=asc` against Alpha with rooms in more than one building and check the returned order. Needs a signed-in session (see the Playwright session-expiry note). Until then the header stays non-sortable and nobody invents a key.

## Permissions

| UI element | Permission item | Action |
|---|---|---|
| Main menu Room | `Rooms` | `Access` |
| Sub-nav Room pill | `Rooms` | `Access` |
| Sub-nav Device pill | `Devices` | `Access` |
| Sub-nav Readings Report | `ReadingsReport` | `Access` |
| Sub-nav Suspicious Readings | `ReadingsReport` | `Access` |
| Add button | `Rooms` | `Add` |
| Delete button | `Rooms` | `Delete` |
| Grid data API | `Rooms` | `Access` |

Evidence: `Views/Room/Index.cshtml:9-37`, `Controllers/Api/RoomApiController.cs:41-42,56-57,133`

## States

| State | Behaviour |
|---|---|
| Loading | Grid `wasLoaded` false until AJAX completes. Evidence: `Scripts/softworks/swgrid.js:688-701` |
| Empty | Footer message "There are no items to show." when `totalRowCount == 0 && wasLoaded`. Evidence: `Scripts/softworks/swgrid.js:808-822` |
| Populated | Rows bound via `itemsToShow` |
| Error | No dedicated error UI in legacy grid — failed GET leaves grid empty/stale |
| Delete in progress | Modal confirm; no explicit disable |

## Side effects

- **Delete room:** Audit log `ROOM` / `DELETED` per room; also `DEVICE-ROOM` / `DELETED` for each linked device-room. Evidence: `Controllers/Api/RoomApiController.cs:144-150`
- **Create/update:** Not on index screen.

## Legacy bugs — do not copy

| Bug | Evidence | React approach |
|---|---|---|
| Building column sort uses `data-column="name"` instead of `buildingName` (LB-063) | `Views/Room/Index.cshtml:50` | Header is not sortable until a server sort key is confirmed — see the open question above |
| Duplicate `id`/`name` on Suspicious Readings link (`readings-report-link`) | `Views/Room/Index.cshtml:18-19` | Unique ids per link |
| No error state for failed list load | `Scripts/softworks/swgrid.js:693-720` | Show error + Retry per the error-state convention |

## Checklist

- [ ] Route `/resources/rooms` gated by Rooms Access
- [ ] Sub-nav pills with correct permission gates
- [ ] Grid columns: externalCode, name, capacity, buildingName
- [ ] Server paging/sort/search against `GetRooms`
- [ ] Initial sort externalCode desc
- [ ] Add → details (id 0)
- [ ] Multi-select delete with confirmation
- [ ] Delete audit side effects (backend)
- [ ] Loading / empty / error states distinct
- [ ] Permissions: Add/Delete buttons hidden without rights
