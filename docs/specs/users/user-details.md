# User — Details

## Route

| | Legacy | React (proposed) |
|---|---|---|
| New | `#/User/Details` | `/users/new` |
| Edit | `#/User/Details/{id}` | `/users/{id}` |
| MVC partial | `User/Details` | — |
| Cancel target | `#/User/Index` | `/users` |

Evidence: `Views/User/Details.cshtml:22`, `Views/User/Details.cshtml:381-399`, `Controllers/UserController.cs:24-27`

## Menu

- Same Users-area sub-nav pills as index (User active when navigated from User index). Evidence: `Views/User/Index.cshtml:8-38`
- No separate main-menu entry; reached from User index Add or row click. Evidence: `Views/User/Index.cshtml:49-52,136`

## Fields

### Main form

| Field | Type | Default (new) | Validation | Visibility | Notes |
|---|---|---|---|---|---|
| `id` | hidden number | `0` | — | Always | Evidence: `Views/User/Details.cshtml:47`, `Controllers/Api/UserApiController.cs:149-155` |
| `accountActive` | boolean (switch) | From API / existing user | — | Always | Evidence: `Views/User/Details.cshtml:49-52`, `Controllers/Api/UserApiController.cs:196` |
| `userName` | text | empty | Required (client) | Always | Evidence: `Views/User/Details.cshtml:55-62`, `Scripts/controllers/userDetailsController.js:493-498` |
| `setPassword` | password | empty | Required when creating and `seatsAuthenticationByOurIdentityProvider`; strong password + must not match username | Only when `seatsAuthenticationByOurIdentityProvider() && isCreating()` | Evidence: `Views/User/Details.cshtml:65-79`, `Scripts/controllers/userDetailsController.js:500-523`, `Controllers/Api/UserApiController.cs:143-145,304-308` |
| `passwordConfirmation` | password | empty | Must match `setPassword` when password entered on create | When password field visible and `setPassword` has length | Evidence: `Views/User/Details.cshtml:81-90`, `Scripts/controllers/userDetailsController.js:525-534` |
| `associatedStudentId` | typeahead → number | `0` or null | `autoCompleteFilled` when `associatedStudentId == 0` | Always | Typeahead API below. Evidence: `Views/User/Details.cshtml:93-102`, `Scripts/controllers/userDetailsController.js:536-544` |
| `associatedStudentDescription` | text (typeahead display) | empty | Paired with student id validation | Always | Evidence: `Views/User/Details.cshtml:99-100` |
| `authenticateModeId` | select | `0` ("None") | — | Hidden (`display: none`) | Populated from `authenticationModeAvailables`; not shown in UI. Evidence: `Views/User/Details.cshtml:104-108`, `Controllers/Api/UserApiController.cs:214-227,198` |
| `emailAddress` | text | empty | — | Always | Evidence: `Views/User/Details.cshtml:111-114` |
| `fullName` | text | empty | Required (client) | Always | Evidence: `Views/User/Details.cshtml:117-120`, `Scripts/controllers/userDetailsController.js:546-551` |
| `isMobileAppLoggingActive` | checkbox | From API | — | Always | Evidence: `Views/User/Details.cshtml:122-128`, `Controllers/Api/UserApiController.cs:199,327` |

**Read-only flags from API (not editable directly):**

| Field | Purpose |
|---|---|
| `seatsAuthorisationByPersonas` | Chooses Personas tab vs Security Level Permissions tab |
| `seatsAuthenticationByOurIdentityProvider` | Shows password fields and Set Password actions |
| `isCreating` | Computed: `id == 0` |

Evidence: `Controllers/Api/UserApiController.cs:139-145,151-152`, `Scripts/controllers/userDetailsController.js:248-250`

### Personas tab (when `seatsAuthorisationByPersonas`)

