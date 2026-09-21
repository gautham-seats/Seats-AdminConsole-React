# Integrations

## Route

| | Legacy | React |
|---|---|---|
| Hub | `#/Integration` | `/integrations` |
| Zoom callback | `#/Integration/Zoom?code=` | stays legacy (Zoom returns to `/integration/zoomresponse` on the legacy host) |

Evidence: `Views/Integration/Index.cshtml:7-15`, `Controllers/IntegrationController.cs:48-53`

## Permissions

| Gate | Needs | Evidence |
|---|---|---|
| Menu | Integration + Access | `_Layout.cshtml:139` |
| Page | Settings + Access | `IntegrationController.cs:21` |
| Status API | Integration + Access | `IntegrationApiController.cs:112` |

## Content

| Item | Behaviour | Evidence |
|---|---|---|
| Zoom entry | One integration only | `seats-admin-integration.html:62-75` |
| Status | GET `api/IntegrationApi/ZoomTenantLinked` → `{ exist, sameUser }` | `seats-admin-integration.html:134-139` |
| Not linked | Clickable; goes to the server-built Zoom OAuth URL | `IntegrationController.cs:22-39`, `seats-admin-integration.html:140-144` |
| Linked by this user | Not clickable, "Zoom linked" | `seats-admin-integration.html:149-173` |
| Linked by another user | Not clickable, "Zoom linked with other user" | same |
| Status call fails | Error toast, stays not linked | `seats-admin-integration.html:115, 145-148` |

## React notes

- The OAuth URL is read from the `Integration/Index` partial (`scope.urlIntegrateZoom`); only an https URL is followed.
- Design: Connections list (C), chosen by Gautham on 2026-09-15.

## Checklist

- [x] Route `/integrations`, menu link
- [x] Integration + Access and Settings + Access gate
- [x] Three link states
- [x] Status error keeps Connect available
- [x] Connect uses the server-built URL, https only
- [ ] Real Alpha data check (needs sign-in)
