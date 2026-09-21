# Access Profile — Index & Details

Covers list (`AccessProfile/Index`) and editor (`AccessProfile/Details`).

## Route

| Screen | Legacy | React (proposed) |
|---|---|---|
| Index | `#/AccessProfile` / `#/AccessProfile/Index` | `/users/access-profiles` |
| New | `#/AccessProfile/Details` | `/users/access-profiles/new` |
| Edit | `#/AccessProfile/Details/{id}` | `/users/access-profiles/{id}` |
| Cancel | navigates to index | `/users/access-profiles` |

Evidence: `Views/AccessProfile/Index.cshtml:36`, `Views/AccessProfile/Details.cshtml:167-169`, `Scripts/controllers/accessProfileDetailsController.js:297-302`

## Menu

- **Main nav:** Access Profile menu item when `AccessProfiles` + `Access` (or fallback when Users not available per layout rules). Evidence: `Views/Shared/_Layout.cshtml:45-51`
- **Sub-nav:** Same Users-area pills; Access Profile pill active on these screens. Evidence: `Views/AccessProfile/Index.cshtml:9-25`, `Views/AccessProfile/Details.cshtml` (no pills on details — toolbar only)
- **Focus parent:** Index pills use `focusParentMenuElement: '#userMenuItem'`. Evidence: `Views/AccessProfile/Index.cshtml:15`

---

## Index

### Fields (grid columns)

| Column label | Bind field | Sort `data-column` | Notes |
|---|---|---|---|
| Name | `description` | `description` | Evidence: `Views/AccessProfile/Index.cshtml:53-60` |

List items also include `id` and `isEnabled` (used for row navigation guard). Evidence: `Controllers/Api/AccessProfileApiController.cs:86-87`, `Views/AccessProfile/Index.cshtml:72-77`

### Actions + API (index)

#### Load list

- **Trigger:** `genericIndexController.load` (client-side pagination). Evidence: `Views/AccessProfile/Index.cshtml:70-85`, `Scripts/softworks/genericIndexController.js:5-38`
- **Endpoint:** `GET /Seats.Trunk.Admin/api/AccessProfileApi`
- **Response:** Array of `{ id, description, isEnabled }`. Evidence: `Controllers/Api/AccessProfileApiController.cs:97-108`
- **Initial sort:** `description` ascending (client). Evidence: `Views/AccessProfile/Index.cshtml:82-83`
- **Restricted profiles:** `isEnabled` false when profile is restricted and not in caller's profiles. Evidence: `Controllers/Api/AccessProfileApiController.cs:83-87`

#### Search

- Client-side search via `_ListSearchNavBar` (pagination is client-side). Evidence: `Views/AccessProfile/Index.cshtml:47`, `Scripts/softworks/swgrid.js:21-22,119-136`

#### Row click

- Custom callback: if `model.isEnabled`, navigate to `#/AccessProfile/Details/{id}`; else show error "You do not have permission to access this profile." (2000 ms). Evidence: `Views/AccessProfile/Index.cshtml:72-77`

#### Add

- Link to `#/AccessProfile/Details`. Gated `AccessProfiles` + `Add`. Evidence: `Views/AccessProfile/Index.cshtml:35-38`

#### Delete

- `DELETE /Seats.Trunk.Admin/api/AccessProfileApi?ids={id}&ids=…`. Evidence: `Scripts/softworks/swgrid.js:421-432`, `Controllers/Api/AccessProfileApiController.cs:306-307`
- Error message: `ProfileInUse` when exception message contains "updating", else generic delete error. Evidence: `Controllers/Api/AccessProfileApiController.cs:318`

### Permissions (index)

| UI element | Item | Action |
|---|---|---|
| Sub-nav pills | per pill | per `Views/AccessProfile/Index.cshtml:11-24` |
| Add | `AccessProfiles` | `Add` |
| Delete | `AccessProfiles` | `Delete` |
| MVC Index | `AccessProfiles` | `Access` |
| GET list | `AccessProfiles` | `Access` |
| DELETE | `AccessProfiles` | `Delete` |

Evidence: `Views/AccessProfile/Index.cshtml:14-43`, `Controllers/AccessProfileController.cs:22-23`, `Controllers/Api/AccessProfileApiController.cs:97,306`

---

## Details

### Fields

