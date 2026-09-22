# Legacy bugs

Legacy behaviour classified **B (defect)** or **C (security weakness)** into classes A–E (A quirk kept, B defect, C security weakness, D dead code, E data risk). None of these are reproduced in React.

## LB-001 · B · Loading modal stays open after fast responses

**Where:** `Scripts/softworks/swapp.js:216-268`, Bootstrap 3.3.0 (`Scripts/thirdParty/bootstrap.js:2`)

**What happens:** every jQuery request calls `$('#loadingModal').modal('show')` in `beforeSend` (`swapp.js:236-239`), and the last `complete` calls `modal('hide')` (`swapp.js:256-260`).

In Bootstrap 3.3.0 `show()` sets `isShown = true` straight away (`bootstrap.js:959`). It only adds the `in` class inside the backdrop's transition callback (`bootstrap.js:969-999`, `1086-1089`).

When the response arrives before that transition ends:

1. `hide()` sets `isShown = false` and removes `in` (`bootstrap.js:1011-1019`).
2. The pending show callback still runs afterwards and adds `in` back (`bootstrap.js:984-986`).
3. The modal is now visible while `isShown` is `false`, so every later `hide()` returns early (`bootstrap.js:1009`).

The popup stays stuck until the page reloads.

**Also:** request ids are built from the current time down to the millisecond (`swapp.js:223-235`). Two requests started in the same millisecond share an id, and `_.without` removes both on the first `complete` (`swapp.js:254`). That can hide the popup while a request is still running.

**React:** the shared `DelayedLoading` is state-driven. It appears after 400 ms and clears as soon as its `active` prop is false (`src/shared/ui/use-delayed-flag.ts`).

## LB-002 · C · Anti-forgery token is sent but never validated

**Where:** `Seats.Common/Seats.Common.BaseWebsite/Controllers/ApiControllerBase.cs:22`

**What happens:**

- The legacy client sends `RequestVerificationToken` on every request (`swapp.js:269`).
- The base API controller has the validation attribute commented out: `//[AntiForgeryValidate]`.
- Even if it were re-enabled, `AntiForgeryValidateAttribute` reads both halves of the token from the header rather than taking the cookie token from the cookie (`AntiForgeryValidateAttribute.cs:18-27`). The double-submit check therefore never involves the cookie.
- Identity heuristics are suppressed (`AntiForgeryExtension.cs:10`). Whether a token pair is still bound to the signed-in user is not verified.

**Impact:** state-changing Admin API calls have no working CSRF protection beyond the browser's same-origin rules.

**React:** sends the header for contract parity (D-003). This does not add protection. Needs a backend fix; reported, not worked around.

## LB-003 · B · User update checks the signed-in user's id, not the edited user's

**Where:** `Controllers/Api/UserApiController.cs:338`

`else if (UserId > 0 && …Edit)` uses `ApiControllerBase.UserId`, the admin's own claim, which is always above 0. The branch is really "Id is not 0 or Add is missing". A user with Edit but no Add who posts `id: 0` falls into the update path and fails on `GetById(0)`.

**React:** only offers Save for a new user with Users + Add (D-021). Needs a backend fix.

## LB-004 · B · Password messages disagree with the password rule

**Where:** `Scripts/softworks/swapp.js:2601-2618`, `GeneralResources.DoesntPassPasswordPolicy`

The client rule needs 10 characters, but the resource shown to the user says six. The user-name check `val.includes(userName)` also fails every password while User Name is still empty.

**React:** shows the ten-character message and ignores the user-name check until a user name exists.

## LB-005 · C · Save errors show raw server exception text

**Where:** `userDetailsController.js:193-195`, `UserApiController.cs:386-387`

A 500 returns `InternalServerError(new Exception(ex.Message))` and the page shows `responseJSON.message`, exposing internal exception details to the browser.

**React:** shows the server message for 4xx (as legacy) and the generic `AlertSaveErrorDefault` for 5xx (`src/features/users/save-error.ts`).

## LB-006 · B · Associated student check almost never runs

**Where:** `userDetailsController.js:536-544`

`autoCompleteFilled` only runs when `associatedStudentId == 0`, but a cleared or unset student is `null`, so typed text without a picked student is saved with no id. The persona validation loop also runs one index past the end (`:130`, already noted in the spec).

**React:** typed text without a chosen student is a validation error; persona checks use a correct loop.

## LB-007 · B · Accessibility statement name is encoded again on every save

**Where:** `seats-admin-setting-color.html:396-397`

Save replaces the name with `$('<div>').text(name).html()` and stores it. The next load shows the encoded text (`&amp;`), and the next save encodes it again (`&amp;amp;`).

**React:** the name is decoded for display and encoded once when saving, so the stored value stays the same as a first legacy save.

## LB-008 · B · Logo Clear link is invisible and does not clear the file

**Where:** `seats-admin-setting-color.html:43-45, 166-170, 448-451`

The Clear link holds only a `.sr-only` span styled `display: None`, so nothing shows. Its handler sets `fileupload.files = null`, which browsers ignore, so the picked file still uploads on Save.

**React:** "Remove selected image" appears once an image is picked and really drops it. Removing a saved logo was never possible in legacy and is not added.

## LB-009 · B · Missing setting breaks or corrupts save

**Where:** `seats-admin-setting-color.html:260, 382, 399`

