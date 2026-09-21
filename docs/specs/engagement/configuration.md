# Engagement — Configuration

## Route

| Legacy | React |
|---|---|
| `#/Engagement` | `/engagement` |
| Row click `#/Engagement/Details/{id}` | link to the React model editor at `/engagement/{id}` |

Evidence: `Views/Engagement/Index.cshtml:1-46`, `seats-admin-engagement.html:253-257`

## Permissions

| Gate | Needs | Evidence |
|---|---|---|
| Data | Engagement + Access | `EngagementApiController.cs:149` |
| Add | Engagement + Add | `Index.cshtml:30-34`, `EngagementApiController.cs:541` |
| Re-calculate | Engagement + ReCalculateModel (67), only with ticked rows | `Index.cshtml:35-38`, `seats-admin-engagement.html:245-252, 349-352` |

## List

| Column | Field | Notes |
|---|---|---|
| Name | `modelName` | Server sorts by name |
| Is Active | `isActive` | Active / Inactive |
| Last Run | `lastRun` | `dd/MM/yyyy HH:mm:ss`; blank when never run |

GET `engagementApi/GetAllEngagement` → `{ items, totalRowCount }`; legacy sends no paging params (`seats-admin-engagement.html:302-304`).

## Add model dialog

| Field | Rules | Evidence |
|---|---|---|
| Name | max 200; required ("The Name is required.") | `seats-admin-engagement-crud.html:52, 119-127` |
| Option | Default setup (default) / Copy existing | `:57-60` |
| Models | Shown for Copy existing; Save disabled until picked | `:63-67, 190-193` |

POST `engagementApi/createEngagementModel?modelName=&modelIdToClone=` (no body); success reloads the list.

## Re-calculate dialog

| Field | Rules | Evidence |
|---|---|---|
| Selected (N) | Default; sends every ticked id | `seats-admin-engagement-recalculate.html:48-53`, `seats-admin-engagement.html:339` |
| Active models in selection (N) | Hidden when 0; sends active ids only | same |
| Re-sync students | Checkbox, off | `:57-60` |
| Date Range | From/To, today by default, `dd/MM/yyyy` | `:63-69, 124-129` |

POST `engagementApi/SyncStudentsAndReCalculate` `{ reSyncStudents, selectAll, startDate, endDate, modelIds }`.

## Checklist

- [x] Route, menu, Engagement + Access gate
- [x] List columns, client sort and pager
- [x] Details link to legacy editor
- [x] Add dialog with Default / Copy and required name
- [x] Re-calculate dialog with Selected / Active, re-sync and dates
- [x] Button permissions
- [ ] Real Alpha data check (needs sign-in)
