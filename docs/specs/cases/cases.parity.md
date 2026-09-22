# Cases — legacy parity audit

Audit date: 2026-09-15, table updated 2026-09-21 against the code. Legacy source: `Seats.Trunk.Admin` Case views and `CaseApi`. React: `src/features/case/**`.

| # | Screen / behaviour | Legacy | React now | Status |
|---|-------------------|--------|-----------|--------|
| 1 | Workflow list at `#/Case` | `CaseController.Index`, `CaseApi/workflows` | `/case` → `WorkflowAdminScreen` + `WorkflowList` | ✅ |
| 2 | Create / delete workflow | `CaseApi` CRUD | `WorkflowDialog`, `node-actions.ts` | ✅ |
| 3 | Student Workflow assignments | `#/Case/StudentWorkflow`, `getWorkflowStudents` | `/case/student-workflow` (D-082) | ✅ |
| 4 | Structure tree navigation | Drill-down routes under `#/Case/workflows/{id}/…` | `StructureTree` + `NodeInspector` (D-083, D-096) | ✅ |
| 5 | Stage groups CRUD | `createWorkflowStageGroup`, `updateworkflowgroup` | `StageGroupPanel` | ✅ |
| 6 | Stages CRUD | stage routes under workflow | `StagePanel` | ✅ |
| 7 | Rule groups CRUD | `createstagerulegroup` | `RuleGroupPanel` (scalars only, see C2 in `case-api.ts`) | ✅ |
| 8 | Rules CRUD | rules under rule group | `RulePanel`, `rule-form.ts` | ✅ |
| 9 | Rule attributes | attribute forms | `RuleAttributePanel`, `attribute-form-utils.ts` (D-090) | ✅ |
| 10 | Stage triggers | trigger CRUD | `TriggerPanel` | ✅ |
| 11 | Trigger attributes | attribute CRUD | `TriggerAttributePanel` | ✅ |
| 12 | Workflow constraints | `createconstraints` | `ConstraintsDrawer` | ✅ |
| 13 | Manual interventions | `AdminCfcStudentManualIntervention` + `Access` | `ManualInterventionsDrawer` | ✅ |
| 14 | Permission gating | `Case` + `Access` on list; manual interventions separate permission | `case-area.ts` gates the route; drawer checks its own claim | ✅ |
| 15 | Case + Settings access on integrations-adjacent flows | N/A for Case area | N/A | ✅ |

Runtime with real data has not been seen locally (the workflow service is not reachable from the local environment).

**Notes**

- D-053 records the intended React shape: Workflow List + Structure Tree (same as legacy Case area, not the separate `#/Workflow` module).
- Alpha `WorkflowAddressKey` and localhost `CfcAddressKey` both required for full runtime (see `docs/specs/_inventory.md`).
- Node panel shells follow Settings-area form patterns for parity with legacy Polymer editors.