The help URL property is declared as `_onlineHelpUrltype` (typo), so if `ONLINE_HELP_URL` is not returned, Save throws and does nothing. Other missing settings are posted with an empty `id` and `key`.

**React:** fields stay editable. An amber note says when settings were not returned, and Save refuses changes to those settings with a clear message instead of sending them. Only loaded settings are sent. Seen locally on 2026-09-14: `GetSettingByKeys` returns `null`.

## LB-010 · B · Upload failures other than 406/415 are silent

**Where:** `seats-admin-setting-color.html:407-418`

Any other upload status leaves the page with no message and nothing saved.

**React:** shows `AlertSaveErrorDefault`.

## LB-011 · B · Device grid loads twice on open

**Where:** `Scripts/controllers/deviceIndexController.js:354-355`

`grid.loadGrid()` is followed by `loadGrid()`, so every visit sends two `GetDevices` requests.

**React:** one request on open.

## LB-012 · B · Devices page opens for users who cannot see devices

**Where:** `Controllers/DeviceController.cs:19-21`, `Controllers/Api/DeviceApiController.cs:50-63`

The page allows Devices, Rooms or ReadingsReport access, but the grid API needs Devices, so Rooms-only users get an empty list that looks like "no devices".

**React:** the route needs Devices + Access and shows a no-access message otherwise.

## LB-013 · B · Export uses filter values that were never applied

**Where:** `Scripts/controllers/deviceIndexController.js:275-296`

Export reads the current dropdowns, battery inputs and typed search, not what the grid was last searched with, so the report can differ from the list on screen.

**React:** exports the applied search, filters and sort.

## LB-014 · B · Device index code hygiene

**Where:** `deviceIndexController.js:111-165` (battery clamp subscribed twice), `:25, :29` (`console.log`), `Views/Device/Index.cshtml:115-116` (duplicate `description-col` id)

**React:** one clamp function, no debug logs, no element ids on headers.

## LB-015 · B · Device details room search and grid quirks

**Where:** `swapp.js:819-823` (selected room text uses `description`, which is often empty), `deviceDetailsController.js:28-48` (room lookup failure is silent), `Views/Device/Details.cshtml:161-174` (grid paging and sort options are passed but no grid is created)

**React:** shows the room description or its name, reports a failed room lookup, and renders a plain linked rooms table with no dead sort or paging.

## LB-016 · C · Developer key list sends every user's key to the browser

**Where:** `Controllers/Api/DeveloperKeyApiController.cs:28-41`, `Seats.Service.Security.Schema.UserDeveloperKeyResponse`

`GET api/DeveloperKeyApi` returns `UserDeveloperKeyResponse` items, which include a `DeveloperKey` property, straight to the page. The grid never shows it (`DeveloperKey/Index.cshtml:58-62`), but anyone with the dashboard right can read it in the network response. Whether the service fills it with the real key or a masked value was not checked at runtime.

**React:** the parser copies only id, userId, userName, fullName and expiryDate; the key is never kept or rendered. Needs a backend fix to stop sending it.

## LB-017 · B · Contact Group list permission and sort keys

**Where:** `Views/ContactGroup/Index.cshtml:39, 53-56`

- Delete is gated by Devices + Delete, while the API demands ContactGroup + Delete.
- Group Email Address, Send Emails To and Function sort by `isActive`, a field the rows do not have, so clicking them does not sort. Associated To has `odata-column`, so it is not sortable at all. Both Function headers share `id="function-col"`.

**React:** Delete uses ContactGroup + Delete; every column sorts by its own field.

## LB-018 · B · Client-side grid search quirks

**Where:** `Scripts/softworks/swgrid.js:111-136`, `Views/Shared/_ListSearchNavBar.cshtml`

- The search box is bound with `value:`, so leaving the box applies the filter without resetting the page; the list can show an empty later page.
- Every text and number field except `id` is searched (swgrid.js:120-135), so rows can match on values the user cannot see.

**React:** since the 2026-09-15 parity pass the Users-area lists copy legacy: filter on Enter and on blur when changed, no trim, every text/number field except `id`.

## LB-063 · B · Room list Building column sorts by room name

Renumbered from a second LB-016 on 2026-09-16 (the id was already taken by the developer-key entry above). `src/types/devices.ts:81` still carries a `(LB-016)` comment that points at this entry.

**Where:** `Views/Room/Index.cshtml:50` (`data-column="name"` on Building), `:18-19` (duplicate `readings-report-link` id)

**React:** Building header is not sortable until a real server sort key is confirmed; links have unique ids.

## LB-019 · B · Security level dialog quirks

**Where:** `Scripts/controllers/userSecurityLevelPermissionDetailsController.js:37-66, 144-169`, `Scripts/controllers/userDetailsController.js:411-414`, `Scripts/softworks/swapp.js:776-780`

- `var userId` inside `init` shadows the module variable, so added rows are sent with no `userId`.
- The temporary id counter restarts at 0 each time the dialog opens, so a second visit can create a second row with id -1; deleting one then removes the wrong row.
- The level GET is sent even when the applied rows are about to be shown instead.
- Editing the search text keeps the previously picked id, so Add can add a level that no longer matches the text.

**React:** rows carry the user id, temporary ids continue below the lowest existing id, applied rows are shown without a request, and typing clears the picked level.

