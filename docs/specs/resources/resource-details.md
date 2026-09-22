# Resource (localisation strings) — Edit (modal)

> Legacy implements "details" as a **modal dialog** on the Resource index screen — there is no `#/Resource/Details` route or MVC action.

## Route

| | Legacy | React (proposed) |
|---|---|---|
| Entry | Row select on Resource index → `#resource-modal` | Dialog/sheet on `/settings/resources` OR `/settings/resources/{key}` |
| MVC | N/A (embedded in `Resource/Index`) | — |

Evidence: `Controllers/ResourceController.cs:12-17` (Index only), `seats-admin-resource.html:493-498`

## Menu

- Modal opened in context of Resource index; no menu change. Evidence: `seats-admin-resource.html:255-289`

## Fields

| Label | Field | Editable | Notes |
|---|---|---|---|
| Key | `resourcesAction.key` | **No** (readonly, disabled) | Evidence: `seats-admin-resource.html:262-268` |
| Text | `resourcesAction.value` | Yes (textarea, 5 rows) | Evidence: `seats-admin-resource.html:272-275` |

Hidden on save payload (set on row select): `cultureName`, `type`. Evidence: `seats-admin-resource.html:494-497,385-393`

## Actions + API

### Open

- **Trigger:** `grid.row-selected` event. Evidence: `seats-admin-resource.html:422-423,493-498`
- Populates `resourcesAction` from selected row; shows Bootstrap modal. Evidence: `seats-admin-resource.html:494-498`

### Save

- **Trigger:** Save button `on-tap="_modalSaved"`. Evidence: `seats-admin-resource.html:280-281,511-517`
- **Endpoint:** `POST api/ResourceApi/updateResource` with JSON body `ResourceDto` (`key`, `value`, `cultureName`, `type`). Evidence: `Views/Resource/Index.cshtml:41`, `seats-admin-resource.html:180-186,513-514`, `Controllers/Api/ResourceApiController.cs:57-59`
- **Permission:** `Resources` + `Edit`. Evidence: `Controllers/Api/ResourceApiController.cs:58`
- **Success:** Success toast; modal closed; grid reloaded. Evidence: `seats-admin-resource.html:516-517,533-535`
- **Error:** Error toast with server message or `AlertSaveErrorDefault`. Evidence: `seats-admin-resource.html:537-541`, `Controllers/Api/ResourceApiController.cs:67-70`
- **No client-side required validation** on value field in component.

### Cancel

- Cancel button / dismiss closes modal without save. Evidence: `seats-admin-resource.html:283-284,519-521`

## Permissions

| Action | Item | Action |
|---|---|---|
| Open modal (view key/text) | `Resources` | `Access` (index gate) |
| Save | `Resources` | `Edit` |

Evidence: `Controllers/Api/ResourceApiController.cs:58,91-92`

> Legacy does not hide Save in modal by permission in the Polymer template — rely on server 403 and gate button in React per the error-state convention.

## States

| State | Behaviour |
|---|---|
| Open | Modal visible with row data |
| Saving | No explicit disable in legacy |
| Success | Toast + reload grid |
| Error | Error toast; modal already closed on save attempt. Evidence: `seats-admin-resource.html:516-517` |

## Side effects

- Persists via `ResourceManager.SaveResource` — updates tenant localisation store. Evidence: `Controllers/Api/ResourceApiController.cs:63`
- Grid refresh re-fetches merged resource sets (file + DB keys). Evidence: `Controllers/Api/ResourceApiController.cs:112-127`

## Legacy bugs — do not copy

| Bug | Evidence | React approach |
|---|---|---|
| Modal closed before save response returns | `seats-admin-resource.html:516-517` | Keep dialog open until save completes |
| Clears `resourcesAction.value` to null before response | `seats-admin-resource.html:516` | Preserve form state on error |
| jQuery Bootstrap modal inside Web Component | `seats-admin-resource.html:498,520` | Accessible shared dialog |
| No permission check on Save button in template | `seats-admin-resource.html:280` | Gate Save with Edit permission |

## Checklist

- [ ] Edit flow reachable only from Resource index with Access
- [ ] Key read-only; value editable
- [ ] POST `updateResource` with key, value, cultureName, type
- [ ] Edit permission on Save
- [ ] Success refreshes list; error shows message without faking success
- [ ] Do not implement add/delete/create route
- [ ] Preserve culture from row (`cultureName`)
