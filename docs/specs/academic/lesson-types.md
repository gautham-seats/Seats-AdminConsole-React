# Lesson Types — source-derived contract

Scope: list and edit only, confirmed by Gautham. No create/delete. POST rejects non-positive IDs.

Sources: legacy `Views/LessonType/Index.cshtml`, `Views/LessonType/Details.cshtml`, `Scripts/controllers/lessonTypeDetailsController.js`, `Controllers/LessonTypeController.cs`, `Controllers/Api/LessonTypeApiController.cs`, `ViewModels/LessonType/LessonTypeViewModel.cs`; DTO and permission constants inspected in referenced `Seats.Trunk.Contracts.1.2.82499` assembly.

- GET `LessonTypeApi/`: array; client pagination, description ascending, no multiselect.
- GET `LessonTypeApi/{id}`: detail and server-provided checkout/scaling options. Existing positive ID only.
- POST `LessonTypeApi/`: complete camel-case DTO, including non-rendered properties. Success returns to list; failure preserves input. No automatic retry.
- Name/description disabled; GPS display-only. Server preserves GPS and description.
- Early/late/absence cutoffs required. All cutoff properties are Int32; no additional positive/range business constraint in the inspected legacy form. Optional blank numeric values require runtime verification of legacy serialization before release.
- Checkout is nullable boolean: null disabled, false optional, true mandatory. Scaling nullable integer uses server options.
- Permission item 23: Access=1, Edit=3, ConsecAttendance=103, CheckOutPolicy=132. Access gates reads; Edit gates saving. Checkout fields require CheckOutPolicy.
- Consecutive attendance visibility requires tenant `Attendance.ConsecutiveAttendanceUpdate`; the form additionally requires ConsecAttendance. Legacy list header/cell has additional client security binding.
- Scaling visibility requires tenant `Attendance_By_frequency` resolving to `PercentageAttendanceTypeEnum.ByDuration`.

Tenant flags (resolved 2026-09-15, D-051): the screens read the two flags from the legacy partial they replace (`LessonType/Index`, `LessonType/Details`), which LessonTypeController renders from the same tenant settings, as Devices does for its battery column (`src/shared/api/legacy-view.ts`). Routes `/resources/lesson-types` and `/resources/lesson-types/{id}` are live and the menu links to them.

Verification status: unit tests and an intercepted browser run pass; real Alpha data and optional-empty serialization still need a signed-in check.
