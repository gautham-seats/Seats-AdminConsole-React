'use client'

import { ChevronDown, ChevronRight, FolderTree, Layers, ListTree, Plus, Workflow } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DelayedLoading, ErrorState, GearworkLoader } from '@/shared/ui'
import { EmptyState } from '@/shared/ui/EmptyState'
import { cn } from '@/shared/ui/cn'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { childDraft, hasTreeChildren } from './node-actions'
import { useFixedWindow } from './use-fixed-window'
import { liveCount, type StructureTreeState, type TreeNode } from './use-structure-tree'

const TEXT = {
  Loading: 'Loading',
  Retry: 'Retry',
  Refresh: 'Refresh',
  Add: 'Add',
  Empty: 'There are no items to show.',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
} as const

const EN = {
  treeLabel: 'Workflow structure',
  expand: 'Expand',
  collapse: 'Collapse',
  addStageGroup: 'Add stage group',
} as const

// Every treeitem is h-8, so long trees are windowed by a fixed row height.
const ROW_HEIGHT = 32

const ADD_LABEL = {
  stageGroup: 'Add stage',
  stage: 'Add rule group',
  rulesBranch: 'Add rule',
  triggersBranch: 'Add trigger',
  rule: 'Add rule attribute',
  trigger: 'Add trigger attribute',
} as const

function glyph(kind: TreeNode['kind']) {
  switch (kind) {
    case 'stageGroup':
      return <FolderTree aria-hidden className="size-4 shrink-0 text-brand/80" />
    case 'stage':
      return <Layers aria-hidden className="size-4 shrink-0 text-brand/80" />
    case 'ruleGroup':
    case 'rulesBranch':
    case 'triggersBranch':
      return <ListTree aria-hidden className="size-4 shrink-0 text-brand/80" />
    default:
      return <Workflow aria-hidden className="size-4 shrink-0 text-brand/80" />
  }
}

type Flat = { node: TreeNode; depth: number; parentKey: string | null; size: number; position: number }

function flatten(
  nodes: readonly TreeNode[],
  cache: ReadonlyMap<string, TreeNode[]>,
  expanded: ReadonlySet<string>,
  depth: number,
  parentKey: string | null,
  out: Flat[],
) {
  nodes.forEach((node, index) => {
    out.push({ node, depth, parentKey, size: nodes.length, position: index + 1 })
    if (!expanded.has(node.key)) return
    const kids = cache.get(node.key)
    if (kids?.length) flatten(kids, cache, expanded, depth + 1, node.key, out)
  })
}

type StructureTreeProps = {
  workflowId: number
  tree: StructureTreeState
  canAdd: boolean
}