## LB-020 · C · Password endpoints return raw exception details

**Where:** `Controllers/Api/UserApiController.cs:541-545, 571-575`, `Scripts/controllers/userDetailsController.js:154-170, 335-356`

`SetPassword` and `SendResetPasswordLink` return `InternalServerError(ex)` on any unexpected failure, which serialises the exception to the browser. Legacy also handles success inside the jQuery `error` callback when the empty 200 response fails JSON parsing.

**React:** only a 400 message is shown; other failures show the generic text. Success is any 2xx. Needs a backend fix for the exception body.

## LB-040 · C · Graph API secret key typed in plain text

**Where:** `seats-admin-graphapi.html:136-151`, `GraphApiController.cs:131-135`

The key input is a normal text field, so a new secret is shown on screen while typed and after saving. Only the last saved row's result is checked, so tenant, client or key failures are ignored.

**React:** password field with an explicit Show key button; still one PUT as legacy.

## LB-041 · B · Contacts: every error says the e-mail already exists

**Where:** `seats-admin-contact.html:469-479`

Load, create, update and delete failures all show `TheMailAlreadyExists`, discarding the server message. After a save the component forces page size 100 while the pager keeps the user's choice, and the pager is hidden unless there are more than 100 contacts.

**React:** shows the server message (400) or the generic save/delete error, keeps the chosen page size and shows the pager from 10 rows. The dialog stays open when a save fails.

## LB-042 · B · File Template: .cshtml files rejected and broken code blocks

**Where:** `seats-website-file-template.html:586-589, 754-768, 804-816`

- When the browser gives no MIME type (usual for `.cshtml`), the whole file name is compared with the MIME list, so the file is refused.
- A template without `<title>` fills the Title field with the whole document.
- Saving turns `<pre>` into `<<div class="content_pre">`, and loading restores only the first code block.
- The title is inserted into the HTML without escaping.

**React:** checks the extension when the type is empty, leaves Title empty when there is none, converts every code block both ways and escapes `<` and `>` in the title.

## LB-043 · C · File Template content is compiled as Razor on the server

**Where:** `FileTemplateApiController.cs:154-188`

Validate and Save compile `contentFile` and the subject with Razor, so any user with File Template Edit can run server-side code through a template. Not changed by the UI; reported for backend review.

## LB-044 · B · Resources: stale page and lost text

**Where:** `seats-admin-resource.html:473-477, 511-518, 567-573`

Changing the type or clearing the search keeps the old page index; the edit dialog closes before the save result arrives, so text is lost on failure; a 500 shows an empty error toast.

**React:** type and search go back to page 1, the dialog waits for the result and shows the error inside it.

## LB-045 · B · Custom Fields: permissions, delete and paging defects

**Where:** `seats-admin-customfield.html:895-900, 1148-1195, 1221-1300`; `CustomFieldGroupApiController.cs`

- PUT, POST and DELETE only require Access on the server (C); Add, Edit and Delete are client checks by action name.
- Delete, then Cancel, then Save sends a DELETE.
- The visible-field limit counter only tracks existing unchecked fields, so new rows skip the limit dialog.
- The name pattern drops the hyphen and names are HTML-encoded on the client and again on the server.
- One validation failure repeats messages on every later row.
- The client sends a 0-based page that the server maps 0 to 1, so pages 1 and 2 both request page 1 (kept as legacy; needs backend confirmation).

**React:** separate Save and Delete flows, the limit check counts any newly visible field, hyphen allowed, names decoded for editing and sent once, each problem reported once.

## LB-046 · B · Activity Types: approval and attachment gates differ

**Where:** `Views/ScheduledActivityType/Index.cshtml:6-7`, `Details.cshtml:98-121`, `ScheduledActivityTypeApiController.cs:85-110`

The list uses the user's permission 34 for Requires Approval while details uses a subscription check; Mandatory Attachments is hidden in the browser but not checked on save; the server accepts Add or Edit for both create and update.

**React:** uses the user's permissions for both and reports the server gaps here.

## LB-021 · B · Contact Group details quirks

**Where:** `Scripts/controllers/contactGroupDetailsController.js:123-156, 223-239, 336-345`, `Views/ContactGroup/Details.cshtml:50-51, 177, 212`, `Controllers/Api/ContactGroupApiController.cs:90-110, 122-129`

- The members-or-email check tests `self.detail().groupEmailAddress`, an observable function, so it is always true; only the server rejects a group with neither.
- The GET never fills `functionName`, so Edit Function opens with an empty name and saving it unchanged posts an empty name.
- Loaded members have no `displayName`, so their Full Name column is blank until the page is reloaded after adding users.
- The user search template renders `description`, which `GetUsersByCriteria` never sets, so results can show as empty rows (not checked at runtime).
- `entityAvailables` contains a "None" item next to the select's own "[None]" caption.
- Deleting members is gated by Users + Delete instead of a Contact Group right.

- Editing the association text keeps the old picked id (swapp.js:776-780), so a stale entity can be saved under new text.
- A failed `GET UserApi/{id}` when adding a member shows nothing (contactGroupDetailsController.js:124-153).
- Editing the member search text keeps the old `selectedUserId` (swapp.js:776-780), so Add inserts the previously picked user. React clears the pick and disables Add.
- `validateEmail` throws on a member with a null email address (contactGroupDetailsController.js:116-122), so the Send Emails To options stop updating. React skips members without a valid email.

