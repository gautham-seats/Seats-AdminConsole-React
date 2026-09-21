# Developer Key — Dashboard & Generator

Covers the Users-area **Developer Key dashboard** (`DeveloperKey/Index`) and the **personal key generator modal** (layout user menu). Two related features with different permission bindings.

## Route

### Dashboard (Users sub-nav)

| | Legacy | React (proposed) |
|---|---|---|
| Path | `#/DeveloperKey` | `/users/developer-keys` |
| MVC partial | `DeveloperKey/Index` | — |

Evidence: `Views/DeveloperKey/Index.cshtml:22-23`, `Views/User/Index.cshtml:34-37`

### Generator modal (global user menu)

- Not a route; modal `#developerKeyGeneratorModal` opened from user menu item `#developerKeyGeneratorContainer`. Evidence: `Views/Login/_GetDeveloperKeyButton.cshtml:4-5`, `Views/Shared/_Layout.cshtml:194,426-429`

## Menu

### Dashboard

- **Sub-nav:** Developer Key pill active; gated `Users` + `DeveloperKeyDashboard`. Evidence: `Views/DeveloperKey/Index.cshtml:22-24`
- Same Users-area pill bar as other User screens. Evidence: `Views/DeveloperKey/Index.cshtml:8-25`

### Generator (user menu)

- **Main user menu item:** Gated `AdminUserMenu` + `DeveloperKey`. Evidence: `Views/Login/_GetDeveloperKeyButton.cshtml:4`
- Initialized in layout with `api/UserApi/`. Evidence: `Views/Shared/_Layout.cshtml:426-429`

---

## Dashboard (index)

### Fields (grid columns)

| Column label | Bind field | Sort `data-column` | Notes |
|---|---|---|---|
| Expiry Date | `expiryDate` | `expiryDate` | Displayed via `dateText` binding. Evidence: `Views/DeveloperKey/Index.cshtml:46-59` |
| User Name | `userName` | `userName` | Evidence: `Views/DeveloperKey/Index.cshtml:49-60` |
| Full Name | `fullName` | `fullName` | Evidence: `Views/DeveloperKey/Index.cshtml:52-61` |

Rows are **not selectable** (`isSelectable: false`); delete still uses row selection machinery when enabled — legacy uses multi-select delete modal. Evidence: `Views/DeveloperKey/Index.cshtml:32-35,73-80`

Deleted users show `UserDeleted` for username and full name (server-side). Evidence: `Controllers/Api/DeveloperKeyApiController.cs:32-38`

### Actions + API (dashboard)

#### Load list

- **Endpoint:** `GET /Seats.Trunk.Admin/api/DeveloperKeyApi?currentPageIndex={n}&pageSize={n}&sortCol={col}&sortDir={asc|desc}&searchFilter={text}`
- **Pagination:** Server-side. Evidence: `Views/DeveloperKey/Index.cshtml:77-78`, `Scripts/softworks/swgrid.js:655-668`
- **Initial sort:** `expiryDate` ascending. Evidence: `Views/DeveloperKey/Index.cshtml:78-79`
- **Permission:** `Users` + `DeveloperKeyDashboard`. Evidence: `Controllers/Api/DeveloperKeyApiController.cs:28-29`
- **Response:** `ServerSidePagedListDto<UserDeveloperKeyResponse>` with `items`, `totalRowCount`. Evidence: `Controllers/Api/DeveloperKeyApiController.cs:29-40`, `Scripts/softworks/swgrid.js:703-707`
- **Page index note:** API converts `currentPageIndex == 0` to page `1` for backend client. Evidence: `Controllers/Api/DeveloperKeyApiController.cs:31`

#### Search

- Server-side `searchFilter` via `_ListSearchNavBar`. Evidence: `Views/DeveloperKey/Index.cshtml:39`, `Scripts/softworks/swgrid.js:659-668`

#### Delete

