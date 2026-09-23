# Decisions

Status: **Accepted** (in force) · **Pending** (needs Gautham's approval before it can be relied on).

## D-001 · Accepted · Stack, versions and dev server

Next.js App Router with strict TypeScript. Versions are pinned to exactly what website-2026 has installed:

| Package                           | Version        |
| --------------------------------- | -------------- |
| next, eslint-config-next          | 16.3.3         |
| react, react-dom                  | 19.2.8         |
| typescript                        | 5.9.3          |
| eslint                            | 9.39.5         |
| jest                              | 30.4.2         |
| ts-jest                           | 29.4.12        |
| tailwindcss, @tailwindcss/postcss | 4.3.3          |
| prettier                          | 3.9.6          |
| husky / lint-staged               | 9.1.7 / 17.4.1 |
| lucide-react                      | 1.34.0         |

The dev server runs on port **3001** with basePath **`/admin-next`**. `allowedDevOrigins` is `dev.seats.local`. Node 24, same as website-2026 CI.

## D-002 · Accepted · New dependencies

| Package                                                                | Why                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@radix-ui/react-dialog` 1.1.23, `@radix-ui/react-alert-dialog` 1.1.23 | The Scheduler's dialog and confirm dialog are built on them (`seats-scheduler-v1/src/components/ui/dialog.tsx`, `alert-dialog.tsx`). They also provide focus trap, Escape and focus return (the dialog rules of this repository) |
| `@radix-ui/react-select` 2.3.7                                         | Scheduler `select.tsx`                                                                                                                                                                                                           |
| `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.7.0 | Scheduler `button.tsx` variants and `lib/utils.ts` `cn()`                                                                                                                                                                        |
| `@testing-library/dom` 10.4.1                                          | Required peer of `@testing-library/react` 16. website-2026 only gets it transitively                                                                                                                                             |

Not taken from the Scheduler:

- `@radix-ui/react-icons`: replaced by lucide, which the Scheduler also uses.
- `tailwindcss-animate`: a Tailwind 3 plugin. The two animations it provided are defined as tokens instead.

## D-003 · Accepted · Where `RequestVerificationToken` comes from

- **Legacy:** the token (`cookieToken:formToken`) is rendered into the page by Razor (`Views/Shared/_Layout.cshtml:341`, `Seats.Common.BaseWebsite/Extensions/AntiForgeryExtension.cs:8-15`). jQuery then sends it on every request (`Scripts/softworks/swapp.js:269`). No API endpoint returns it.
- **React:** `src/shared/api/verification-token.ts` makes one `GET /Seats.Trunk.Admin/` per page load and extracts the value from the rendered layout.
  - Reads carry the header when the token is available and still run when it isn't.
  - Writes are refused (`ApiError` kind `token`) when it isn't.
- **Why this is acceptable for now:** the server does not validate the token today (`ApiControllerBase.cs:22`, see LB-002).
- **Follow-up:** a small backend endpoint that returns the token would remove the HTML parsing.

## D-004 · Accepted · Safe mode and read-only POSTs

Approved by Gautham on 2026-09-14. Reviewer confirmed the endpoint only reads `GeneralResources` (`ResourceApiController.cs:36-53`).

**The rule:** The safe-mode rule: the client sends only GET unless `ADMIN_ALLOW_WRITES=true`. `src/shared/api/config.ts` enforces that before any network call. `ADMIN_ALLOW_WRITES` is inlined at build time (`next.config.ts`).

**The problem:** `api/ResourceApi/GetResourcesForScreen` is `[HttpPost]` but only reads resource values. It takes a key list in the body and returns a dictionary, with no writes (`Controllers/Api/ResourceApiController.cs:36-53`). Every screen needs it for text.

**Current state:** that single path is on an explicit allow-list (`READ_ONLY_POST_PATHS`). Every other non-GET request is blocked in safe mode.

**Approved:** this single path stays on the allow-list. Any new read-only POST needs its own decision entry.

## D-005 · Accepted · Session status codes

| Status   | Action                                                          | Legacy                   |
| -------- | --------------------------------------------------------------- | ------------------------ |
| 401, 403 | `/Seats.Trunk.Admin/Account/ForceLogin?returnUrl=<current URL>` | `swapp.js:188-195` (403) |
| 428      | `/Seats.Trunk.Admin/Account/SignOut` (`UserIsActiveHandler`)    | `swapp.js:196-202`       |
| 408      | `/Seats.Trunk.Admin/Account/SignOut`                            | `swapp.js:184-187`       |

In release builds, legacy 401 first calls `Home/IsUserAuthenticate` and may route to `#/Error/NotAuthorised` (`swapp.js:174-183`). Phase 0 follows the task brief and sends 401 to ForceLogin. Revisit when the NotAuthorised screen is specced.

Only one redirect runs per page load (`src/shared/api/navigation.ts`).

## D-006 · Accepted · Request details kept from the jQuery transport

- `credentials: 'same-origin'`
- `X-Requested-With: XMLHttpRequest`: jQuery adds it to same-origin AJAX. It isn't yet proven that the server needs it.
- JSON bodies with `Content-Type: application/json`
- Query `null` sent as an empty value, the same as `$.param`
- Server `Message` on 4xx is exposed as `ApiError.serverMessage` (`ResourceApiController.cs:70` pattern)

Writes have no timeout and no retry. Reads are cancelled through `AbortSignal`, and `useApiRead` ignores stale responses.

## D-007 · Accepted · One token stylesheet

Tailwind 4 needs a CSS entry to generate utilities. `src/shared/ui/tokens.css` holds only the Tailwind import, `@theme` tokens copied from `seats-scheduler-v1/src/index.css:92-131` and `src/App.tsx:349-351` (brand `#1566a2`, page `#f5f6fa`, avatar `#56bdea`), a border-colour base, and animation tokens (`menu-in`, `item-in`, `bell-ring`, `badge-in`, `sheen`) used by the nav bar. Component styles live in components. Nothing else may be added to this file.

## D-008 · Accepted · Resources

- `loadScreenResources(keys)` posts the key list and unwraps the single culture property. The server returns `{ "<culture>": { Key: Value } }` (`ResourceApiController.cs:49-52`).
- Values are cached in memory for the page load. A missing key renders as the key name, so gaps are visible.
- Shared UI keys live in `src/shared/resources/keys.ts` and were checked in `Seats.Trunk.Resources/GeneralResources.resx`.
- There is no `Retry` key. Retry buttons use `Refresh` until one is added.

## D-009 · Accepted · Per-user storage user id

`createUserStorage(userId)` namespaces keys as `seats-admin:<userId>:<key>` and throws without a user id, so nothing can leak across accounts.

- **Source:** the legacy layout renders the `UserId` claim as `swapp.init({ userId: parseInt('<id>') })` (`_Layout.cshtml:232-236, 349`). `extractSessionHeader` reads it from the layout HTML we already load (D-014); no extra request.
- An empty or `0` id means no storage: preferences then last only until reload.
- First use: `useRememberedFlag` (`src/shared/shell/use-remembered-flag.ts`) keeps the AreaWorkspace collapsed state per user (D-018).

## D-010 · Accepted · Navigation bar (replaces the inventory placeholder)

- Built from legacy source, not the inventory: `src/shared/shell/admin-menu.ts` copies `Views/Shared/_Layout.cshtml:38-151` (order, `data-screen-code-no` fallbacks, Analytics hidden) and each area's sub-navigation pills as dropdown items.
- Permissions come from `GET api/UserApi/GetClaims` (same ProfileData claim the legacy layout renders). Codes are read from `Seats.Trunk.Contracts.dll` (`PermissionDefinitionItemEnum`, `PermissionDefinitionActionEnum`).
- Six entries on the bar, the rest under More, bell never moved (`swapp.js:386-420`).
- Look: Scheduler logo, `#1566a2` bar, ghost buttons and Radix dropdown (`seats-scheduler-v1/src/App.tsx:349-500`). Bell and badge copy `website-2026/src/components/TopNav.tsx`.
- Every entry links to the legacy Admin route until its React screen exists.
- Labels missing from `GeneralResources` (Integrations, Authentication, Contacts, Configuration, Gdpr* keys, Graph API, Suspicious Readings Report) use English fallbacks until a resource source is agreed.

## D-011 · Superseded · Owner check

A pre-commit ownership check was used while several people worked on separate areas in parallel. It was retired on 2026-09-21; one area per commit and pull-request review replace it.

## D-012 · Pending · IIS rewrite for `/admin-next` (for Gautham to apply)

This rule is applied by hand, never by a script. Add it to `C:\inetpub\wwwroot\web.config` under `<system.webServer><rewrite><rules>`, next to the existing `Website2026Next` rule and in the same style:

```xml
<rule name="SeatsAdminReactNext" stopProcessing="true">
    <match url="^admin-next(/.*)?$" />
    <conditions>
        <add input="{REQUEST_URI}" pattern="^/admin-next($|[/?])" />
    </conditions>
    <action type="Rewrite" url="http://localhost:3001/admin-next{R:1}" />
</rule>
```

Then run `npm run dev` in this repo and open `https://dev.seats.local/admin-next`.

## D-013 · Accepted · `@radix-ui/react-dropdown-menu` 2.1.24

The Scheduler's nav dropdowns use it (`seats-scheduler-v1/src/components/ui/dropdown-menu.tsx`). Gives keyboard navigation, focus management and Escape.

## D-014 · Accepted · Name, email and initials

No Admin API returns them. `src/shared/api/session-header.ts` reads them from the same legacy layout HTML already fetched for the verification token (`Views/Shared/_LoginPartial.cshtml:59-80`). One request per page load (`legacy-layout.ts`).

## D-015 · Pending · Nav search (new, not in legacy Admin)

Requested by Gautham. Searches only the menu entries the user may open and navigates to them. Needs formal approval as a product addition.

## D-016 · Accepted · Account menu items

2026-09-21: Configure accessibility, Change password, Select language and Get developer key are built as React dialogs (`shell/AccountDialogs.tsx`, `shell/DeveloperKeyDialog.tsx`); Online help opens the configured URL; Sign out is live. Register mobile app stays a legacy link (its QR flow is served by the legacy page).

## D-017 · Accepted · Loaders

Chosen by Gautham on 2026-09-14 from ten loading-screen designs.

- **Gearwork** (`src/shared/ui/loaders/GearworkLoader.tsx`) for a component, table area or dialog. Two SEAtS cogs mesh at the correct 10:8 ratio and the leaves stay upright. It modernises Angular's `assets/img/loading.gif` (`web-app-angular/src/styles.less:2716`).
- **Tide** (`TideLoader.tsx`) only for a whole-page load. The outlined SEAtS circle fills and empties with water.
- Both use the four-leaf mark traced from `Seats.Trunk.Admin/images/SEAtS_Logo_square.png` (`loaders/mark.ts`).
- `DelayedLoading` takes `variant="inline" | "page"` and still appears only after 400 ms.
- Keyframes are `@theme` animation tokens in `tokens.css`. Reduced motion shows a still mark.

## D-018 · Accepted · Area workspace layout

Chosen by Gautham on 2026-09-14 (design 5 in `docs/specs/users/user-index.designs.html`). Reuse it for every Admin area.

- `src/shared/shell/AreaWorkspace.tsx`: collapsible sidebar with the area's sub-navigation (same list and permission gates as the nav dropdown), breadcrumb, title with a compact count, and actions on the right.
- No large stat tiles: Gautham removed Total / Selected / Page cards as too big. Counts stay inline.
- Sections with a React screen use client routing (`MenuLink.reactRoute`); the rest open legacy Admin.
- The collapsed state is remembered per user (D-009).
- `ProfileProvider` (`src/shared/shell/profile.tsx`) loads `UserApi/GetClaims` once for the nav bar and every screen's permission checks. `AppShell` main no longer adds padding, so each screen owns its layout.

## D-019 · Accepted · Users list details

- Route `/users`, gated by Users + Access. The nav "Users" entry and the User sidebar section now open it.
- Column labels come from `GeneralResources`: `UserName` (User Name), `Email` (E-mail), `RealName` (Full Name). There is no `AccessProfiles` key, so it uses the legacy fallback "Access Profile(s)" (`Views/User/Index.cshtml:88`).
- Row click, the user name link and Add open legacy `#/User/Details` until User details is built.
- Row checkboxes and select-all show only with Users + Delete, because selection exists only for delete.
- Delete confirm uses the legacy modal text and buttons (`_DeleteConfirmationPartial.cshtml`: DeleteConfirmationMsg, Confirm, Cancel).
- Success shows `AlertDeleteSuccessDefault` for 2.5 s. A 400 shows the server message and other failures show `AlertDeleteErrorDefault` for 5 s (`swgrid.js:435-457`). In safe mode the client blocks the DELETE and the error message shows.
- A resource that comes back empty now falls back to English instead of showing a blank label. Legacy showed only the icon for the fourth Users pill (`#/Audit`, key `Activity`). On Gautham's request (2026-09-14) the fallback name is **Activity Log**; a non-empty tenant value still wins.
- Not in GeneralResources, English fallbacks until a key exists: "There are no items to show." (legacy hard-codes it, `swgrid.js:816`), Expand, First, Last, Clear search, Select, and the no-access message.

## D-021 · Accepted · User details, slice 2a (form, personas, save)

D-020 is left for the Settings work already referencing it in `src/shared/api/config.ts`.

- Routes `/users/new` and `/users/{id}`; the list's row click, user name link and Add now open them. Other ids show a not-found state.
- Load `GET api/UserApi/{id}` (new: `api/UserApi/`). Save `POST api/UserApi` with the full `UserDto`. Fields the form does not edit (`isSuperUser`, `positionNumber`, `displayName`, `authenticateModeId`, `userSecurityLevelPermissionToProcess`) are sent back exactly as loaded, because the save always calls `SetIsSuperUser` (`UserApiController.cs:418`).
- Validation follows `userDetailsController.js:493-551` and `swapp.js:2574-2647`:
  - User Name and Full Name required.
  - `<` and `>` blocked in every text field, passwords included.
  - The create password applies only with our identity provider, and must pass the 10-character strong rule and not contain the user name.
  - The confirmation must match.
  - Personas each need an access profile, with no duplicates.
- Associated student: typeahead on `GET api/UserApi/GetStudentsByCriteria?query=` with a 250 ms pause and stale requests cancelled; typed text without a picked student is an error (see LB-006).
- Save success returns to the list, which shows `AlertSaveSucceededDefault`. A 400 shows the server message. Other failures show `AlertSaveErrorDefault` instead of the raw exception text legacy displayed. Safe mode explains that saving is off.
- Save is shown only with Users + Add (new) or Users + Edit (existing), and stays disabled while the request runs.
- Not yet in React: security level editing (slice 2b, the tab is read-only), Set Password and Send reset link (slice 2c), and the unsaved-changes prompt legacy routing offers.

## D-022 · Pending · Hidden legacy password label text

Legacy shows "Authenticate via …" beside the create password but hides it (`Details.cshtml:76-78`) and the Authentication Mode select is `display: none` (`:104-108`). Neither is rendered in React. Confirm they can stay hidden.

## D-023 · Accepted · Settings (branding) screen

Built on 2026-09-14 at Gautham's request. Source: `Views/Settings/Index.cshtml`, `bower_components/seats-admin-setting-color/seats-admin-setting-color.html`, `Controllers/Api/SettingsApiController.cs`, `Controllers/Api/FileApiController.cs:100-165`.

- Route `/settings`, gated by Settings + Access. The nav "Settings" entry and the Settings sidebar section open it. The other seven sections still open legacy Admin, with the legacy permission gates.
- Load: `POST SettingsApi/GetSettingByKeys` with the seven keys in legacy order. It only calls `GetByKeys`, so it joins the safe-mode read-only POST list (like D-004).
- Save: validation order and messages as legacy (`OnlineHelpUrlValidationMessage`, `RequiredMessage`). Body `[{id, value, key}]` in legacy order. A picked logo is first sent to `POST api/image` (`file0`, `container=menu-logo-attachments`), and 406/415 shows `FileNotSupported`. Success shows `AlertSaveSucceededDefault`; a 400 shows the server message. Toasts last 3 s (seats-toast default).
- Safe mode blocks the upload and the save and says so plainly.
- Save and editing need Settings + Edit, which the backend demands (`SettingsApiController.cs:61`). Legacy showed Save to everyone; without Edit the React form is view-only.
- The shared client now sends `FormData` bodies as multipart (no JSON content type). Jest maps image imports to `src/shared/testing/image-stub.ts`. New token `animate-toast-timer`.
- New, not in legacy (UI only, no new API calls except the logo preview GET): live preview of menu colour, logo and table header; WCAG contrast badge for header text; unsaved-changes pill with Discard; Ctrl+S; drag-and-drop logo with thumbnail; the full paper-swatch-picker palette plus a native colour picker; inline field errors.
- The saved logo thumbnail uses `GET SettingsApi/MENU_CUSTOM_LOGO`, which returns the file URI.
- English-only text until resource keys exist: group titles (Help, Colours, Logo, Accessibility statement), Live preview, Unsaved changes, Discard, View only, palette and logo hints, the safe-mode message and the no-access message.

## D-024 · Superseded · Monochrome Admin sidebar (replaces the per-area section list)

Chosen by Gautham on 2026-09-14 (Monochrome, from the professional set of six). Built the same day. Superseded by D-018's `AreaWorkspace` sidebar; the unused `AdminSidebarView` component was removed on 2026-09-21 (Gautham: delete).

- `src/shared/shell/AdminSidebar.tsx` lists every Admin area the user can see, in `buildMenu` order (bar then More), with the same permission gates and resource labels as the nav bar. Areas with children open and close in place; the rest are direct links.
- Neutral greys and black text only; SEAtS blue appears only as the dot on the current page. A grey highlight glides under the pointer, pages sit on a thin guide line, and area page counts use the mono font.
- The area holding the current page starts open. Collapse shrinks it to icons with native tooltips; clicking a group while collapsed expands the sidebar and opens that group. State is not persisted (D-009).
- Opt-in through `AreaWorkspace navigation="admin"`. Users screens use it now; Settings and Devices keep the section list until Gautham approves it for all pages. The "Admin" heading is English-only until a resource key exists.
- `next.config.ts` moves the dev-only Next.js indicator to the bottom-right so it no longer covers Collapse.

## D-025 · Accepted · Devices list (Location Rail)

Built on 2026-09-14 at Gautham's request; layout is design 2 "Location Rail" from `docs/specs/resources/device-index.designs.html`, inside the D-018 area workspace (section list, as D-024 keeps for Devices).

- Route `/resources/devices`, gated by Devices + Access; the nav "Devices" entry and the Device section open it. Rooms-only and ReadingsReport-only users see no-access instead of legacy's empty grid (LB-012).
- Load `GET DeviceApi/GetDevices` once on open with `description desc`, 100 rows (legacy loaded twice, LB-011). Optional `batteryPercentMin/Max` only after the range is touched; `siteId`, `buildingId`, `roomId` only when set.
- Filters are a draft in the left rail and apply only on Search, **including Include inactive** (legacy reloads on tick, `deviceIndexController.js:75-77`; pending Gautham's confirmation). The search box applies text with the filters already applied; the rail Search applies both, as legacy. Removing a chip reloads at once.
- Location is one Site > Building > Room tree built from the three option lists legacy loads on open (`GetSiteOptions`, `GetBuildingOptions?siteId=`, `GetRoomOptions?siteId=&buildingId=`). Cascade rules as legacy; a room without a building clears site and building. Items whose parent is missing are grouped. A find box filters the tree (UI only).
- `Device.BatteryPercent.Enabled` has no API: the screen reads it from the legacy `Device/Index` partial (`id="battery-percent-col"`) via new `src/shared/api/legacy-view.ts`, like D-003/D-014. The Battery % column and range show only when it is on. Bars keep the >40 / >15 / else thresholds and always show the number.
- Delete `DELETE DeviceApi?ids=…` (spec path; legacy sends it to `DeviceApi/GetDevices?ids=…`, same action). Success `AlertDeleteSuccessDefault` 2.5 s, 400 server message, other `AlertDeleteErrorDefault` 5 s; then page and search reset.
- Reprocess needs Devices + ReprocessDeviceSwipes (130, new `PermissionAction` value) and exactly one row. `PUT DeviceApi/ReprocessSwipes?deviceId=&date=dd/MM/yyyy`, default today, strict date validation; `AlertSaveSucceededDefault` / `AlertSaveErrorDefault` 3 s.
- Export PDF (0) / CSV (1) `POST DeviceApi/Export` with the **applied** search, filters and sort (legacy posted unapplied values, LB-013). Success `ReportProcessing` 6 s; 400 server message or `AlertSaveErrorDefault` 10 s. Safe mode blocks Delete, Reprocess and Export with a plain message.
- Loading: Tide while the profile loads, Gearwork for the table (the previous page stays dimmed during reloads). Error shows Retry, never "no data".
- Row click and the description link open legacy `#/Device/Details/{id}`; Add opens `#/Device/Details` (details not built).
- Pager shows the legacy numbered pages (up to five, `swgrid.js:172-190`) through the new opt-in `Pagination pageLabel`; the Users list does not use it yet.
- English-only text until resource keys exist: `InService`, `BatteryPercent`, `ReprocessCardSwipes` (not in `GeneralResources.resx`; legacy fallbacks), plus rail labels, tree groups, date and safe-mode messages in `devices-text.ts`.
- 2026-09-14 additions (UI only, no new API calls):
  - Studio Split layout with the "Anatomy" live preview (menu bar, tables, footer links) filling the right column.
  - Card title band and a short grey hint under every label (English until resource keys exist).
  - Empty colour boxes show the default (`#1566a2` menu and table header, `#ffffff` header text), matching what Admin shows when a colour setting is empty.
  - "Use default colours" clears the three colours in the form; nothing is saved until Save.
  - "Open link" beside both URL fields opens only http/https addresses in a new tab (`noopener noreferrer`).
  - Inline warning under Table header text color when the header contrast is below AA.

## D-026 · Accepted · Device details (add / edit)

- Routes `/resources/devices/new` and `/resources/devices/{id}`; list row, description link and Add now open it instead of legacy.
- Same layout as Users details: Device card (5 text fields, Beacon and Is Active checkboxes), rooms card (room search + Add, linked rooms table), sticky Cancel / Save footer.
- Save posts the loaded detail back with the edits, `roomIdsInDevice` and `url`, like `ko.toJSON`. `url` stays the legacy hash route so audit links keep working.
- Validation matches legacy: Serial Number required; `<` or `>` in any text field blocked; toast "There are fields with input validation errors."
- Permissions: Save = Devices Add (new) or Edit (existing); room Add = Rooms Edit; room Delete = Rooms Delete.

## D-027 · Accepted · Users-area lists: Access Profile, Contact Group, Developer Key

Built on 2026-09-14. Specs: `docs/specs/users/access-profile.md`, `contact-group.md`, `developer-key.md` (index parts only).

- Routes `/users/access-profiles`, `/users/contact-groups`, `/users/developer-keys`. The Users-area sidebar and nav entries now open them.
- One list frame for all three (`src/features/users/list/`): search, selection, delete with the shared confirm dialog, sticky blue header, pager from 10 rows, page sizes and default 100 as swgrid.
- **Client lists** (Access Profile, Contact Group) load everything once (`GET AccessProfileApi`, `GET ContactGroupApi`) and search, sort and page in the browser like `swgrid.js:111-159`. Comparison uses legacy `<`/`>` with null as empty text, stable for ties. Search runs on Enter or the button, trims the text, returns to page 1 and clears the selection. Selection is kept across pages and sorts; unticking the header clears all (`swgrid.js:298-325`).
- Search covers the columns on screen (Access Profile: Name; Contact Group: Name, Group Email Address, Send Emails To, plus Function and Associated To when shown). Legacy also matched hidden ids and GUIDs (LB-018).
- **Server list** (Developer Key): `GET DeveloperKeyApi?currentPageIndex&pageSize&sortCol&sortDir&searchFilter`, initial `expiryDate asc`. Expiry shows the wall-clock value as `DD/MM/YYYY HH:mm:ss` (en-GB, `swapp.js:2195-2204`); other cultures are not handled until a culture source exists.
- Delete: `DELETE {Api}?ids=…&ids=…`. A 400 shows the server message (e.g. `ProfileInUse`), safe mode says saving is off, anything else `AlertDeleteErrorDefault`. Success resets search and page and reloads.
- Permissions: Access Profile page needs AccessProfiles + Access (Add/Delete per spec). Contact Group page needs ContactGroup + Access; Delete uses ContactGroup + Delete (not the legacy Devices + Delete, LB-017); Function and Associated To need ContactGroup + ContactGroupFunctions (129). Developer Key page needs Users + DeveloperKeyDashboard **and** AdminUserMenu + DeveloperKey (53), because the API checks the first and `DeveloperKeyController.cs:15` serves the page only with the second; this matches what a legacy user can actually open.
- Row click: Access Profile opens the legacy editor only when `isEnabled`, otherwise shows "You do not have permission to access this profile." for 2 s (`AccessProfile/Index.cshtml:72-77`). Contact Group opens the legacy editor. Developer Key rows do not open (`detailUrl: ''`). Add opens the legacy editors until those screens are rebuilt.
- The developer key value in the list response is dropped when parsing and never rendered (LB-016).
- Shared change: `src/shared/api/client.ts` now reads the camel-cased `message` of `HttpError` responses as well as `Message`; before this, every 400 message fell back to the generic text.
- Not built here (spec items for later): Access Profile and Contact Group details, and the personal developer key generator in the account menu (D-016).

## D-098 · Accepted · Room list

- Route `/resources/rooms`, gated by Rooms Access; the Room sidebar tab and top-menu Room entry now open it.
- Same table style as Devices: search, sort, 100 per page, numbered pager, select and delete (`DELETE api/RoomApi?ids=`).
- Building is not sortable: legacy sends `name` for it, which sorts by room name (LB-016). A working server key is unverified; check `GetRooms?sortCol=buildingName` on Alpha before enabling.
- Row, code link and Add open the React Room details (D-099).

## D-028 · Accepted · User details slices 2b and 2c: security levels and passwords

Built on 2026-09-14. Spec: `docs/specs/users/user-details.md`.

- **Security Level Permissions tab** is now editable. Is Super User is a checkbox (no permission binding, as `Details.cshtml:196`). Lecturer Visibility needs Users + LecturerVisibility and is disabled for a super user; changing it writes an `isOwnClasses` entry `[{ id: 0, isOwnClasses: true, isSuperUser: false }]` or `[]` (`userDetailsController.js:223-241`). A super user sees each level as plain text; otherwise each level opens the dialog.
- **Level dialog** (`UserSecurityLevelPermission/Index.cshtml`): loads `GET UserSecurityLevelPermissionApi?userId&securityLevel` unless the level was already applied in this visit, in which case the applied rows are shown (legacy fetched again and ignored the answer). Search `GET UserSecurityLevelPermissionApi/GetSecurityLevelsByCriteria?securityLevel&query`, min length 1, 8 results (100 for students). Add needs Users + Edit and skips a level already listed; new rows get negative temporary ids that the API turns into 0. Delete needs Users + Delete and only removes rows locally. Apply stores `{ securityLevel, userSecurityLevelPermissions }` in `userSecurityLevelPermissionToProcess` and updates the overview text (names joined with `;`, cut at 40 characters plus `...`, or None). Rows loaded from the API are sent back with every field they arrived with.
- Save now sends the edited `isSuperUser` and `userSecurityLevelPermissionToProcess`.
- **Set Password** (existing users with `seatsAuthenticationByOurIdentityProvider`, no permission binding): password required, ten-character policy, must not contain the user name; confirmation must match. `POST UserApi/SetPassword { id, password }`. Success closes the dialog and shows `PasswordWasSavedSuccesfuly` for 4 s; a 400 shows the server message, safe mode says so, anything else `AlertSaveErrorDefault`. The User form is not saved.
- **Send Password Reset Link** (same visibility, Users + Edit): `POST UserApi/SendResetPasswordLink` with the current user name as a JSON string. Success "Password reset link sent successfully." 4 s; a 400 shows its message for 10 s; otherwise "Failed to send password reset link." 4 s. These three English strings are hard-coded in legacy and stay fallback-only.
- Shared change: `src/shared/ui/Checkbox.tsx` gains an optional `disabled` prop.
- The associated student search and the level search share `LookupTypeahead`.

## D-040 · Accepted · Settings area: remaining screens

Built on 2026-09-14 at Gautham's request, reusing the Settings page design (nav-bar blue title bands, hints under labels, shared toast, Ctrl+S). Contracts were traced from the legacy components; every route opens with the same permission as the legacy tab.

| Screen                  | Route                                   | Legacy API used                                                                                              |
| ----------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Authentication          | `/settings/authentication`              | GET, PUT `AuthenticationApi/` (PascalCase body)                                                              |
| Graph API               | `/settings/graph-api`                   | GET, PUT `GraphApi`                                                                                          |
| Contacts                | `/settings/contacts`                    | GET `ContactApi?page&pageSize`, POST, PUT, DELETE (id array body)                                            |
| File Template list      | `/settings/file-templates`              | GET, DELETE `FileTemplateApi?ids=`                                                                           |
| File Template add/edit  | `/settings/file-templates/new`, `/[id]` | GET `FileTemplateApi/?id=`, `GetSubjectTemplateTypes`, POST `ValidateTemplateTypes`, POST `FileTemplateApi/` |
| Activity Types list     | `/settings/activity-types`              | GET, DELETE `ScheduledActivityTypeApi?ids=`                                                                  |
| Activity Types add/edit | `/settings/activity-types/new`, `/[id]` | GET `ScheduledActivityTypeApi/{id or Details}?letterFileTemplatesOnly=true`, POST                            |
| Resources               | `/settings/resources`                   | GET `getResources`, `GetTypes`, `GetResourcesByString`; POST `updateResource`                                |
| Custom Fields           | `/settings/custom-fields`               | GET `CustomFieldGroupApi/`, `CountCustomFields`, `ExistsCustomFieldDataByEntityIdAsync`; POST, PUT, DELETE   |

- Shared pieces live in `src/features/settings/shared/` (frame, gate, cards, table, client-side list, form dialog, switch, toast, one-time flash message).
- Safe mode blocks every write and says so; `ValidateTemplateTypes` is also blocked because it compiles Razor on the server.
- Graph API: both API calls need Settings + Edit although the tab needs Contacts, so without Edit the page explains that instead of calling the API. The key field is a password input; the server only ever returns a mask.
- Activity Types: "Requires Approval" uses the user's ScheduledActivity (34) Access, as the legacy list does. Legacy details used a subscription check (`ViewBag.HasApprovalSubscriptionAccess`) that no API exposes.
- Custom Fields: buttons use permission ids (Add 2, Edit 3, Delete 4) instead of legacy's lookup by action name. Page numbers are sent 0-based exactly as legacy (see LB-045).
- Resources: the edit dialog waits for the save result, and the app's resource cache is cleared after a successful save.
- Dialog errors are shown inside the open dialog, because content behind a modal is hidden from assistive technology.
- After saving a details screen, the list shows the success message (legacy kept the alert across the redirect).
- English-only helper text (card titles, hints, placeholders) until resource keys exist.

## D-041 · Superseded by D-114 · Rich text editor: `quill` 2.0.3

File Template add/edit needs a WYSIWYG editor; legacy uses polymer-quill with Quill 1.0.6. `quill@2.0.3` (BSD-3-Clause) is the same editor family.

- `npm audit` reports GHSA-v3m3-f69x-jf25 (low) in Quill's HTML export (`getSemanticHTML`). The app never calls it: the stored document is built from the editor HTML by tested functions in `file-template-form.ts` (nested lists, Razor block clean-up, code blocks), mirroring legacy `_computedContentFile`.
- `quill/dist/quill.snow.css` is imported by `TemplateEditor.tsx` only; Quill is loaded with a dynamic import in the browser.

## D-029 · Accepted · Contact Group details (add / edit)

Built on 2026-09-14. Spec: `docs/specs/users/contact-group.md` (details). Routes `/users/contact-groups/new` and `/users/contact-groups/{id}`; the list row and Add now open them.

- Load `GET ContactGroupApi/{id}` (`ContactGroupApi/` for new). Page needs ContactGroup + Access; Save needs Add (new) or Edit (existing).
- Fields as `ContactGroup/Details.cshtml`: Name (required), Description, Group Email Address (max 100; an invalid address shows "Please enter a valid email address." but does not block, as legacy), Send Emails To (required). An option is disabled when its recipients are missing: 1 without a valid group email, 2 without a member with a valid email, 3 without either (`contactGroupDetailsController.js:190-201`).
- Function and Associated To need ContactGroup + ContactGroupFunctions. Changing the function or the entity type clears the association; the entity search (`ContactGroupApi/Get{Courses|Faculties|Modules|Programmes|Schools}ByCriteria`) is required once a function and type are chosen. The duplicate "None" entity is shown once.
- Function dialog: `POST contactGroupApi/createOrUpdateFunction { id, name }` selects the returned function; `DELETE contactGroupApi/deletefunction?id=` clears it with no confirm, as legacy (2026-09-15 parity pass). Both write immediately, as legacy. The dialog is prefilled with the function name from the list, because the GET never returns it.
- Members: search `GET UserApi/GetUsersByCriteria` (shown as "user name (full name)"), Add fetches `GET UserApi/{id}` and appends the user once. Add and Delete members need ContactGroup + Edit (legacy gated Delete with Users + Delete). Full Name shows `displayName`, falling back to `fullName` for loaded members.
- Save: validation (required, conditional entity, no `<` or `>`); the members-or-email rule is left to the server as legacy (2026-09-15 parity pass); then `POST ContactGroupApi` with the loaded detail plus the edited fields, only the chosen entity id, and `userIdsInContactGroup`. Success returns to the list with the saved notice; 400 shows the server message; safe mode says so.
- The User lists frame now shows a pending saved notice when it opens (as the Users list does).

## D-030 · Accepted · Access Profile details (add / edit)

Built on 2026-09-14. Spec: `docs/specs/users/access-profile.md` (details). Routes `/users/access-profiles/new` and `/users/access-profiles/{id}`; the list row (enabled profiles) and Add open them.

- Load `GET AccessProfileApi/{id}` (`0` for new) and `GET AccessProfileApi/GetLandingPages`. Page needs AccessProfiles + Access; Save needs Add (id 0) or Edit.
- Fields: Name (required), External Key, Restricted (legend in the tooltip), Default Landing Page. A landing page option is enabled only when the Access action of its permission item is ticked (lookup built from the tree, `accessProfileDetailsController.js:40-117`); choosing or saving an invalid one shows the legacy message and blocks Save.
- Site Access: the permission areas list on the left (the unnamed root wrapper is not shown), the selected area's permissions on the right with one pressed/unpressed button per action; toggling edits `selectedPermissions` (action-in-item ids).
- Event, Case and Workflow Visibility tabs appear from the `isEventTypeVisible`, `isCaseVisible` and `isWorkflowVisible` flags returned on load, as legacy. Each tab loads its list once (`AccessProfileApi/GetAllEventTypes`, `caseapi/getAllCasesProfile`, `caseapi/getAllWorkflows`, all with the legacy `accesProfile` parameter) and replaces the loaded selection with the one it returns. Legacy loaded all three even when their tab was hidden; React loads only the tabs that are shown.
- Event Visibility rows (Case History, general groups, Events) have Event, Details and Comment toggles; Details and Comment work only on a row with Event; the header boxes tick or untick a whole column; search matches the description, the group name or the Events title, as the component did.
- Save is enabled once the form is shown (legacy waited for the hidden components to report back, and its disabled attribute did not stop the click). Body is the loaded details with the edited fields.
- Copy profile (existing profiles) sets id 0 and appends " (1)"; the next Save creates a new profile.
- A missing id returns an empty profile from the API and shows the not-found state. A restricted profile the user cannot access returns 401, which the shared client treats as an expired session and sends to ForceLogin (legacy went to NotAuthorised); needs a shared client decision (D-003 area).

## D-099 · Accepted · Room details (add / edit)

- Routes `/resources/rooms/new` and `/resources/rooms/{id}`, gated by Rooms Access; Save needs Rooms Add (new) or Edit (existing).
- Fields as legacy: Building select (an unset building takes the first option, like the captionless KO select), Code, Name (required), Capacity (required).
- Capacity must be a whole number before posting; legacy let any text through and the server rejected it with a generic 400.
- Save posts the loaded RoomDto back with the edits and the legacy hash `url`; success returns to the Room list with the save toast.

## D-100 · Accepted · Readings Report and Suspicious Readings Report

- No screen specs exist yet; built from legacy source (`Views/ReadingsReport/*`, `Views/SuspiciousReadingsReport/*`, their controllers and API controllers). Still to write: `readings-report.md` and `suspicious-readings-report.md`.
- Routes `/resources/readings-report` and `/resources/suspicious-readings-report`, gated by ReadingsReport Access; sidebar and top-menu entries now open them.
- Readings Report: Device, Start Date, Start Time, End Date, End Time, Include Out of Service Devices, search, sortable 7-column grid, PDF/CSV export. Every filter change reloads from page 0, as legacy.
- Suspicious Readings Report: Start and End Date, sortable 9-column grid, no search or export (legacy has none). Initial sort key stays `date`, as legacy sends it.
- Dates default to today in the browser; legacy uses the tenant's time zone date from the server. Date text is dd/MM/yyyy like the reprocess date (same culture question as D-025).
- Typed dates apply only when valid; legacy's picker could never send a partial date.

## D-050 · Accepted · Users: Activity Log and the Developer Key generator

Built on 2026-09-15 with Gautham's approval to write the spec and edit the shared shell. Spec: `docs/specs/users/audit.md` (new) and `docs/specs/users/developer-key.md` (generator).

- Route `/users/activity` gated by Users + Activity; the Users sidebar and the top menu Audit entry now open it.
- Filters Site, Type, User (lookup `GET Audit/GetUser`, lists users on focus as the `min-length="0"` autocomplete did) and Select Range (From/To calendar, To never before From). Legacy hides the preset buttons (`hidden-section-button`); since 2026-09-22 React keeps the shared preset rail (Today, Last 7 Days…), which no other date range in the console hides (approved by Gautham on 2026-09-22 when he asked for this work to land). Every change reloads from page 0 (LB-050). Clean resets filters, sort, range and page.
- `POST audit/GetAudit` and `POST UserApi/GetUserDeveloperKey` have no side effects (`_auditApiClient.GetAsync`, `GetUserDeveloperKeyExpirationAsync`), so they join the read-only POST list in `src/shared/api/config.ts`. Export and GenerateDeveloperKey stay blocked in safe mode.
- Detail text and link rules follow `_detail`/`_isAction`; only absolute http(s) links render, opened with `noopener noreferrer`.
- Export: an Export button (hidden with no rows) opens Export As Pdf/Csv with Save; `POST audit/Export` shows `ReportProcessing`.
- Dates in the range field show as dd/MM/yyyy, as the Devices filters do (en-GB `globalDateFormat`).
- Developer Key generator: profile menu item for AdminUserMenu + DeveloperKey; each open loads the current expiry, New Key shows the key once with Copy to clipboard. The key is kept only in the open dialog and dropped on close. A 400 on load (no key yet) shows no expiry line, as legacy.

## D-101 · Accepted · Operations area: Rollback and Job Schedule

Built on 2026-09-15 from legacy source, on the Settings building blocks (`src/features/settings/shared`, now accepting another area's sidebar and an optional search bar).

| Screen                | Route                        | Legacy API used                                                                                                                      |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Rollback              | `/rollback`                  | GET `RollbackApi`                                                                                                                    |
| Job Schedule list     | `/job-schedule`              | GET `JobScheduleApi`, DELETE `JobScheduleApi?ids=`                                                                                   |
| Job Schedule add/edit | `/job-schedule/new`, `/[id]` | GET `JobScheduleApi/{id or 0}`, `Get{School,Course,Module,Site,Building,Room}Options`, `Get…Description?id=`, POST `JobScheduleApi/` |

- Rollback and Job Schedule are separate legacy bar entries; React shows both in one "Operations" sidebar (`OPERATIONS_GROUP`).
- Rollback has no action button: the legacy button runs the grid delete, which calls a DELETE the controller does not have (LB-076).
- Job type conditions use Seats.Trunk.Contracts values read from the bin assembly: AttendanceExport 2, RoomUtilisation 4, StudentsExport 101, TimetablesExport 102, LastHeartbeatReport 103, ProcessClockingsMonitorReport 104.
- Selects pick their first option only while visible, as knockout's options binding did; hidden fields keep their values in the body.
- The jquery-cron widget and prettyCron are replaced by `cron.ts` (no new dependency): the same six period shapes, Advance for anything else, and a plain-English description. Expressions outside those shapes show as typed.
- The `< >` check from `swapp.js` and the recipients e-mail check run before saving; the cron itself is validated by the server as before.

## D-051 · Accepted · Lesson Types (list and edit)

Built on 2026-09-15; Gautham approved taking over the unassigned Academic area. Specs: `docs/specs/resources/lesson-type-index.md`, `lesson-type-details.md`, `docs/specs/academic/lesson-types.md`. The earlier unrouted components and their tests were replaced.

- Routes `/resources/lesson-types` and `/resources/lesson-types/{id}`, gated by LessonType + Access; the top menu Lesson Type item opens them. No create or delete.
- Tenant flags `Attendance_By_frequency` (ByDuration) and `Attendance.ConsecutiveAttendanceUpdate` are not exposed by any API, so each screen reads them from the partial it replaces (`GET LessonType/Index` or `LessonType/Details` with X-Requested-With), matching the column and field ids LessonTypeController renders. Checkout columns and fields need LessonType + CheckOutPolicy; the consecutive column and field also need ConsecAttendance, as the KO security bindings did.
- List: `GET api/LessonTypeApi/`, client sort (description ascending first), page size 100, pager from 10 rows, no search box (the index view has none), row opens the editor. Booleans show tick/cross; checkout Disabled/Mandatory/Optional; scaling None/Enabled/Only If Absent/Only If Attended.
- Edit: `GET api/LessonTypeApi/{id}`; Name and Description locked; GPS shows On (green) or Off (red); early, late and absence cutoffs required; typed cutoffs must be whole numbers; Save needs LessonType + Edit and posts the full DTO to `api/LessonTypeApi/`. A blank optional cutoff is sent as null, which the server rejects like the legacy empty string. Success returns to the list with the saved notice; errors show the server message.
- Unsaved changes (2026-09-15, Phase 2+3): draft vs loaded baseline; `FormStatusPill` (View only / Unsaved changes), `SaveActions` (Discard + Save), Ctrl+S via `useSaveShortcut`, Cancel confirm and `beforeunload` when dirty — same as Settings / Operations edit screens; legacy had no dirty UX.
- Label text for Checkout/Percentage Cut Off, Attendance Scaling, Consecutive Attendance Update and the two scaling options is not in GeneralResources.resx; keys are used with readable fallbacks.
- **Finish workflow (2026-09-15):** details use `FormStatusPill`, `SaveActions` (Discard + Save), draft dirty tracking, `useSaveShortcut` (Ctrl+S), and `useLeaveGuard` (Cancel confirm + `beforeunload`). Parity audit: all ✅ or ⚠ (`docs/specs/academic/lesson-types.parity.md`). Tests: 19/19 in `src/features/academic/lesson-types/__tests__/`.

## D-102 · Accepted · Students area: GDPR deletion screens

Built on 2026-09-15 from legacy source on the Settings building blocks. `SettingsTable` now also accepts text (GUID) row ids.

| Screen                                | Route                   | Legacy API used                                                                           | Action permission             |
| ------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| Student Deletion (confirmation queue) | `/students`             | GET `StudentDeleteApi/GetStudentsConfirm?…&from&to`, POST `GetStudentsConfirmBulkDelete`  | StudentsAdmin (51) Confirm 73 |
| Manual Student Deletion               | `/students/manual`      | GET `StudentDeleteApi/GetStudents`, POST `GetStudentsBulkDelete`                          | Delete 4                      |
| Recycle Bin                           | `/students/recycle-bin` | GET `StudentDeleteApi/GetStudentsInRecycleBin`, POST `GetStudentsInRecycleBinBulkRestore` | Restore 72                    |

- Query order follows swgrid.js server paging: `currentPageIndex`, `pageSize` (100), `sortCol`, `sortDir`, trimmed `searchFilter`, then `from`/`to`.
- The queue starts at today ±3 days, sent as dd/MM/yyyy (the en-GB `{0:d}` the API parses); its columns are not sortable, as legacy `isSortable: false`.
- Selection is per page and cleared on every load; after an action the page, search and selection reset.
- Student Stage reset is not built: no menu link and its API call is commented out.
- A navigational "deletion steps" strip and relative deletion-date chips are UI additions; no extra requests.
- Runtime on 2026-09-15 (local): Manual Student Deletion 200 with data; the queue and recycle bin return 500 because the local GDPR service (`GdprAddressKey` localhost) is not running, and React shows the error state with Retry.

## D-060 · Accepted · Shared filter panel (Design E, Views + Panel)

- Gautham chose Design E on 2026-09-15 and approved building it in `src/shared/ui/filter-panel` (`FilterPanel`, `sameFilters`).
- Filters apply the moment a value is chosen, like legacy (`readingsReportController.js:116-138`); no Search button.
- View tabs sit on the right, dots use the Scheduler palette (blue, sky, emerald, amber), and the active dot breathes (`animate-breathe` token).
- Readings Report views (Today, Yesterday, Last 7, Last 30 days) only fill the legacy date filters and clear the times; no new API field.
- Start and End are one Date Range field; the calendar is a port of website-2026 `SeatsCalendarPicker` (quick buttons, two month calendars, Select Range).
- Collapsed panels show the applied filters as chips. Shared `Select` opens with `animate-menu-in`, and trigger content no longer wraps its icon.

## D-061 · Accepted · Users area parity fixes and required marker

- Gautham approved on 2026-09-15 keeping the red `*` after required labels (not in Scheduler) because it shows what must be filled.
- Tables inside forms and dialogs (Contact Group members, Security Levels) use the Scheduler header (`h-10`, muted `font-medium`); the blue header stays only on list pages (D-027).
- Save errors show the server message for 4xx like legacy, generic text for 5xx (LB-005); Function delete keeps the legacy generic text.
- Lookups match legacy bootstrap3-typeahead: results filtered and sorted on their JSON text, query not trimmed, associated student capped at 8.
- The Security Level lookup is always visible; only Add needs Users + Edit (`UserSecurityLevelPermission/Index.cshtml:22-31`).

## D-062 · Accepted · Lift & Bloom hover motion and Frost tooltips

- Gautham chose H1 Lift & Bloom and T1 Frost on 2026-09-15 from `docs/specs/shared/hover-tooltip.variants.html`.
- Styles live in `src/shared/ui/motion.css`: `lift-bloom` on filled and outline `Button` variants, `lift-icon` on icon buttons, `lift-slide` on sidebar links, `lift-chip` on filter chips; every table data row tints and shows a brand edge on hover (`data-row-hover="off"` opts out, used by the calendar).
- `FrostTooltips` in `AppShell` shows every native `title` as a Frost tooltip, so screens keep using `title` and need no tooltip code.
- `field-bloom` gives every text box, select and text area the filter date box hover and brand focus halo; checkboxes and switches get a hover halo; hand-made bordered buttons use `lift-bloom`, small pill toggles and pager buttons use `lift-chip`.
- The Angular-copied date range dialog buttons keep their Material look.

## D-063 · Superseded in presentation by D-113 · User Notifications screen

Built on 2026-09-15 from `Views/UserNotification/Index.cshtml`, `userNotificationIndexController.js`, `UserNotificationApiController.cs`.

- Route `/notifications`, gated by UserNotifications (40) + Access. Nav bell opens React via `NOTIFICATIONS_ROUTE`; `refreshNotificationCount()` reloads `GET usernotificationapi/count` after mark-read and delete.
- List: `GET UserNotificationApi` with swgrid paging query order, page size 100, no search. Opening the page POSTs `usernotificationapi/setAllAsRead` like legacy before the grid loads.
- Columns match Index.cshtml; expiration column follows `Notification.Expiration.Days` parsed from `GET UserNotification/Index` (AjaxOnly partial). Dates use dd/MM/yyyy HH:mm UTC (`dateTextUtc`). Unread rows (`showAsNew`) show a brand dot and semibold text.
- Delete per row when `userNotificationStatusId !== 1`; confirm uses `DeleteConfirmationMsg`; POST `usernotificationapi/delete?id=`. No row click, selection or bulk delete.
- Header "Mark all as read" is a UI addition (legacy auto-marks on open only). SignalR hub updates are not ported (documented gap in parity spec).

## D-064 · Pending · Nav bar additions not in legacy Admin

Asked for by Gautham on 2026-09-15. None of these exist in the legacy Admin (`Scripts/softworks/swapp.js:386-420` only has a 6-item bar and a More dropdown toggle).

- **More page** `/more` (`src/features/more/MoreScreen.tsx`): clicking the word More opens a page of the overflow menu entries the user can see; the chevron still opens the dropdown. Legacy More is `href="#"` only.
- **Aurora search** (`src/shared/shell/NavSearch.tsx`, `nav-search.ts`): typo-tolerant page search with recent pages (8, per user via `createUserStorage`), `@area` scope, `>` actions (Import a file, Re-calculate engagement, Switch to old Admin), preview panel and Ctrl K. No pins. Replaces D-015's simple list.
- **Dropdown style "SEAtS Unified"** (`src/shared/shell/NavMenuCards.tsx`): student-app panel values (`website-2026/src/app/globals.css:2278-2310`) with Scheduler inset rows; each row's icon takes its own colour on hover.
- **Table header** (`src/shared/ui/table-head.ts`, `src/features/users/list/HeadBackdrop.tsx`): header rows reuse the nav bar gradient, glow and sheen; the sheen starts 8 s after the nav bar so both never sweep together.

## D-065 · Accepted · Access Profile details use the Live Preview Studio

- Gautham chose design 3 of `docs/specs/users/access-profile.designs.html` on 2026-09-15.
- Site Access lists every permission from the API tree grouped by node, with a None / View / Edit / Full level (View = Access/View/Read actions, Edit adds Add/Edit/Create/Update) and a panel of the exact actions; mixed selections show Custom.
- A live preview beside the form shows the areas, pages and actions the profile unlocks and whether the default landing page is allowed.
- Payload, validation, landing page rule, visibility tabs, Copy, Cancel and Save are unchanged.

## D-066 · Accepted · One owner-only shared motion layer, and WCAG 2.2 AA as a gate

- `src/shared/ui/motion.css` (imported by `tokens.css`) stays as the single shared motion layer: hover (`lift-bloom`), focus halos, Frost tooltips, row hover, page entrance, dialog, toast and skeleton rules. Splitting them into components duplicated the same keyframes per feature and made the hover system impossible to keep consistent.
- It is owner-only and is the one exception to "no global CSS file"; no second global stylesheet may be added.
- `docs/accessibility.md` (from the accessibility team's Angular WCAG 2.1/2.2 AA audit, 2026-09-15) is the reference for a11y evidence and test code. The enforceable rules and the UI floor are part of the check before every pull request.

## D-067 · Accepted · eslint-plugin-jsx-a11y and the first accessibility fixes

- Added `eslint-plugin-jsx-a11y` (dev dependency) and enabled its recommended rules in `eslint.config.mjs`. The plugin is already registered by `eslint-config-next`, so only the rules are spread in.
- Six rules are off, each with the reason in the config: `anchor-has-content` (forwardRef anchors take children from spread props), `click-events-have-key-events`, `interactive-supports-focus`, `no-static-element-interactions` (combobox options are driven by `aria-activedescendant`, per the APG), `no-autofocus` (dialogs focus their first field on purpose) and `label-has-associated-control` (`Label` is a generic wrapper; callers pass `htmlFor`).
- Contrast: `--color-destructive` 60.2% → 48% L and `--color-muted-foreground` 46.9% → 46% L; `text-slate-400` → `text-slate-500` (44 uses) and `text-amber-600` → `text-amber-700` (4); avatar initials use `text-foreground` on `bg-brand-avatar`, which keeps the Aurora colour while passing 4.5:1.
- `AppShell` renders the "Skip to main content" link as the first focusable element and `<main id="admin-main" tabIndex={-1}>`.
- Nav search wraps its captions and shortcut grid in a `role="group"` so the listbox only owns option/group children.
- Field messages still appear on the change event (knockout parity) but clear as soon as the typed value is valid: User details, Contact group, File template.

## D-068 · Accepted · Access Profile details: Console layout and Briefing preview

- Refines D-065. Gautham chose the Console layout and the Briefing preview on 2026-09-16 from the Access Profile Studio.
- Site Access restores the legacy node rail (`Views/AccessProfile/Details.cshtml:78-83`): one entry per top node with its granted/total count, its permissions listed under it with a fill bar, and a search box above.
- Every action button is always visible, as in legacy (`Details.cshtml:92-95`); the expand step is gone.
- The None/View/Edit/Full control sits under the permission name in its own column, and a mixed selection shows a "Custom mix" badge on its own line, so it can never overlap the actions. Actions sit on an equal-width grid.
- Save, Cancel and Copy profile moved above the fields to match `Details.cshtml:7-32`; the sticky footer is gone. Restricted became a described row with the legend visible instead of tooltip-only.
- The Briefing preview shows pages open, actions allowed and pages closed, a plain sentence for the focused permission, the allowed and closed lists, a red "Pages they will never see" block, and the landing-page line. Every line toggles its own action.
- `src/features/users/access-profiles/briefing-text.ts` is English-only; `GeneralResources` has no keys for this wording. Same exception as `USERS_FALLBACK_ONLY`.
- Open debt: the preview still uses raw hex for the blue gradient and the rose/emerald tints. Moving them into `tokens.css` belongs with the shared tokens.

## D-079 · Accepted · Row windowing for long tables

- `src/shared/ui/use-row-window.ts` keeps only the visible rows plus a 12-row buffer in the DOM once a table passes 100 rows; a spacer row above and below holds the scroll height so the scrollbar and column widths stay correct.
- Applied to `SettingsTable` (13 screens), `UsersTable`, `ListTable`, `DevicesTable`, `RoomsTable` and `ReportTable`. Below 100 rows nothing changes, and with no layout (jsdom) the window is inactive, so tests render every row.
- No library was added: a `<table>` needs spacer rows rather than the absolute positioning `@tanstack/react-virtual` expects, and the sticky header, sticky first column and column alignment all had to keep working.
- Measured with 1,000 mocked rows at page size 200: 35 row elements in the DOM, still 35 after scrolling to the middle (first visible row 178) and 22 at the end, with no console errors.

## D-069 · Accepted · Devices and Rooms details warn about unsaved changes

Accepted by Gautham on 2026-09-21: the same Stay / Leave prompt every other details form uses.

- Legacy Cancel is a plain link to `#/Device/Index` / `#/Room/Index` (`Views/Device/Details.cshtml:20-23`, `Views/Room/Details.cshtml:21-23`). It navigates away immediately and the edits are lost with no prompt.
- React's Device details and Room details show a confirm prompt when Cancel (or a route change) would discard edits.
- Reason: losing a filled form to a mis-click is the most common complaint on the legacy screens, and the same pattern was already accepted for Lesson Types (D-051).
- Cost: one extra click for the user who really did want to discard. Because it adds a step to a workflow, it does not ship as settled parity until Gautham says yes. If he declines, the guard comes out and `docs/specs/resources/room-details.md` ("no unsaved-changes prompt on this screen") stands as written.

## D-070 · Accepted · Sorting returns to page 1

- Legacy `swgrid.sortTable` reloads without touching `currentPageIndex` (`swgrid.js:335-360`), so sorting from page 5 lands on page 5 of a different ordering (LB-073).
- React resets `pageIndex` to 0 on every sort change, in the Devices, Rooms, Readings and Suspicious lists (`nextReportSort` in `src/features/devices/readings/readings-query.ts`).
- Reason: the rows the user was looking at are the reason they sorted. Legacy already resets the page for search (`swgrid.js:369-374`); sorting was simply never given the same treatment.
- Cost: a user deliberately paging deep and then re-sorting loses their place — the same behaviour they already get from search.

## D-071 · Accepted · Reprocess and Delete render disabled, not hidden

- Legacy binds `visible: selectedItems().length == 1` / `> 0` (`Views/Device/Index.cshtml:79-87`, `Views/Room/Index.cshtml:34-37`), so the buttons appear and disappear as rows are ticked and the toolbar reflows under the pointer.
- React keeps them mounted and sets `disabled` with a reason in the accessible name when the selection does not match.
- Reason: a control that vanishes is unreachable by keyboard and unexplainable ("where did Delete go?"); a disabled control tells the user the rule. Permission-based hiding is unchanged — a user without the right still never sees the button.
- Cost: an extra greyed control on screen when nothing is selected.

## D-072 · Accepted · Rooms index shows a total-count badge

- Legacy shows no count anywhere on `#/Room`; the number only exists in the pager arithmetic (`swgrid.js:828-851`).
- React shows `Total {n}` next to the Rooms heading, from `totalRowCount` on the list response that is already fetched.
- Reason: no extra request, and it answers "how many rooms do we have?" which currently needs paging to the end. Consistent with the Devices and report screens.
- Cost: none on the wire; one more element in the header.

## D-073 · Accepted · Row selection checkboxes are hidden without Delete

- Legacy renders the select-all and per-row checkboxes for everyone (the swgrid selection column is driven by `isSelectable`, not by a permission) and only hides the Delete button (`Views/Room/Index.cshtml:34-37`).
- React renders the selection column only when the user has Rooms + Delete (Devices + Delete on the device list).
- Reason: selecting rows with no action available does nothing — it is a dead control that also adds a column of noise and a tab stop for every row.
- Cost: a user without Delete can no longer tick rows. Nothing in either screen consumes a selection other than Delete.

## D-074 · Accepted · Room capacity is validated as a whole number client-side

- Legacy Room Capacity is a plain text input with only a KO `required` rule (`Views/Room/Details.cshtml:54-56`, `roomDetailsController.js:47-52`); any string is posted and the server's model binding fails with a generic 400 (`RoomApiController.cs:115-119`).
- React requires a non-negative whole number before it will POST, with the message on the field.
- Reason: the user gets the real reason at the field instead of a generic save error after a round trip. The wire contract is unchanged — the same `capacity` value is sent in the same body.
- Cost: a value the server would have accepted but React rejects would be a regression; the server binds it to an integer, so there is none known. Decimal and empty strings fail on both sides.

## D-075 · Accepted · Delete success toast auto-dismisses after 2500 ms

- The live legacy path is `.done(…)` calling `swAlert.showDeleteSuccess()` with no duration, so the alert never closes on its own (`swgrid.js:451-457`). The 2500 ms figure quoted elsewhere comes from the unreachable `.error(status === 200)` branch at `swgrid.js:434-440` (LB-074).
- React shows the delete success toast for 2500 ms.
- Reason: a success toast that stays until the page reloads covers the list and trains people to ignore alerts. 2500 ms is the value the original author clearly intended, and matches every other success toast in the app.
- Cost: a deliberate difference from the shipped legacy behaviour, recorded here so nobody changes it back.

## D-076 · Accepted · Short dates follow the user's UI culture

- Legacy formats short dates with the thread's UI culture on the server (`Views/ReadingsReport/Index.cshtml:90-91`, `Views/SuspiciousReadingsReport/Index.cshtml:84-85`) and parses them back the same way (`DateTime.Parse(…, CultureInfo.CurrentUICulture)` in `ReadingsReportApiController.cs:52,67`, `SuspiciousReadingsReportApiController.cs:41,49`, `DeviceApiController.cs:273-286`). The React code had `dd/MM/yyyy` hard-coded.
- New shared helper `src/shared/i18n/culture.ts` formats and parses the short date from the user's UI culture, and the Devices-area screens use it.
- Reason: the server parses with `CultureInfo.CurrentUICulture`, so the client format **must** agree or a US-culture user silently files readings against the wrong day (03/04 read as 4 March instead of 3 April). A hard-coded format is a data-correctness bug, not a cosmetic one.
- The helper is a new shared file, added with this decision.
- Cost: date strings on the wire now vary by culture — exactly as they already do in legacy.

## D-077 · Superseded by D-126 · Battery gauge colours are tokens, lightened to pass contrast

- Legacy paints the battery bar with raw hex thresholds in the view (`Views/Device/Index.cshtml:145-157,199-205`: above 40 green, above 15 amber, else red). The percentage label sits on the fill, and the legacy greens and reds do not reach 4.5:1 behind it.
- React defines `--color-battery-ok`, `--color-battery-low` and `--color-battery-critical` in `tokens.css`, each lightened until the label holds 4.5:1 at every fill level, and the thresholds stay 40 / 15.
- Reason: §8 forbids reproducing a contrast failure, and §9 forbids raw hex in a component. The thresholds are business rules and are unchanged; only the paint moved.
- Cost: the bars are visibly lighter than legacy. Colour is not the only signal — the percentage is always written out.

## D-078 · Accepted · The invented "Low battery" quick-view filter was removed

- An earlier React pass added a "Low battery" quick view on the Devices list with a 0–20 threshold.
- Nothing in legacy defines 20: the only battery thresholds that exist are the 40 / 15 display bands (`Views/Device/Index.cshtml:145-157`) and the user-set `batteryPercentMin` / `batteryPercentMax` filter, which defaults to 0–100 (`deviceIndexController.js:111-137`).
- Reason: a number with no source in legacy is a guess, and a guess in a filter quietly hides devices. The battery min/max filter already covers the need and lets the user pick their own threshold.
- If a "low battery" definition is wanted, it needs a product decision and a stated number, and comes back here as its own entry.

## D-103 · Accepted · Contacts columns stay unsortable

- The legacy Contacts grid shows sortable headers but never sends a sort parameter and never sorts in the browser (LB-077). The behaviour is a defect, not a feature, so React does not reproduce it.
- If sorting is genuinely wanted, `ContactApi` must accept a sort column and direction first. Raise it with the backend team rather than sorting one page client-side, which would sort only the rows already loaded and mislead the user.

## D-104 · Pending · "Requires Approval" needs the approval subscription flag

- Legacy shows the Requires Approval toggle on the Activity Type screen from `ViewBag.HasApprovalSubscriptionAccess`, which the controller reads through `IPermissionApiClient`. It is a subscription check, not a permission check.
- React currently gates the toggle on the Scheduled Activity Access permission (`ActivityTypeDetailsScreen.tsx`), so the field can appear for a tenant without the subscription and hide for one with it.
- No API the React Admin already calls returns that flag. **Blocked pending a backend answer:** which endpoint can return the approval subscription state for the current tenant. Until then the code is left as it is, and this difference is a known gap.

## D-105 · Accepted · Job Schedule "When" column describes hourly and every-minute jobs

Legacy renders the When cell with `prettyCron.toString` (`Views/JobSchedule/Index.cshtml:56`), which
describes hourly and every-minute expressions (`prettycron.js:118-132`). Our `describeCron` only covered
the three builder periods, so any other shape printed the raw cron string. Real data is full of these:
`C:\Seats\Mocks\JobSchedule\Job.json` holds `0 * * * *` twice.

`describeSubDaily` in `cron.ts` now covers every-minute, hourly on the hour, N minutes past the hour and
every-minute-of-an-hour. The builder still offers only day/week/month, matching `jquery-cron.js:146-147`,
so these shapes continue to open in Advance. Expressions the parser cannot place still show raw, as legacy does.

Sentence wording stays in our style ("Every hour, on the hour") rather than prettyCron's ("04:00 every day").
The strings are English in `cron.ts` because `GeneralResources` has no keys for them and legacy's prettyCron
was English-only. Same accepted exception as the other English-only helpers.

## D-080 · Accepted · Lesson Type tenant flags fail loudly, never silently "off"

Parity audit of the Lesson Types area, 2026-09-16. The two tenant-driven columns and fields
(Attendance Scaling from `Attendance_By_frequency`, Consecutive Attendance Update from
`Attendance.ConsecutiveAttendanceUpdate`) have no API. Per D-051 each screen scrapes the legacy
partial it replaces and infers the flag from a rendered element id. That side channel had two
failure modes, both invisible to the user:

- `readTenantFlags` returned `{false, false}` for **any** html, so a sign-in page, an error page or
  a renamed id read as "both tenant settings are off" and the two columns silently disappeared with
  no error at all. It now returns `null` unless the response contains the `api/LessonTypeApi` url
  that both partials print in their init script (`Index.cshtml:154`, `Details.cshtml:142`), and
  `fetchLessonTypeFlags` turns that into a failed read.
- The list treated a failed flag read as a failed list: `status` went to `error` and the user saw
  "There was an error while processing your request." with no lesson types, although the list
  request had succeeded. The list now shows the data with the two flag-dependent columns hidden and
  an information notice, which is what the details screen already did
  (`LessonTypeDetailsScreen.tsx:117-129`). Checkout columns are unaffected because they come from a
  permission, not from the partial.

A real flag read failure therefore degrades to "fewer columns plus a visible notice", never to
"wrong columns with no warning" and never to "no data".

## D-082 · Accepted · Student workflow move preserves the legacy action contract

- Legacy posts `studentsAction` to `api/CaseApi/updateWorkflowActions`; the body contains `workflowId`, `stageId`, `isOnHold`, `nextChangeDate`, `onHoldExpiryDate`, `comment`, `studentsSelected` and workflow `type` (`seats-admin-workflow-student.html:578-592,889-895`).
- React posts the same fields to `caseapi/updateWorkflowActions`; `closedUserId` remains a harmless client default because the controller replaces it with the signed-in user (`CaseApiController.cs:1118-1129`).
- The previously failing test was caused by jsdom lacking `scrollIntoView`, so the Radix stage selector crashed before submission. The product payload was correct and remains unchanged.

## D-081 · Accepted · Lesson Types: id 0, the summary timeline, and error tone

Closing the Medium and Low findings of the 2026-09-16 parity audit (see D-080 for the two High ones).

**Id 0 stays "not found", deliberately.** `swapp.getIdFromQueryString()` returns 0 for
`#/LessonType/Details` with no id, and `LessonTypeApiController.cs:53-56` answers that with an empty
`LessonTypeDto`, so legacy opens a blank form. That form is a dead end: there is no Add button
anywhere on the index (`Index.cshtml:14-17` is an empty pill bar) and `Post` rejects `Id <= 0` with
"Invalid id" (`:86`), so the only possible outcome is a save error. `parseLessonTypeId` therefore
rejects `0` and the screen shows the not-found panel. Do not "fix" this back to a blank form without
a real Add flow and a server that accepts it.

**A missing record and an unreadable body are now different states.** `parseLessonTypeView` returns
`notFound` for the empty DTO (Id 0) and `malformed` for a body with no readable detail;
`fetchLessonType` throws on `malformed`, so the screen shows the error state with Retry instead of
claiming the lesson type does not exist. The list is the opposite case and stays as it is: Alpha
returns a bare `null` for a tenant with no lesson types, and `swgrid.js:710` binds
`responseData == null ? []`, so null is the empty state and never an error. Rows with no usable `id`
are dropped, because the detail link and the React key both need one — legacy renders such a row but
its own detail link is broken too.

**The summary timeline is an accepted addition with no legacy counterpart.** `LessonTimeline.tsx`
takes the three cut-off values already on screen plus `isAbsenceBasedOnStart`, and renders. It calls
no API, holds no state, has no callback and is never part of the save payload; it is excluded from
`toLessonTypePayload`. It draws only when all three values are non-negative whole numbers and shows
its incomplete message otherwise, so a partly filled or negative form cannot produce a misleading
picture. Display only — changing it can never change stored data.

**Save errors are red, as in Devices.** `LessonTypeDetailsScreen.tsx` now raises the save failure
notice with tone `error` (the existing red styling of `LessonTypeNoticeBar`) rather than the neutral
tone that mirrored legacy's `swAlert.showGray`. An error looks like an error in every area. The
validation notice stays neutral: it is a "fill these in" prompt, not a failure, and keeps legacy's
4 s timing.

## D-108 · Accepted · Lesson type cut-offs are nullable in the contract

- `src/types/lesson-types.ts` now types earlyCutoff, lateCutoff, absenceCutoff, percentageCutoff and checkoutCutoff as `number | null`.
- Evidence: `Scripts/controllers/lessonTypeDetailsController.js:37-52` declares the cut-offs as `ko.observable(null)` extended with `required`. Legacy starts them empty and refuses to save while one is blank; it never writes a number the user did not type.
- React previously coerced a blank or non-numeric value to 0, which both invented data and allowed a save legacy would have blocked. The form keeps the fields as strings and the required rule fires with legacy's message and timing.
- Typecheck is clean across the repo after the change.

## D-106 · Accepted · Job Schedule: hidden fields, the module cap, and English schedule text

**Hidden fields never decide a save.** Percentage and Minutes belong to type-specific sections. Legacy kept
whatever the hidden observable held and posted it, so junk text reached the server and came back as a 400
the user could not act on; our earlier code converted it to `null` and saved silently, which is worse.
`withVisibleDefaults` now drops only text that cannot be posted as a number, and only from a section the
type change has hidden. Values the server can accept still survive being hidden, keeping D-050.

**The module cap is now visible.** `JobScheduleApiController.cs:222` returns at most 100 modules with nothing
on the wire to say the list was cut, so a user could fail to find a module and never learn why. When exactly
100 options come back the dropdown adds one quiet line telling them to keep typing. No redesign; the line is
`role="presentation"` so it never reads as a selectable option. The cap is passed in by the screen, so no
other lookup gains a cap it does not have.

**English schedule sentences stay English.** Searched `Seats.Trunk.Resources/GeneralResources.resx` for
EveryDay, EveryHour, EveryMinute, EveryWeek, EveryMonth, OnTheHour, MinutesPast and Every: zero matches.
No key exists to translate a schedule sentence, and legacy's prettyCron was hard-coded English too
(`prettycron.js:93-132`). `describeCron` and the new cap line therefore stay literal English in the feature
folder. This is a recorded choice, not an oversight; if Admin is ever localised, these need new resource keys.

## D-083 · Accepted · Case trees expose incomplete server data instead of hiding it

- A Case deep link now resolves its ancestor chain before selecting a nested stage, rule group, rule, trigger or attribute. Only ancestors on the resolved path expand; ordinary workflow opening remains collapsed like legacy's level-by-level navigation.
- Failed child requests remain failed and show Retry instead of being cached as an empty branch. Empty and duplicate labels receive stable id-based labels, and the breadcrumb contains the complete loaded path.
- Case pagers use the greater of the reported total and the number of rows demonstrably returned through the current page. This prevents an inconsistent zero total from hiding real rows while preserving valid server totals.

## D-110 · Accepted · One failure language: five shapes, brand blue, and a real error boundary

Gautham reviewed five designs (artifact "Admin Failure States") and accepted all five as **one
language at five sizes**, not five competing looks. Implemented 2026-09-16.

**Colour.** A failure the user did not cause now wears the SEAtS blue, not red. `tone` on
`ErrorState` is `signal` (brand, default), `warning` (amber — session expired, no permission, safe
mode blocked the write) or `danger` (red — kept for destructive confirmations and field validation).
Red no longer means "we could not load it".

**Shapes.** `variant` on `src/shared/ui/ErrorState.tsx`:

- `page` — Full Stage. The whole route failed. Brand-gradient medallion carrying the SEAtS ONE logo
  with the state icon as a badge, soft brand wash, message, hint, Retry plus an optional second
  action, and the reference in mono underneath. Applied to the 15 whole-screen failures.
- `strip` — Inline Strip. One table or panel failed while the rest of the page works; headers,
  filters and toolbar stay usable. Applied to the 7 table bodies.
- `card` — Quiet Card. The default, so all remaining call sites kept working unchanged.
- `panel` — Signal Panel. Severity rail, state tag, and a closed `Technical details` drawer built
  from `facts`. Nothing in that drawer is raw: reference, screen, status, time only.
- `detail` — Diagnostic. The exact error in plain rows. Gautham dropped the earlier
  "signed in / connection" checklist: it invented checks we do not actually run.

Labels for the drawer and the fact rows are props, never literals, so text stays resource-driven.

**The error boundary — the part that stops raw code reaching the screen.** `src/app/error.tsx` and
`src/app/global-error.tsx` are new. Anything thrown while rendering a route is caught and drawn as
the Full Stage screen instead of a white page or a stack trace; `global-error.tsx` covers the root
layout itself failing and brings its own `html`/`body`. **This Next version passes `retry`, not
`reset`** (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`).
Only `error.digest` is shown — never the message, never the stack. Neither file logs to the console:
the lint rule forbids it, suppressions are not allowed, and Next already reports the cause to the
server log and the dev overlay.

Boundary text is English constants in the file, following `src/app/loading.tsx`. A boundary cannot
fetch its own wording — the resources call may be exactly what failed.

## D-084 · Accepted · Atrium is the failure language; Console dropped

Gautham reviewed the two systems (artifact "Atrium & Console") and chose **Atrium for every
full-screen state** — page could not load, no permission, session expired, not found, unexpected
problem. Console was rejected as a full-screen layout. Implemented 2026-09-16, replacing D-083's
five shapes with three.

`ErrorState` variants are now `page` (Atrium), `panel` (centred inside a table or card) and `card`
(the compact default). `tone` stays signal/warning/danger; `glyph` picks the mark —
connection, permission, session, missing, problem.

- **Atrium** is a full-bleed split filling at least 68vh: a pulsing state label, a large headline, a
  supporting sentence, the actions, and a quiet reference line; on the right a plate with a 22s
  colour drift, a ruled ground, two breathing rings and a floating glyph. Below `lg` the plate is
  hidden and the words take the full width.
- **Panel** is centred in the table body with the action under the message, so the headers, filters
  and toolbar around it stay usable — Gautham's "console in the body, button in the middle".
- **Empty stays quiet and grey.** `EmptyState` gained two breathing rings around its icon
  (`state-ring`), which is the "outer layer moving" he asked for. It is not an error and never
  borrows the failure styling.

**Motion** lives in the shared layer as `state-drift` (22s), `state-float` (9s), `state-ring` (5.5s)
and `state-dot` (2.8s). All four are listed in the `prefers-reduced-motion` block, so the screens go
completely still when the viewer asks.

**Copy.** `GeneralResources` supplies only the headline, so `ERROR_FALLBACK_ONLY` in `ErrorState.tsx`
carries a professional state label and supporting sentence that the Atrium falls back to. This
avoids editing 15 screens to add wording and keeps one voice. `retryLabel` is now optional: a state
that cannot be retried (no permission, session expired, not found) shows no Retry button, because a
control that cannot possibly work is worse than no control.

A defect from D-110 is fixed here: the logo plate was a square holding a wide wordmark, so
"SEAtS ONE" was clipped and the badge covered it. Atrium drops the logo plate entirely.

## D-107 · Accepted · A new user or contact group requests the literal `Details` segment

`WebApiConfig.cs:20-24` routes `api/{controller}/{id}` with an optional id. With **no** segment the selector
picks the parameterless overload — `UserApiController.cs:59` and `ContactGroupApiController.cs:70` — each a
flat list of every record. With a **non-numeric** segment the request reaches `Get(int? id)`
(`UserApiController.cs:131`), `id` binds as null, and the new-record branch at `:146-156` returns the model
the form needs: `SeatsAuthorisationByPersonas`, `SeatsAuthenticationByOurIdentityProvider` and a seeded
`Personas` list.

Legacy never sent a bare URL: `swapp.js:466-482` hands the hash tail — the literal string `Details` — to
`userDetailsController.js:448`. We were sending `UserApi/` and `ContactGroupApi/`, so `parseUserDetails` read
`.detail` off an array and produced an empty form: no password field, no personas tab, no access-profile
options, and Save posted a user with no password and no error shown.

Both now send `Details` for a new record, matching legacy exactly and matching the pattern this repo already
uses at `ActivityTypeDetailsScreen.tsx:84`. Tests assert the URL on both screens.

Not verified at runtime: proving the server's response shape needs a signed-in session, which safe mode and
the login flow prevent here. The controller source is unambiguous, but this is code evidence, not a live call.

## D-109 · Accepted · The React Zoom callback page never completes the link

`IntegrationApi/ZoomResponse/{code}` is a `[HttpGet]` that performs a write: it calls `CreateUserAccount`
and links the tenant's Zoom account (`IntegrationApiController.cs:52-83`). Our API client applies the safe-mode
write guard and the `RequestVerificationToken` only to non-GET requests (`client.ts:63-72`), so this was the
one path that still wrote real data in a read-only deployment — and it ran from a read hook whose Refresh
button re-issued the same OAuth code.

Zoom never returns to React: `IntegrationController.cs:29` builds `redirect_uri` on the legacy host and `:52`
redirects to the legacy hash route. `docs/specs/integration/integrations.md:8` states the callback stays legacy.
The React page was therefore reachable only by typing its URL, and doing so linked an account.

`ZoomReturnScreen` now makes no request at all: it explains that linking finishes on the legacy Admin and links
back to Integrations. `fetchZoomResponse` is removed as dead code, and the page no longer reads the `code`
parameter. A test asserts no `ZoomResponse` call is ever made.

The files are kept rather than deleted, because deleting a route is not reversible here (this working copy is
not a git repository) and removal needs Gautham's word. The safe-mode gap itself — classifying writes by
endpoint rather than by HTTP verb — is a `src/shared/api` change and stays with that owner (audit D3).

## D-085 · Accepted · More contains separate destinations, not one combined workspace

Legacy `_Layout.cshtml:121-148` defines Imports, Engagement, Students, Integrations and User Notifications as independent menu destinations. `swapp.checkMenuVisibility` merely moves overflow entries beneath the label “More”; it does not turn them into sibling tabs for one area.

React therefore keeps each destination’s own internal rail: Imports, Integrations and Notifications have one entry; Engagement has Configuration and History; Students has its three GDPR screens. The `/more` route is only the overflow landing page. Zoom is a child screen of Integrations, so it retains the Integrations rail while its single h1 names the page “Zoom”.

## D-086 · Accepted · Import processing requires both Import access and Add

Legacy `Views/Import/Index.cshtml` renders Process File only for Import + Add, while page access remains Import + Access. React now applies the same split: an Access-only user can inspect the page and file requirements but cannot select and submit an import. The request remains `PUT api/ImportApi` with `selectedImportTypeId` and `file`; safe mode continues to block the write.

## D-087 · Accepted · Returned Engagement rows outrank an impossible zero total

Engagement History uses `totalRowCount` for its announced total and pager, but the rows already returned by the same response are stronger evidence that the result is non-empty. Its parser now clamps the total to at least the number of valid returned rows. This preserves the server count when it is credible and prevents a populated first page from being labelled “Total 0” or losing paging because of a stale count.

## D-111 · Accepted · Every short date goes through the shared culture helper

`_Layout.cshtml:214` sets `globalDateFormat` from the signed-in user's UI culture, and the server parses the
value back with `CultureInfo.CurrentUICulture` (`StudentDeleteApiController.cs:339,345`,
`EngagementApiController.cs:388-392,131-135`). The two therefore had to agree, and in legacy they always did.

Four areas had written their own `dd/MM/yyyy` helper instead of using `src/shared/i18n/culture.ts`, which the
devices area already used correctly. On a tenant whose culture is not day-first, `05/09/2026` was read as
9 May and `13/09/2026` threw: the GDPR deletion queue showed the wrong students, and Engagement ReCalculate —
a write — recomputed the wrong period.

`students/shared/student-list.ts`, `engagement/configuration/engagement-models.ts` and
`notifications/notification-list.ts` now delegate to `formatShortDate`. The notifications helper still reads
UTC parts exactly as `swapp.js:2213-2215` did; only the order and separator follow the culture. A students
test asserts the output changes under `en-US`, so a fixed pattern cannot come back unnoticed.

Still open (audit J8): the students date window is seeded from the browser clock, where legacy used
`ViewBag.NowWithTimeZone`. The tenant's "now" is not exposed to React, so that one needs a backend answer.

## D-088 · Superseded by D-097 · Engagement History exposes CSV export only

Legacy renders its PDF action with the export permission gate and leaves CSV available; the current page contract records that PDF is not shown. React had exposed both actions. History now keeps only CSV, while retaining the same `ExportEngagementStats` / `ExportEngagementStudentScore` request and `exportTo: 1` body.

## D-089 · Accepted · Cron validation accepts whatever Cronos parses

WorkflowApiController.cs:1586-1598 and JobScheduleApiController.cs:454-466 validate by calling
Cronos.CronExpression.Parse and accepting anything it takes. That includes the six-field form with seconds and
the @daily style macros. The legacy stage editor has no client-side cron check at all
(seats-admin-workflow-creator-stages.html:256 is a plain text input), so React's five-field rule was stricter
than both, locking an admin out of an expression the server would have saved. isValidCronExpression now accepts
five or six fields and the macros; the server stays the authority.

## D-090 · Accepted · Case attributes are matched by enum id, never by display name

WorkflowStageRuleGroupsRuleAttributes.cshtml:44 and WorkflowStageRuleGroupsTriggerAttributes.cshtml:60-64 key
their special handling off CfcWorkflowRuleDefinitionAttributesEnum and CfcTriggerTypeAttributeEnum ids read
from Seats.Trunk.Contracts.dll. React had been matching the display name with a regex, so a renamed or
translated attribute silently lost its picker and an unrelated attribute could gain one. Both now match ids:
lesson type 15 and 16; template 23 and 15; contact 18, 16, 17; function 30, 28, 29; stage 1; manual 6.
SmsFileTemplateUniqueIdentifier (20) is deliberately excluded, as it is in legacy.

## D-091 · Accepted · C1 was a false finding: LessonTypeDto has exactly the 17 fields React rebuilds

The audit called `lesson-type-form.ts:23-47` a potential silent wipe because it rebuilds a fixed object rather
than echoing the response. Reflection over Seats.Trunk.Contracts.dll shows
Seats.Trunk.Contracts.DataContracts.LessonType.LessonTypeDto has 17 public properties and no public fields, and
they match React's 17 keys one for one. `toLessonTypeForm` spreads the parsed DTO and `toLessonTypePayload`
spreads it back, so the round trip drops nothing. No change made. The same read settles C4:
IsAttendanceBasedOnCheckout, AttendanceScaling, IsAbsenceBasedOnStartCutOff and IsMandatory are all nullable,
which is what React already models.

## D-092 · Accepted · A rule group save posts scalars only

CfcWorkflowStageRuleGroupViewModel.cs:26-30 binds CfcWorkflowStageRules, CfcWorkflowStageRuleGroupTriggers and
CfcWorkflowStageRuleGroupConstraints, and CaseApiController.cs:758-772 maps that whole view model to the DTO it
hands the service. React had been posting the fetched nested graph back, so renaming a group also resubmitted
its rules and triggers. Legacy posted its flat view model
(seats-admin-workflow-crud-behaviour.html:56), never the collections. Both create and update now send the seven
scalars only. sortOrder is kept rather than dropped: legacy omitted it and let the server default it to 0, which
is recorded in docs/legacy-bugs.md rather than copied.

## D-093 · Accepted · Devices area redesign: Live Identity, Command Bar, Tabbed

Gautham chose one direction per screen from the three-per-screen set in the redesign artifact. No field, action,
permission, endpoint or validation rule changed in any of them; the work is layout only.

Room Details — "Live Identity". A preview panel beside the form redraws from the form state as it is typed
(code, name, building, capacity). It renders nothing the form does not already hold, makes no request, and the
capacity marks are one per ten seats. The four legacy fields and Save/Cancel are unchanged.

Devices list — "Command Bar". Legacy has two filter speeds: Include-inactive and Search reload the grid at once
(deviceIndexController.js:75-77), while Site, Building, Room and Battery wait for the Search button
(_IndexFilterRow.cshtml:26-30). The two instant filters now sit on the list header, the four deferred ones sit
inside the shared FilterPanel which defaults to collapsed, so its existing trigger, count badge and chip row act
as the Filters control. Selection actions moved into a dock floating over the foot of the table, shown only when
rows are selected; it is positioned inside the table wrapper so it can never cover the pager. Toggling
Include-inactive still commits the pending draft exactly as before, which matches legacy reading the live
dropdown observables at request time.

Device Details — "Tabbed". An identity summary carries the title, serial, MAC, live In-service/Beacon badges and
Save/Cancel, and sticks to the top of the scroll area. Details and Rooms became tabs using the shared
TabIndicator. Both panels stay mounted behind `hidden`, so switching tabs never discards an edit, and a save
with a validation error forces the Details tab back before focusing the field. The summary line is a paragraph,
not a heading: the route already has one and a second with the same text would break the §8 heading rule.

## D-094 · Accepted · Devices list becomes a two-tier console; Room Details sizes to its content

Refinement of D-093 after Gautham saw it running.

Room Details: the capacity marks were removed. At 25 seats they rendered as three dots and read as a loading
indicator rather than seats. Capacity now reads as the number plus its unit. The form also stopped stretching to
the viewport: four fields never fill a page, so it sizes to its content and Save/Cancel sit directly under the
cards instead of being stranded at the foot of the window.

Devices list: the search row and the bulk actions were competing for one row. They now share it in time instead
of space — the row carries search and Include-inactive until rows are ticked, then becomes Selected, Clear,
Reprocess and Delete, tinted so the change reads as a state. Reprocess and Delete are never on screen while they
would do nothing, which also retires the floating dock from D-093. Add uses the glossy Users Add treatment.

Today / Yesterday / Last 7 / Last 30 were NOT added to the devices list. Legacy has no date filter on that
screen (Views/Device/_IndexFilterRow.cshtml has Site, Building, Room and Battery only), and adding one would
invent a filter. They already exist as the Readings Report view pills (report-filter-panel.ts:5), which is the
same row position the devices views occupy, so the two screens already agree.

## D-096 · Accepted · Cases redesign: Pipeline Canvas + Filter-first Table

Gautham chose these from docs/specs/cases/cases.redesign.html on 2026-09-17.

Workflow Admin uses a Pipeline Canvas: stage groups as lanes, stages as connected nodes, node editors in a
shared inspector. The canvas is never the only route — a Diagram/List toggle keeps StructureTree as a real APG
tree carrying every node action, so keyboard and screen-reader users lose nothing (accessibility rule in `docs/accessibility.md`).
Default is Diagram, remembered per user.

Student Workflow uses a filter-first table: stage filter as an APG tablist above a full-width table, single
student typeahead, floating selection pill.

Reading the legacy Polymer components corrected six things the earlier build prompt had wrong: the Add/Edit
Workflow dialog has only Name (max 50); the student table has 8 columns, not 4 (Stage, Approved, Attended and
Scheduled were missing in React); student search is one autocomplete routed by digit, not two inputs; the
workflow stats are grid columns in legacy; status options are Live/Disabled; and for General and Engagement
workflow types seven fields blank out while Status, Approval and Constraints are hidden entirely.

Legacy defects deliberately not reproduced: the Approved dropdown binds the wrong field; the two Move
validation messages are written to an element that does not exist so nobody sees them; three strings bypass
localisation; and a permission bug leaves Add/Delete/Edit visible to everyone while 10 of 11 drill-down
controller actions have their permission attribute commented out. React gates the UI properly; the server
already enforces. The React screens therefore show fewer buttons than legacy for lower-privileged users.

## D-095 · Accepted · Devices filter section restored to its 16/09 end-of-day version

Gautham asked for the Devices filter section to be put back exactly as it was at the end of 16/09 and not
changed again. The filter parts of D-093 and all of D-094 are reverted: Include-inactive is a switch inside
the filter panel again, the panel opens expanded, the view pills sit on the panel's own header, Battery is the
two labelled From/To inputs with no slider, and Search plus the selection actions sit in the table header. The
shared FilterPanel and src/shared/ui/index.ts are back to their original content, with no `leading` slot and no
exported view tabs. Kept, because they are not part of the filter: the glossy Add button on Devices, the Room
Details preview and sizing, and the tabbed Device Details. Do not redesign the Devices filter without asking.

## D-112 · Accepted · Devices filters apply on change; selection actions sit beside search

Gautham asked (17/09) to remove the filter panel's Search button on Devices. Site, Building and Room now
reload the grid as soon as they are picked, and Battery % From/To reload when the box is left or Enter is
pressed. This deliberately differs from legacy `_IndexFilterRow.cshtml:26-30`, which held those filters for
Search; the request body and endpoint are unchanged, only when the request is sent. Export and Add stay in
the page header and the table search box is unchanged. N Selected, Clear, Reprocess Card Swipes and Delete
move from the far right of the table toolbar to directly after the search box, behind a divider, so they sit
next to the checkbox column they act on. Supersedes the "Search in the filter panel" part of D-095.
Follow-up (17/09): Gautham moved Reprocess Card Swipes and Delete back to the right end of the toolbar;
N Selected and Clear stay beside the search box.

## D-097 · Accepted · Engagement History: PDF export restored, filters apply on change

Supersedes D-088. D-088 removed PDF on the belief that legacy never shows it. It does, to every user.
`seats-admin-engagement-history.html:383` hides the PDF link with `hiddenElement('export', _hasViewPermissions)`,
but `_hasViewPermissions` is never declared or set, and the page's `viewPermissions` has no `export` key
(`HistoryIndex.cshtml:34-39`). Read as JavaScript that returns hidden, but legacy runs Polymer 1.9.2, which never
evaluates a computed binding while a dependency is undefined, so the `hidden` attribute is never applied. Gautham's
17/09 screenshot of legacy shows the PDF icon. The CSV link's gate is commented out (`:387`).
React now offers both in a page-header Export menu, matching Devices (`ExportMenu.tsx`), with `exportTo` 0 for PDF
and 1 for CSV on the unchanged endpoints and body. The 0 comes from the compiled ExportToEnum, as Devices and Activity
already assume; it is unproven until a PDF export succeeds on Alpha.
The Search button is removed at Gautham's request, following D-112: selects, multi-selects, the date range, the
student pick and Sort by reload at once, and Containing reloads on Enter or blur. Only when the request is sent
changes. The export menu lives in the Engagement feature (`HistoryExportMenu.tsx`) because Devices' is typed to
Devices text; the two are a candidate for one shared component.

## D-113 · Accepted · Notifications uses an inbox workspace

Supersedes D-063's "no row click, selection" presentation note. Gautham approved the Notifications Inbox redesign on 2026-09-17: selecting a row opens its detail pane, the type filter is page-local, Notifications has no sidebar, and a successful delete is confirmed by a toast. The API endpoints, permission gate, safe-mode protection and delete confirmation remain unchanged.

## D-114 · Accepted · Quill dependency security update

The File Template editor uses a non-vulnerable Quill release so production dependency auditing is clean. This dependency-only security change preserves the existing toolbar, HTML conversion and approved editor design; hostile HTML remains subject to Quill's clipboard conversion and is covered by a regression test.

## D-115 · Accepted · Live notifications speak the legacy SignalR 2 protocol

The Admin site runs ASP.NET SignalR 2 (`Seats.Trunk.Admin/App_Start/Startup.cs:20` `app.MapSignalR()`, jQuery client
`Scripts/softworks/signalrManager.js`), which the modern `@microsoft/signalr` package cannot talk to. React therefore
carries a small client for that protocol (`src/shared/api/signalr-hub.ts`): negotiate, a WebSocket `connect`, `start`,
then hub pushes, with backoff reconnect and a keep-alive watchdog. No dependency is added.
The shell joins `userNotificationHub` for the signed-in user and calls `ConnectToUserNotification(userId)` on every
connect, as `userNotificationMenuController.js:10-28` does. `NewUserNotification` refreshes the bell count and the open
inbox; a reconnect refreshes once, because pushes sent while the socket was down are lost.
Unverified at runtime: it has not yet been confirmed that WebSockets reach `/Seats.Trunk.Admin/signalr` through the
dev.seats.local IIS proxy. If they do not, the connection retries quietly and nothing else on the page is affected.

## D-116 · Accepted · Upload progress uses XMLHttpRequest

`fetch` cannot report upload progress, so `apiRequest` switches to XMLHttpRequest when a caller passes
`onUploadProgress` (`src/shared/api/client.ts`). Everything else is unchanged: the same URL, verification token,
safe-mode block, session redirects and `ApiError` kinds. Import uses it for a live percentage, a Cancel that aborts the
request, and Retry after a failure or cancel; the endpoint and posted form are untouched.

## D-117 · Accepted · Engagement dataset building is built, minus the charts and Map To

The Model Details page now carries the legacy Dataset Building panel
(`seats-admin-engagement-model.html:274-413`): its own rule editor, which adds College Year to the
categories (`seats-admin-engagement-model-rule.html:68`), the withdrawal and assessment ranges with their
option lists, the three student counts, Calculate and Export profile set.
`CountStudentsInModelBuildingCalculation` joins the read-only POST allow-list: it only counts
(`EngagementApiController.cs:453-459`).
Legacy rules kept as they are: the total is the withdrawal and assessment counts once a withdrawal range is
set, otherwise the rules count (`:907-910`); Export is disabled while that total is zero (`:852-855`); and
the assessment dates and types are sent only when both switches are on (`:1384-1395`). React adds a note
saying so, because in legacy the assessment block silently does nothing without a withdrawal range.
The Calculate badge counts how many parts of the request have changed since the shown counts were worked
out, which replaces the legacy per-field `_filtersSelected` bookkeeping with the same visible result.
Still legacy-only and linked as such: the two prevalence charts and Map To. Run node is built on the React page (`NodeTree.tsx`, `POST RunNode`; a write, so it stays behind the safe-mode guard — decided 2026-09-21). Map To is not built
because its options mix synapse ids with node ids and needs a runtime check first.

## D-118 · Accepted · A page total is never raised from an empty page

`pageTotal` (`src/shared/api/page-total.ts`) clamps a server total up to the rows on screen only when rows
came back. Clamping an empty page asserted `pageIndex * pageSize` rows that do not exist, which hid the
Activity pager and stranded the reader on an empty page 2 (the Audit API answers 200 with an empty page when
its service fails, `docs/specs/users/audit.md:82`).
`pageEnvelope` in the same file is the shared shape check: a successful body that is not `{ items: [],
totalRowCount: n }` raises a parse error instead of rendering as an empty list. Users, Devices, Rooms,
Readings, Suspicious Readings, Activity, Developer Keys, Engagement History, Notifications, Students,
Settings Resources and Settings Contacts all go through it.

## D-119 · Accepted · The jsdom selector recursion is patched in the test setup

Opening one popper-positioned Radix menu in jsdom took about 18 seconds: jsdom 26 ships nwsapi 2.2.27, whose
`:fullscreen` check calls the same selector engine again, so a single `matches()` became 62 million of them
(measured with a CPU profile). Every suite that opens a Select, dropdown or date picker paid it, which is why
Import and Student Workflow carried 60 s and 90 s timeouts and still failed under load.
`jest.setup.ts` now answers `:fullscreen` and `:modal` directly, because nothing under test is ever
fullscreen or a modal dialog, and stubs `ResizeObserver` and `IntersectionObserver`, which jsdom lacks.
The inflated per-suite timeouts are gone with it. The whole suite runs in about 20 seconds instead of 150,
and the Import flake it was masking is gone. No application code changed: this is a jsdom defect, not a
defect in the app.

## D-120 · Accepted · Shared API client follows legacy session, message and empty-body rules

2026-09-21. Closes audit findings D1, D2, B1, B2, J1, J2, J3, J14 (2026-09-16 parity audit).

- **401 stays on the page, 403 forces a login** (`swapp.js:173-194`). `client.ts` and `legacy-view.ts` redirect on 403 only; a 401 is an `auth` error that `ErrorState` shows as _Not authorised_ with the no-access art. The per-call `authRedirect` option is kept for compatibility but no longer changes behaviour.
- **Server message only on 400** (`swgrid.js:444-447`). Any other failing status carries `serverMessage: null`, so screens fall back to their own text and raw exception detail never reaches the page. Every feature call site already guarded on `status === 400` or had a fallback, so no screen changes.
- **Empty 200 body on a read is a failed load** (`swgrid.js:429-451`), raised as `parse`; writes may still return an empty body.
- **Anti-forgery safety net.** A write answered with 400 whose body mentions the anti-forgery token re-reads the legacy layout once and retries once. Recorded as a safety net, not as legacy parity: no evidence yet that the token rotates within a session.
- **Malformed claims are an error, not an empty profile.** A successful `GetClaims` whose body is not an array puts the shell in the error state with Retry instead of rendering locked-down.
- **Screen resources cached per culture; misses remembered**, so a culture switch never serves the old language and absent keys are not re-requested on every mount.
- **Sign-out clears the `seats-admin:*` namespace** in local and session storage (menu link and forced sign-out both).

Follow-up for feature owners: `DeviceDetailsForm`, `DevicesIndexScreen`, `ReadingsReportScreen`, `RoomDetailsForm`, `RoomsIndexScreen` silently `return` on `kind === 'auth'` because they assumed a redirect was already happening; with 401 no longer redirecting they should show the Not-authorised state instead.

## D-121 · Accepted · J8 and I3 need backend contracts; React records the gap instead of guessing

2026-09-21. From the time-zone and scraper research done the same day (notes kept outside the repository).

- **J8 — GDPR default date window.** Legacy computes "now" server-side through `IDateTimeWithTimeZone.GetNow()`; nothing exposes the tenant time zone or a tenant-local "now" to the browser (no claim, no `SettingsApi` key, no resource). React keeps the browser clock and the audit row stays open until the Admin API returns tenant-local now. Backend ask: a read contract (for example `GET api/SettingsApi/Now`) built on `IDateTimeWithTimeZone`.
- **I3 — Zoom Connect URL.** `IntegrationController` assembles the OAuth URL server-side from `Integration.Zoom.ClientId`, `Integration.Zoom.AuthUrl` and a computed `redirect_uri`; no JSON endpoint returns it. React keeps the page scrape, but must surface a visible error when the scrape misses and must pass the scraped `href` through untouched (no `new URL().toString()` round-trip, which re-encodes `redirect_uri`). Backend ask: `GET api/IntegrationApi/ZoomAuthUrl` returning the URL as JSON.
- **I1 — Battery column** is _not_ a backend ask: legacy reads `Device.BatteryPercent.Enabled` from tenant settings (`DeviceController.cs:30-33`), and `SettingsApi/GetSettingByKeys` accepts any key list. Planned: React reads that key through its settings call and drops the scrape of `Device/Index`, once confirmed against a live tenant. Until then `devices-api.ts` still scrapes.

## D-122 · Accepted · E4, J16, J18 are inherited server behaviour and stay documented, not fixed

2026-09-21. Job-schedule delete stopping at the first failure (E4), the activity log swallowing exceptions and returning zero rows (`AuditController.cs:162-166`, J16) and `ReprocessSwipes` returning a count no UI shows (J18) all live in the legacy controllers. React reproduces the visible behaviour and records each in `docs/legacy-bugs.md`; the audit rows are closed as _inherited_.

## D-123 · Accepted · Duplicate legacy-bug numbers renumbered without moving anything

2026-09-21. `docs/legacy-bugs.md` carried two LB-075 and two LB-076. The later entries became **LB-077** (Contacts column sorting does nothing) and **LB-078** (renaming a rule group resets its sort order); the two references to them were updated. Existing numbers were not shifted, so every other citation stays valid. `D-108`/`D-109`/`D-110` are unique but out of order in the file; left as is.

## D-124 · Accepted · C1, C2, C4 close on the compiled contracts; I1 and I2 planned as settings reads

2026-09-21. The DTOs bound by the Admin API live in `Seats.Trunk.Contracts.dll` (read by reflection only; no config file opened).

- **`LessonTypeDto` has exactly 17 properties**: Id, Name, Description, EarlyCutoff, LateCutoff, AbsenceCutoff, PercentageCutoff, CheckoutCutoff, IsAbsenceBasedOnStart, IsAttendanceBasedOnCheckout (`bool?`), AttendanceScaling (`int?`), IsGPSEnabled, IsActive, GlobalId, IsConsecutiveAttendanceUpdate, IsAbsenceBasedOnStartCutOff (`bool?`), IsMandatory (`bool?`). `parseLessonType` / `toLessonTypePayload` carry all 17, so a save cannot drop a server property. **C1 closed.**
- **C4 closed:** the two "[None]" fields React posts as `null` (`isAttendanceBasedOnCheckout`, `attendanceScaling`) are nullable in the contract, so `null` and an omitted property bind identically.
- **C2 was already closed:** `toRuleGroupBody` (`case-api.ts`) posts the seven scalars only; the three `List<>` collections on `CfcWorkflowStageRuleGroupDto` never leave the browser.
- **I2:** `LessonTypeController.cs:17-56` derives the three tenant flags from settings `Attendance.ConsecutiveAttendanceUpdate`, `Attendance_By_frequency` (== ByDuration) and the claim `LessonType/CheckOutPolicy`. Planned, same path as I1 (D-121): read the two keys through `SettingsApi/GetSettingByKeys`, take the claim from the profile and drop the HTML scrape — after one live check that `GetSettingByKeys` returns the same store the MVC controllers read. Until then `lesson-type-api.ts` still scrapes.

## D-125 · Accepted · Audit items closed on 2026-09-21 (D4, G4, G5, G6, J7, J13, C5)

Gautham took the recommendations on 2026-09-21.

- **D4 fixed:** `ImportApi/validateFile` (PUT) is on the safe-mode allow-list (`READ_ONLY_PUT_PATHS`): `ImportApiController.cs:259-279` parses the file and returns its errors, storing nothing. Upload stays blocked.
- **G4 fixed (follow legacy):** branding Save posts the rows that exist and leaves a field without a setting row unchanged, then reports it (`SettingsApiController.cs:61-77` saved whatever arrived). Before, one missing row refused the whole save.
- **G5 closed, no change:** when the licence count comes back null, legacy saves straight away (`seats-admin-customfield.html:929` calls `_modalVisibilitySave`); React already does the same.
- **G6 closed, no change:** typing in the student box after choosing a student clears the chosen id on purpose — the text no longer names that student.
- **J7 closed, no change:** an unknown building falls back to the first option exactly as the legacy select does (`Details.cshtml:38`, no caption).
- **J13 closed, no change:** "Use default colours" only edits the draft; Save is a separate click and Discard restores it. Nothing is posted by the reset itself.
- **C5 closed, no change:** a field that was null on the server and was never touched stays null; a touched field posts its text. Legacy posts the KO model as-is, which is the same outcome for every field the user edited.
- **I1 / I2 stay planned:** the live check on 2026-09-21 returned `null` from `SettingsApi/GetSettingByKeys` for every key on the local tenant (the Config service has no rows here), so the switch from the HTML scrape waits for a tenant with settings.

## D-126 · Accepted · Battery gauge drawn as a status-bar cell with the number beside it

Approved by Gautham on 2026-09-22 when he asked for this work to land. The design is Battery A ("iPhone Glass") and Picker A in `docs/specs/resources/battery.designs.html`.

- The Devices list draws each battery as a small glass cell (`BatteryGlyph.tsx`) with the percentage written beside it, not on the fill. The thresholds stay 40 / 15 (`Views/Device/Index.cshtml:199-205`).
- The fill uses the status-bar hues (`--color-battery-good`, `-medium`, `-low` and a `-deep` shade of each in `tokens.css`). Because no text sits on the fill any more, the lightening D-077 needed is no longer required.
- Accessibility: the cell is `aria-hidden`; the number is real text and the level is given in words in the cell's title. The low number uses `--color-battery-low-deep` (about 4.8:1 on white). The low pulse and the fill sweep stop under reduced motion.
- The Battery % range filter (Picker A) shows the chosen band on the same glass cell, with two thumbs; it keeps the legacy rules (`_IndexFilterRow.cshtml:17-24`: 0-100, min at most max) and commits a bound on release, key-up or blur (D-112).

## D-129 · Accepted · One export button and one date picker across the Admin console

Gautham reported the Activity Log export button as the odd one out on 2026-09-23. It was, and the
cause was that the header-button box only ever lived as a copy-pasted class string, applied on the
pages where an Add button sat next to it and nowhere else.

- **`EXPORT_BUTTON_CLASS` / `EXPORT_ICON_CLASS`** now sit in `add-button.ts` beside `ADD_BUTTON_CLASS`.
  Activity, Devices, Readings and Engagement History all use them, so every export trigger is
  `min-h-10 min-w-[8.5rem] rounded-lg px-7` with an 18px icon, like the Add button.
  Activity was `size="sm"` (36px tall, ~96px wide, 6px radius, 16px icon); the 4px height gap is why
  its top edge sat lower than every other header button under the header's `items-end`.
- **`FileGlyph`** moved from `devices/index/ExportMenu.tsx` to `shared/ui/FileGlyph.tsx`. The Activity
  export dialog now shows the same red PDF / green CSV document glyph instead of flat grey lucide
  icons in 36px tiles. Activity keeps its radio-and-Save shape (`seats-website-export.html:30-75`);
  only the glyph and the card are shared.
- **`hidePresets` is gone.** The Activity date picker now shows the Quick and Academic rail like the
  other five date ranges. This is a deliberate step away from legacy: `seats-admin-audit.html:177`
  has no quick ranges. Reverting is one prop on `DateRangeField` in `ActivityScreen.tsx`.
- **`StartDate` / `EndDate`** were added to `USERS_TEXT`, so the two boxes translate. They were
  hard-coded English in `USERS_FALLBACK_ONLY` even though `Devices` already read the same resource keys.

## D-127 · Accepted · Cases carries the Admin page furniture, and the inspector is conditional

D-096 (Pipeline Canvas + Filter-first Table) stands. Built out on 2026-09-23 after Gautham reported
"gaps everywhere" and an Add button that did not match the rest of Admin. Measured with
`docs/pw/cases-probe.mjs`; the numbers below are from that run.

- **Add workflow moved to the page header** with `ADD_BUTTON_CLASS`, beside a `Total n` pill, as on
  Users, Activity Types and Resources. It used to be a flat `Button` at the foot of the list and a
  second copy in the narrow bar; both are gone, so there is one Add at every width.
- **The selection bar appears with the first tick.** It used to render whenever the list had rows, so
  an empty "0 Selected / Delete / Clear" block sat above the list costing ~100 px.
- **The list card stretches to the row height** (`lg:self-stretch`, was `lg:self-start`), and the
  pipeline canvas is the right column's own surface. Deepest run of empty page inside `main` is now
  **0 px** on every measured state, at 1440 px, 320 px and 200 % zoom.
- **The inspector is mounted only for a selected node or a draft.** It used to stand there empty
  saying "Select a node to edit it."; the canvas now takes the full width instead.
- **Workflow stats are a label-over-value row**, not a run of grey text. Still figures, not tiles,
  per the standing decision against big stat cards.
- **Student Workflow's count moved into the page header** as the same pill, out of the toolbar.

Accessibility fixed in the same pass, all three found by axe or by the probe, none of them cosmetic:

- The selected workflow row's "15 students" and type text were `text-muted-foreground` on the row's
  brand tint, under 4.5:1. Now `text-slate-600`.
- The active stage tab's count was `text-brand` on `bg-brand/15`, under 4.5:1. Now `bg-brand text-white`.
- **The Move panel's "Is On Hold" switch had no visible label** — only an `aria-label`, so a sighted
  user saw a bare toggle. It now carries visible text beside it, `aria-hidden` because the switch
  already owns the accessible name.

## D-128 · Accepted · The structure tree is keyed by workflow

`WorkflowStructure` is mounted with `key={workflow.id}`. Without it the tree kept the previous
workflow's `selectedKey` and cache across a switch, so the inspector asked for a node the new
workflow does not own: `GET caseapi/workflows/1/stageGroups/3` answered **404**, because stage group 3
belongs to workflow 6. The API is correct — `workflows/6/stageGroups/3` is 200. Verified by switching
away and back with a node open: **0 failed calls**.
