# Lesson Types — parity audit

**Summary:** 49 ✅ · 0 ❌ · 2 ⚠ (LB-060)

Audited 2026-09-15 against legacy `monolithic-seats-trunk-websites/Seats.Trunk.Admin` (Views/LessonType, `lessonTypeDetailsController.js`, `LessonTypeController.cs`, `LessonTypeApiController.cs`), specs (`lesson-type-index.md`, `lesson-type-details.md`, `lesson-types.md`), decisions **D-018**, **D-024**, **D-051** (grep "Lesson Types"), and **LB-060**. **D-052** is referenced in the build prompt but has no entry in `docs/decisions.md`.

React code reviewed: `src/features/academic/lesson-types/**`, `src/app/resources/lesson-types/**`.

Status key: **✅** matches legacy (or accepted D-051 deviation) · **❌** gap to fix · **⚠** documented legacy bug (do not copy).

---

## Access

| Legacy behaviour | React now | Status |
|---|---|---|
| Both screens require `LessonType` + `Access` (MVC partial + `GET api/LessonTypeApi/`) | `LessonTypeGate` + `ProfileProvider.can(LESSON_TYPE_ACCESS)` on list and edit routes | ✅ |
| Top menu "Lesson Type" item gated by `LessonType` + `Access` | `admin-menu.ts` `lesson-type` link → `/resources/lesson-types` with same permission | ✅ |
| Checkout list columns and edit fields need `LessonType` + `CheckOutPolicy` (ViewBag + KO `security` on th/td) | `profile.can(LESSON_TYPE_CHECKOUT)` hides checkout cutoff column, checkout select, and attendance-based-on-checkout column | ✅ |
| Consecutive list column and edit field need tenant `Attendance.ConsecutiveAttendanceUpdate` **and** `LessonType` + `ConsecAttendance` (ViewBag `@if` + KO `security` on th/td/div) | `tenant.consecutiveAttendanceUpdate && profile.can(LESSON_TYPE_CONSECUTIVE)` for column and checkbox | ✅ |
| Save button and `POST api/LessonTypeApi/` need `LessonType` + `Edit` | Save hidden without `LESSON_TYPE_EDIT`; inputs disabled when `!canEdit` (D-051 view-only — legacy left fields editable without Save) | ✅ |
| No create or delete flows | No add/delete routes or buttons | ✅ |

---

## Tenant flags

| Legacy behaviour | React now | Status |
|---|---|---|
| `Attendance_By_frequency` == `ByDuration` → show Attendance Scaling column (Index th `attendance-scaling-col`) and select (Details `#attendance-scaling`) | `fetchLessonTypeFlags` parses `#attendance-scaling-col` / `#attendance-scaling` from `GET LessonType/Index` or `Details` partial HTML | ✅ |
| `Attendance.ConsecutiveAttendanceUpdate` == true → show Consecutive column/field (Index th `is-consecutive-attendance-update-col`; Details `#lesson-type-consecutive-attendance-update`) | Parses `#is-consecutive-attendance-update-col` / `#lesson-type-consecutive-attendance-update` from same partials | ✅ |
| Checkout visibility is permission-only (not tenant-gated) | Same — `CheckOutPolicy` permission only | ✅ |
| Percentage Cutoff column/field always shown | Always in list and edit form | ✅ |

---

## List

| Legacy behaviour | React now | Status |
|---|---|---|
| Column order: Name, Description, Early, Late, Absence, [Checkout], Percentage, Is Absence Based On Start, [Is Attendance Based On Checkout], [Attendance Scaling], [Consecutive], Is Active | Same order in `LessonTypesScreen.tsx` `columns` memo | ✅ |
| Header labels from `GeneralResources` (Early Cut Off, Late Cut Off, …) | `useLessonTypeText` + `LESSON_TYPE_TEXT` fallbacks match spec labels | ✅ |
| `GET api/LessonTypeApi/`; client-side pagination | `fetchLessonTypes` → `useApiRead('lesson-types', …)` | ✅ |
| Initial sort: `description` ascending | `INITIAL_SORT` + applied before paging | ✅ |
| All `data-column` headers sortable (swgrid) | Every column header is a sort button with asc/desc toggle | ✅ |
| Default page size 100 | `LESSON_TYPE_PAGE_SIZE = 100` | ✅ |
| Pager shown when row count > 9 (from 10 rows) | `Pagination` when `rows.length >= LESSON_TYPE_PAGER_MIN_ROWS` (10) | ✅ |
| Page-size options 10, 15, 20, 50, 100, 200 | `LESSON_TYPE_PAGE_SIZES` matches `swgrid.js` footer | ✅ |
| No search box on index (swgrid search exists but Index has no filter UI) | No search control | ✅ |
| Booleans: check / times icons | `Flag` component with Check / X icons + aria-label Yes/No | ✅ |
| Checkout: null → Disabled, true → Mandatory, false → Optional | `checkoutKey` + pill text | ✅ |
| Scaling: 0/null → None; 1/2/3 → Enabled / Only If Absent / Only If Attended | `scalingKey` + pill text | ✅ |
| Row click → `#/LessonType/Details/{id}` | Row `onClick` + name link → `/resources/lesson-types/{id}` | ✅ |
| Empty: "There are no items to show." | `LESSON_TYPE_FALLBACK_ONLY.noItems` | ✅ |
| Loading state while grid loads | `DelayedLoading` until list **and** tenant flags succeed | ✅ |
| List GET failure: no legacy UI handling | `ErrorState` + Retry (spec improvement) | ✅ |
| Success toast after save → return to index (3.5 s) | `setLessonTypeFlash` on save; `LessonTypeNoticeBar` on list via `peekLessonTypeFlash` | ✅ |