| Field | Type | Default | Validation | Notes |
|---|---|---|---|---|
| `personas[]` | array | One empty persona on create | Each persona must have `accessProfileId`; no duplicate `accessProfileId` across personas | Evidence: `Controllers/Api/UserApiController.cs:153-154`, `Scripts/controllers/userDetailsController.js:128-143,11-20` |
| `personas[].id` | number | `0` for new rows | — | Evidence: `Controllers/Api/UserApiController.cs:203-208` |
| `personas[].accessProfileId` | select | `[None]` caption | Required before save (client alert) | Restricted profiles use `accessProfileAll`; others use `accessProfileAvailables`. Evidence: `Views/User/Details.cshtml:173-178`, `Scripts/controllers/userDetailsController.js:101-104,128-143` |
| `personas[].order` | number | Auto-incremented on add | Reorder via Up/Down on selected row | Evidence: `Scripts/controllers/userDetailsController.js:15-17,34-62` |

Persona actions: Add, Up order, Down order, Remove (remove hidden when only one persona). Evidence: `Views/User/Details.cshtml:147-183`, `Scripts/controllers/userDetailsController.js:65-75`

### Security Level Permissions tab (when not `seatsAuthorisationByPersonas`)

| Field | Type | Notes |
|---|---|---|
| `isSuperUser` | checkbox | Click/keypress updates security level processing. Evidence: `Views/User/Details.cshtml:194-197`, `Scripts/controllers/userDetailsController.js:106-127` |
| `userSecurityLevelPermissionOverview().isOwnClasses` | checkbox | Lecturer visibility; disabled when super user. Gated by `Users` + `LecturerVisibility`. Evidence: `Views/User/Details.cshtml:199-203`, `Scripts/controllers/userDetailsController.js:553-558` |
| `userSecurityLevelPermissionOverview` school/course/module/programme/faculty/student | link text or static | Click opens security level modal except when super user (read-only text). Evidence: `Views/User/Details.cshtml:205-270`, `Scripts/controllers/userDetailsController.js:106-112` |

**Security level modal** loads `UserSecurityLevelPermission/Index?securityLevel={level}`; Apply returns selections into `userSecurityLevelPermissionToProcess`. Evidence: `Views/User/Details.cshtml:322-335`, `Scripts/controllers/userDetailsController.js:411-444`

### Set Password modal (existing users only)

Shown when `!isCreating() && seatsAuthenticationByOurIdentityProvider()`. Evidence: `Views/User/Details.cshtml:26-29,337-349`

| Field | Type | Validation |
|---|---|---|
| `password` | password | Required, strong password, must not match username |
| `confirmPassword` | password | Must match password |

Evidence: `Views/User/_PasswordConfirmation.cshtml:6-17`, `Scripts/controllers/userDetailsController.js:297-322`

## Actions + API

### Load details

- **Trigger:** Page init; `id` from query string (`swapp.getIdFromQueryString`). Evidence: `Scripts/controllers/userDetailsController.js:379-381,448`
- **Endpoint:** `GET /Seats.Trunk.Admin/api/UserApi/{id}` (`id` omitted or `0` for new). Evidence: `Scripts/controllers/userDetailsController.js:448`, `Controllers/Api/UserApiController.cs:131-263`
- **Response top-level:** `detail`, `defaultPersonToAdd`, `accessProfileAvailables`, `accessProfileRestricted`, `accessProfileAll`, `authenticationModeAvailables`, `userSecurityLevelPermissionOverview`. Evidence: `ViewModels/User/UserDetailsViewModel.cs:23-37`, `Controllers/Api/UserApiController.cs:133-263`

### Associated student typeahead

- **Endpoint:** `GET /Seats.Trunk.Admin/api/UserApi/GetStudentsByCriteria?query={text}`
- **Permission:** `Users` + `Access`. Evidence: `Views/User/Details.cshtml:100`, `Controllers/Api/UserApiController.cs:487-492`

### Save (create or update)

