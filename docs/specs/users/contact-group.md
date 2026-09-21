# Contact Group — Index & Details

Covers list (`ContactGroup/Index`) and editor (`ContactGroup/Details`).

## Route

| Screen | Legacy | React (proposed) |
|---|---|---|
| Index | `#/ContactGroup` / `#/ContactGroup/Index` | `/users/contact-groups` |
| New | `#/ContactGroup/Details` | `/users/contact-groups/new` |
| Edit | `#/ContactGroup/Details/{id}` | `/users/contact-groups/{id}` |
| Cancel | `#/ContactGroup/Index` | `/users/contact-groups` |

Evidence: `Views/ContactGroup/Index.cshtml:35`, `Views/ContactGroup/Details.cshtml:21`, `Scripts/controllers/contactGroupDetailsController.js:286`

## Menu

- **Main nav:** Contact Group when `ContactGroup` + `Access`. Evidence: `Views/Shared/_Layout.cshtml:53-59`
- **Sub-nav:** Users-area pills; Contact Group active on index. Evidence: `Views/ContactGroup/Index.cshtml:9-25`
- **Focus parent:** `focusParentMenuElement: '#userMenuItem'`. Evidence: `Views/ContactGroup/Index.cshtml:18`

---

## Index

### Fields (grid columns)

| Column label | Bind field | Sort `data-column` | Conditional | Notes |
|---|---|---|---|---|
| Name | `name` | `name` | Always | Evidence: `Views/ContactGroup/Index.cshtml:52,61` |
| Group Email Address | `groupEmailAddress` | `isActive` (legacy wrong key) | Always | Evidence: `Views/ContactGroup/Index.cshtml:53,62` |
| Send Emails To | `sendEmailsToTypeDescription` | `isActive` | Always | Evidence: `Views/ContactGroup/Index.cshtml:54,63` |
| Function | `functionName` | `isActive` | `ContactGroup` + `ContactGroupFunctions` | Evidence: `Views/ContactGroup/Index.cshtml:55,64` |
| Associated To | `associatedToDescription` | `isActive` | `ContactGroup` + `ContactGroupFunctions` | Evidence: `Views/ContactGroup/Index.cshtml:56,65` |

### Actions + API (index)

#### Load list

- **Trigger:** `genericIndexController.load` (client-side pagination). Evidence: `Views/ContactGroup/Index.cshtml:76-86`
- **Endpoint:** `GET /Seats.Trunk.Admin/api/ContactGroupApi`
- **Response:** `ContactGroupDto[]` (all groups; paging client-side). Evidence: `Controllers/Api/ContactGroupApiController.cs:69-74`, `Views/ContactGroup/Index.cshtml:82`
- **Initial sort:** `name` ascending. Evidence: `Views/ContactGroup/Index.cshtml:83-84`

#### Row click

- Navigates to `#/ContactGroup/Details/{id}`. Evidence: `Views/ContactGroup/Index.cshtml:80`, `Scripts/softworks/swgrid.js:252-264`

#### Add

- `#/ContactGroup/Details`. Gated `ContactGroup` + `Add`. Evidence: `Views/ContactGroup/Index.cshtml:34-37`

#### Delete

- `DELETE /Seats.Trunk.Admin/api/ContactGroupApi?ids=…`
- **Custom error:** `onDeleteErrorCallback` parses `response.message` and shows warning 5000 ms. Evidence: `Views/ContactGroup/Index.cshtml:85,89-92`, `Controllers/Api/ContactGroupApiController.cs:185-193`

### Permissions (index)

| UI element | Item | Action | Notes |
|---|---|---|---|
| Sub-nav pills | various | various | Evidence: `Views/ContactGroup/Index.cshtml:11-24` |
| Add | `ContactGroup` | `Add` | Evidence: `Views/ContactGroup/Index.cshtml:34` |
| Delete button (view) | `Devices` | `Delete` | **Wrong permission — legacy bug** |
| Function/Associated columns | `ContactGroup` | `ContactGroupFunctions` | Evidence: `Views/ContactGroup/Index.cshtml:55-56,64-65` |
| GET list | `ContactGroup` | `Access` | Evidence: `Controllers/Api/ContactGroupApiController.cs:69` |
| DELETE API | `ContactGroup` | `Delete` | Evidence: `Controllers/Api/ContactGroupApiController.cs:185` |

Evidence for delete button bug: `Views/ContactGroup/Index.cshtml:39`

---

## Details

### Fields

