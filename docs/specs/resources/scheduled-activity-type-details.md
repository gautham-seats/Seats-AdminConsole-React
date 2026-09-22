# Scheduled Activity Type — Details

## Route

| | Legacy | React (proposed) |
|---|---|---|
| New | `#/ScheduledActivityType/Details` | `/settings/activity-types/new` |
| Edit | `#/ScheduledActivityType/Details/{id}` | `/settings/activity-types/{id}` |
| Cancel | `#/ScheduledActivityType/Index` | `/settings/activity-types` |

Evidence: `Views/ScheduledActivityType/Details.cshtml:26`, `Views/ScheduledActivityType/Details.cshtml:151-157`

## Menu

- No sub-nav on details form. Evidence: `Views/ScheduledActivityType/Details.cshtml:10-147`

## Fields

| Label | Field | Control | Notes |
|---|---|---|---|
| Name | `name` | Text | Required (client check before save). Evidence: `Views/ScheduledActivityType/Details.cshtml:40-43`, `Scripts/controllers/scheduledActivityTypeDetailsController.js:35-50` |
| Trigger Email | `triggerEmail` | Checkbox | Evidence: `Views/ScheduledActivityType/Details.cshtml:46-49` |
| Attachment (notification type) | `notificationTypeId` | Select | Visible only when `triggerEmail` AND at least one file template with `fileTemplateTypeId === 1` (Letter). Options from `notificationTypeAvailables`; caption `[None]`. Evidence: `Views/ScheduledActivityType/Details.cshtml:51-63` |
| File Template | `fileTemplateIds` | Checkbox list | Visible when `triggerEmail` AND `notificationTypeId === 3` (Letter). Scrollable list from `fileTemplateAvailables`. Evidence: `Views/ScheduledActivityType/Details.cshtml:65-76` |
| Act As Clocking | `actAsClocking` | Checkbox | Evidence: `Views/ScheduledActivityType/Details.cshtml:79-83` |
| Act As Blackout | `actAsBlackout` | Checkbox | Evidence: `Views/ScheduledActivityType/Details.cshtml:86-90` |
| Is Appointment | `isAppointment` | Checkbox | Evidence: `Views/ScheduledActivityType/Details.cshtml:93-96` |
| Requires Approval | `requiresApproval` | Checkbox | Only if `ViewBag.HasApprovalSubscriptionAccess`. Evidence: `Views/ScheduledActivityType/Details.cshtml:98-105`, `Controllers/ScheduledActivityTypeController.cs:35` |
| Mandatory Comments | `mandatoryComment` | Checkbox | Evidence: `Views/ScheduledActivityType/Details.cshtml:108-111` |
| Mandatory Attachments | `mandatoryAttachments` | Checkbox | Only if user `hasMandatoryAttachments`. Evidence: `Views/ScheduledActivityType/Details.cshtml:6-7,113-120` |
| Type | `scheduledActivitySubTypeId` | Select | Options: `scheduledActivitySubTypeAvailables`. Evidence: `Views/ScheduledActivityType/Details.cshtml:123-126` |
| Access Level | `accessLevelId` | Select | Options: `accessLevels` (enum `AccessLevelEnum` names). Evidence: `Views/ScheduledActivityType/Details.cshtml:129-132`, `Controllers/Api/ScheduledActivityTypeApiController.cs:68-69` |
| Attendance Type | `attendanceStatusTypeId` | Select | Visible when `actAsClocking`; options `attendanceTypes` (`StudentScheduleStatusNotAutomatedEnum`); caption `[None]`. Evidence: `Views/ScheduledActivityType/Details.cshtml:134-138`, `Controllers/Api/ScheduledActivityTypeApiController.cs:69` |

### Load query flag

- GET uses `?letterFileTemplatesOnly=true` to limit file templates to Letter type for dropdown visibility logic. Evidence: `Scripts/controllers/scheduledActivityTypeDetailsController.js:85`, `Controllers/Api/ScheduledActivityTypeApiController.cs:45,66-67`

### Lookup data on GET

`scheduledActivitySubTypeAvailables`, `notificationTypeAvailables`, `fileTemplateAvailables`, `accessLevels`, `attendanceTypes`. Evidence: `Controllers/Api/ScheduledActivityTypeApiController.cs:64-69`

## Actions + API

### Load

