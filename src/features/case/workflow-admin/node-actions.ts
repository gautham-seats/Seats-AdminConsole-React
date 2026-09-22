import type { DraftTarget, TreeNode, TreeNodeKind } from './use-structure-tree'

// Which child a node can create; rule groups only hold the two fixed branches.
const CHILD_KIND: Partial<Record<TreeNodeKind, TreeNodeKind>> = {
  stageGroup: 'stage',
  stage: 'ruleGroup',
  rulesBranch: 'rule',
  triggersBranch: 'trigger',
  rule: 'ruleAttribute',
  trigger: 'triggerAttribute',
}

export function childDraft(node: TreeNode): DraftTarget | null {
  const kind = CHILD_KIND[node.kind]
  if (!kind) return null
  return { kind, path: node.path, parentKey: node.key }
}

export function hasTreeChildren(kind: TreeNodeKind): boolean {
  return kind !== 'ruleAttribute' && kind !== 'triggerAttribute'
}
