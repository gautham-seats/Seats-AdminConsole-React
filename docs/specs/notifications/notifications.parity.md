# User Notifications — legacy parity

Source: `Views/UserNotification/Index.cshtml`, `userNotificationIndexController.js`, `userNotificationMenuController.js`, `UserNotificationApiController.cs`.

| Item | Status | Notes |
| --- | --- | --- |
| Route `/notifications` | ✅ | React replaces `#/UserNotification`. |
| Permission gate UserNotifications (40) + Access | ✅ | `SettingsGate` + nav bell visibility. |
| GET `UserNotificationApi` server paging | ✅ | `currentPageIndex`, `pageSize`, `sortCol`, `sortDir`, `searchFilter` in swgrid order. |
| Default page size 100 | ✅ | swgrid default when `pageSize` omitted. |
| Default sort (none) | ✅ | Legacy sends empty/`null` `sortCol`; React sends `''`. |
| No search box | ✅ | Index view has no search UI. |
| Columns: Type, Description, Status, Date Created, Expiration (conditional), Details | ✅ | Expiration from `Notification.Expiration.Days` via legacy partial parse. |
| Date format dd/MM/yyyy HH:mm UTC | ✅ | `dateTextUtc` binding in swapp.js. |
| Unread styling (`showAsNew`) | ✅ | Brand dot + semibold; read rows normal weight. |
| POST `setAllAsRead` on page open | ✅ | Legacy `userNotificationIndexController.js:26-31`. |
| Mark all as read control | ⚠ | React adds header button (legacy auto-marks only; no button). |
| Bell count refresh after mark read / delete | ✅ | `refreshNotificationCount()`. |
| Nav bell links to React route | ✅ | `NOTIFICATIONS_ROUTE` → `/notifications`. |
| Row click opens detail | ⚠ | Inbox design (2026-09-17, Gautham): selecting a row shows its details in a side panel. No new API; legacy rows are not clickable. |
| No row selection / bulk delete | ✅ | `isSelectable: false`, `isMultiSelectable: false`. |
| Delete when `userNotificationStatusId != 1` | ✅ | Trash hidden for status 1 (Processing). |
| Delete confirm `DeleteConfirmationMsg` | ✅ | Same text as modal in Index.cshtml. |
| POST `usernotificationapi/delete?id=` | ✅ | Per-row delete only. |
| Delete success toast + reload | ⚠ | Legacy reloads silently; React shows delete toast (Settings pattern). |
| File link in Details (`userNotificationFile.url`) | ✅ | Opens in new tab. |
| Empty state text | ✅ | "There are no items to show." (swgrid.js:816). |
| Loading / error + Retry | ✅ | Tide profile gate, Gearwork table, `ErrorState`. |
| Safe mode blocks writes | ✅ | `setAllAsRead` and delete show safe-mode message. |
| SignalR live updates (`UserNotificationHub`) | ⚠ | React subscribes to `userNotificationHub` through the shared shell (D-115).
| Legacy header sort clicks | ✅ | Legacy sort clicks never changed `sortCol`; the inbox has no sort control and always sends the legacy default. |
| Type filter chips | ⚠ | Inbox addition: filters the loaded page only, no request. |
| No area sidebar | ⚠ | Gautham 2026-09-17: the page has no left section sidebar. |

Verified in unit tests: `src/features/notifications/__tests__/Notifications.test.tsx`.