**React:** since the 2026-09-15 parity pass the members-or-email rule is left to the server as legacy; the function name comes from the list, Full Name falls back to `fullName`, results show the user name, None appears once, member editing needs ContactGroup + Edit, editing the association text clears the pick, a failed member fetch shows an error toast, and an empty member table shows "There are no items to show.".

## LB-022 · B · Access Profile details quirks

**Where:** `Views/AccessProfile/Details.cshtml:10-18, 67-74, 148-159`, `Scripts/controllers/accessProfileDetailsController.js:277, 506-523`, `bower_components/seats-admin-security-event/*.html` (`_filter`)

- Save is "disabled" with a `disabled` attribute on an `<a>`, which does not stop the click.
- The Event, Case and Workflow tabs only follow the flags returned on load, so ticking a visibility permission does not show its tab until the profile is saved and reopened.
- The unnamed root node renders an expand button with no label.
- The three visibility components build a `RegExp` from the search text, so characters such as `(` throw and break filtering.
- All three visibility lists are requested even when their tabs are hidden.

**React:** Save is a real button and search uses plain text matching. Since the 2026-09-15 parity pass the root node shows its expand button and all three visibility lists load, as legacy. The tab flags still come from the load, as legacy.

## LB-075 · B · Readings reports quirks

**Where:** `readingsReportController.js:66-78` (export sends the typed, unsubmitted search text), `SuspiciousReadingsReport/Index.cshtml:71` (initial sort `date` is not a column), `:34-42` (hard-coded English headers), `suspiciousReadingsReportController.js:49-65` (dead export handlers with no export API)

**React:** export uses the applied search; Suspicious keeps the `date` contract but shows no active sort arrow; headers are fallback text; no dead export.

## LB-050 · B · Activity Log quirks

**Where:** `bower_components/seats-admin-audit/seats-admin-audit.html:479-482, 555-609`, `bower_components/seats-website-export/seats-website-export.html:47, 150-152`, `Controllers/Api/AuditController.cs:162-166`, `Scripts/controllers/developerKeyGeneratorController.js:44-80`, `Views/Login/_DeveloperKeyGenerator.cshtml:24,43`

- Changing a filter keeps the old page number, so the wrong page is requested while the pager shows page 1.
- The error toast writes `toastMessage` instead of `_toastMessage`, so load errors show an empty toast.
- Enter in the user box calls `_search()` without an event and throws.
- The export dialog renders an empty radio row because `hiddenSelectedItem === 0` is never true.
- GetAudit returns an empty 200 page when the audit service fails, so the client cannot tell an error from no data.
- Detail links open any stored `url` in a new tab without `noopener` (class C part: a `javascript:` value would run).
- Generator: the modal binds the expiry label from the previous open before the new request returns, and `@GeneralResources.New` does not exist, so the button reads " Key"; `CopyToClipboard` resolves to the raw key name.

**React:** filters return to page 0, load errors show Retry, Enter picks the highlighted user, only http(s) links render with `noopener noreferrer`, the generator waits for its own load and uses readable labels.

## LB-076 · B · Rollback button never reaches the server

**Where:** `Views/Rollback/Index.cshtml:22-26`, `Views/Shared/_RollbackConfirmationPartial.cshtml`, `swgrid.js:420-460`, `RollbackApiController.cs:114-130`

Confirm calls the grid's `confirmDelete`, which sends `DELETE api/RollbackApi` with no ids (rows are not selectable); the controller has no Delete action. The POST action only rolls back when `Id == 0` and then dereferences a null result for any other id.

**React:** read-only list. Needs a product/backend decision before a Rollback action is added.

## LB-051 · B · Job Schedule list and details quirks

**Where:** `Views/JobSchedule/Index.cshtml:44,58`, `Views/JobSchedule/Details.cshtml`, `jobScheduleDetailsController.js`

- Initial sort column `JobName` is not a row field; the Type header sorts by Enabled.
- A 5-part numeric expression jquery-cron cannot place (for example `0 4 * 1 *`) makes the widget throw.
- `GetBuildingOptions` and `GetRoomOptions` demand Reports Access instead of Job Schedule Access (C: reported, not changed).
- The recipients e-mail regex contains `{1, 3}` (with a space), so bracketed IP addresses never match (`jobScheduleDetailsController.js:507`). React uses `{1,3}`.
- An hourly expression such as `0 * * * *` passes the controller's `valid_cron` test (`jobScheduleDetailsController.js:177-187`), so legacy opens the simple builder. jquery-cron dropped the minute and hour periods (`jquery-cron.js:146-147`) but kept their parsers (`:163-164`), so the widget falls back to the first period, Day. Touching any control then fires `onChange` and silently rewrites an hourly job to daily. React opens these in Advance and locks it, so the expression is never replaced.

**React:** keeps the server order, sorts Type by type name, clears a lookup id when its text is cleared (legacy typeahead behaviour not yet checked at runtime), and opens such expressions in Advance.

## LB-060 · B · Lesson Type quirks

**Where:** `Views/LessonType/Index.cshtml:36,46`, `Views/LessonType/Details.cshtml:17,38,50,89-94`, `Controllers/Api/LessonTypeApiController.cs:71`

