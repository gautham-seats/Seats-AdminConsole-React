# Legacy Admin screen inventory

Generated from legacy source at `C:\Code\monolithic-seats-trunk-websites\Seats.Trunk.Admin\`.  
Routing: Sammy hash router in `Scripts/softworks/swrouting.js` maps `#/{controller}/{action}/{id}` → MVC partial load (`swrouting.js:164–173`, `RouteConfig.cs:16–19`).  
Menu: `Views/Shared/_Layout.cshtml:38–151`.  
Backing service column reflects `Web.Debug.StandAlone.config` mock flags + address keys (Alpha URLs vs base `Web.config` localhost keys).

**Legend — backing service**

| Value | Meaning |
|-------|---------|
| **mocked** | `Mock.*=true` in StandAlone → in-process mock client |
| **Alpha** | Address key overridden to the internal Alpha service hosts in StandAlone |
| **localhost** | Key still `http://localhost/...` in base `Web.config`, not overridden in StandAlone |
| **Redis localhost** | Uses `localhost:6379` cache/Hangfire (all screens indirectly) |

---

## Screen inventory

| area | screen | legacy hash route | menu label + position | required permission | MVC controller | API controller(s) + endpoints | Polymer components used | backing service | Sources |
|------|--------|-------------------|----------------------|---------------------|----------------|------------------------------|---------------------------|-----------------|---------|
| users | User list | `#/User` | Users · navbar pos 1 | `Users` + `Access` | `UserController.Index` | `UserApi`: GET list (`GetUsers`), DELETE | — (KO + `genericIndexController`) | mocked (`Mock.Security`, `SecurityAddressKey`) | `_Layout.cshtml:43`, `User/Index.cshtml:135` |
| users | User create | `#/User/Details` | Users submenu · Add | `Users` + `Add` | `UserController.Details` | `UserApi`: GET `/{id}`, POST, `SetPassword`, `SendResetPasswordLink`; `UserSecurityLevelPermissionApi`: GET, `GetSecurityLevelsByCriteria`, Save | — (KO `userDetailsController`) | mocked | `User/Index.cshtml:50`, `User/Details.cshtml:385–387` |
| users | User edit | `#/User/Details/{id}` | Users submenu · row click | `Users` + `Access`/`Edit` | `UserController.Details` | same as User create | — | mocked | `User/Index.cshtml`, `userDetailsController.js:448` |
| users | Access Profile list | `#/AccessProfile` | Access Profile · navbar pos 2 | `AccessProfiles` + `Access` | `AccessProfileController.Index` | `AccessProfileApi`: GET, DELETE, `GetLandingPages` | — (KO) | mocked | `_Layout.cshtml:51`, `AccessProfile/Index.cshtml:80` |
| users | Access Profile create/edit | `#/AccessProfile/Details` / `#/AccessProfile/Details/{id}` | Users submenu · Access Profile | `AccessProfiles` + `Add`/`Edit` | `AccessProfileController.Details` | `AccessProfileApi`: GET `/{id}`, POST; `CaseApi`/`WorkflowApi` visibility lists | — (`accessProfileDetailsController`) | mocked (+ `CfcAddressKey`/`EventAddressKey` localhost for case/event visibility) | `AccessProfile/Index.cshtml:36`, `accessProfileDetailsController.js` |
| users | Contact Group list | `#/ContactGroup` | Contact Group · navbar pos 3 | `ContactGroup` + `Access` | `ContactGroupController.Index` | `ContactGroupApi`: GET, DELETE | — (KO) | mocked (`IUserApiClient`) | `_Layout.cshtml:59`, `ContactGroup/Index.cshtml:79` |
| users | Contact Group create/edit | `#/ContactGroup/Details` / `#/ContactGroup/Details/{id}` | Users submenu · Contact Group | `ContactGroup` + `Add`/`Edit` | `ContactGroupController.Details` | `ContactGroupApi`: GET, POST, `createOrUpdateFunction`, `deletefunction`, criteria lookups (`GetCoursesByCriteria`, etc.); `UserApi.GetUsersByCriteria` | — (`contactGroupDetailsController`) | mocked + localhost proxies for academic data | `ContactGroup/Details.cshtml` |
| users | Audit / Activity | `#/Audit` | Audit · navbar pos 4 (`Activity` permission) | `Users` + `Activity` | `AuditController.Index` | `Audit`: `GetAudit`, `GetUser`, `Export` (`api/audit/*`) | `seats-admin-audit` | Alpha (`AuditAddressKey`) + mocked user lookup | `_Layout.cshtml:67`, `Audit/Index.cshtml:38–60` |
| users | Developer Key dashboard | `#/DeveloperKey` | Users submenu (not top navbar) | `Users` + `DeveloperKeyDashboard` | `DeveloperKeyController.Index` | `DeveloperKeyApi`: GET, DELETE; `UserApi.GenerateDeveloperKey` | — (KO) | mocked | `User/Index.cshtml:35`, `DeveloperKey/Index.cshtml:74` |
| users | User security level permissions | `#/UserSecurityLevelPermission` (?`securityLevel=`) | Embedded in User Details (no navbar link) | `Users` + `Access` | `UserSecurityLevelPermissionController.Index` | `UserSecurityLevelPermissionApi`: GET, `GetSecurityLevelsByCriteria`, Save, Delete | — (`userSecurityLevelPermissionDetailsController`) | mocked + `SecurityAddressKey` | `UserSecurityLevelPermission/Index.cshtml:105`, `User/Details.cshtml:387` |
| devices | Device list | `#/Device` | Devices · navbar pos 5 | `Devices` + `Access` | `DeviceController.Index` | `DeviceApi`: `GetDevices`, `Export`, `GetSiteOptions`, `GetBuildingOptions`, `GetRoomOptions`, `ReprocessSwipes` | `seats-date-picker` (filters) | Alpha (`ClockingAddressKey`, `LocationAddressKey`) | `_Layout.cshtml:73`, `Device/Index.cshtml:209–222` |
| devices | Device create/edit | `#/Device/Details` / `#/Device/Details/{id}` | Devices submenu · Add | `Devices` + `Add`/`Edit` | `DeviceController.Details` | `DeviceApi`: GET, POST, DELETE; `RoomApi.GetRoomsByCriteria` | — (`deviceDetailsController`) | Alpha | `Room/Index.cshtml:30` pattern, `Device/Details.cshtml:164` |
| devices | Room list | `#/Room` | Room · navbar pos 6 | `Rooms` + `Access` | `RoomController.Index` | `RoomApi`: `GetRooms`, DELETE | — (KO) | Alpha (`LocationAddressKey`) | `_Layout.cshtml:81`, `Room/Index.cshtml:72` |
| devices | Room create/edit | `#/Room/Details` / `#/Room/Details/{id}` | Devices submenu · Add | `Rooms` + `Add`/`Edit` | `RoomController.Details` | `RoomApi`: GET, POST, DELETE | — (`roomDetailsController`) | Alpha | `Room/Details.cshtml:74` |
| devices | Readings Report | `#/ReadingsReport` | Readings Report · navbar pos 7 | `ReadingsReport` + `Access` | `ReadingsReportController.Index` | `ReadingsReportApi`: `GetStudentClockings`, `GetDevices`, `Export` | `seats-date-picker` | Alpha (`ClockingAddressKey`) | `_Layout.cshtml:89`, `ReadingsReport/Index.cshtml:80–88` |
| devices | Suspicious Readings Report | `#/SuspiciousReadingsReport` | Devices submenu (4th tab) | `ReadingsReport` + `Access` | `SuspiciousReadingsReportController.Index` | `SuspiciousReadingsReportApi`: `GetSuspiciousClockings` | `seats-date-picker` | Alpha (`ClockingAddressKey`) | `SuspiciousReadingsReport/Index.cshtml:67`, `Room/Index.cshtml:19` |
| settings | Settings (branding) | `#/Settings` | Settings · navbar pos 8 | `Settings` + `Access` | `SettingsController.Index` | `SettingsApi`: `GetSettingByKeys`, `/{key}`, POST; `FileApi` attach | `seats-admin-setting-color` | mocked (`Mock.Configuration`) | `_Layout.cshtml:94`, `Settings/Index.cshtml:35–43` |
| settings | File Template list | `#/FileTemplate` | Settings submenu pos 2 | `FileTemplate` + `Access` | `FileTemplateController.Index` | `FileTemplateApi`: GET, DELETE | — (KO) | mocked | `Settings/Index.cshtml:12`, `FileTemplate/Index.cshtml:116` |
| settings | File Template edit | `#/FileTemplate/Details` / `#/FileTemplate/Details/{id}` | Settings submenu · Add | `FileTemplate` + `Add`/`Edit` | `FileTemplateController.Details` | `FileTemplateApi`: GET, POST, `ValidateTemplateTypes`, `GetSubjectTemplateTypes` | `seats-website-file-template` | mocked | `FileTemplate/Details.cshtml:8–54` |
| settings | Scheduled Activity Type list | `#/ScheduledActivityType` | Settings submenu pos 3 | `ScheduledActivityType` + `Access` | `ScheduledActivityTypeController.Index` | `ScheduledActivityTypeApi`: GET, POST, DELETE | — (KO) | mocked + localhost (`ScheduledActivityAddressKey`) | `Settings/Index.cshtml:15`, `ScheduledActivityType/Index.cshtml:135` |
| settings | Scheduled Activity Type edit | `#/ScheduledActivityType/Details` / `.../{id}` | Settings submenu · Add | `ScheduledActivityType` + `Add`/`Edit` | `ScheduledActivityTypeController.Details` | `ScheduledActivityTypeApi`: GET, POST | — (`scheduledActivityTypeDetailsController`) | mocked + localhost | `ScheduledActivityType/Details.cshtml:154` |
| settings | Resources (localisation) | `#/Resource` | Settings submenu pos 4 | `Resources` + `Access` | `ResourceController.Index` | `ResourceApi`: `getResources`, `GetResourcesByString`, `updateResource`, `GetTypes`, `GetResourcesForScreen` | `seats-admin-resource` | mocked (`Mock.Configuration`, `Mock.Localisation`, `LocalisationAddressKey`) | `Resource/Index.cshtml:33–42` |
| settings | Custom Fields | `#/CustomField` | Settings submenu pos 5 | `CustomFields` + `Access` | `CustomFieldController.Index` | `CustomFieldGroupApi`: GET, PUT, POST, DELETE, `CountCustomFields`, `ExistsCustomFieldDataByEntityIdAsync` | `seats-admin-customfield` | Alpha (`CustomFieldsAddressKey`) | `CustomField/Index.cshtml:39–50` |
| settings | Authentication | `#/Authentication` | Settings submenu pos 6 | `ConfigureAuthentication` + `Access` | `AuthenticationController.Index` | `AuthenticationApi`: GET, PUT | `seats-admin-authentication` | mocked | `Authentication/Index.cshtml:35–42` |
| settings | Contacts | `#/Contact` | Settings submenu pos 7 | `Settings` + `Contacts` | `ContactController.Index` | `ContactApi` (CRUD) | `seats-admin-contact` | mocked | `Contact/Index.cshtml:32–38` |
| settings | Graph API settings | `#/GraphAPI` | Settings submenu pos 8 | `Settings` + `Contacts` | `GraphAPIController.Index` | `GraphApi`: GET, PUT | `seats-admin-graphapi` | mocked | `GraphAPI/Index.cshtml:34–41` |
| operations | Rollback | `#/Rollback` | Rollback · navbar pos 9 | `Rollback` + `Access` | `RollbackController.Index` | `RollbackApi`: GET, POST | — (KO) | mocked | `_Layout.cshtml:99`, `Rollback/Index.cshtml:42` |
| operations | Job Schedule list | `#/JobSchedule` | Job Schedule · navbar pos 10 | `JobSchedule` + `Access` | `JobScheduleController.Index` | `JobScheduleApi`: GET, DELETE, lookup routes (`GetSchoolOptions`, etc.) | — (KO) | mocked (`Mock.JobSchedule`; base `JobScheduleAddressKey` localhost) | `_Layout.cshtml:104`, `JobSchedule/Index.cshtml:77` |
| operations | Job Schedule edit | `#/JobSchedule/Details` / `#/JobSchedule/Details/{id}` | Job Schedule · Add/row | `JobSchedule` + `Add`/`Edit` | `JobScheduleController.Details` | `JobScheduleApi`: GET `/{id}`, POST | — (`jobScheduleDetailsController`) | mocked | `JobSchedule/Details.cshtml:234` |
| case | Case / workflow list (legacy creator) | `#/Case` | Cases · navbar pos 11 | `Case` + `Access` | `CaseController.Index` | `CaseApi`: `workflows`, `workflowscases`, CRUD under `api/caseapi/*` | `seats-admin-workflow-creator` | Alpha (`WorkflowAddressKey`) + localhost (`CfcAddressKey`) | `_Layout.cshtml:109`, `Case/Index.cshtml:13–24` |
| case | Student workflow assignments | `#/Case/StudentWorkflow` | Cases submenu · Student Workflow | `Students` + `Access` | `CaseController.StudentWorkflow` | `CaseApi`: `getWorkflowStudents`, `removeStudentsInWorkflow` | `seats-admin-workflow-student` | Alpha + localhost `CfcAddressKey` | `Case/StudentWorkflow.cshtml:13–22` |
| case | Workflow stage groups | `#/Case/workflows/{id}/stageGroups` | Cases · drill-down | `Case` + `Access` | `CaseController.WorkflowGroups` | `CaseApi`: `workflows/{id}/stageGroups`, `updateworkflowgroup`, `createWorkflowStageGroup` | `seats-admin-workflow-creator-stage-group` | Alpha | `CaseController.cs:26–27`, `WorkflowGroups.cshtml:13` |
| case | Workflow stages | `#/Case/workflows/{id}/stageGroups/{sgId}/stages` | Cases · drill-down | `Case` + `Access` | `CaseController.WorkflowStages` | `CaseApi`: stages routes, `updateworkflowstage`, `createWorkflowStage` | `seats-admin-workflow-creator-stages` | Alpha | `CaseController.cs:34–35` |
| case | Stage rule groups | `#/Case/.../stages/{sId}/ruleGroups` | Cases · drill-down | `Case` + `Access` | `CaseController.WorkflowStage` | `CaseApi`: rule group routes, `createstagerulegroup` | `seats-admin-workflow-creator-stage` | Alpha | `CaseController.cs:42–43` |
| case | Stage rules | `#/Case/.../ruleGroups/{rgId}/rules` | Cases · drill-down | `Case` + `Access` | `CaseController.WorkflowStageRuleGroupsRules` | `CaseApi`: rules CRUD | `seats-admin-workflow-creator-stage-rules` | Alpha | `CaseController.cs:58–59` |
| case | Rule attributes | `#/Case/.../rules/{rId}/attributes` | Cases · drill-down | `Case` + `Access` | `CaseController.WorkflowStageRuleGroupsRuleAttributes` | `CaseApi`: `createstagerulegroupsruleattributes`, updates | `seats-admin-workflow-creator-stage-rule-attributes` | Alpha | `CaseController.cs:98–99` |
| case | Stage triggers | `#/Case/.../ruleGroups/{rgId}/triggers` | Cases · drill-down | `Case` + `Access` | `CaseController.WorkflowStageRuleGroupsTriggers` | `CaseApi`: trigger CRUD | `seats-admin-workflow-creator-stage-triggers` | Alpha | `CaseController.cs:82–83` |
| case | Trigger attributes | `#/Case/.../triggers/{tId}/attributes` | Cases · drill-down | `Case` + `Access` | `CaseController.WorkflowStageRuleGroupsTriggerAttributes` | `CaseApi`: `createStageRuleGroupsTriggerAttribute` | `seats-admin-workflow-creator-stage-trigger-attributes` | Alpha | `CaseController.cs:90–91` |
| case | Workflow constraints | `#/Case/workflows/{id}/constraints` | Cases · drill-down | `Case` + `Access` | `CaseController.WorkflowStageRuleGroupsConstraints` | `CaseApi`: `createconstraints`, constraint types | `seats-admin-workflow-creator-stage-constraints` | Alpha | `CaseController.cs:66–67` |
| case | Manual interventions | `#/Case/workflows/{id}/manualInterventions` | Cases · drill-down | `AdminCfcStudentManualIntervention` + `Access` | `CaseController.WorkflowStageRuleGroupsManualInterventions` | `CaseApi`: `manualInterventions`, `createManualIntervention` | `seats-admin-workflow-creator-stage-manual-interventions` | Alpha | `CaseController.cs:74–75` |
| workflow | New workflow list | `#/Workflow` / `#/workflow` | Cases submenu · Workflow Admin tab | `Workflow` + `Access` | `WorkflowController.Index` | `WorkflowApi`: `workflows`, `createWorkflow`, `deleteWorkflow`, etc. | `seats-admin-workflow` | Alpha (`WorkflowAddressKey`, `AssessmentAddressKey`, `TagAddressKey`) | `Workflow/Index.cshtml:18`, `WorkflowController.cs:13–19` |
| workflow | Workflow manager | `#/workflow/{id}/manager` | Workflow drill-down | `Workflow` + `Access` | `WorkflowController.Manager` | `WorkflowApi`: `workflows/{id}`, `updateworkflow`, `saveStages`, transitions | `seats-admin-workflow-manager`, `seats-alert` | Alpha | `WorkflowController.cs:25–26`, `Manager.cshtml:21` |
| workflow | Transition editor | `#/workflow/{id}/definition/{defId}/transition/{transId}/transitions` | Workflow drill-down | `Workflow` + `Access` | `WorkflowController.Transition` | `WorkflowApi`: `transition`, `createTransition`, `transitionDelete`, `cloneTransition`, `actions`, `variables` | `seats-admin-workflow-transition` | Alpha | `WorkflowController.cs:44–45` |
| workflow | Workflow constraints (new) | `#/workflow/{id}/definition/{defId}/constraints` | Workflow drill-down | `Workflow` + `Access` | `WorkflowController.Constraints` | `WorkflowApi`: `constraintTypesWorkflow`, `saveConstraints` | `seats-admin-workflow-constraints` | Alpha | `WorkflowController.cs:63–64` |
| academic | Lesson Type list | `#/LessonType` | Lesson Type · navbar pos 12 | `LessonType` + `Access` | `LessonTypeController.Index` | `LessonTypeApi`: GET, POST | — (KO) | mocked | `_Layout.cshtml:114`, `LessonType/Index.cshtml:154` |
| academic | Lesson Type edit | `#/LessonType/Details` / `#/LessonType/Details/{id}` | Lesson Type · Add/row | `LessonType` + `Add`/`Edit` | `LessonTypeController.Details` | `LessonTypeApi`: GET, POST | — (`lessonTypeDetailsController`) | mocked | `LessonType/Details.cshtml:142` |
| analytics | Analytics dashboards | `#/Analytics` | Analytics · navbar pos 13 (hidden) | `AdminAnalytics` + `Access` | `AnalyticsController.Index` | `AnalyticsApi`: `dashboards`, `schema/cubes`, `schema/dimensions`, `drilldowns` | `seats-admin-dashboard` | Alpha (`EmbeddedAnalyticsAddressKey`) | `_Layout.cshtml:117–119`, `Analytics/Index.cshtml:6–18` |
| analytics | Dashboard widgets | `#/analytics/dashboard/{id}/widgets` | Analytics drill-down | `AdminAnalytics` + `Access` | `AnalyticsController.IndexWidget` | `AnalyticsApi`: `widgets`, `widgets/{id}`, datasource/query | `seats-admin-widget` | Alpha | `AnalyticsController.cs:17–18`, `IndexWidget.cshtml:6` |
| analytics | Dashboard filters | `#/analytics/dashboard/{id}/filters` | Analytics drill-down | `AdminAnalytics` + `Access` | `AnalyticsController.IndexFilters` | `AnalyticsApi`: `filters`, `filters/{id}/data` | `seats-admin-dashboard-filter` | Alpha | `AnalyticsController.cs:24–25` |
| analytics | Dashboard visualization | `#/analytics/Details/{id}/visualization` | Analytics drill-down | `AdminAnalytics` + `Access` | `AnalyticsController.DetailsDashboard` | `AnalyticsApi`: export, drilldowns | `seats-analytics-detail` | Alpha | `AnalyticsController.cs:31–32`, `DetailsDashboard.cshtml:17` |
| data | Import | `#/Import` | Imports · navbar pos 14 | `Import` + `Access` | `ImportController.Index` | `ImportApi`: `GetImportTypes`, `UploadFile`, `validateFile`, `GetImportFileSample/{type}` | `seats-file-importer` | localhost (`ImportAddressKey`) | `_Layout.cshtml:124`, `Import/Index.cshtml:10–16` |
| engagement | Engagement models | `#/Engagement` | Engagement · navbar pos 15 | `Engagement` + `Access` | `EngagementController.Index` | `EngagementApi`: `GetAllEngagement`, `CreateEngagementModel`, `SyncStudentsAndReCalculate` | `seats-admin-engagement` | Alpha (`EngagementAddressKey`; `Mock.Engagement=false`) | `_Layout.cshtml:129`, `Engagement/Index.cshtml:22–43` |
| engagement | Engagement history | `#/Engagement/HistoryIndex` | Engagement submenu · History | `Engagement` + `Access` | `EngagementController.HistoryIndex` | `EngagementApi`: `getEngagementStats`, `getEngagementStudentScore`, exports, `GetCurrentCalculationPeriod` | `seats-admin-engagement-history` | Alpha | `Engagement/HistoryIndex.cshtml:23–51` |
| engagement | Engagement model editor | `#/Engagement/Details/{id}` | Engagement · row click | `Engagement` + `Access` | `EngagementController.Details` | `EngagementApi`: `GetEngagementModelConfigViewModels`, `SaveModel`, `RunNode`, lookups, exports | `seats-admin-engagement-model` | Alpha + `AssessmentAddressKey` | `Engagement/Details.cshtml:13–49` |
| students | GDPR delete queue | `#/StudentDelete` | Students · navbar pos 16 | `StudentsAdmin` + `Access` | `StudentDeleteController.Index` | `StudentDeleteApi`: `GetStudentsConfirm`, confirm/bulk delete routes | `seats-range-date-picker` | localhost (`GdprAddressKey`) + Alpha (`StudentAddressKey`) | `_Layout.cshtml:134`, `StudentDelete/index.cshtml:67` |
| students | Manual student delete | `#/Student` | Students submenu | `StudentsAdmin` + `Access` | `StudentController.Index` | `StudentDeleteApi`: `GetStudents`, bulk delete | — (KO) | localhost + Alpha | `Student/Index.cshtml:59` |
| students | Student recycle bin | `#/StudentRecycleBin` | Students submenu | `StudentsAdmin` + `Access` | `StudentRecycleBinController.Index` | `StudentDeleteApi`: `GetStudentsInRecycleBin`, restore routes | — (KO) | localhost + Alpha | `StudentRecycleBin/Index.cshtml:61` |
| students | Student stage reset | `#/StudentStage` | **No menu link found** | `StudentStage` + `ResetStage`/`ResetAllStage` | `StudentStageController.Index` | `StudentStageApi`: POST `resetall` (list endpoint stubbed) | — (KO) | Alpha (`StudentAddressKey`); reset API body commented out | `StudentStage/Index.cshtml:79`, `StudentStageApiController.cs:26–34` |
| integration | Integrations hub | `#/Integration` | Integrations · navbar pos 17 | `Integration` + `Access` | `IntegrationController.Index` | `IntegrationApi`: `ZoomLinked`, `ZoomTenantLinked`, `PostIntegrationZoom` | `seats-admin-integration` | mocked (`IUserApiClient`) | `_Layout.cshtml:139`, `Integration/Index.cshtml:7–15` |
| integration | Zoom OAuth callback | `#/Integration/Zoom` | OAuth redirect (no menu) | `Integration` + `Access` | `IntegrationController.Zoom` | `IntegrationApi`: `ZoomResponse/{code}` | `seats-admin-integration-zoom` | mocked | `IntegrationController.cs:44`, `Integration/Zoom.cshtml:7` |
| notifications | User notifications | `#/UserNotification` | User Notifications · navbar pos 18 | `UserNotifications` + `Access` | `UserNotificationController.Index` | `UserNotificationApi`: `count`, `setAllAsRead`, `delete`; list via index controller | — (`userNotificationIndexController`) | localhost (`NotificationAddressKey`) | `_Layout.cshtml:144`, `UserNotification/Index.cshtml:108` |
| shell | Not authorised | `#/Error/NotAuthorised` | Redirect target (no menu) | Admin website access (website id 2) | `ErrorController.NotAuthorised` | — | — | — | `_Layout.cshtml:548`, `ErrorController.cs:9` |
| shell | Not active | `#/Error/NotActive` | Error route | — | `ErrorController.NotActive` | — | — | — | `ErrorController.cs:14` |
| shell | Unsupported browser | `#/Error/UnsupportedBrowser` | Error route | — | `ErrorController.UnsupportedBrowser` | — | — | — | `ErrorController.cs:19` |

