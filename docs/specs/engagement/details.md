# Engagement — Model Details

## Route

| Legacy | React |
|---|---|
| `#/Engagement/Details/{id}` | `/engagement/{id}` |
| Name link in Configuration | `Link` to `/engagement/{id}` |

Evidence: `Controllers/EngagementController.cs:20-25`, `Views/Engagement/Details.cshtml:1-51`, `seats-admin-engagement.html:253-257`. Legacy reads the id from the hash (`seats-admin-engagement-model.html:927-931`).

## Permissions

| Gate | Needs | Evidence |
|---|---|---|
| Page data | Engagement (50) + Access (1) | `EngagementApiController.cs:174-178` |
| Save | Engagement (50) + Edit (3) | `Details.cshtml:26-31`, `EngagementApiController.cs:839-843` |

Legacy never hides Save: `hiddenElement` returns false whenever `viewPermissions` is set (`seats-security-behavior.html:18-20`, `seats-admin-engagement-model.html:225, 841-844`). React hides it without Edit (defect B, backend still enforces).

## Load

GET `engagementApi/GetEngagementModelConfigViewModels?engagementId={id}` → `EngagementModelViewDto { appliedDto, buildingDto, nodeDto }` (`EngagementApiController.cs:174-322`, `ViewModels/Engagement/*.cs`).

- Unknown id returns `appliedDto` + empty node and **no** `buildingDto` (`:180-189`) → React shows "not found".
- Tree: root (level 1) → node types (level 2, background named `Background`, `:247-268`) → signal event types (level 3, `:270-295`).

## Model section

| Field | Rules | Evidence |
|---|---|---|
| Model Name | text, max 200, no required rule | `seats-admin-engagement-model.html:236-243` |
| Is Active | checkbox | `:244-251` |

## Model applied to

| Field | Rules | Evidence |
|---|---|---|
| Include | Select / Include / Exclude | `seats-admin-engagement-model-rule.html:54-62` |
| Category | Course, College (faculty), Programme, School, Type, Student Year (no College Year here) | `:63-76`, `seats-admin-engagement-model.html:261-264` |
| Value | dropdown for faculty / student type / student year; type-ahead (`?query=`, min length 0) for school / programme / course | `:82-99, 226-279, 401-425` |
| Add | all set, else `RequiredMessage`; same category + value is skipped | `:315-335` |
| Grid | Include/Exclude, category, `=`, value description, delete | `:106-146, 348-356` |
| Lookup error | "An error occurred when trying to obtain the values for the selected category." | `:357-359` |

Lookups: `GetStudentType`, `GetStudentYear`, `GetFacultiesInCurrentYear`, `GetSchoolsInCurrentYear`, `GetProgrammesInCurrentYear`, `GetCoursesInCurrentYear` (`EngagementApiController.cs:561-629`).

React shows an info notice for a duplicate rule instead of doing nothing (no inert button).

## Nodes

| Column | Rules | Evidence |
|---|---|---|
| Active checkbox | hidden on root | `seats-admin-engagement-node.html:66, 272-275` |
| Weight | `[-.0-9]`; hidden on root and on level-3 under a "presence" parent; disabled when inactive | `:84-89, 282-284` |
| Decay | `[0-9.]`; must be a number between 0.01 and 0.99 | `:96-97, 312-328` |
| Patience, Threshold | `[0-9]` | `:105, 113` |
| Min Z, Max Z | `[.0-9]` | `:121, 129` |
| Decay…Max Z | disabled on background or inactive; placeholder `default` when active | `:269-278` |
| Url, Key | max 200; enabled only on the active background node | `:137-148, 279-281` |
| Collapse | root and level 2 expand/collapse | `seats-admin-engagement-model.html:494-524, 1486-1513` |

Legacy clears an invalid decay on blur and toasts; React keeps the value, marks the field and blocks Save with the same message.
React also blocks non-numeric text like `1.2.3`, which legacy would post and the server would fail to bind.

## Save

- Client check: active background node needs a URL matching `/^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/` → "Please enter a valid URL." (`seats-admin-engagement-model.html:873-876, 1539-1560`).
- POST `engagementApi/SaveModel` body = whole `modelDto` (`:1532-1537`). React sends `appliedDto` (edited), `buildingDto` as loaded, `nodeDto.node` with edited fields as numbers or null.
- Server: active node without weight → 400 "The selected nodes should have an associated weight." (`EngagementApiController.cs:848-849`); shown from the server message.
- Success: legacy toasts `AlertSaveSucceededDefault` and goes back (`:1561-1565`); React returns to `/engagement`.
- Safe mode: blocked write shows the safe-mode notice.

## Built later (D-117)

Dataset building and Export profile set now live on the React page; see D-117 for the legacy rules they follow.

## Not built yet

| Legacy feature | Evidence | Why |
|---|---|---|
| Events range, interval size, extrapolate, Refresh; Total prevalence and Withdrawals % charts | `:415-493, 1237-1371`; POST `GetTotalPrevalence`, `GetSignalPrevalenceWithdrawals` | Charts + read-only POSTs not in the allow-list |
| Map To (level 3) | `seats-admin-engagement-node.html:70-79, 236-247, 329-333`; `EngagementApiController.cs:932-942, 956` | Options mix synapse ids with node ids — needs a runtime check (class D) |
| Run node | `seats-admin-engagement-node.html:150-159`; POST `RunNode` | Write |

React links to the legacy editor for these.

Shared-owner follow-ups: move the DTO types in `details/details-model.ts` to `src/types/engagement.ts`; add a success flash on the Configuration list.

## Checklist

- [x] Route `/engagement/{id}`, Engagement + Access gate, list link
- [x] Loading / error + Retry / not found
- [x] Model Name + Is Active
- [x] Model applied to: add, duplicate skip, delete, lookups
- [x] Node tree with legacy enable, weight and input rules
- [x] Decay + background URL validation
- [x] Save body, Engagement + Edit button gate, safe mode, server message
- [x] Dataset building: rules with College Year, withdrawal and assessment ranges, option lists, counts, Calculate (D-117)
- [x] Export profile set (queued server-side; safe mode blocks it)
- [ ] Charts, Map To, Run node (not built)
- [ ] Real Alpha data check (needs sign-in)