| Field | Type | Default | Validation | Visibility | Notes |
|---|---|---|---|---|---|
| `id` | number | `0` | — | Always | Evidence: `Scripts/controllers/contactGroupDetailsController.js:246` |
| `name` | text | empty | Required | Always | Evidence: `Views/ContactGroup/Details.cshtml:35-38`, `Scripts/controllers/contactGroupDetailsController.js:248-254` |
| `description` | text | empty | — | Always | Evidence: `Views/ContactGroup/Details.cshtml:41-44` |
| `groupEmailAddress` | email text | empty | Email format (client, max 100 in markup) | Always | Also on separate `groupEmailAddress` observable on VM. Evidence: `Views/ContactGroup/Details.cshtml:60-62`, `Scripts/controllers/contactGroupDetailsController.js:11-17,107-113` |
| `sendEmailsToTypeId` | select | null `[None]` | Required | Always | Options from `sendEmailToAvailables`; some disabled by `visible` flag. Evidence: `Views/ContactGroup/Details.cshtml:66-70`, `Scripts/controllers/contactGroupDetailsController.js:316-322,190-201` |
| `functionId` | select | null | — | `ContactGroupFunctions` | Evidence: `Views/ContactGroup/Details.cshtml:72-91` |
| `functionName` | text | — | — | Derived on function change | Evidence: `Scripts/controllers/contactGroupDetailsController.js:40-46` |
| `entityId` | select | null | — | `ContactGroupFunctions` | Entity type: 1=Course, 2=Faculty, 3=Module, 4=Programme, 5=School. Evidence: `Controllers/Api/ContactGroupApiController.cs:30-37,122-128`, `Views/ContactGroup/Details.cshtml:93-164` |
| `courseId` / `facultyId` / `moduleId` / `programmeId` / `schoolId` | typeahead | null | Required when `functionId` set and matching `entityId` | Per entity type | Evidence: `Scripts/controllers/contactGroupDetailsController.js:267-312`, `Views/ContactGroup/Details.cshtml:101-156` |
| `associatedToDescription` | text | empty | — | Typeahead display for entity | Evidence: `Views/ContactGroup/Details.cshtml:107` |
| `userIdsInContactGroup` | int[] | `[]` | At least one user OR non-empty group email to save | Built from local users grid before save | Evidence: `Scripts/controllers/contactGroupDetailsController.js:215-239` |

### Users grid (members)

| Column | Field | Notes |
|---|---|---|
| Select | checkbox | Multi-select |
| User Name | `userName` | Client sort `userName` asc, page size 15 |
| Real Name | `displayName` | From user object when added |
| Email | `emailAddress` | |

Evidence: `Views/ContactGroup/Details.cshtml:173-214`, `Scripts/controllers/contactGroupDetailsController.js:296-299`

**Add user:** Typeahead `GET api/UserApi/GetUsersByCriteria?query={text}` → `GET api/UserApi/{id}` to fetch detail; push to `localUsers` if not duplicate. Evidence: `Views/ContactGroup/Details.cshtml:50-51`, `Scripts/controllers/contactGroupDetailsController.js:123-151`

**Remove users:** Delete selected from `localUsers` (no API until save). Evidence: `Scripts/controllers/contactGroupDetailsController.js:163-187`

### Send Emails To option visibility logic

| Option id | Hidden when |
|---|---|
| `1` | Group email invalid/empty |
| `2` | No users with valid email in grid |
| `3` | Invalid group email OR no valid-email users |

Evidence: `Scripts/controllers/contactGroupDetailsController.js:190-201`

### Function modal

| Field | Validation |
|---|---|
| `name` | Required |

- **Create/update:** `POST /Seats.Trunk.Admin/api/contactGroupApi/createOrUpdateFunction` body `{ id, name }`
- **Delete:** `DELETE /Seats.Trunk.Admin/api/contactGroupApi/deletefunction?id={id}`
- **Permission:** `ContactGroup` + `ContactGroupFunctions`

Evidence: `Views/ContactGroup/Details.cshtml:241-281`, `Scripts/controllers/contactGroupDetailsController.js:336-430`, `Controllers/Api/ContactGroupApiController.cs:341-367`

### Actions + API (details)

#### Load

- **Endpoint:** `GET /Seats.Trunk.Admin/api/ContactGroupApi/{id}` (`0` for new)
- **Response:** `{ detail, users, sendEmailToAvailables, entityAvailables, functionAvailables }`. Evidence: `Scripts/controllers/contactGroupDetailsController.js:451-461`, `ViewModels/ContactGroup/ContactGroupViewModel.cs:12-17`, `Controllers/Api/ContactGroupApiController.cs:78-156`

#### Entity typeahead APIs

| Entity | Endpoint |
|---|---|
| Course | `GET api/ContactGroupApi/GetCoursesByCriteria?query=` |
| Faculty | `GET api/ContactGroupApi/GetFacultiesByCriteria?query=` |
| Module | `GET api/ContactGroupApi/GetModulesByCriteria?query=` |
| Programme | `GET api/ContactGroupApi/GetProgrammesByCriteria?query=` |
| School | `GET api/ContactGroupApi/GetSchoolsByCriteria?query=` |