- Two index headers share `id="absence-cutoff-lesson-type-col"`; the Early Cut Off input reuses `id="lesson-type-name"` and Save has two ids.
- Not found returns "Room with id: … was not found".
- The checkout select binds option ids 0/1 to a nullable boolean; KO may not match a loaded true/false and could reset the value to Disabled on open (needs a runtime check on Alpha before relying on it).
- A cleared optional cutoff posts an empty string and fails model binding with a generic 400.
- `swgrid.js:752` hides the whole `<thead>` when the list is empty, so the empty grid has no column headers.
- `genericIndexController.js:17-18` defaults `isSelectable` to true, so the index renders a row-checkbox column although the screen has no Delete or any other selection action (`Index.cshtml:14-17` is an empty pill bar).
- `swgrid.js:335-360` client sort does not reset `currentPageIndex`, so sorting from page 3 stays on page 3 of a different ordering; its comparator never returns 0, so equal rows reorder on every sort.
- `swapp.js:506-526` attaches the special-character validator to every observable on the detail, including `name` and `description`, which `LessonTypeApiController.cs:90-91` overwrites from the database anyway.
- `Details.cshtml:50` renders the Early Cut Off input with `type="number"` but no `min`, and `lessonTypeDetailsController.js:37-52` only checks required, so a negative cut-off posts happily.

**React:** unique ids, a correct not-found message, explicit null/true/false → checkout select mapping (Alpha runtime check still open), cutoffs checked as whole numbers before posting, and unsaved-changes UX (pill, Discard, Ctrl+S, leave guard) per D-051 — not copied from legacy.

## LB-052 · B · Student deletion screens quirks

**Where:** `Views/Student/Index.cshtml:59-66`, `Views/StudentDelete/index.cshtml`, `StudentDeleteApiController.cs`

- Manual Student Deletion loads with `studentRecycleBinController`, and its initial `sortCol` is `student`, a column the grid does not have.
- `GetStudents` can return `totalRowCount: 0` with items, which hides the legacy pager; React counts the rows it received.
- The single DELETE routes (`GetStudents`, `GetStudentsConfirm`, `GetStudentsInRecycleBin`) are unused by the UI; only the bulk POST routes are called.
- The queue's search is filtered on the server but documented as client side in the view options.

**React:** same requests, a total that never shows fewer than the loaded rows, one controller per screen.

## LB-061 · B/C · Users area parity pass (2026-09-15): legacy defects kept fixed

**Where:** `Scripts/controllers/User*/userDetailsController.js`, `userSecurityLevelPermissionDetailsController.js`, `Scripts/softworks/swapp.js`, `swgrid.js`, `DeveloperKeyApiController.cs`, `developerKeyGeneratorController.js`, `seats-admin-audit.html`

- User save, reset-link, set-password and developer-key errors show `responseJSON.message` for any status, 5xx included (userDetailsController.js:160-170, :195, :342-352; UserApiController.cs:621,635). React hides 5xx text (LB-005 rule).
- Reset link: `$.parseJSON(e.responseText)` runs outside try (userDetailsController.js:165), so a non-JSON error shows nothing. React shows "Failed to send password reset link.".
- Associated student keeps the old `associatedStudentId` after the text is edited (swapp.js:776-781, userDetailsController.js:536-544); the security-level lookup does the same with `selectedSecurityLevelId`. React clears the pick and requires a new one (LB-006).
- `DoesntPassPasswordPolicy` says "six characters" but `strongPassword` needs ten (swapp.js:2601-2618, Details.cshtml:398). React says "ten".
- Security level dialog restarts new-row ids at 0 on every open (userSecurityLevelPermissionDetailsController.js:36, :57-60), so Delete can remove the wrong row; Apply works before the GET finishes and saves an empty list (Index.cshtml:9). React uses lowest id - 1 and disables Apply until loaded.
- A delete 400 with an empty body throws in `JSON.parse` and shows nothing (swgrid.js:445). React shows the warning with the delete-error text.
- `searchFilter` is appended unencoded (swgrid.js:668), so `&` or `#` breaks the query. React URL-encodes it.
- Typeahead searches append `query=` unencoded (swapp.js:801), so `&`, `#` or `+` break student and security-level searches. React encodes it.
- The password rule checks `val.includes(userName)` (swapp.js:2595); once User Name is blank every password contains `''` and fails. React skips the check while User Name is empty.
- Users-area forms have no unsaved-changes warning in legacy (no `beforeunload` in the details controllers). React adds one on User details (via `SaveActions`), Access Profile and Contact Group details (`useLeaveGuard`), matching the Settings forms; recorded as a deliberate improvement, not parity.
- Developer keys: the grid sends a 0-based page index and the API turns 0 into 1 (swgrid.js:656, DeveloperKeyApiController.cs:31), so pages 1 and 2 match and the last page is unreachable. React sends pageIndex + 1.
- Audit detail links open any stored url without `noopener` (seats-admin-audit.html:235, :483-486). React allows only http(s) with `rel="noopener noreferrer"`.
- Not ported (dead code): user save "partial success" — the server only returns empty `Ok()` (UserApiController.cs:434), `self.id` does not exist (userDetailsController.js:186), message never passed (Details.cshtml:382-399).
- Not ported (dead code): Audit export GDPR warning — `enabledGdprExportMessage` is never set in Admin.