**Global shell components** (all authenticated screens): `seats-configuration-manager`, `seats-block-bypass`, `seats-security-manager` — `_Layout.cshtml:33–37`, `_MainLayoutAdminTemp.cshtml:16–49`.

**Shared API** (all screens): `api/audit/log` page audit (`swrouting.js:107–109`), `api/web/metric` (`swrouting.js:112–125`), `api/ResourceApi/GetResourcesForScreen`, `api/UserApi/GetClaims`, `api/SettingsApi` culture/logo/help.

---

## 1. Screens whose services point to localhost

Per `Web.Debug.StandAlone.config`, most address keys are overridden to Alpha. These screens still depend on **localhost** keys from base `Web.config` (not overridden in StandAlone) and may fail without local IIS services:

| Screen | localhost key(s) | Notes |
|--------|------------------|-------|
| Import | `ImportAddressKey` → `http://localhost/Seats.Service.Import.Web/` | `Web.config:39` |
| GDPR delete / manual delete / recycle bin | `GdprAddressKey` → `http://localhost/Seats.Service.Gdpr.Web/` | `Web.config:44`; also `StudentAddressKey` Alpha |
| Scheduled Activity Type | `ScheduledActivityAddressKey` → `http://localhost/Seats.Service.ScheduledActivity.Web/` | Partially masked by `Mock.Configuration` |
| User notifications | `NotificationAddressKey` → `http://localhost/Seats.Service.Notification.Web/` | Menu badge uses `count` only |
| Case / legacy workflow creator | `CfcAddressKey` → `http://localhost/Seats.Service.Cfc.Web/` | Coexists with Alpha `WorkflowAddressKey` |
| Access Profile (event/case visibility) | `EventAddressKey`, `TimelineAddressKey` | `Web.config:56–59` |
| Job Schedule | `JobScheduleAddressKey` → localhost | **Mocked** via `Mock.JobSchedule=true` in StandAlone — works without local service |
| All screens (cache/session) | Redis `localhost:6379` | `Web.Debug.StandAlone.config:15–16` — requires local Redis |

