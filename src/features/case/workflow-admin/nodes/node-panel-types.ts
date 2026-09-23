type WorkflowNodePath = {
  workflowId: number
  stageGroupId: number
  stageId: number
  ruleGroupId: number
}

export type NodePanelCallbacks = {
  onSaved: () => void
  onDeleted?: () => void
  onDirtyChange?: (dirty: boolean) => void
}

export type RulePanelProps = WorkflowNodePath &
  NodePanelCallbacks & {
    ruleId: number | null
  }

export type RuleAttributePanelProps = WorkflowNodePath &
  NodePanelCallbacks & {
    ruleId: number
    attributeId: number | null
  }

export type TriggerPanelProps = WorkflowNodePath &
  NodePanelCallbacks & {
    triggerId: number | null
  }

export type TriggerAttributePanelProps = WorkflowNodePath &
  NodePanelCallbacks & {
    triggerId: number
    attributeId: number | null
  }

export type RuleDefinitionAttributeOption = {
  id: number
  name: string | null
  dataType: string | null
  cfcWorkflowRuleDefinitionId: number
}

export type TriggerTypeAttributeOption = {
  id: number
  name: string | null
  dataType: string | null
  cfcTriggerTypeId: number
}

export type ListOption = {
  id: number
  description: string | null
}