**React:** the fixes above; everything else on the 10 Users screens copies legacy behaviour, timings and texts.

## LB-062 · B · Access Profile screens quirks (2026-09-15 parity pass)

**Where:** `Views/AccessProfile/Details.cshtml:103-132`, `Views/AccessProfile/Index.cshtml:76`, `Scripts/controllers/accessProfileDetailsController.js`, `Scripts/softworks/swgrid.js`, `Controllers/Api/AccessProfileApiController.cs`

- Two tab panes share `id="events"` (Details.cshtml:103-132). React has one Event Visibility pane.
- A load error other than 401 leaves the page hidden with no message (accessProfileDetailsController.js:462); a failed list load shows nothing (swgrid.js:693-720). React shows an error with Refresh.
- `disabledSave` blocks Save until hidden tab components respond (accessProfileDetailsController.js:277, :506-523). React enables Save and saves missing lists as `[]`.
- Landing page error (accessProfileDetailsController.js:145) and restricted-row message (Index.cshtml:76) are hard-coded English.
- The Event header checkbox compares against the number of general groups, not rows (seats-admin-security-event.html:373), so it can be ticked with one row unselected. React counts rows.
- Details/Views `visible:` and `security:` share one element (Details.cshtml:10; swapp.js:2043-2045), so Copy Profile shows Save to users without Add and the save gets a 401. React keeps Save hidden.
- Visibility tab load failures show a toast and an empty list (seats-admin-security-event.html:399-402, case/workflow :209-212). React shows an inline error with Refresh.
- Empty Case History / Events headings show until the first search (seats-admin-security-event.html:143, :193, :366). React hides empty sections.
- Server-side, report only: creating a profile updates workflows with id 0 instead of the new id (AccessProfileApiController.cs:287-288).

**React:** 401 shows "not authorised" (no forced login), unknown ids open a blank form, everything else copies legacy.

## LB-064 · B · Suspicious Readings Report is titled "Readings Report"

**Where:** `Views/SuspiciousReadingsReport/Index.cshtml:4`

`<title>@GeneralResources.ReadingsReport - SEAtS</title>` — the same resource the Readings Report view uses (`Views/ReadingsReport/Index.cshtml:4`). The browser tab and the page name say the wrong screen; the rest of the view hard-codes "Suspicious Readings Report" in English (`:34-42`, `:71`).

**React:** the Suspicious screen is titled with its own name (`DEVICES_FALLBACK_ONLY.suspiciousReadingsReport`).

## LB-065 · B · A failed device list leaves the Readings Report blank

**Where:** `Scripts/controllers/readingsReportController.js:101-109`

`$.getJSON(apiController + '/GetDevices', …)` has no failure branch, and `grid.bindGrid({ querystringParams: … })` is called **inside** its success callback. If `GetDevices` fails (or returns non-JSON), the grid is never bound: no rows, no headers wired, no message — the page simply stays empty. The rows were already fetched by the earlier `grid.loadGrid({ bind: false })`, so the data is there and never shown. The Suspicious controller does not have this bug: its `bindGrid` is at the end of `init` (`suspiciousReadingsReportController.js:134-137`).

**React:** the grid and the device dropdown load independently; a failed device list shows an inline error with Refresh next to the Device filter and the table still renders.

## LB-066 · B · Room typeahead query is not URL-encoded

**Where:** `Scripts/softworks/swapp.js:795-812`

The typeahead source builds `url + "query=" + query` with the raw text (`:801`). A room name containing `&`, `#` or `+` splits the query string, truncates at the fragment, or arrives with the `+` read as a space, so `GET api/roomApi/GetRoomsByCriteria` is sent the wrong term and returns the wrong rooms. Same defect as the student and security-level lookups in LB-061.

**React:** the room search term is URL-encoded by the shared API client.

## LB-067 · B · Device save failure alerts say "undefined", or nothing at all

**Where:** `Scripts/controllers/deviceDetailsController.js:100-102`, `Controllers/Api/DeviceApiController.cs:180`

The error callback shows `e.responseJSON.message` (lower-case `m`). The server returns `Request.CreateErrorResponse(HttpStatusCode.BadRequest, GeneralResources.AlertSaveErrorDefault)`, which serialises as `{"Message": "…"}`, so the alert reads `undefined`. Worse, when the body is not JSON at all (a 500 HTML error page, an IIS page, a dropped connection), `responseJSON` is `undefined`, reading `.message` throws inside the error callback, and the user sees no message whatsoever.

**React:** the save error reads the server message case-insensitively, falls back to `AlertSaveErrorDefault`, and never throws on a non-JSON body. 5xx text stays hidden per LB-005.

## LB-068 · B · Device details Add-room button keeps a stale room

**Where:** `Views/Device/Details.cshtml:81`, `Scripts/softworks/swapp.js:776-780`

The Add button is only disabled while `$root.selectedRoomId()` is null. The typeahead clears `propertyValue` **only when the box is emptied** (`swapp.js:776-780`: `if ($(this).val() === "") propertyValue(null)`). So: pick "Room A", then type "Room B" without choosing it from the list — the id is still Room A's, the button is still armed, and Add links Room A. Same family as the stale lookups in LB-019 and LB-021.

**React:** editing the search text clears the picked room id and disables Add until a room is chosen from the list again.