Screens on **Alpha only** (need VPN): Engagement, Device/Room/Readings (Clocking, Location), Custom Fields, Analytics, Audit export, new Workflow API paths.

Screens **fully mocked** in StandAlone (work offline): Users, Access Profiles, Contact Groups, Settings branding, Resources, Authentication, GraphAPI, Contacts, Rollback, Job Schedule, most Configuration-backed lists.

---

## 2. Suggested build order

Simplest and most-used first (navbar order + low dependency + mocked/local-friendly):

1. **Users** (`#/User`, `#/User/Details`) — default landing page (`_Layout.cshtml:371`), mocked security, core CRUD pattern
2. **Access Profiles** (`#/AccessProfile`) — same area, permission model template
3. **Contact Groups** (`#/ContactGroup`) — same area, slightly richer details
4. **Audit** (`#/Audit`) — read-only list/export; good read-path test
5. **Settings branding** (`#/Settings`) — single Polymer component, few endpoints
6. **Resources** (`#/Resource`) — localisation editing, mocked
7. **Devices** (`#/Device`, `#/Room`) — paired list/detail; device submenu pattern
8. **Readings reports** (`#/ReadingsReport`, `#/SuspiciousReadingsReport`) — read-heavy, date filters
9. **Lesson Types** (`#/LessonType`) — simple academic CRUD
10. **File Templates** (`#/FileTemplate`) — settings submenu, file upload
11. **Scheduled Activity Types** (`#/ScheduledActivityType`) — settings CRUD + localhost caveat
12. **Custom Fields** (`#/CustomField`) — Alpha service; table inline edit
13. **Authentication / Contact / GraphAPI** — settings leaf screens
14. **Job Schedule** (`#/JobSchedule`) — complex form, mocked schedule service
15. **Rollback** (`#/Rollback`) — destructive confirm dialog pattern
16. **Import** (`#/Import`) — file upload workflow; localhost dependency
17. **Students admin** (`#/StudentDelete`, `#/Student`, `#/StudentRecycleBin`) — GDPR flows
18. **User notifications** (`#/UserNotification`) — list + mark read/delete
19. **Integrations** (`#/Integration`) — OAuth edge case last in ops tier
20. **Engagement** (`#/Engagement` + history + details) — Alpha, large API surface
21. **Analytics** (`#/Analytics` + dashboard drill-downs) — Alpha, hidden menu, complex Polymer
22. **Case legacy workflow** (`#/Case` + drill-down routes) — largest route tree, Alpha + localhost Cfc
23. **New workflow** (`#/workflow/*`) — parallel to Case, Assessment/Workflow Alpha
24. **Developer Key**, **Student Stage**, **Error pages** — leaf/low-traffic last

