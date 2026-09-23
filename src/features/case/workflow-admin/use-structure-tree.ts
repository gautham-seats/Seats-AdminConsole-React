'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  fetchRuleGroups,
  fetchRules,
  fetchStages,
  fetchTriggers,
  fetchWorkflowStageGroups,
} from '../case-api'

export type TreeNodeKind =
  | 'stageGroup'
  | 'stage'
  | 'ruleGroup'
  | 'rulesBranch'
  | 'triggersBranch'
  | 'rule'
  | 'trigger'
  | 'ruleAttribute'
  | 'triggerAttribute'

type TreePath = {
  workflowId: number
  stageGroupId?: number
  stageId?: number
  ruleGroupId?: number
  ruleId?: number
  triggerId?: number
}

export type TreeNode = {
  key: string
  kind: TreeNodeKind
  id: number | null
  label: string
  count?: number
  path: TreePath
  children?: TreeNode[]
  loading?: boolean
  expanded?: boolean
}

function nodeKey(kind: TreeNodeKind, id: number | string): string {
  return `${kind}:${id}`
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function displayLabel(kind: TreeNodeKind, id: number | null, label: string | null | undefined) {
  const trimmed = label?.trim()
  return trimmed || `${kind} ${id ?? ''}`.trim()
}

function uniqueLabels(nodes: TreeNode[]) {
  const counts = new Map<string, number>()
  nodes.forEach(node => counts.set(node.label, (counts.get(node.label) ?? 0) + 1))
  return nodes.map(node =>
    counts.get(node.label) === 1 ? node : { ...node, label: `${node.label} (${node.id ?? node.key})` },
  )
}

export type BranchLabels = { rules: string; triggers: string }

async function fetchNodeChildren(
  workflowId: number,
  node: TreeNode,
  labels: BranchLabels,
): Promise<TreeNode[]> {
  let children: TreeNode[] = []
  if (node.kind === 'stageGroup' && node.path.stageGroupId) {
    const stages = asArray(await fetchStages(workflowId, node.path.stageGroupId))
    children = stages.map(stage => ({
      key: nodeKey('stage', stage.id ?? 0),
      kind: 'stage',
      id: stage.id ?? 0,
      label: displayLabel('stage', stage.id ?? 0, stage.name),
      count: stage.cfcWorkflowStageRuleGroups?.length,
      path: { ...node.path, stageId: stage.id ?? 0 },
    }))
  } else if (node.kind === 'stage' && node.path.stageGroupId && node.path.stageId) {
    const groups = asArray(await fetchRuleGroups(workflowId, node.path.stageGroupId, node.path.stageId))
    children = groups.map(group => ({
      key: nodeKey('ruleGroup', group.id ?? 0),
      kind: 'ruleGroup',
      id: group.id ?? 0,
      label: displayLabel('ruleGroup', group.id ?? 0, group.name),
      path: { ...node.path, ruleGroupId: group.id ?? 0 },
    }))
  } else if (node.kind === 'ruleGroup' && node.path.ruleGroupId) {
    children = [
      {
        key: nodeKey('rulesBranch', node.path.ruleGroupId),
        kind: 'rulesBranch',
        id: node.path.ruleGroupId,
        label: labels.rules,
        path: node.path,
      },
      {
        key: nodeKey('triggersBranch', node.path.ruleGroupId),
        kind: 'triggersBranch',
        id: node.path.ruleGroupId,
        label: labels.triggers,
        path: node.path,
      },
    ]
  } else if (
    node.kind === 'rulesBranch' &&
    node.path.ruleGroupId &&
    node.path.stageGroupId &&
    node.path.stageId
  ) {
    const rules = asArray(
      await fetchRules(workflowId, node.path.stageGroupId, node.path.stageId, node.path.ruleGroupId),
    )
    children = rules.map(rule => ({
      key: nodeKey('rule', rule.id),
      kind: 'rule' as const,
      id: rule.id,
      label: displayLabel('rule', rule.id, rule.name),
      count: rule.cfcWorkflowStageRuleAttributes?.length ?? 0,
      path: { ...node.path, ruleId: rule.id },
    }))
  } else if (
    node.kind === 'rule' &&
    node.path.ruleId &&
    node.path.ruleGroupId &&
    node.path.stageGroupId &&
    node.path.stageId
  ) {
    // seats-admin-workflow-creator-stage-rule-attributes.html:538,590 reads the rule by id for its attributes.
    const [rule] = asArray(
      await fetchRules(
        workflowId,
        node.path.stageGroupId,
        node.path.stageId,
        node.path.ruleGroupId,
        node.path.ruleId,
      ),
    )
    children = (rule?.cfcWorkflowStageRuleAttributes ?? []).map(attr => ({
      key: nodeKey('ruleAttribute', attr.id ?? 0),
      kind: 'ruleAttribute' as const,
      id: attr.id ?? 0,
      label: displayLabel('ruleAttribute', attr.id ?? 0, attr.name ?? attr.description),
      path: node.path,
    }))
  } else if (
    node.kind === 'triggersBranch' &&
    node.path.ruleGroupId &&
    node.path.stageGroupId &&
    node.path.stageId
  ) {
    const triggers = asArray(
      await fetchTriggers(workflowId, node.path.stageGroupId, node.path.stageId, node.path.ruleGroupId),
    )
    children = triggers.map(trigger => ({
      key: nodeKey('trigger', trigger.id),
      kind: 'trigger' as const,
      id: trigger.id,
      label: displayLabel('trigger', trigger.id, trigger.name),
      count: trigger.cfcWorkflowStageRuleGroupTriggerAttributes?.length ?? 0,
      path: { ...node.path, triggerId: trigger.id },
    }))
  } else if (
    node.kind === 'trigger' &&
    node.path.triggerId &&
    node.path.ruleGroupId &&
    node.path.stageGroupId &&
    node.path.stageId
  ) {
    const [trigger] = asArray(
      await fetchTriggers(
        workflowId,
        node.path.stageGroupId,
        node.path.stageId,
        node.path.ruleGroupId,
        node.path.triggerId,
      ),
    )
    children = (trigger?.cfcWorkflowStageRuleGroupTriggerAttributes ?? []).map(attr => ({
      key: nodeKey('triggerAttribute', attr.id),
      kind: 'triggerAttribute' as const,
      id: attr.id,
      label: displayLabel('triggerAttribute', attr.id, attr.name ?? attr.description),
      path: node.path,
    }))
  }
  return uniqueLabels(children)
}

export type DraftTarget = { kind: TreeNodeKind; path: TreePath; parentKey: string | null }

export type InspectorTarget = { kind: TreeNodeKind; path: TreePath; id: number | null }

function findTrail(
  nodes: TreeNode[],
  cache: ReadonlyMap<string, TreeNode[]>,
  key: string,
  trail: TreeNode[] = [],
): TreeNode[] | null {
  for (const node of nodes) {
    const next = [...trail, node]
    if (node.key === key) return next
    const kids = cache.get(node.key)
    const found = kids ? findTrail(kids, cache, key, next) : null
    if (found) return found
  }
  return null
}

function findNode(nodes: TreeNode[], cache: ReadonlyMap<string, TreeNode[]>, key: string): TreeNode | null {
  return findTrail(nodes, cache, key)?.at(-1) ?? null
}

// The URL carries the whole trail (stageGroup:5/stage:20/…) so a deep link is one walk, not a search.
function trailKeys(trail: readonly TreeNode[]): string {
  return trail.map(node => node.key).join('/')
}

// A node's count comes from its parent's payload; once its own children are loaded, they are the truth.
export function liveCount(node: TreeNode, cache: ReadonlyMap<string, TreeNode[]>): number | undefined {
  if (node.kind === 'ruleGroup' || node.kind === 'rulesBranch' || node.kind === 'triggersBranch')
    return node.count
  return cache.get(node.key)?.length ?? node.count
}

export function useStructureTree(workflowId: number, initialNodeKey: string | null, labels: BranchLabels) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [roots, setRoots] = useState<TreeNode[]>([])
  const [loadingRoots, setLoadingRoots] = useState(false)
  const [rootsError, setRootsError] = useState(false)
  const [draft, setDraft] = useState<DraftTarget | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  const [cache, setCache] = useState<ReadonlyMap<string, TreeNode[]>>(() => new Map())
  const [loadingKeys, setLoadingKeys] = useState<ReadonlySet<string>>(() => new Set())
  const [errorKeys, setErrorKeys] = useState<ReadonlySet<string>>(() => new Set())
  // Labels and the deep link are read through refs: neither may restart the tree when it changes.
  const labelsRef = useRef(labels)
  const linkRef = useRef(initialNodeKey)
  // A response for a workflow the user has already left must not land in the new tree.
  const activeWorkflow = useRef(workflowId)
  useEffect(() => {
    activeWorkflow.current = workflowId
  }, [workflowId])
  useEffect(() => {
    labelsRef.current = labels
  }, [labels])
  useEffect(() => {
    linkRef.current = initialNodeKey
  }, [initialNodeKey])
  const cacheRef = useRef(cache)
  useEffect(() => {
    cacheRef.current = cache
  }, [cache])
  const selectedKeyRef = useRef<string | null>(null)
  useEffect(() => {
    selectedKeyRef.current = selectedKey
  }, [selectedKey])

  const syncNodeUrl = useCallback(
    (key: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('workflow', String(workflowId))
      if (key) params.set('node', key)
      else params.delete('node')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams, workflowId],
  )

  // Read through a ref so the loaders never restart when the URL object changes.
  const syncNodeUrlRef = useRef(syncNodeUrl)
  useEffect(() => {
    syncNodeUrlRef.current = syncNodeUrl
  }, [syncNodeUrl])

  // A selected node that a reload no longer lists (deleted) leaves the panel and the URL.
  const dropSelectionIfGone = useCallback((nodes: TreeNode[], lookup: ReadonlyMap<string, TreeNode[]>) => {
    const key = selectedKeyRef.current
    if (!key || findTrail(nodes, lookup, key)) return
    setSelectedKey(null)
    syncNodeUrlRef.current(null)
  }, [])

  // resolveLink: first load of a workflow follows the URL once; a refresh keeps what is open.
  const loadRoots = useCallback(
    async (resolveLink = false) => {
      setLoadingRoots(true)
      setRootsError(false)
      try {
        const groups = await fetchWorkflowStageGroups(workflowId)
        const nodes = uniqueLabels(
          groups.map(group => ({
            key: nodeKey('stageGroup', group.id),
            kind: 'stageGroup' as const,
            id: group.id,
            label: displayLabel('stageGroup', group.id, group.name),
            count: group.cfcWorkflowStages?.length,
            path: { workflowId, stageGroupId: group.id },
          })),
        )
        if (activeWorkflow.current !== workflowId) return
        if (!resolveLink) {
          setRoots(nodes)
          dropSelectionIfGone(nodes, cacheRef.current)
          return
        }
        const link = linkRef.current
        const trail = link ? link.split('/').filter(Boolean) : []
        const target = trail.at(-1) ?? null
        const nextCache = new Map<string, TreeNode[]>()
        const nextExpanded = new Set<string>()
        const nextErrors = new Set<string>()
        const walk = async (): Promise<boolean> => {
          let level = nodes
          for (let index = 0; index < trail.length; index += 1) {
            const node = level.find(candidate => candidate.key === trail[index])
            if (!node) return false
            if (index === trail.length - 1) return true
            try {
              const children = await fetchNodeChildren(workflowId, node, labelsRef.current)
              nextCache.set(node.key, children)
              nextExpanded.add(node.key)
              level = children
            } catch {
              // D-083: the failed level stays failed with Retry; the link is not resolved.
              nextErrors.add(node.key)
              nextExpanded.add(node.key)
              return false
            }
          }
          return false
        }
        // Old links hold one key only; those still need the search.
        const search = async (parents: TreeNode[]): Promise<boolean> => {
          for (const parent of parents) {
            try {
              const children = await fetchNodeChildren(workflowId, parent, labelsRef.current)
              if (children.length === 0) continue
              nextCache.set(parent.key, children)
              if (children.some(child => child.key === target) || (await search(children))) {
                nextExpanded.add(parent.key)
                return true
              }
            } catch {
              nextErrors.add(parent.key)
            }
          }
          return false
        }
        let resolved = false
        if (target) {
          resolved = await walk()
          if (!resolved && trail.length === 1) resolved = await search(nodes)
        }
        if (activeWorkflow.current !== workflowId) return
        setRoots(nodes)
        setCache(nextCache)
        setExpanded(nextExpanded)
        setErrorKeys(nextErrors)
        setSelectedKey(resolved ? target : null)
      } catch {
        setRoots([])
        setRootsError(true)
      } finally {
        setLoadingRoots(false)
      }
    },
    [dropSelectionIfGone, workflowId],
  )

  const mergeChildren = useCallback((parentKey: string, children: TreeNode[]) => {
    setCache(current => new Map(current).set(parentKey, children))
  }, [])

  const loadChildren = useCallback(
    async (node: TreeNode, force = false) => {
      if (!force && cache.has(node.key)) return
      setLoadingKeys(current => new Set(current).add(node.key))
      setErrorKeys(current => {
        const next = new Set(current)
        next.delete(node.key)
        return next
      })
      try {
        const children = await fetchNodeChildren(workflowId, node, labelsRef.current)
        if (activeWorkflow.current !== workflowId) return
        mergeChildren(node.key, children)
        if (force) dropSelectionIfGone(roots, new Map(cache).set(node.key, children))
      } catch {
        setErrorKeys(current => new Set(current).add(node.key))
      } finally {
        setLoadingKeys(current => {
          const next = new Set(current)
          next.delete(node.key)
          return next
        })
      }
    },
    [cache, dropSelectionIfGone, mergeChildren, roots, workflowId],
  )

  const toggleExpanded = useCallback(
    (node: TreeNode) => {
      setExpanded(current => {
        const next = new Set(current)
        if (next.has(node.key)) next.delete(node.key)
        else next.add(node.key)
        return next
      })
      void loadChildren(node)
    },
    [loadChildren],
  )

  const selectNode = useCallback(
    (node: TreeNode) => {
      setDraft(null)
      setSelectedKey(node.key)
      const trail = findTrail(roots, cache, node.key)
      syncNodeUrl(trail ? trailKeys(trail) : node.key)
      // Containers open on select; a rule / trigger is read by its panel, its attributes on expand only.
      if (
        node.kind !== 'ruleAttribute' &&
        node.kind !== 'triggerAttribute' &&
        node.kind !== 'rule' &&
        node.kind !== 'trigger'
      ) {
        setExpanded(current => new Set([...current, node.key]))
        void loadChildren(node)
      }
    },
    [cache, loadChildren, roots, syncNodeUrl],
  )

  const selectedTrail = useMemo(
    () => (selectedKey ? (findTrail(roots, cache, selectedKey) ?? []) : []),
    [cache, roots, selectedKey],
  )
  const selectedNode = selectedTrail.at(-1) ?? null

  const invalidate = useCallback(
    (parentKey: string | null) => {
      if (!parentKey) {
        void loadRoots()
        return
      }
      const parent = findNode(roots, cache, parentKey)
      if (!parent) {
        void loadRoots()
        return
      }
      void loadChildren(parent, true)
    },
    [cache, loadChildren, loadRoots, roots],
  )

  // A draft is a not-yet-saved child: the inspector opens the same panel with a null id.
  const startDraft = useCallback(
    (target: DraftTarget) => {
      setSelectedKey(null)
      setDraft(target)
      syncNodeUrl(null)
    },
    [syncNodeUrl],
  )

  const cancelDraft = useCallback(() => setDraft(null), [])

  const inspectorTarget: InspectorTarget | null = draft
    ? { kind: draft.kind, path: draft.path, id: null }
    : selectedNode
      ? { kind: selectedNode.kind, path: selectedNode.path, id: selectedNode.id }
      : null

  const draftParentKey = draft?.parentKey ?? null
  const draftParentTrail = useMemo(
    () => (draftParentKey ? (findTrail(roots, cache, draftParentKey) ?? []) : []),
    [cache, draftParentKey, roots],
  )

  return {
    roots,
    cache,
    expanded,
    loadingRoots,
    rootsError,
    loadingKeys,
    errorKeys,
    selectedKey,
    selectedNode,
    selectedTrail,
    draft,
    draftParentTrail,
    inspectorTarget,
    startDraft,
    cancelDraft,
    loadRoots,
    toggleExpanded,
    selectNode,
    setSelectedKey,
    invalidate,
    loadChildren,
  }
}

export type StructureTreeState = ReturnType<typeof useStructureTree>
