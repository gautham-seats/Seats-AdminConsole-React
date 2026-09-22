# Room — Details

## Route

| | Legacy | React (proposed) |
|---|---|---|
| New | `#/Room/Details` | `/resources/rooms/new` |
| Edit | `#/Room/Details/{id}` | `/resources/rooms/{id}` |
| MVC partial | `Room/Details` | — |
| Cancel target | `#/Room/Index` | `/resources/rooms` |

Evidence: `Views/Room/Details.cshtml:21`, `Views/Room/Details.cshtml:71-76`

## Menu

- Same Physical resources context as Room index (user arrives from index or main nav). No sub-nav on details view itself. Evidence: `Views/Room/Details.cshtml:6-66`

## Fields

| Label | Model field | Control | Required (client) | Notes |
|---|---|---|---|---|
| Building | `buildingId` | Select; options from `buildings`, `optionsValue: id`, `optionsText: name` | No explicit KO rule | Options loaded from GET response `buildings`. Evidence: `Views/Room/Details.cshtml:36-39`, `Controllers/Api/RoomApiController.cs:89` |
| Room Code | `externalCode` | Text input | No (commented-out validator) | Evidence: `Views/Room/Details.cshtml:42-45`, `Scripts/controllers/roomDetailsController.js:54-59` |
| Room Name | `name` | Text input | Yes (`required`) | Evidence: `Views/Room/Details.cshtml:48-50`, `Scripts/controllers/roomDetailsController.js:40-45` |
| Room Capacity | `capacity` | Text input | Yes (`required`) | Evidence: `Views/Room/Details.cshtml:54-56`, `Scripts/controllers/roomDetailsController.js:47-52` |

Hidden/metadata: `id` (0 for new). Evidence: `Scripts/controllers/roomDetailsController.js:38`, `Controllers/Api/RoomApiController.cs:74-77`

## Actions + API

### Load

- **Trigger:** `roomDetailsController.init` on page load. Evidence: `Views/Room/Details.cshtml:69-77`
- **Id from query:** `swapp.getIdFromQueryString()` — missing/0 = new. Evidence: `Scripts/controllers/roomDetailsController.js:80`
- **Endpoint:** `GET api/RoomApi/{id}` — returns `{ detail, buildings }`. Evidence: `Scripts/controllers/roomDetailsController.js:81`, `Controllers/Api/RoomApiController.cs:70-91`
- **Not found:** HTTP 404 with message `Room with id: {id} was not found`. Evidence: `Controllers/Api/RoomApiController.cs:82-86`
- **UI:** Container hidden until load completes, then shown. Evidence: `Scripts/controllers/roomDetailsController.js:77,84`

### Save

- **Trigger:** Save button `click: save`. Evidence: `Views/Room/Details.cshtml:11-17`
- **Gating:** Save (Add) when `detail().id() == 0`; Save (Edit) when `id != 0`. Evidence: `Views/Room/Details.cshtml:10-18`
- **Validation:** KO `required` on name and capacity; `swapp.handleSaveEvent` runs full validation group. Evidence: `Scripts/controllers/roomDetailsController.js:18-29`, `Scripts/softworks/swapp.js:528-576`
- **Endpoint:** `POST api/RoomApi/` with JSON body (`RoomCreateViewModel` / `RoomDto` fields + `url`). Evidence: `Scripts/softworks/swapp.js:530-533`, `Controllers/Api/RoomApiController.cs:97`
- **Auth:** Server checks Add OR Edit permission manually (not attribute). Evidence: `Controllers/Api/RoomApiController.cs:99-100,129`
- **Create vs update:** `id == 0` → Create; else Update. Evidence: `Controllers/Api/RoomApiController.cs:107-112`
- **Success:** Save success toast (3.5s), redirect to `#/Room/Index`. Evidence: `Scripts/controllers/roomDetailsController.js:22-24`
- **Error:** Gray alert with `responseJSON.message` (5s). Evidence: `Scripts/controllers/roomDetailsController.js:26-28`
- **Server validation failure:** HTTP 400 `AlertSaveErrorDefault`. Evidence: `Controllers/Api/RoomApiController.cs:115-119`