- **Trigger:** Save button; gated `Users`+`Add` when `id==0`, `Users`+`Edit` when `id!=0`. Evidence: `Views/User/Details.cshtml:10-18`, `Scripts/controllers/userDetailsController.js:177-200`
- **Client pre-check:** Personas access-profile validation (required + no duplicates) when personas mode. Evidence: `Scripts/controllers/userDetailsController.js:128-143,177-178`
- **Endpoint:** `POST /Seats.Trunk.Admin/api/UserApi`
- **Body:** JSON serialisation of `detail` view model (`UserDto`), including:
  - `id`, `userName`, `fullName`, `emailAddress`, `associatedStudentId`, `authenticateModeId`, `accountActive`, `isMobileAppLoggingActive`, `isSuperUser`, `setPassword` (create only), `personas[]`, `userSecurityLevelPermissionToProcess[]`
- Evidence: `Scripts/controllers/userDetailsController.js:180-182`, `Scripts/softworks/swapp.js:530-533`, `Controllers/Api/UserApiController.cs:293-437`
- **Create path:** `id == 0` requires `Users`+`Add`; may call `SetPassowrd` after create when identity provider + password set. Evidence: `Controllers/Api/UserApiController.cs:315-336`
- **Update path:** `id > 0` requires `Users`+`Edit`. Evidence: `Controllers/Api/UserApiController.cs:338-357`
- **Password policy:** Server validates `setPassword` via `ValidatePassword` when identity provider enabled. Evidence: `Controllers/Api/UserApiController.cs:304-308`
- **Personas:** Saved via `_userApiClient.Personas` when `personas` not null. Evidence: `Controllers/Api/UserApiController.cs:363-377`
- **Security levels:** Each item in `userSecurityLevelPermissionToProcess` saved; `isOwnClasses` processed last; `SetIsSuperUser` called. Evidence: `Controllers/Api/UserApiController.cs:400-425`
- **Success:** Toast + redirect to `#/User/Index`. Evidence: `Scripts/controllers/userDetailsController.js:183-191`
- **Partial success:** Not ported — dead legacy code: the server only returns an empty `Ok()` (`Controllers/Api/UserApiController.cs:434`), `self.id` does not exist (`Scripts/controllers/userDetailsController.js:186`) and the message is never passed in (`Views/User/Details.cshtml:382-399`).
- **Error:** Shows `responseJSON.message` gray alert. Evidence: `Scripts/controllers/userDetailsController.js:193-195`

### Set password (modal)

- **Endpoint:** `POST /Seats.Trunk.Admin/api/UserApi/SetPassword`
- **Body:** `{ id, password }`
- **Permission:** `Users` + `Access` (API). Evidence: `Scripts/controllers/userDetailsController.js:329-332`, `Controllers/Api/UserApiController.cs:525-528`
- **Success:** Close modal, success toast. Evidence: `Scripts/controllers/userDetailsController.js:336-338,358-360`

### Send password reset link

- **Trigger:** Button visible when `!isCreating() && seatsAuthenticationByOurIdentityProvider()`; gated `Users`+`Edit` in view. Evidence: `Views/User/Details.cshtml:31-37`
- **Endpoint:** `POST /Seats.Trunk.Admin/api/UserApi/SendResetPasswordLink`
- **Body:** JSON string of `userName`
- **Permission (API):** `Users` + `Access`. Evidence: `Scripts/controllers/userDetailsController.js:145-152`, `Controllers/Api/UserApiController.cs:555-558`
- **Success:** Legacy treats HTTP 200 in error handler as success with message "Password reset link sent successfully." Evidence: `Scripts/controllers/userDetailsController.js:154-156`

### Cancel

- Navigates to `#/User/Index` without save. Evidence: `Views/User/Details.cshtml:22-24`

### Security level modal (per level)

- **Load:** `GET` partial `UserSecurityLevelPermission/Index?securityLevel={school|course|module|programme|faculty|student}`
- **Search:** `GET api/UserSecurityLevelPermissionApi/GetSecurityLevelsByCriteria?securityLevel={level}&query={text}` (via typeahead in partial). Evidence: `Views/UserSecurityLevelPermission/Index.cshtml:25`, `Scripts/controllers/userDetailsController.js:412`
- **Apply:** Returns array saved into `userSecurityLevelPermissionToProcess`; overview text updated (truncated at 40 chars). Evidence: `Scripts/controllers/userDetailsController.js:416-438`