---

## Edit

| Legacy behaviour | React now | Status |
|---|---|---|
| `GET api/LessonTypeApi/{id}` with lookup arrays for existing id | `fetchLessonType` + `parseLessonTypeView` | ✅ |
| Name and Description read-only (`enable:false`) | Disabled inputs with lock icon | ✅ |
| GPS display only: On (green) / Off (red); not saved from client | Read-only pill; `isGPSEnabled` preserved in POST body from loaded DTO | ✅ |
| Early, Late, Absence cutoffs required (KO `required`) | `REQUIRED_FIELDS` + `validateLessonType` | ✅ |
| Other numeric cutoffs optional | Checkout and Percentage not in `REQUIRED_FIELDS` | ✅ |
| Typed cutoffs must be whole Int32 (DTO constraint) | Client `wholeNumber` validation before POST (D-051 enhancement) | ✅ |
| Checkout select: caption `[Disabled]` for null; options 0=Optional, 1=Mandatory | `Select` with `NONE` / `'0'` / `'1'` mapping | ✅ |
| Checkout loaded value (LB-060): in legacy, true/false never matches option ids 0/1, so the select shows [Disabled] and saving clears the policy | React shows the real loaded value | ⚠ legacy bug, deliberately not copied |
| Attendance Scaling select when `attendanceByDuration`; caption `[None]` | Shown when `tenant.attendanceByDuration`; `NONE` for null/0 | ✅ |
| Consecutive checkbox when tenant + `ConsecAttendance` | `showConsecutive` gate | ✅ |
| Is Absence Based On Start, Is Active checkboxes | `ToggleRow` + `Checkbox` | ✅ |
| Hidden DTO fields (`globalId`, `isAbsenceBasedOnStartCutOff`, `isMandatory`) not rendered but remain in save payload | Included in `LessonTypeForm` / `toLessonTypePayload` | ✅ |
| 404: server message says "Room with id …" (LB-060) | User-facing `LESSON_TYPE_FALLBACK_ONLY.notFound` | ✅ |
| Cancel → `#/LessonType/Index` | Cancel link → `/resources/lesson-types` | ✅ |

---

## Save

| Legacy behaviour | React now | Status |
|---|---|---|
| `POST api/LessonTypeApi/` with full detail DTO (`ko.toJSON(detail)`) | `saveLessonType` → `toLessonTypePayload(form)` — all DTO keys, numeric fields as numbers | ✅ |
| Server keeps `isGPSEnabled` and `description` from DB | Same server rule; client still sends loaded values | ✅ |
| Success: toast 3.5 s → index | Flash notice + `router.push(LESSON_TYPES_ROUTE)` | ✅ |
| Failure: gray server `responseJSON.message` (5 s) | `toApiError` → `serverMessage` in notice bar | ✅ |
| Validation failure: "There are fields with input validation errors." (4 s) | Same resource key / duration | ✅ |
| Blank optional numeric cutoff → empty string → model bind 400 (LB-060) | Blank → `null` in JSON → same server 400 | ⚠ legacy bug |
| Safe mode blocks writes locally | `ApiError` kind `blocked` → safe-mode message | ✅ |
| Rejects `id <= 0` | Route only accepts positive ids; no create flow | ✅ |

---

## Unsaved changes

| Legacy behaviour | React now | Status |
|---|---|---|
| Legacy details: Save + Cancel only; no dirty indicator, no Discard, no Ctrl+S, Cancel navigates without prompt | React admin standard: draft vs loaded baseline, `FormStatusPill`, `SaveActions`, `useSaveShortcut`, Cancel confirm + `beforeunload` when dirty (D-051 enhancement) | ✅ |
| React admin standard: `FormStatusPill`, `SaveActions` (Discard + Save), Ctrl+S only with changes, leave guard | Shared `useLeaveGuard` covers browser unload and every in-app link (fixed 2026-09-15; was Cancel and tab close only) | ✅ |

---

## Notes (not ❌)

- **LB-060 ⚠** Blank optional cutoff still yields server 400 — preserved intentionally; needs signed-in Alpha check before changing behaviour.
- **LB-060 ⚠** Checkout select load on real data — mapping is fixed in code; Alpha runtime confirmation still outstanding.
- **D-051 ✅** View-only locks all inputs without Edit; legacy allowed typing without Save.
- **Runtime** Real Alpha data verification and optional-empty serialization remain **NOT RUN** per `lesson-types.md`.
- **UI (build prompt §3)** done 2026-09-15: Identity / Cut-offs / Check-out / Attendance rules cards, sticky summary with live cut-off timeline, min and % units in list and form, read-only hints. Table header keeps the brand fill used by every other Admin React table (`SettingsTable`).
- **Flags** (fixed 2026-09-15): a failed tenant-flag read no longer blocks the editor; it hides only scaling and consecutive update with a notice. Flag ids are matched regardless of quotes and spacing, with a real-markup test.
