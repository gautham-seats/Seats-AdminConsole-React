# Device — Index

## Route

| | Legacy | React (proposed) |
|---|---|---|
| Path | `#/Device` / `#/Device/Index` | `/resources/devices` |
| MVC partial | `Device/Index` | — |

Evidence: `Views/Device/Index.cshtml:57-58`, `Views/Device/Index.cshtml:207-223`

## Menu

- **Main nav:** Devices when `Devices` + `Access`. Evidence: `Views/Shared/_Layout.cshtml:69-73`
- **Sub-nav pills:** Room, Device (active), Readings Report, Suspicious Readings Report — permission-gated. Evidence: `Views/Device/Index.cshtml:53-65`
- **MVC Index access:** Allowed if user has Devices OR Rooms OR ReadingsReport Access (broader than grid API). Evidence: `Controllers/DeviceController.cs:19-27`

## Fields (grid columns)

| Column | Bind field | Sort column | Notes |
|---|---|---|---|
| Description | `description` | `description` | Evidence: `Views/Device/Index.cshtml:115,133` |
| In Service | `isActive` | `isActive` | Displays Yes/No. Evidence: `Views/Device/Index.cshtml:116,134-136` |
| Serial Number | `serialNumber` | `serialNumber` | Evidence: `Views/Device/Index.cshtml:117,137` |
| MAC Address | `macAddress` | `mac` | Column key `mac`; bind `macAddress`. Evidence: `Views/Device/Index.cshtml:118,138` |
| IP Address | `ipAddress` | `ip` | Evidence: `Views/Device/Index.cshtml:119,139` |
| Last Heart Beat | `displayLastHeartBeat` | `lastHeartBeat` | Evidence: `Views/Device/Index.cshtml:120,140` |
| Last Read Date | `displayLastReadDate` | `lastReadDate` | Evidence: `Views/Device/Index.cshtml:121,141` |
| Room | `roomNames` | `room` | Evidence: `Views/Device/Index.cshtml:122,142` |
| Asset Tag | `assetTag` | `assetTag` | Evidence: `Views/Device/Index.cshtml:123,143` |
| Building | `buildingNames` | `building` | Evidence: `Views/Device/Index.cshtml:124,144` |
| Battery % | `batteryPercent` | `batteryPercent` | Only if tenant setting `Device.BatteryPercent.Enabled` is true. Visual bar with colour thresholds (>40 green, >15 amber, else red). Evidence: `Views/Device/Index.cshtml:125-128,145-157`, `Controllers/DeviceController.cs:32-33`, `Views/Device/Index.cshtml:199-205` |

## Filters (legacy applies on Search click; React applies on change — D-112)

| Filter | Model | Default | API param |
|---|---|---|---|
| Include inactive | `includeInactive` | `false` | `includeInactive` |
| Site | `selectedSiteId` | null (All) | `siteId` |
| Building | `selectedBuildingId` | null | `buildingId` |
| Room | `selectedRoomId` | null | `roomId` |
| Battery min | `batteryMin` | `0` | `batteryPercentMin` (only if user touched filter) |
| Battery max | `batteryMax` | `100` | `batteryPercentMax` (only if user touched filter) |

Evidence: `Views/Device/_IndexHeaderFilter.cshtml:6-9`, `Views/Device/_IndexFilterRow.cshtml:4-29`, `Scripts/controllers/deviceIndexController.js:73-77,86-107,321-346`

### Filter lookup APIs

| Endpoint | Purpose |
|---|---|
| `GET api/DeviceApi/GetSiteOptions` | Site dropdown |
| `GET api/DeviceApi/GetBuildingOptions?siteId=` | Building dropdown (cascades from site) |
| `GET api/DeviceApi/GetRoomOptions?siteId=&buildingId=` | Room dropdown (cascades) |

Evidence: `Views/Device/Index.cshtml:220-222`, `Scripts/controllers/deviceIndexController.js:167-233`, `Controllers/Api/DeviceApiController.cs:69-103`

### Cascading behaviour

- Site change clears building + room, reloads building/room options. Evidence: `Scripts/controllers/deviceIndexController.js:185-191`
- Building change back-fills site from `building.siteId`, clears room. Evidence: `Scripts/controllers/deviceIndexController.js:192-207`
- Room change back-fills building and site. Evidence: `Scripts/controllers/deviceIndexController.js:208-233`
- Battery min/max clamped 0–100; min ≤ max. Evidence: `Scripts/controllers/deviceIndexController.js:111-137`

## Actions + API

### Load list

- **Controller:** `deviceIndexController.load` (custom, not generic). Evidence: `Views/Device/Index.cshtml:208`
- **Endpoint:** `GET api/DeviceApi/GetDevices`
- **Query:** `currentPageIndex`, `pageSize`, `sortCol`, `sortDir`, `searchFilter`, `includeInactive`, optional `batteryPercentMin/Max`, `siteId`, `buildingId`, `roomId`. Evidence: `Controllers/Api/DeviceApiController.cs:47-48`, `Scripts/controllers/deviceIndexController.js:321-346`
- **Initial sort:** `description` desc. Evidence: `Views/Device/Index.cshtml:214-215`
- **Initial load:** Grid loads twice on init (`loadGrid` then `loadGrid` with filter params). Evidence: `Scripts/controllers/deviceIndexController.js:354-355`
- **No permission:** Returns empty paged list (not 401). Evidence: `Controllers/Api/DeviceApiController.cs:50-63`