## Permissions

| UI element | Permission item | Action |
|---|---|---|
| MVC partial | `Users` | `Access` |
| Load API | `Users` | `Access` |
| Save (new) | `Users` | `Add` |
| Save (edit) | `Users` | `Edit` |
| Send reset link (view) | `Users` | `Edit` |
| Lecturer visibility checkbox | `Users` | `LecturerVisibility` |
| Set Password button | No explicit security binding (visible by flags only) | — |
| Security level modal Add (in partial) | `Users` | `Edit` |
| Security level modal Delete | `Users` | `Delete` |
| POST create | `Users` | `Add` |
| POST update | `Users` | `Edit` |

Evidence: `Controllers/UserController.cs:26-27`, `Views/User/Details.cshtml:11-17,32,199`, `Controllers/Api/UserApiController.cs:295-296,315,338`

## States

| State | Behaviour |
|---|---|
| Loading | `#userdetailDtlContainer` hidden until GET completes, then shown. Evidence: `Scripts/controllers/userDetailsController.js:377,448-563` |
| Empty (new) | `id == 0`; one default persona when personas mode. Evidence: `Controllers/Api/UserApiController.cs:146-155` |
| Populated | Form bound to `detail` |
| Error (load) | No dedicated UI — container may stay hidden |
| Error (save) | Message toast; stay on page |
| Validation error | Client validation messages; persona alerts via `swAlert.showError` |

## Side effects

- **Create:** Creates user, optional password set, personas, security level permissions, super-user flag, reporting sync. Evidence: `Controllers/Api/UserApiController.cs:331-425`
- **Update:** Updates user fields, personas, security levels, `SyncUserSecurityLevelPermissionIndividualToTheReporting`. Evidence: `Controllers/Api/UserApiController.cs:338-425`
- **Set password / reset link:** Backend password operations on user account. Evidence: `Controllers/Api/UserApiController.cs:528-577`

## Legacy bugs — do not copy

| Bug | Evidence | React approach |
|---|---|---|
| Duplicate `id="set-password-action"` on two buttons | `Views/User/Details.cshtml:27,32` | Unique element ids |
| Send reset link gated by `Edit` in view but API requires only `Access` | `Views/User/Details.cshtml:32`, `Controllers/Api/UserApiController.cs:557` | Match API permission for route gate; document view/API mismatch |
| `validateAccesProfileAssociatedToPersonas` loop uses `i <= data.length` (off-by-one risk) | `Scripts/controllers/userDetailsController.js:130` | Correct duplicate/required validation |
| Send reset success handled in AJAX `error` callback when status 200 | `Scripts/controllers/userDetailsController.js:154-156` | Treat 2xx as success in API client |
| No load error state | `Scripts/controllers/userDetailsController.js:448` | Error + Retry |
| Hard-coded "Send Password Reset Link" English string | `Views/User/Details.cshtml:36` | Resource key |
| `save` calls `hideLoadingIcon` immediately after `showLoadingIcon` | `Scripts/controllers/userDetailsController.js:179,198` | Keep loading until request completes |

## Checklist

- [x] Routes `/users/new` and `/users/{id}` gated by `Users` + `Access`
- [x] All main form fields with correct defaults and validation
- [x] Personas tab when `seatsAuthorisationByPersonas`; security tab otherwise
- [x] Persona order, add/remove, restricted vs available profile lists
- [x] Security level modal per entity type; super-user disables editing
- [x] Set Password modal with policy validation
- [x] Send reset link (respect Edit gate in UI)
- [x] Save POST with full `UserDto` payload
- [x] Cancel returns to user index
- [x] Loading / empty / error states distinct
- [x] Permissions on Save, Lecturer visibility, reset link
