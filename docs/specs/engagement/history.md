# Engagement — History

## Route

| Legacy | React |
|---|---|
| `#/Engagement/HistoryIndex` | `/engagement/history` |

Evidence: `Views/Engagement/HistoryIndex.cshtml`, `seats-admin-engagement-history.html`

## Load order

1. GET `EngagementApi/GetCurrentCalculationPeriod` → `{ periodStart, periodEnd }` sets the dates (`:824-840`).
2. The first search runs with the Stats view (`:769-788`).
3. GET `engagementApi/GetAllEngagement` (Models) and `engagementApi/GetNodes` (Nodes).

## Filters (shared filter panel, D-060)

| Filter | Control | Values | View | Evidence |
|---|---|---|---|---|
| View | Panel view tabs | Stats (default), Student Score; changing runs a search | both | `:188-193, 979-987` |
| Is Training Period | Select | All `''`, Yes `'true'`, No `'false'` | both | `:196-202` |
| Date Range | Date range | calculation period by default | both | `:205-210` |
| Models | Multi-select + All | model ids | both | `:213-233` |
| Nodes | Multi-select + All | node ids | both | `:236-259` |
| Students | Search, 2+ letters | GET `engagementApi/getStudentsByName?query=` | Student Score | `:261-273` |
| Status | Multi-select + All | Error, Finished, Idle, Loading, Persisting, Processing | Stats | `:274-325` |
| Containing | Text, max 200 | | Stats | `:326-340` |
| Refresh Interval | Select | Never, 10–300 s; repeats the search | both | `:341-354, 757-764` |
| Sort by | Select | Period / Calculated, newest or oldest; runs a search | both | `:355-364` |
| Search | — | legacy button `:365-367`; **React has none** — every filter applies on change (D-097) | both | `:365-367` |
| Clear filters | Panel reset | restores defaults and searches | both | `:368-370, 1025-1075` |

**When filters apply (D-097, following D-112):** selects, multi-selects, the date range and the student pick reload the grid the moment a value is chosen; Containing reloads on Enter or when the box is left. The request body is unchanged.

## Requests

- POST `engagementApi/getEngagementStats` / `getEngagementStudentScore` with `returnTotalCount, pageNumber, pageSize, sortField, sortOrder, isTrainingPeriod, startDatePeriod, endDatePeriod, modelIds, nodeIds, status` + `containing` (Stats) or `studentIds: [student]` (Student Score). Both are reads (D-062).
- Export (PDF and CSV): POST `ExportEngagementStats` / `ExportEngagementStudentScore` with the same body plus `exportTo` (PDF `0`, CSV `1`), `userId: '', userCultureInfo: '', userNotificationId: '', returnTotalCount: true`; success says ReportProcessing. Both show for every user — see D-097 for why the PDF gate at `:383` never hides it. React puts them in the page-header **Export** menu, like Devices.

## Grid

Period, Calculated (`dd/MM/yyyy HH:mm:ss`), Training (Yes/No), Model, Node, Status (Error red, Finished green, Processing grey), Instances, Min, Max, Mean, SD (cut to 6 characters, full value on hover); Stats adds Errors, Warnings, Messages (count opens the messages dialog); Student Score adds Student Id, R, Z, Dr, Dz, Zdz, P. Server paging, 100 per page; the total comes with page 0.

## Checklist

- [x] Calculation period defaults and first search
- [x] All filters per view, on the shared panel, Search and Clear filters
- [x] Refresh interval polling
- [x] Stats and Student Score bodies and columns
- [x] Messages dialog as plain text
- [x] PDF and CSV export in the header Export menu (D-097)
- [x] Filters apply on change, no Search button (D-097)
- [ ] PDF export confirmed on Alpha (`exportTo: 0` comes from a compiled enum; not proven until a PDF arrives)
- [x] Real Alpha data check: loads clean on Alpha, 0 rows because no calculation has ever run (the only model is inactive, Last Run = Never)