| Field | Type | Default (new) | Validation | Notes |
|---|---|---|---|---|
| `id` | number | `0` | — | Evidence: `Scripts/controllers/accessProfileDetailsController.js:7-8` |
| `name` | text | empty | Required (client) | Maps to API `Description`. Evidence: `Views/AccessProfile/Details.cshtml:36-39`, `Scripts/controllers/accessProfileDetailsController.js:9-14`, `Controllers/Api/AccessProfileApiController.cs:233` |
| `externalKey` | text | empty | — | Evidence: `Views/AccessProfile/Details.cshtml:42-45`, `Controllers/Api/AccessProfileApiController.cs:234` |
| `isRestricted` | checkbox | false | — | Info tooltip on label. Evidence: `Views/AccessProfile/Details.cshtml:48-56`, `Controllers/Api/AccessProfileApiController.cs:237` |
| `defaultLandingPage` | select | null ("Not Set") | Client: selected option must have matching Site Access permission; error on save and on change | Options from `GetLandingPages`; disabled styling when not enabled. Evidence: `Views/AccessProfile/Details.cshtml:59-62`, `Scripts/controllers/accessProfileDetailsController.js:90-146,170-217,305-310` |
| `selectedPermissions` | int[] | `[]` | — | Toggle buttons per permission action in tree |
| `selectedEvents` | event type[] | null | — | From Polymer `seats-admin-security-event` |
| `selectedCases` | int[] | null | — | From Polymer `seats-admin-security-case` |
| `selectedWorkflows` | int[] | null | — | From Polymer `seats-admin-security-workflow` |
| `isEventTypeVisible` | boolean | false | — | When event visibility permission selected |
| `isCaseVisible` | boolean | false | — | When case visibility permission selected |
| `isWorkflowVisible` | boolean | false | — | When workflow visibility permission selected |
| `isGeneralStudentProfile` | boolean | — | Hidden in UI; in API model | Evidence: `Controllers/Api/AccessProfileApiController.cs:194,235` |
| `isGeneralStaffProfile` | boolean | — | Hidden in UI | Evidence: `Controllers/Api/AccessProfileApiController.cs:195,236` |
| `forceNewUI` | boolean | — | Hidden in UI | Evidence: `Controllers/Api/AccessProfileApiController.cs:197,238` |

**Permission tree (`nodes`):** Hierarchical `permissionDefinition` items with `permissions[]` each having `permissionDefinitionActions[]` with `permissionDefinitionActionInItemId`, `id`, `name`. Evidence: `Views/AccessProfile/Details.cshtml:76-100`, `Controllers/Api/AccessProfileApiController.cs:145-174`

### Actions + API (details)

#### Load details

- **Endpoint:** `GET /Seats.Trunk.Admin/api/AccessProfileApi/{id}` (`0` for new)
- **Response:** `{ details, nodes }` (`AccessProfileContainerViewModel`). Evidence: `Scripts/controllers/accessProfileDetailsController.js:441-443`, `ViewModels/AccessProfile/AccessProfileContainerViewModel.cs:16-18`, `Controllers/Api/AccessProfileApiController.cs:133-220`
- **Restricted profile on edit:** Returns `Unauthorized` if restricted and caller cannot access. Evidence: `Controllers/Api/AccessProfileApiController.cs:183-187`
- **401:** Redirect hash to `/Error/NotAuthorised`. Evidence: `Scripts/controllers/accessProfileDetailsController.js:462`

#### Load landing pages

- **Endpoint:** `GET /Seats.Trunk.Admin/api/AccessProfileApi/GetLandingPages`
- **Response:** `{ id, description, permissionDefinitionItemId, permissionDefinitionActionId }[]`. Evidence: `Controllers/Api/AccessProfileApiController.cs:111-129`, `Scripts/controllers/accessProfileDetailsController.js:170-217`

#### Load event types (tab)

- **Endpoint:** `GET /Seats.Trunk.Admin/api/AccessProfileApi/GetAllEventTypes?accesProfile={id}`
- **Used by:** Polymer component `seats-admin-security-event`. Evidence: `Views/AccessProfile/Details.cshtml:106-108,185`, `Controllers/Api/AccessProfileApiController.cs:325-327`

#### Load cases (tab)

- **Endpoint:** `GET /Seats.Trunk.Admin/api/caseapi/getAllCasesProfile` (via Polymer scope). Evidence: `Views/AccessProfile/Details.cshtml:117-118,193`

#### Load workflows (tab)

- **Endpoint:** `GET /Seats.Trunk.Admin/api/caseapi/getAllWorkflows`. Evidence: `Views/AccessProfile/Details.cshtml:137,201`

#### Save

- **Trigger:** Save button; `disabledSave` starts true until Polymer tabs push data (events/cases/workflows). Evidence: `Views/AccessProfile/Details.cshtml:10-18`, `Scripts/controllers/accessProfileDetailsController.js:277,506-523`
- **Client validation:** Landing page permission check before POST. Evidence: `Scripts/controllers/accessProfileDetailsController.js:305-310`
- **Endpoint:** `POST /Seats.Trunk.Admin/api/AccessProfileApi`
- **Body (`AccessProfileViewModel`):** `id`, `name`, `externalKey`, `isRestricted`, `defaultLandingPage`, `selectedPermissions`, `selectedEvents`, `selectedCases`, `selectedWorkflows`, plus hidden flags as returned on GET
- Evidence: `Scripts/controllers/accessProfileDetailsController.js:312-323`, `ViewModels/AccessProfile/AccessProfileViewModel.cs:17-38`, `Controllers/Api/AccessProfileApiController.cs:225-304`
- **Create:** `id == 0` + `AccessProfiles`+`Add`. Evidence: `Controllers/Api/AccessProfileApiController.cs:274-296`
- **Update:** `id > 0` + `AccessProfiles`+`Edit`. Evidence: `Controllers/Api/AccessProfileApiController.cs:248-272`
- **Success:** Toast + redirect to index. Evidence: `Scripts/controllers/accessProfileDetailsController.js:315-321`