- **Endpoint:** `GET api/ScheduledActivityTypeApi/{id}?letterFileTemplatesOnly=true`. Evidence: `Scripts/controllers/scheduledActivityTypeDetailsController.js:85`, `Controllers/Api/ScheduledActivityTypeApiController.cs:44-71`
- **New:** `id=0` → empty detail with `fileTemplateIds: []`. Evidence: `Controllers/Api/ScheduledActivityTypeApiController.cs:49-52`
- **Not found:** 404 with ScheduledActivityType message. Evidence: `Controllers/Api/ScheduledActivityTypeApiController.cs:57-60`
- **UI:** Container hidden until load. Evidence: `Scripts/controllers/scheduledActivityTypeDetailsController.js:79,88`

### Save

- **Gating:** Add save when `id==0`; Edit save when `id!=0`. Evidence: `Views/ScheduledActivityType/Details.cshtml:14-22`
- **Client validation:** Name required; else error toast with `NameIsRequired` (10s). Evidence: `Scripts/controllers/scheduledActivityTypeDetailsController.js:35-50`, `Views/ScheduledActivityType/Details.cshtml:155`
- **Endpoint:** `POST api/ScheduledActivityTypeApi/` with `ScheduledActivityTypeDto` body. Evidence: `Scripts/controllers/scheduledActivityTypeDetailsController.js:36-38`, `Controllers/Api/ScheduledActivityTypeApiController.cs:85`
- **Auth:** Add OR Edit (manual). Evidence: `Controllers/Api/ScheduledActivityTypeApiController.cs:87-88`
- **Create vs update:** `id==0` → Create; else Update. Evidence: `Controllers/Api/ScheduledActivityTypeApiController.cs:94-97`
- **Success:** Toast 3.5s → index. Evidence: `Scripts/controllers/scheduledActivityTypeDetailsController.js:39-41`
- **Error:** Gray server message. Evidence: `Scripts/controllers/scheduledActivityTypeDetailsController.js:43-45`

### Cancel

- `#/ScheduledActivityType/Index`. Evidence: `Views/ScheduledActivityType/Details.cshtml:26`

## Permissions

| UI element | Item | Action |
|---|---|---|
| MVC Details | `ScheduledActivityType` | `Access` |
| Save (new) | `ScheduledActivityType` | `Add` |
| Save (edit) | `ScheduledActivityType` | `Edit` |
| Requires Approval field | Subscription: `ScheduledActivity` | `Access` |
| Mandatory Attachments field | `ScheduledActivityType` | `MandatoryAttachments` |
| POST | `ScheduledActivityType` | `Add` or `Edit` |

Evidence: `Controllers/ScheduledActivityTypeController.cs:32-35`, `Views/ScheduledActivityType/Details.cshtml:14-22,98-120`, `Controllers/Api/ScheduledActivityTypeApiController.cs:87-88`

## States

| State | Behaviour |
|---|---|
| Loading | `#schActivityTypeDtlContainer` hidden |
| Conditional sections | Notification/file template/attendance type visibility per rules above |
| Name missing | Error toast, no API call |
| Save error | Server message |

## Side effects

- Create/Update via scheduled activity type service — no Admin audit log. Evidence: `Controllers/Api/ScheduledActivityTypeApiController.cs:94-97`

## Legacy bugs — do not copy

| Bug | Evidence | React approach |
|---|---|---|
| `mandatoryComment` defined twice in default detail observable | `Scripts/controllers/scheduledActivityTypeDetailsController.js:22-23` | Single property |
| `mapping.create` references `self.fileTemplateIds` out of scope | `Scripts/controllers/scheduledActivityTypeDetailsController.js:65` | Correct fileTemplateIds binding |
| Act as Clocking / Blackout mutual disable commented out | `Views/ScheduledActivityType/Details.cshtml:81,88` | Confirm with product whether mutual exclusion is required |
| Empty `detailViewModel` function | `Scripts/controllers/scheduledActivityTypeDetailsController.js:55-58` | Proper typed model |
| Duplicate `for` label id `scheduled-requires-approval` | `Views/ScheduledActivityType/Details.cshtml:101,108,116` | Unique label `for` targets |

## Checklist

- [ ] New and edit routes; ScheduledActivityType Access
- [ ] GET with `letterFileTemplatesOnly=true` and all lookup lists
- [ ] All fields + conditional visibility rules
- [ ] Name required before POST
- [ ] Add/Edit permission on save
- [ ] Requires Approval gated by subscription permission
- [ ] Mandatory Attachments gated by MandatoryAttachments permission
- [ ] POST create/update
- [ ] Loading / validation / error states
