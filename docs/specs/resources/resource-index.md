# Resource (localisation strings) — Index

> Legacy has **no separate Details route** — list and edit share one screen via Polymer component `seats-admin-resource`. The edit modal is specified in `resource-details.md`.

## Route

| | Legacy | React (proposed) |
|---|---|---|
| Path | `#/Resource` | `/settings/resources` |
| MVC partial | `Resource/Index` only (no `Details` action) | — |

Evidence: `Controllers/ResourceController.cs:12-17`, `Views/Resource/Index.cshtml:17`

## Menu

- **Main nav:** Under Settings area — user opens via `#/Settings` menu item, then Settings sub-pills. Evidence: `Views/Shared/_Layout.cshtml:91-94`
- **Sub-nav pills (Settings group):** Settings, File Template, Activity Types, **Resources** (active), Custom Fields, Authentication, Contacts, GraphAPI — each permission-gated. Evidence: `Views/Resource/Index.cshtml:6-30`
- **Sub-menu visibility:** `showOrHideSubMenu` synchronously calls `GET api/UserApi/GetClaims` and hides pills without permission (duplicates KO security binding). Evidence: `Views/Resource/Index.cshtml:46-104`

## Fields (grid)

| Column | Bind | Sortable |
|---|---|---|
| Text | `value` | Yes (`value`) |
| Key | `key` | Yes (`key`) |
| Type | `type` | Yes (`type`) |

Evidence: `bower_components/seats-admin-resource/seats-admin-resource.html:236-250`

## Filters

| Filter | Control | Behaviour |
|---|---|---|
| Text search | `seats-autocomplete` min-length 2 + Search button | Sets `filters.value` from selected or typed text; resets page to 0. Evidence: `seats-admin-resource.html:198-213,460-467,500-503` |
| Type | `<select id="typesOptions">` | Options from `GET api/ResourceApi/GetTypes`; "All" + distinct types; changing type reloads grid (skipped on first populate). Evidence: `seats-admin-resource.html:216-221,543-572`, `Views/Resource/Index.cshtml:41` |
| Type autocomplete suggestions | `GET api/ResourceApi/GetResourcesByString?query=&type=` | Returns up to 20 matches for autocomplete dropdown. Evidence: `seats-admin-resource.html:173-178,488-492`, `Controllers/Api/ResourceApiController.cs:190-207` |

## Actions + API

### Initialise localisation

- **Endpoint:** `POST api/ResourceApi/GetResourcesForScreen` with body `["Save","Cancel",…]` keys. Evidence: `seats-admin-resource.html:156-163,425-429`, `Views/Shared/_Layout.cshtml:326`
- Sets component `language` from response culture key. Evidence: `seats-admin-resource.html:432-436`

### Load grid

- **Endpoint:** `GET api/ResourceApi/getResources` (case as wired in view). Evidence: `Views/Resource/Index.cshtml:39`, `seats-admin-resource.html:164-171,460-466`
- **Query params:** `value`, `cultureName`, `pageNumber`, `pageSize` (default 100), `sortCol`, `sortDir`, `type`. Evidence: `seats-admin-resource.html:368-380,465`, `Controllers/Api/ResourceApiController.cs:92`
- **Default sort field:** `Key` when none specified. Evidence: `Controllers/Api/ResourceApiController.cs:131-132`
- **Response:** `{ items, totalRowCount }`. Evidence: `seats-admin-resource.html:454-458`, `Controllers/Api/ResourceApiController.cs:161-167`
- **Empty:** Hides page-size/total label area. Evidence: `seats-admin-resource.html:455`

### Pagination / sort

- Page change → `filters.pageNumber = grid.selectedIndex`. Evidence: `seats-admin-resource.html:522-524`
- Page size change → reset page 0. Evidence: `seats-admin-resource.html:468-471`
- Sort change → reset page 0, set `sortCol`/`sortDir`. Evidence: `seats-admin-resource.html:526-531`

### Row select

- Single-select grid; row selected opens edit modal (see resource-details). Evidence: `seats-admin-resource.html:231-235,493-498`

### Add / Delete

- **Not supported** in legacy UI.

## Permissions

| UI element | Item | Action |
|---|---|---|
| MVC Index | `Resources` | `Access` |
| GET grid / types / search | `Resources` | `Access` |
| Save (modal) | `Resources` | `Edit` |

Evidence: `Controllers/ResourceController.cs:13`, `Controllers/Api/ResourceApiController.cs:58,91-92,172`

## States

| State | Behaviour |
|---|---|
| Loading | `loadingGrid` bound to seats-ajax `loading` |
| Empty | `totalData` 0; hides resource count row |
| Error on load/save | `seats-toast` error with `AlertSaveErrorDefault` fallback. Evidence: `seats-admin-resource.html:253,537-541` |
| Success on save | Success toast "Actions updated successfully". Evidence: `seats-admin-resource.html:325-327,533-535` |

## Side effects

- **Update resource:** `GeneralResources.ResourceManager.SaveResource(resource)` — persists localisation override. Evidence: `Controllers/Api/ResourceApiController.cs:63`
- Merges in-memory resource set with WCF keys for display. Evidence: `Controllers/Api/ResourceApiController.cs:112-127`

## Legacy bugs — do not copy

| Bug | Evidence | React approach |
|---|---|---|
| Synchronous blocking `GetClaims` AJAX (`async: false`) | `Views/Resource/Index.cshtml:56-65` | Async permission resolution |
| Duplicate `id` attributes on sub-nav anchors | `Views/Resource/Index.cshtml:17,23-24` | Unique ids |
| Polymer + Bootstrap modal (`$("#resource-modal").modal()`) mix | `seats-admin-resource.html:498-520` | Shared dialog component |
| `getResources` URL casing inconsistent (`getResources` vs `GetResources`) | `Views/Resource/Index.cshtml:39`, `ResourceApiController.cs:92` | Use actual routed endpoint from API |
| Paging bug: `totalPages` calculation uses `Math.Round` | `Controllers/Api/ResourceApiController.cs:154` | Correct ceiling division |

## Checklist

- [ ] Route under Settings area with Resources Access
- [ ] Settings sub-nav pills with permission gates
- [ ] Grid columns: value, key, type
- [ ] Text + type filters; search resets page
- [ ] GET `api/ResourceApi/GetResources` with paging/sort/filter params
- [ ] GET `GetTypes` for type filter
- [ ] Row select opens edit flow (resource-details)
- [ ] No add/delete
- [ ] Loading / empty / error states
- [ ] Localisation keys for labels (not hard-coded)