// Tab order is grouped by logic: the tree is one Tab stop and the arrow keys move inside it (APG tree pattern).
export function StructureTree({ workflowId, tree, canAdd }: StructureTreeProps) {
  const t = useScreenText(TEXT)
  const rows = useMemo(() => {
    const out: Flat[] = []
    flatten(tree.roots, tree.cache, tree.expanded, 0, null, out)
    return out
  }, [tree.roots, tree.cache, tree.expanded])

  const [focusKey, setFocusKey] = useState<string | null>(null)
  const items = useRef(new Map<string, HTMLDivElement>())
  const scroller = useRef<HTMLDivElement>(null)
  const rowWindow = useFixedWindow(rows.length, ROW_HEIGHT, scroller)
  const pendingFocus = useRef<string | null>(null)
  const activeKey =
    focusKey && rows.some(row => row.node.key === focusKey)
      ? focusKey
      : tree.selectedKey && rows.some(row => row.node.key === tree.selectedKey)
        ? tree.selectedKey
        : (rows[0]?.node.key ?? null)

  const moveTo = (key: string | undefined) => {
    if (!key) return
    setFocusKey(key)
    const element = items.current.get(key)
    if (element) {
      element.focus()
      return
    }
    // The target is outside the rendered window: scroll to it, then focus once it renders.
    pendingFocus.current = key
    const index = rows.findIndex(row => row.node.key === key)
    const node = scroller.current
    if (node && index >= 0) {
      node.scrollTop = index * ROW_HEIGHT
      rowWindow.onScroll()
    }
  }

  useEffect(() => {
    const key = pendingFocus.current
    if (!key) return
    const element = items.current.get(key)
    if (!element) return
    pendingFocus.current = null
    element.focus()
  })

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, row: Flat) => {
    const index = rows.findIndex(candidate => candidate.node.key === row.node.key)
    const { node } = row
    const expandable = hasTreeChildren(node.kind)
    const isExpanded = tree.expanded.has(node.key)

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        moveTo(rows[index + 1]?.node.key)
        return
      case 'ArrowUp':
        event.preventDefault()
        moveTo(rows[index - 1]?.node.key)
        return
      case 'Home':
        event.preventDefault()
        moveTo(rows[0]?.node.key)
        return
      case 'End':
        event.preventDefault()
        moveTo(rows[rows.length - 1]?.node.key)
        return
      case 'ArrowRight':
        event.preventDefault()
        if (!expandable) return
        if (!isExpanded) tree.toggleExpanded(node)
        else if (tree.errorKeys.has(node.key)) void tree.loadChildren(node, true)
        else moveTo(rows[index + 1]?.node.key)
        return
      case 'Insert':
      case '+': {
        const draft = canAdd ? childDraft(node) : null
        if (!draft) return
        event.preventDefault()
        tree.startDraft(draft)
        return
      }
      case 'ArrowLeft':
        event.preventDefault()
        if (expandable && isExpanded) tree.toggleExpanded(node)
        else if (row.parentKey) moveTo(row.parentKey)
        return
      case 'Enter':
      case ' ':
        event.preventDefault()
        tree.selectNode(node)
        return
      default:
    }
  }

  const body = (() => {
    if (tree.loadingRoots) return <DelayedLoading active label={t('Loading')} />
    if (tree.rootsError) {
      return (
        <ErrorState
          message={t('AlertGeneralErrorDefault')}
          retryLabel={t('Refresh')}
          onRetry={() => void tree.loadRoots()}
        />
      )
    }
    if (rows.length === 0) return <EmptyState title={t('Empty')} icon={Workflow} className="min-h-40" />

    return (
      <div role="tree" aria-label={EN.treeLabel} className="py-1">
        {rowWindow.padTop > 0 ? <div aria-hidden style={{ height: `${rowWindow.padTop}px` }} /> : null}
        {rows.slice(rowWindow.start, rowWindow.end).map(row => {
          const { node } = row
          const expandable = hasTreeChildren(node.kind)
          const isExpanded = tree.expanded.has(node.key)
          const draft = canAdd ? childDraft(node) : null
          const addLabel = ADD_LABEL[node.kind as keyof typeof ADD_LABEL]

          return (
            <div
              key={node.key}
              ref={element => {
                if (element) items.current.set(node.key, element)
                else items.current.delete(node.key)
              }}
              role="treeitem"
              aria-level={row.depth + 1}
              aria-setsize={row.size}
              aria-posinset={row.position}
              aria-expanded={expandable ? isExpanded : undefined}
              aria-selected={tree.selectedKey === node.key}
              tabIndex={activeKey === node.key ? 0 : -1}
              aria-keyshortcuts={draft && addLabel ? 'Insert' : undefined}
              style={{ paddingLeft: `${row.depth * 12 + 8}px` }}
              className={cn(
                'flex h-8 cursor-pointer items-center gap-2 rounded-md pr-2 text-sm outline-none',
                'transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
                'hover:bg-brand/[0.05] active:bg-brand/[0.1] focus-visible:ring-2 focus-visible:ring-ring',
                tree.selectedKey === node.key && 'bg-brand/[0.08] font-medium text-brand',
              )}
              onClick={() => {
                setFocusKey(node.key)
                tree.selectNode(node)
              }}
              onKeyDown={event => onKeyDown(event, row)}
            >
              {/* Mouse shortcuts only: ArrowRight/ArrowLeft expand, retry and collapse; Insert adds a child. */}
              {expandable ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  onMouseDown={event => event.preventDefault()}
                  aria-label={`${isExpanded ? EN.collapse : EN.expand} ${node.label}`}
                  className="grid size-5 shrink-0 place-items-center rounded transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-page active:bg-brand/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={event => {
                    event.stopPropagation()
                    tree.toggleExpanded(node)
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown aria-hidden className="size-4" />
                  ) : (
                    <ChevronRight aria-hidden className="size-4" />
                  )}
                </button>
              ) : (
                <span className="size-5 shrink-0" />
              )}
              {glyph(node.kind)}
              <span className="min-w-0 flex-1 truncate" title={node.label}>
                {node.label}
              </span>
              {tree.loadingKeys.has(node.key) ? <GearworkLoader className="!h-5 !w-5 shrink-0" /> : null}
              {tree.errorKeys.has(node.key) ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`${t('Retry')} ${node.label}`}
                  className="shrink-0 rounded px-1 text-xs font-medium text-brand transition-colors duration-150 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={event => {
                    event.stopPropagation()
                    void tree.loadChildren(node, true)
                  }}
                >
                  {t('Retry')}
                </button>
              ) : null}
              {!tree.loadingKeys.has(node.key) && liveCount(node, tree.cache) !== undefined ? (
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {liveCount(node, tree.cache)}
                </span>
              ) : null}
              {draft && addLabel ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  onMouseDown={event => event.preventDefault()}
                  aria-label={`${addLabel} ${node.label}`}
                  className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-brand/10 hover:text-brand active:bg-brand/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={event => {
                    event.stopPropagation()
                    tree.startDraft(draft)
                  }}
                >
                  <Plus aria-hidden className="size-3.5" />
                </button>
              ) : null}
            </div>
          )
        })}
        {rowWindow.padBottom > 0 ? <div aria-hidden style={{ height: `${rowWindow.padBottom}px` }} /> : null}
      </div>
    )
  })()

  return (
    <div className="flex w-full shrink-0 flex-col rounded-xl border border-border bg-white shadow-sm lg:w-[320px]">
      <div
        ref={scroller}
        onScroll={rowWindow.onScroll}
        className="max-h-[70dvh] min-h-[16rem] flex-1 overflow-auto p-1"
      >
        {body}
      </div>
      {canAdd ? (
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => tree.startDraft({ kind: 'stageGroup', path: { workflowId }, parentKey: null })}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-brand/50 hover:text-brand active:bg-brand/[0.08] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Plus aria-hidden className="size-3.5" />
            {EN.addStageGroup}
          </button>
        </div>
      ) : null}
    </div>
  )
}