### Search (text)

- Standard `_ListSearchNavBar` server-side `searchFilter`. Evidence: `Views/Device/Index.cshtml:92`, `Scripts/softworks/swgrid.js:659-668`

### Row click → details

- `#/Device/Details/{id}`. Evidence: `Views/Device/Index.cshtml:211`, `Scripts/softworks/swgrid.js:263`

### Add

- `#/Device/Details`; Devices + Add. Evidence: `Views/Device/Index.cshtml:74-77`

### Delete

- `DELETE api/DeviceApi?ids=…`; Devices + Delete. Evidence: `Views/Device/Index.cshtml:84-87`, `Controllers/Api/DeviceApiController.cs:234-235`
- **400:** Shows `result.Message` (validation). Evidence: `Controllers/Api/DeviceApiController.cs:242-243`
- **409/Error:** Generic delete error. Evidence: `Controllers/Api/DeviceApiController.cs:240-241`

### Reprocess Card Swipes

- Visible when exactly one row selected; Devices + `ReprocessDeviceSwipes`. Evidence: `Views/Device/Index.cshtml:79-82`
- Opens modal with date picker (`dd/MM/yyyy`), default today. Evidence: `Views/Device/Index.cshtml:168-196`, `Scripts/controllers/deviceIndexController.js:8-13`
- **Endpoint:** `PUT api/DeviceApi/ReprocessSwipes?deviceId={id}&date={date}` (date parsed with current UI culture). Evidence: `Scripts/controllers/deviceIndexController.js:18-19`, `Controllers/Api/DeviceApiController.cs:273-286`
- **Success:** Close modal, save success toast. Evidence: `Scripts/controllers/deviceIndexController.js:26-28`
- **Error:** Save error toast. Evidence: `Scripts/controllers/deviceIndexController.js:23-25`

### Export PDF / CSV

- Icons call `exportTo` with `ExportToEnum` value. Evidence: `Views/Device/Index.cshtml:99-107,216-217`
- **Endpoint:** `POST api/DeviceApi/Export` with body: `searchString`, `includeInactive`, `exportTo`, `sortField`, `sortOrder`, `batteryPercentMin/Max`, `siteId`, `buildingId`, `roomId`. Evidence: `Scripts/controllers/deviceIndexController.js:275-296`, `Controllers/Api/DeviceApiController.cs:260-270`
- **Success:** Gray "report processing" message (6s). Evidence: `Scripts/controllers/deviceIndexController.js:292-294`, `Views/Device/Index.cshtml:219`

## Permissions

| UI element | Item | Action |
|---|---|---|
| Main menu Devices | `Devices` | `Access` |
| Grid data (strict) | `Devices` | `Access` |
| MVC Index view (lenient) | `Devices` OR `Rooms` OR `ReadingsReport` | `Access` |
| Add | `Devices` | `Add` |
| Delete | `Devices` | `Delete` |
| Reprocess Swipes | `Devices` | `ReprocessDeviceSwipes` |
| Export | Implicit via Devices Access (no separate gate in view) | — |

Evidence: `Views/Device/Index.cshtml:74-87`, `Controllers/DeviceController.cs:19-21`, `Controllers/Api/DeviceApiController.cs:50,106`

## States

| State | Behaviour |
|---|---|
| Loading | Standard swgrid `wasLoaded` |
| Empty | "There are no items to show." |
| Error | No list error UI; export/reprocess show toasts on failure |
| Reprocess modal | KO bindings cleaned on `hidden.bs.modal`. Evidence: `Scripts/controllers/deviceIndexController.js:299-302` |

## Side effects

- **Delete:** Audit `DEVICE` / `DELETED` and `DEVICE-ROOM` / `DELETED` per linked room. Evidence: `Controllers/Api/DeviceApiController.cs:245-252`
- **Reprocess:** Calls clocking `SetUnprocessed` for Swipe type. Evidence: `Controllers/Api/DeviceApiController.cs:279`
- **Export:** Enqueues async report for user. Evidence: `Controllers/Api/DeviceApiController.cs:264-268`

## Legacy bugs — do not copy

| Bug | Evidence | React approach |
|---|---|---|
| Duplicate `batteryMin`/`batteryMax` subscribe blocks | `Scripts/controllers/deviceIndexController.js:111-165` | Single clamp implementation |
| Double initial grid load | `Scripts/controllers/deviceIndexController.js:354-355` | One load on mount |
| Duplicate `id` on column headers (`description-col`) | `Views/Device/Index.cshtml:115-116` | Unique ids |
| `console.log` on reprocess success/error | `Scripts/controllers/deviceIndexController.js:25,29` | No debug logs |
| MVC Index allows Rooms-only users to open page but API returns empty | `Controllers/DeviceController.cs:19-21`, `Controllers/Api/DeviceApiController.cs:63` | Align route gate with data gate |

## Checklist

- [ ] Route `/resources/devices` with Devices Access
- [ ] Sub-nav pills
- [ ] All grid columns (+ conditional battery column from tenant setting)
- [ ] Filters: inactive, site/building/room cascade, battery range
- [ ] Search + server paging/sort on `GetDevices`
- [ ] Add, delete, reprocess swipes, export PDF/CSV
- [ ] Permission gates including ReprocessDeviceSwipes
- [ ] Loading / empty / error states
- [ ] Side effects documented for delete/export/reprocess
