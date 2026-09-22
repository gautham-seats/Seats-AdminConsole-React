# Scheduled Activity Type — Index

## Route

| | Legacy | React (proposed) |
|---|---|---|
| Path | `#/ScheduledActivityType` / `#/ScheduledActivityType/Index` | `/settings/activity-types` |
| MVC partial | `ScheduledActivityType/Index` | — |

Evidence: `Views/ScheduledActivityType/Index.cshtml:18-19`, `Views/ScheduledActivityType/Index.cshtml:133-141`

## Menu

- **Main nav:** Via Settings (`#/Settings`). Evidence: `Views/Shared/_Layout.cshtml:91-94`
- **Sub-nav pills:** Settings, File Template, **Activity Types** (active), Resources, Custom Fields, Authentication, Contacts, GraphAPI. Evidence: `Views/ScheduledActivityType/Index.cshtml:11-35`
- **Sub-menu visibility:** `showOrHideSubMenu` + `GET api/UserApi/GetClaims` (sync). Evidence: `Views/ScheduledActivityType/Index.cshtml:143-203`

## Fields (grid columns)

| Column | Field | Sort column |
|---|---|---|
| Name | `name` | `name` |
| Type | `scheduledActivitySubTypeDescription` | `scheduledActivitySubTypeDescription` |
| Notification Type | `notificationTypeDescription` | `notificationTypeDescription` |
| Act As Clocking | `actAsClocking` | `actAsClocking` |
| Act As Blackout | `actAsBlackout` | `actAsBlackout` |
| Is Appointment | `isAppointment` | `isAppointment` |
| Trigger Email | `triggerEmail` | `triggerEmail` |
| Requires Approval | `requiresApproval` | `requiresApproval` |
| Access Level | `accessLevel` | (not sortable in markup) |
| Mandatory Comments | `mandatoryComment` | (not sortable) |
| Mandatory Attachments | `mandatoryAttachments` | (not sortable) |

Evidence: `Views/ScheduledActivityType/Index.cshtml:62-122`

Conditional columns:

| Column | Condition |
|---|---|
| Requires Approval | `hasApprovalAccess` — subscription has `ScheduledActivity` + `Access`. Evidence: `Views/ScheduledActivityType/Index.cshtml:6,83-87,113-115` |
| Mandatory Attachments | `hasMandatoryAttachments` — user has `ScheduledActivityType` + `MandatoryAttachments`. Evidence: `Views/ScheduledActivityType/Index.cshtml:7,95-99,119-121` |

> List DTO fields are pre-formatted strings from service (`ScheduledActivityTypeListItemDto`).

## Actions + API

### Load list

- **Endpoint:** `GET api/ScheduledActivityTypeApi` (collection). Evidence: `Views/ScheduledActivityType/Index.cshtml:135`, `Controllers/Api/ScheduledActivityTypeApiController.cs:37-40`
- **Pagination:** Client-side (default). Evidence: `Scripts/softworks/swgrid.js:9` (no `paginationSide: 'server'` in index script)
- **Initial sort:** `name` asc. Evidence: `Views/ScheduledActivityType/Index.cshtml:138-139`
- **Delete error handler:** Custom `showDeleteReferenceError` parses 400 message. Evidence: `Views/ScheduledActivityType/Index.cshtml:140,148-151`, `Scripts/softworks/swgrid.js:444-447`

### Search

- Server search N/A (client pagination); search box still binds `searchFilter` for client filter. Evidence: `Views/ScheduledActivityType/Index.cshtml:56`, `Scripts/softworks/swgrid.js:119-136`

### Row click → details

- `#/ScheduledActivityType/Details/{id}`. Evidence: `Views/ScheduledActivityType/Index.cshtml:136`, `Scripts/softworks/swgrid.js:263`

### Add

- `#/ScheduledActivityType/Details`; `ScheduledActivityType` + `Add`. Evidence: `Views/ScheduledActivityType/Index.cshtml:44-47`

### Delete

- `DELETE api/ScheduledActivityTypeApi?ids=…`; `ScheduledActivityType` + `Delete`. Evidence: `Views/ScheduledActivityType/Index.cshtml:49-52`, `Controllers/Api/ScheduledActivityTypeApiController.cs:113-114`
- **400:** Warning toast with `result.Message` (reference constraint). Evidence: `Controllers/Api/ScheduledActivityTypeApiController.cs:118-119`, `Views/ScheduledActivityType/Index.cshtml:148-151`

## Permissions

| UI element | Item | Action |
|---|---|---|
| MVC Index/Details | `ScheduledActivityType` | `Access` |
| Add | `ScheduledActivityType` | `Add` |
| Delete | `ScheduledActivityType` | `Delete` |
| Requires Approval column | `ScheduledActivity` (subscription) | `Access` |
| Mandatory Attachments column | `ScheduledActivityType` | `MandatoryAttachments` |
| GET list | `ScheduledActivityType` | `Access` |

Evidence: `Controllers/ScheduledActivityTypeController.cs:25-26`, `Views/ScheduledActivityType/Index.cshtml:44-52`, `Controllers/Api/ScheduledActivityTypeApiController.cs:37-38`

## States

| State | Behaviour |
|---|---|
| Loading | swgrid standard |
| Empty | No items message |
| Delete reference error | Warning alert 5s with server message |

## Side effects

- Delete calls service `Delete(ids)` — no audit in Admin API. Evidence: `Controllers/Api/ScheduledActivityTypeApiController.cs:116`

## Legacy bugs — do not copy

| Bug | Evidence | React approach |
|---|---|---|
| Sync blocking GetClaims for sub-nav | `Views/ScheduledActivityType/Index.cshtml:157-166` | Async permissions |
| Duplicate ids on sub-nav links | `Views/ScheduledActivityType/Index.cshtml:28` | Unique ids |
| `tabindex` on delete icon instead of `title` | `Views/ScheduledActivityType/Index.cshtml:51` | Proper attributes |
| Access Level / Mandatory columns not sortable while others are | `Views/ScheduledActivityType/Index.cshtml:89-94` | Consistent sort behaviour |

## Checklist

- [ ] Route under Settings; ScheduledActivityType Access
- [ ] Settings sub-nav with permission gates
- [ ] Grid columns including conditional Requires Approval and Mandatory Attachments
- [ ] GET collection; client paging; initial sort name asc
- [ ] Add → details; multi-delete with reference error handling
- [ ] Row click → details
- [ ] Loading / empty / error states