---

## Gaps and blockers

| Gap | Evidence |
|-----|----------|
| `swrouting.js` has no per-route table — routes are implicit MVC `{controller}/{action}/{id}` | `swrouting.js:164–173`, `RouteConfig.cs:16–19` |
| `#/StudentStage` has view + controller but **no menu href** in `_Layout.cshtml` | grep: no `#/StudentStage` in Views/Scripts |
| `RollbackController.Details` exists but **no `Views/Rollback/Details.cshtml`** | `RollbackController.cs:21`; only `Index.cshtml` in Views/Rollback |
| `UserSecurityLevelPermissionController.Details` — **no Details view**; UX embedded in User Details | `UserSecurityLevelPermissionController.cs:27`; only `Index.cshtml` |
| `StudentStageApiController.ResetAll` — proxy call **commented out** | `StudentStageApiController.cs:28–29` |
| Analytics menu item `hidden` in layout | `_Layout.cshtml:117` |
| Hash case inconsistency: `#/Workflow` vs `#/workflow`, `#/Case` vs `case` RoutePrefix | `WorkflowController.cs:13`, `CaseController.cs:12` |
| `ContactApiController .cs` filename has spurious space | filesystem |

**Row count: 64** routable screens (excluding partials and shared shell; OAuth callback counted once).