### Cancel

- Legacy: link to `#/Room/Index`, no unsaved-changes prompt on this screen. Evidence: `Views/Room/Details.cshtml:21-23`
- **D-069 (Accepted 2026-09-21):** React shows a Stay / Leave prompt when Cancel or a route change would discard edits — an added step, accepted. If he declines, the guard comes out and the legacy line above stands as the behaviour.

## React differences on this screen

| Behaviour | Legacy | React | Decision |
|---|---|---|---|
| Cancel with unsaved edits | Navigates away silently | Confirm prompt | D-069 — accepted, added step |
| Room Capacity | Plain text input, `required` only; any string is posted and the server 400s (`RoomApiController.cs:115-119`) | Must be a non-negative whole number before the POST; message shown on the field. Same `capacity` value on the wire | D-074 |
| Short dates | Server-formatted with the thread UI culture | Formatted and parsed via `src/shared/i18n/culture.ts` so client and `CultureInfo.CurrentUICulture` agree | D-076 |
| Failed GET | Container stays hidden, no message | Distinct error state + Retry | error-state convention |

## Permissions

| UI element | Permission item | Action |
|---|---|---|
| MVC Index/Details views | `Rooms` | `Access` |
| Save (new) | `Rooms` | `Add` |
| Save (existing) | `Rooms` | `Edit` |
| GET detail | `Rooms` | `Access` |
| POST save | `Rooms` | `Add` or `Edit` (server) |

Evidence: `Controllers/RoomController.cs:13-23`, `Views/Room/Details.cshtml:10-18`, `Controllers/Api/RoomApiController.cs:69-70,99-100`

## States

| State | Behaviour |
|---|---|
| Loading | `#roomDtlContainer` hidden until GET completes. Evidence: `Scripts/controllers/roomDetailsController.js:77,84` |
| New (`id=0`) | Empty `detail`, buildings list populated. Evidence: `Controllers/Api/RoomApiController.cs:74-77,89` |
| Edit | Detail from service; 404 if missing |
| Validation error | Gray `fieldsWithInputValidationsMsg` (4s) + field messages. Evidence: `Scripts/softworks/swapp.js:573-575` |
| Save error | Gray server message |

## Side effects

- **Create:** Audit `ROOM` / `ADDED` with room id, code, name; `url` appended with new id. Evidence: `Controllers/Api/RoomApiController.cs:122-125`
- **Update:** Audit `ROOM` / `UPDATED`. Evidence: `Controllers/Api/RoomApiController.cs:125`
- **Delete:** On index only (see room-index spec).

## Legacy bugs — do not copy

| Bug | Evidence | React approach |
|---|---|---|
| `externalCode` special-char validator commented out | `Scripts/controllers/roomDetailsController.js:54-59` | Follow server validation rules; do not silently drop client rules without decision |
| `buildingId` not in KO detailViewModel (relies on mapping only) | `Scripts/controllers/roomDetailsController.js:34-60` | Explicit form model |
| Capacity is text input not number | `Views/Room/Details.cshtml:56` | Numeric input, whole-number rule client-side (D-074), same API contract |
| No loading/error state for failed GET | `Scripts/controllers/roomDetailsController.js:81-85` | Distinct error + Retry |

## Checklist

- [ ] Routes new/edit with Rooms Access gate
- [ ] Load GET `api/RoomApi/{id}`; buildings dropdown
- [ ] Fields: buildingId, externalCode, name, capacity
- [ ] Required: name, capacity (client); honour server ModelState
- [ ] Save POST; redirect on success
- [ ] Add vs Edit permission on save button
- [ ] Cancel returns to index
- [ ] Loading / error states
- [ ] Audit side effects on save (backend)