## LB-069 · B · Linked-rooms table never sorts or pages

**Where:** `Views/Device/Details.cshtml:167-173`

The view passes `gridContainer`, `isSelectable`, `isMultiSelectable`, `paginationSide: 'client'`, `pageSize: 15`, `initialSortColumn: 'externalCode'`, `initialSortDirection: 'asc'` to `deviceDetailsController.init`, which never reads any of them — no `swgrid` is constructed on this screen. The linked-rooms table is a plain knockout `foreach`, so the headers do nothing and a device with more than 15 rooms shows all of them with no pager. Recorded narrowly in LB-015; this entry names the dead options.

**React:** a plain linked-rooms table with no dead sort or paging affordances.

## LB-070 · B · The special-character rule is attached to every observable, visible or not

**Where:** `Scripts/softworks/swapp.js:506-526`, `Scripts/softworks/swapp.js:2641-2647`

`handleSaveEvent` walks **every** property of the view model and extends every `ko.observable` with `customValidatorForSpecialCharacters` unless it already opted out. The rule is `!(/[<>]/.test(val))` with the message "Special characters are not allowed .". Server-only and hidden fields (ids, urls, flags, names returned by the GET) are observables too, so a `<` or `>` that arrived **from the server** in a field the user cannot see fails validation: Save is blocked and the validation message is attached to a control that is not on screen. The user gets the generic "fields with input validation" alert and no way to find the offending field.

**React:** the rule is applied to the fields the user can actually edit; values loaded from the server are not re-validated against it.

## LB-071 · B · Device Save has no double-submit guard

**Where:** `Views/Device/Details.cshtml:10,15`

Both Save affordances are `<a … data-bind="click:save">` anchors with no pending state, no `disable` binding and no in-flight flag in `deviceDetailsController.save`. A double click sends two `POST api/DeviceApi/` requests, so the audit log gets two entries and, for a new device, two devices can be created.

**React:** Save is a real `<button>` that disables itself while the request is in flight (write rule: one request in flight per button).

## LB-072 · B · Device save failure uses the neutral alert style

**Where:** `Scripts/controllers/deviceDetailsController.js:100-102`

The failure path calls `swAlert.showGray(...)` — the same neutral grey style legacy uses for "report processing" notices — so a failed save looks like an informational message rather than an error. `swAlert.showWarning` / `showSaveError` exist and are used elsewhere.

**React:** save failures use the error tone.

## LB-073 · B · Sorting a grid does not reset the page index

**Where:** `Scripts/softworks/swgrid.js:335-360`

`sortTable` sets `currentColumn` and `sortType` and calls `reLoadGrid()` without touching `currentPageIndex`. Sort from page 5 and you land on page 5 of a completely different ordering — the rows you were looking at are gone and the pager still says 5. (`searchTrigger` at `:369-374` does reset the index; sorting was never given the same treatment.)

**React:** every sort change returns to page 1 (D-070).

## LB-074 · B · The delete success alert never closes; the 2500 ms figure is dead code

**Where:** `Scripts/softworks/swgrid.js:451-457`, `Scripts/softworks/swgrid.js:434-440`

The live path is `.done(…)` → `swAlert.showDeleteSuccess()` with **no duration**, so the success alert stays on screen until the user dismisses it or the page reloads.

The 2500 ms that the rest of the codebase quotes comes from `.error(function (e) { if (e.status === 200) { … swAlert.showDeleteSuccess(2500); } … })` at `:434-440`. jQuery never invokes the error callback after a 200, so that branch is unreachable dead code — it appears to be a leftover from a time when the empty 200 body failed JSON parsing (`dataType: 'json'`). Do not cite it as legacy timing.

**React:** the delete success toast auto-dismisses after 2500 ms (D-075), because an alert that never closes is worse than a slightly different duration.

## LB-077 · B · Contacts column sorting does nothing

`bower_components/seats-admin-contact/seats-admin-contact.html:223` wires the grid's `on-sort-change` to `_onSortChange` (`:446-450`), which sets the page back to 1 and calls `_getRequest()`. `_getRequest` (`:415-424`) sends only `{ page, pageSize }` — no sort field, no direction — and nothing sorts the rows in the browser either.

So clicking Name or Email in the legacy Contacts grid re-fetches the same unsorted first page. The headers look sortable and are not.

**React:** the Contacts columns stay unsortable (D-103). Copying the headers would advertise a feature that has never worked; adding real sorting would need a `ContactApi` contract change, which is a backend decision, not a migration one.

## RB-001 · React regression · Table loader fought the scrollbar

**Where:** `src/shared/ui/DelayedLoading.tsx` (measuring version), reported on `/resources/devices`.

`useVisibleWidthInTable` put a `ResizeObserver` on the table's scroll container and set the loader's
width from `clientWidth`. While a list loaded, the content height changed, so the vertical scrollbar
appeared and disappeared — each toggle changed `clientWidth` by roughly 15px, which fired the
observer, resized the loader, shifted the height again and toggled the scrollbar back. Both
scrollbars flickered continuously for as long as the load ran.

**Fix:** no measuring at all. `DelayedLoading` takes `surface="table"` and pins itself with
`sticky left-0 w-[100cqw]` against the scroller's container query, which every table scroller already
declares. Reading nothing means nothing to feed back.

## RB-002 · React regression · White strip beside the pinned Description column