- **UI:** Delete button when items selected; `Users` + `DeveloperKeyDashboard`. Evidence: `Views/DeveloperKey/Index.cshtml:32-35`
- **Endpoint:** `DELETE /Seats.Trunk.Admin/api/DeveloperKeyApi?ids={id}&ids=…`
- **Permission:** `Users` + `DeveloperKeyDashboard`. Evidence: `Controllers/Api/DeveloperKeyApiController.cs:43-44`
- **Error:** 400 with message per id; 500 on exception. Evidence: `Controllers/Api/DeveloperKeyApiController.cs:54-61`

#### Row click

- `detailUrl: ''` — no navigation on row click. Evidence: `Views/DeveloperKey/Index.cshtml:75`

### Permissions (dashboard)

| UI element | Item | Action |
|---|---|---|
| Sub-nav Developer Key pill | `Users` | `DeveloperKeyDashboard` |
| Delete button | `Users` | `DeveloperKeyDashboard` |
| GET list | `Users` | `DeveloperKeyDashboard` |
| DELETE | `Users` | `DeveloperKeyDashboard` |
| MVC Index load | `AdminUserMenu` | `DeveloperKey` |

Evidence: `Views/DeveloperKey/Index.cshtml:22-24,32`, `Controllers/Api/DeveloperKeyApiController.cs:28-29,43`, `Controllers/DeveloperKeyController.cs:15`

**Permission mismatch:** MVC `DeveloperKeyController.Index` requires `AdminUserMenu`+`DeveloperKey`, but sub-nav and API use `Users`+`DeveloperKeyDashboard`. Document and verify at runtime which gate actually applies to partial load.

---

## Generator modal (current user key)

### Fields

| Element | Type | Notes |
|---|---|---|
| Expiry message | label text | Loaded on modal open |
| Dev key warning | label | Shown when key not expired |
| New Key button | action | Calls generate |
| Cancel | dismiss modal | |
| `devKey` | readonly text | Shown after generate |
| Copy to clipboard | button | `data-clipboard-target="#devKeyInput"` |
| Copy warning | label | Updates after generate |

Evidence: `Views/Login/_DeveloperKeyGenerator.cshtml:12-49`, `Scripts/controllers/developerKeyGeneratorController.js:88-116`

### Actions + API (generator)

#### On modal open (first open only per session)

- **Endpoint:** `POST /Seats.Trunk.Admin/api/UserApi/GetUserDeveloperKey`
- **Permission:** `AdminUserMenu` + `DeveloperKey`. Evidence: `Controllers/Api/UserApiController.cs:628-629`, `Scripts/controllers/developerKeyGeneratorController.js:44-73`
- **Response:** `{ developerKey: "******************", expiryDate }` — masked key. Evidence: `Controllers/Api/UserApiController.cs:638`, `Scripts/controllers/developerKeyGeneratorController.js:52-69`
- **Expired key:** Message "Current key has expired."; hide warning. Evidence: `Scripts/controllers/developerKeyGeneratorController.js:1-2,58-61`
- **Valid key:** Message "Current key expires on {date}." + invalidation warning. Evidence: `Scripts/controllers/developerKeyGeneratorController.js:3-4,63-68`

#### Generate new key

- **Endpoint:** `POST /Seats.Trunk.Admin/api/UserApi/GenerateDeveloperKey`
- **Body:** view model JSON via `handleSaveEvent` (empty/minimal)
- **Permission:** `AdminUserMenu` + `DeveloperKey`. Evidence: `Controllers/Api/UserApiController.cs:614-615`, `Scripts/controllers/developerKeyGeneratorController.js:106-119`
- **Response:** `{ developerKey, expiryDate }` — full key shown once. Evidence: `Controllers/Api/UserApiController.cs:624`, `Scripts/controllers/developerKeyGeneratorController.js:110-116`
- **UI after success:** Show result panel, hide request buttons; update expiry and "copy now" warning. Evidence: `Scripts/controllers/developerKeyGeneratorController.js:112-116`, `Views/Login/_DeveloperKeyGenerator.cshtml:34-48`