All require `Users` + `Access`. Evidence: `Views/ContactGroup/Details.cshtml:105-152`, `Controllers/Api/ContactGroupApiController.cs:247-337`

#### Save

- **Endpoint:** `POST /Seats.Trunk.Admin/api/ContactGroupApi`
- **Body:** `ContactGroupDto` fields from `detail` including `userIdsInContactGroup`
- **Client rule:** Must have users OR group email; else gray alert with `userInContactGroupMessage`. Evidence: `Scripts/controllers/contactGroupDetailsController.js:223-239`
- **Server rule:** `ModelState` valid AND (`userIdsInContactGroup` not empty OR `groupEmailAddress` set). Evidence: `Controllers/Api/ContactGroupApiController.cs:167-168`
- **Permission:** `ContactGroup` + `Add` (create) or `Edit` (update) checked in controller. Evidence: `Controllers/Api/ContactGroupApiController.cs:164-165`
- **Success:** Toast + redirect to index. Evidence: `Scripts/controllers/contactGroupDetailsController.js:227-229`

#### Cancel

- Link to `#/ContactGroup/Index`. Evidence: `Views/ContactGroup/Details.cshtml:21`

### Permissions (details)

| UI element | Item | Action |
|---|---|---|
| MVC Details | `ContactGroup` | `Access` |
| Save (new) | `ContactGroup` | `Add` |
| Save (edit) | `ContactGroup` | `Edit` |
| Add user button | `ContactGroup` | `Edit` |
| Function / Associated To fields | `ContactGroup` | `ContactGroupFunctions` |
| Delete users in grid (view) | `Users` | `Delete` |
| GET | `ContactGroup` | `Access` |
| POST | `ContactGroup` | `Add` / `Edit` |
| Function APIs | `ContactGroup` | `ContactGroupFunctions` |
| User search typeahead | `Users` | `Access` |

Evidence: `Views/ContactGroup/Details.cshtml:10-17,52,72,177`, `Controllers/ContactGroupController.cs:28-31`, `Controllers/Api/ContactGroupApiController.cs:77,164-165`

## States

| State | Behaviour |
|---|---|
| Loading | Container hidden until GET completes. Evidence: `Scripts/controllers/contactGroupDetailsController.js:445,457-458` |
| Empty members | Save blocked unless group email provided |
| Error (save) | `responseJSON.message` toast. Evidence: `Scripts/controllers/contactGroupDetailsController.js:231-232` |
| Error (delete index) | Parsed warning message. Evidence: `Views/ContactGroup/Index.cshtml:89-92` |

## Side effects

- **Save:** Persists contact group and member list via `_contactGroupProxy.Proxy.Save`. Evidence: `Controllers/Api/ContactGroupApiController.cs:170`
- **Function create/update/delete:** Mutates function lookup used by other groups. Evidence: `Controllers/Api/ContactGroupApiController.cs:341-377`

## Legacy bugs — do not copy

| Bug | Evidence | React approach |
|---|---|---|
| Index Delete button gated by `Devices`+`Delete` instead of `ContactGroup`+`Delete` | `Views/ContactGroup/Index.cshtml:39` | Use `ContactGroup` + `Delete` |
| Grid sort columns use `data-column="isActive"` for non-boolean fields | `Views/ContactGroup/Index.cshtml:53-56` | Sort by actual field names |
| Details delete-users uses `Users`+`Delete` not `ContactGroup` | `Views/ContactGroup/Details.cshtml:177` | Use appropriate ContactGroup edit permission |
| Duplicate `id="function-col"` on two headers | `Views/ContactGroup/Index.cshtml:55-56` | Unique ids |
| `entityAvailables` includes `Id = 0` "None" but ko `entityId == 1` checks use numeric ids | `Controllers/Api/ContactGroupApiController.cs:122-128`, `Views/ContactGroup/Details.cshtml:101` | Align entity type values |
| Hard-coded "Required" validation spans | `Views/ContactGroup/Details.cshtml:108` | Resource keys |
| No load error UI | `Scripts/controllers/contactGroupDetailsController.js:451` | Error + Retry |

## Checklist

- [x] Index and details routes with `ContactGroup` + `Access`
- [x] Index columns including conditional Function/Associated To
- [x] Correct Delete permission on index (`ContactGroup` + `Delete`)
- [x] Details form with name, description, email, send-to, function, entity association
- [x] Users grid with add/remove and typeahead
- [x] Send-to option disable logic
- [x] Function modal CRUD
- [x] Save validation (users OR email)
- [x] POST body matches `ContactGroupDto`
- [x] Loading / empty / error states distinct