**Where:** `src/features/devices/index/DevicesTable.tsx`.

The checkbox column was declared `width: 44px` and the Description column was pinned at a hard-coded
`left: 44px`. The table is `w-full` with **automatic** layout, where a cell width is only a
preference: the browser shares spare width across every column, so the checkbox column rendered wider
than 44px. Description stayed frozen at 44px, leaving an uncovered strip that the scrolling rows
passed through — visible as a thin white gap that stood still while everything else moved.

**Fix:** `useStickyOffset` measures the checkbox cell and the Description column follows that width.
Reading a width cannot change it, so unlike RB-001 there is no feedback loop.

## RB-003 · React regression · Two scrollbars fighting on an empty table

**Where:** every table scroller (`DevicesTable`, `RoomsTable`, `ReportTable`, `UsersTable`,
`ListTable`, `SettingsTable`, `LessonTypesScreen`). Reported on the Readings Report with no rows.

The scroll container was permanently `overflow-auto`, so it kept scrollbars even when the table held
no rows at all — only a header and an empty-state block. That is where the flicker came from: the
vertical scrollbar appearing takes about 15px of **width**, which pushes the header row past the
container and brings in the horizontal scrollbar; the horizontal one takes about 15px of **height**,
which pushes the content past the container and re-triggers the vertical one. Each scrollbar creates
the condition for the other, so the pair oscillates forever. Classic dueling scrollbars, and it was
worst when empty because the content sat exactly on the boundary.

**Fix:** scrolling is now switched off unless rows are actually on screen — `overflow-auto` only when
the status is success and the row count is above zero, `overflow-hidden` for loading, error and empty.
With nothing to scroll there is no scrollbar to trigger the other one, and once real rows arrive the
scrollbars appear normally and only on the axis that genuinely overflows.

Distinct from RB-001, which was a JavaScript measuring loop in the loader. This one is pure CSS
layout, which is why RB-001's fix did not cure it.

## RB-004 · React regression · Header strip hid most columns and invented a scrollbar

**Where:** `src/shared/ui/HeadBackdrop.tsx` (the absolutely positioned version), every table using it.

The blue header was one absolutely positioned strip inside the first `<th>`, sized `w-[100cqw]` — one
**container** width — while the header cells themselves were `bg-transparent` with `text-white`.

Two faults followed:

- On any table wider than the viewport (Devices has eleven columns) the strip covered only the first
  screen's worth. Every header past it was white text on white, so the row appeared to hold nothing
  but Description.
- An absolutely positioned box still counts toward its scroll container's scrollable area. The strip
  began at the first `<th>`, which on a selectable table starts 44px in, so the scroll width ran about
  44px past the content. That produced a horizontal scrollbar and a band of empty space to the right
  on tables that otherwise fitted, such as Rooms.

**Fix:** each header cell paints itself with a **vertical** gradient. A vertical gradient is identical
in every cell, so columns show no seam — which was the only reason the single strip existed — and each
sticky cell keeps its colour however far the table is scrolled on either axis. The strip is gone, so
nothing inflates the scroll width. `HEAD_ROUND` curves the outer corners of the header row.

## LB-078 · B · Renaming a rule group resets its sort order to zero

`seats-admin-workflow-creator-stage.html:315-327` builds the rule group view model without `sortOrder`, and
`seats-admin-workflow-crud-behaviour.html:56` posts that object as-is. `CfcWorkflowStageRuleGroupViewModel.cs:20`
declares `SortOrder` as a non-nullable int, so the missing key binds as 0 and every rename silently moves the
group to the front of its stage. Not copied: React sends the sortOrder the server already holds, so a rename
leaves the ordering alone.

## LB-079 · D · Linked-rooms "select all" stays ticked after a row is unticked

**Where:** `Scripts/controllers/deviceDetailsController.js:13-25` — `selectAll` is a plain observable that only pushes to the rows; unticking a row never clears it, so the header says "all selected" while rows are not.
**React:** the header checkbox is derived from the rows (unchecked / mixed / checked) — `DeviceDetailsForm.tsx:205-208`.

## LB-080 · B · Reprocess date "required" message is the literal text "requiredText"

**Where:** `Scripts/controllers/deviceIndexController.js:9-12` — the required validator's `message` is the string `"requiredText"` instead of `GeneralResources.Required`.
**React:** shows the `Required` resource — `ReprocessDialog.tsx:58`.

## LB-081 · B · Workflow delete has no confirmation

**Where:** `seats-admin-workflow-creator.html:808-818` posts the delete on the first click.
**React:** `ConfirmDialog` before the delete.

## LB-082 · B · Student Workflow move / validation texts are literals, not resources

**Where:** `seats-admin-workflow-student.html:487, 930, 934`.
**React:** `NoStudentsSelected`, `NoStageSelected`, `AlertSaveSucceededDefault` resources.

## LB-083 · B · Stage form rejects `0` for every numeric default

**Where:** `seats-admin-workflow-creator-stages.html:457-466` — the check is truthiness, so `0` reads as missing.
**React:** blank check only; `0` is accepted.

## LB-084 · B · Approval select marks the selected option from the status id

**Where:** `seats-admin-workflow-creator.html:214-216` — `selected(1, cfcWorkflowStatusTypeId)`; harmless because the value binding wins.
**React:** value-driven Select.