#### Copy

- Clipboard.js on `#copyBtn`. Evidence: `Scripts/controllers/developerKeyGeneratorController.js:84`

### Permissions (generator)

| UI element | Item | Action |
|---|---|---|
| User menu item | `AdminUserMenu` | `DeveloperKey` |
| GetUserDeveloperKey | `AdminUserMenu` | `DeveloperKey` |
| GenerateDeveloperKey | `AdminUserMenu` | `DeveloperKey` |

Evidence: `Views/Login/_GetDeveloperKeyButton.cshtml:4`, `Controllers/Api/UserApiController.cs:614-615,628-629`

## States

| State | Behaviour |
|---|---|
| Dashboard loading | Grid `wasLoaded` false until GET completes. Evidence: `Scripts/softworks/swgrid.js:688-701` |
| Dashboard empty | "There are no items to show." when count 0. Evidence: `Scripts/softworks/swgrid.js:808-822` |
| Modal — request | `shouldShowRequest` true, result hidden. Evidence: `Scripts/controllers/developerKeyGeneratorController.js:89-90` |
| Modal — result | After generate: key visible, request hidden. Evidence: `Scripts/controllers/developerKeyGeneratorController.js:112-113` |
| Modal reset | `modalOpened` reset on `hidden.bs.modal`. Evidence: `Scripts/controllers/developerKeyGeneratorController.js:42,77-78` |
| Error | Dashboard: no dedicated grid error UI; Generator: via `handleSaveEvent` error handling |

## Side effects

- **GenerateDeveloperKey:** Invalidates previous key for current user; new expiry returned. Evidence: `Scripts/controllers/developerKeyGeneratorController.js:4,114-116`, `Controllers/Api/UserApiController.cs:616-624`
- **Dashboard delete:** Removes developer key records by id via `_developerKeyApiClient.Delete`. Evidence: `Controllers/Api/DeveloperKeyApiController.cs:46-52`

## Legacy bugs — do not copy

| Bug | Evidence | React approach |
|---|---|---|
| MVC dashboard gate (`AdminUserMenu`+`DeveloperKey`) ≠ sub-nav/API gate (`Users`+`DeveloperKeyDashboard`) | `Controllers/DeveloperKeyController.cs:15`, `Views/DeveloperKey/Index.cshtml:22`, `Controllers/Api/DeveloperKeyApiController.cs:28` | Resolve with product owner; enforce consistent permission |
| `isSelectable: false` but delete UI still present | `Views/DeveloperKey/Index.cshtml:32-35,80` | Explicit selection model or row actions |
| Generator strings hard-coded in JS `GeneralResource` | `Scripts/controllers/developerKeyGeneratorController.js:1-7` | Resource keys |
| `formatDate` defined but modal open uses `moment` for display | `Scripts/controllers/developerKeyGeneratorController.js:30-38,63` | Single date formatting approach |
| No dashboard load error UI | `Scripts/softworks/swgrid.js:693-720` | Error + Retry |
| Full developer key only returned on generate — easy to miss copy warning | `Scripts/controllers/developerKeyGeneratorController.js:5,116` | Prominent one-time key display |

## Checklist

- [x] Dashboard route `/users/developer-keys` gated by `Users` + `DeveloperKeyDashboard`
- [x] Grid: expiryDate, userName, fullName; server paging/sort/search
- [x] Delete keys with confirmation
- [x] Deleted-user display text from API
- [x] Generator modal in app shell gated by `AdminUserMenu` + `DeveloperKey`
- [x] GetUserDeveloperKey on open (masked key + expiry)
- [x] GenerateDeveloperKey shows full key once
- [x] Copy-to-clipboard for generated key
- [x] Loading / empty / error states distinct on dashboard
- [x] Document and test MVC vs API permission mismatch
