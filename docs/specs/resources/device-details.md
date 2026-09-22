# Device — Details

## Route

| | Legacy | React (proposed) |
|---|---|---|
| New | `#/Device/Details` | `/resources/devices/new` |
| Edit | `#/Device/Details/{id}` | `/resources/devices/{id}` |
| Cancel | `#/Device/Index` | `/resources/devices` |

Evidence: `Views/Device/Details.cshtml:20`, `Views/Device/Details.cshtml:161-174`

## Menu

- No sub-nav on details; arrived from Device index. Evidence: `Views/Device/Details.cshtml:5-26`

## Fields (main form)

| Label | Field | Control | Constraints | Notes |
|---|---|---|---|---|
| Description | `description` | Text | — | Evidence: `Views/Device/Details.cshtml:33-36` |
| Serial Number | `serialNumber` | Text | Required (KO) | Evidence: `Views/Device/Details.cshtml:39-42`, `Scripts/controllers/deviceDetailsController.js:118-123` |
| MAC Address | `macAddress` | Text | — | Evidence: `Views/Device/Details.cshtml:45-48` |
| Asset Tag | `assetTag` | Text | `maxlength="30"` | Evidence: `Views/Device/Details.cshtml:51-54` |
| IP Address | `ipAddress` | Text | `maxlength="30"` | Evidence: `Views/Device/Details.cshtml:57-60` |
| Is Beacon | `isBeacon` | Checkbox | — | Evidence: `Views/Device/Details.cshtml:63-68` |
| Is Active | `isActive` | Checkbox | Default `true` for new | Evidence: `Views/Device/Details.cshtml:71-74`, `Controllers/Api/DeviceApiController.cs:123-126` |

### Add rooms (typeahead)

| Control | Behaviour |
|---|---|
| Search room | Typeahead against `GET api/roomApi/GetRoomsByCriteria?query=`; sets `selectedRoomId` / `selectedRoomName`. Evidence: `Views/Device/Details.cshtml:77-79` |
| Add button | Disabled when no room selected; requires `Rooms` + `Edit` (not Devices Edit). Fetches `GET api/RoomApi/{roomId}` and pushes room into local grid if not duplicate. Evidence: `Views/Device/Details.cshtml:80-84`, `Scripts/controllers/deviceDetailsController.js:27-51` |

## Fields (linked rooms grid)

| Column | Field |
|---|---|
| Select | checkbox → `selectedItems` |
| Room Code | `externalCode` |
| Room Name | `name` |
| Room Capacity | `capacity` |

Evidence: `Views/Device/Details.cshtml:111-134`

- **Delete rooms from device:** Removes from `localRooms` client-side only until save; gated by `Rooms` + `Delete`. Evidence: `Views/Device/Details.cshtml:99-104`, `Scripts/controllers/deviceDetailsController.js:53-73`
- **Select all:** Header checkbox. Evidence: `Views/Device/Details.cshtml:113`, `Scripts/controllers/deviceDetailsController.js:13-26`

## Actions + API

### Load

- **Endpoint:** `GET api/DeviceApi/{id}` — returns `{ detail, rooms, distancesAvailables }`. Evidence: `Scripts/controllers/deviceDetailsController.js:150`, `Controllers/Api/DeviceApiController.cs:116-151`
- **Id parsing:** `getIdFromQueryString({ validateNumber: false })`. Evidence: `Scripts/controllers/deviceDetailsController.js:147-149`
- **New defaults:** `isActive: true`, empty room list scaffold. Evidence: `Controllers/Api/DeviceApiController.cs:123-130`
- **Edit:** Maps `detail.roomInDevices` → `rooms` list into `localRooms`. Evidence: `Scripts/controllers/deviceDetailsController.js:156-157`, `Controllers/Api/DeviceApiController.cs:144-145`
- **Not found:** 404 `Device with id: {id} was not found`. Evidence: `Controllers/Api/DeviceApiController.cs:136-140`