#### Copy profile

- **Trigger:** Copy Profile button when `id > 0`. Sets `id` to 0 and appends ` (1)` to name. Evidence: `Views/AccessProfile/Details.cshtml:25-28`, `Scripts/controllers/accessProfileDetailsController.js:273-282`
- **Permission:** No explicit security binding on button (only `showCopyProfile` visibility). Evidence: `Views/AccessProfile/Details.cshtml:25`

#### Cancel

- Navigates to `#/AccessProfile/Index`. Evidence: `Scripts/controllers/accessProfileDetailsController.js:297-302`

#### Toggle permission

- Click action button toggles `permissionDefinitionActionInItemId` in `selectedPermissions`. Evidence: `Scripts/controllers/accessProfileDetailsController.js:220-236`, `Views/AccessProfile/Details.cshtml:92-94`

### Permissions (details)

| UI element | Item | Action |
|---|---|---|
| MVC Details | `AccessProfiles` | `Access` |
| GET details | `AccessProfiles` | `Access` |
| Save (new) | `AccessProfiles` | `Add` |
| Save (edit) | `AccessProfiles` | `Edit` |
| POST (server) | `AccessProfiles` | `Add` or `Edit` (runtime check) |

Evidence: `Views/AccessProfile/Details.cshtml:10-18`, `Controllers/AccessProfileController.cs:31-32`, `Controllers/Api/AccessProfileApiController.cs:227-228,248,274`

## States

| State | Behaviour |
|---|---|
| Loading | `#uapContainer` hidden until GET completes. Evidence: `Scripts/controllers/accessProfileDetailsController.js:437,459-461` |
| Empty tree node | Permission panel hidden when no permissions on selected node. Evidence: `Views/AccessProfile/Details.cshtml:84` |
| Tabs hidden | Event/Case/Workflow tabs visible only when corresponding permission selected. Evidence: `Views/AccessProfile/Details.cshtml:69-73`, `Controllers/Api/AccessProfileApiController.cs:203-205` |
| Save disabled | `disabledSave` true until child components push selections. Evidence: `Scripts/controllers/accessProfileDetailsController.js:277,506-523` |
| Error (load 401) | Redirect to NotAuthorised. Evidence: `Scripts/controllers/accessProfileDetailsController.js:462` |
| Error (save) | Alert with message or generic save error. Evidence: `Controllers/Api/AccessProfileApiController.cs:268,293` |

## Side effects

- **Create/update:** Updates access profile, permissions, and optionally event types, cases, workflows when visibility permissions present. Evidence: `Controllers/Api/AccessProfileApiController.cs:252-263,278-288`
- **Delete (index):** Deletes profile via API client. Evidence: `Controllers/Api/AccessProfileApiController.cs:309-313`

## Legacy bugs — do not copy

| Bug | Evidence | React approach |
|---|---|---|
| Duplicate `id="events"` tab pane (two `#events` divs) | `Views/AccessProfile/Details.cshtml:103-132` | Single event visibility tab |
| `disabledSave` blocks save until Polymer components fire even when tabs hidden | `Scripts/controllers/accessProfileDetailsController.js:277,506-523` | Save always enabled; missing lists saved as `[]` |
| POST authorization attributes commented out on API | `Controllers/Api/AccessProfileApiController.cs:223-224` | Enforce Add/Edit on server (already done in method body) |
| Create workflow update uses `accessProfileViewModel.Id` (0) instead of created `access.Id` | `Controllers/Api/AccessProfileApiController.cs:287-288` | Use created profile id for workflow update |
| Hard-coded landing page validation English | `Scripts/controllers/accessProfileDetailsController.js:145` | Resource key |
| No list load error UI | `Scripts/softworks/swgrid.js:693-720` | Error + Retry |
| Row click error message hard-coded English | `Views/AccessProfile/Index.cshtml:76` | Resource key |

## Checklist

- [x] Index route with client-side sort/search on `description`
- [x] Row navigation blocked when `isEnabled` false
- [x] Details form fields: name, externalKey, isRestricted, defaultLandingPage
- [x] Permission tree with toggle actions
- [x] Conditional Event/Case/Workflow tabs
- [x] Landing page options gated by selected permissions
- [x] Save POST with full view model
- [x] Copy profile → new record with suffixed name
- [x] Delete on index with in-use handling
- [x] Loading / empty / error states distinct
- [x] All permission gates on buttons and routes