### Save

- **Prepare:** Collects room ids from `localRooms` into `detail.roomIdsInDevice`; sets `detail.url` to current href. Evidence: `Scripts/controllers/deviceDetailsController.js:84-92`
- **Endpoint:** `POST api/DeviceApi/` with `DeviceSaveViewModel` body. Evidence: `Scripts/controllers/deviceDetailsController.js:93-95`, `Controllers/Api/DeviceApiController.cs:157`
- **Auth:** Add OR Edit (manual check). Evidence: `Controllers/Api/DeviceApiController.cs:159-160`
- **Beacon side effect:** If `isBeacon`, server sets `beaconDistance = 10`. Evidence: `Controllers/Api/DeviceApiController.cs:165-167`
- **Room links:** `VerifyRoomInDevices` diffs room list; audit `DEVICE-ROOM` ADDED/DELETED. Evidence: `Controllers/Api/DeviceApiController.cs:188,195-228`
- **Device audit:** `DEVICE` ADDED/UPDATED. Evidence: `Controllers/Api/DeviceApiController.cs:186`
- **Success:** Toast 3.5s, redirect index. Evidence: `Scripts/controllers/deviceDetailsController.js:96-98`
- **Error:** Gray `responseJSON.message`. Evidence: `Scripts/controllers/deviceDetailsController.js:100-102`

### Cancel

- Link to `#/Device/Index`. Evidence: `Views/Device/Details.cshtml:20`

## Permissions

| UI element | Item | Action |
|---|---|---|
| MVC Details view | `Devices` | `Access` |
| Save (new) | `Devices` | `Add` |
| Save (edit) | `Devices` | `Edit` |
| Add room button | `Rooms` | `Edit` |
| Remove room from grid | `Rooms` | `Delete` |
| GET detail | `Devices` | `Access` |

Evidence: `Controllers/DeviceController.cs:37-42`, `Views/Device/Details.cshtml:9-17,80,99`

## States

| State | Behaviour |
|---|---|
| Loading | `#deviceDtlContainer` hidden until GET done. Evidence: `Scripts/controllers/deviceDetailsController.js:144,154` |
| New / Edit | Save button visibility by `id` |
| Validation fail | `fieldsWithInputValidationsMsg` via handleSaveEvent |
| Empty rooms grid | Allowed; save sends empty `roomIdsInDevice` |

## Side effects

- Save device → audit DEVICE record. Evidence: `Controllers/Api/DeviceApiController.cs:186`
- Room membership changes → DEVICE-ROOM audit per add/remove. Evidence: `Controllers/Api/DeviceApiController.cs:215-228`
- `isBeacon` → `beaconDistance` hardcoded 10 server-side. Evidence: `Controllers/Api/DeviceApiController.cs:165-167`

## Legacy bugs — do not copy

| Bug | Evidence | React approach |
|---|---|---|
| Add-room permission uses Rooms Edit, not Devices Edit | `Views/Device/Details.cshtml:80` | Preserve exact permission gate (business rule) but document clearly |
| `distancesAvailables` loaded but never shown in UI | `Controllers/Api/DeviceApiController.cs:147-150` | Omit dead UI unless product confirms |
| Mixed KO/plain objects in `localRooms` | `Scripts/controllers/deviceDetailsController.js:17-19,32-42` | Normalised model |
| `isZoned` on detailViewModel never bound | `Scripts/controllers/deviceDetailsController.js:115` | Only expose fields in spec |
| No failed GET error state | `Scripts/controllers/deviceDetailsController.js:150-157` | Error + Retry |

## Checklist

- [ ] Routes new/edit; Devices Access on route
- [ ] Form fields + maxlengths + defaults
- [ ] Room typeahead + add/remove grid
- [ ] Correct permission on add-room vs save
- [ ] POST with `roomIdsInDevice` and `url`
- [ ] Beacon distance server rule preserved
- [ ] Audit side effects on save
- [ ] Loading / validation / error states
