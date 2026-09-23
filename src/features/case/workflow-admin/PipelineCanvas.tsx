'use client'

import { Plus, Workflow } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DelayedLoading, ErrorState, GearworkLoader } from '@/shared/ui'
import { EmptyState } from '@/shared/ui/EmptyState'
import { cn } from '@/shared/ui/cn'
import { useScreenText } from '@/features/settings/shared/use-screen-text'
import { LANE_MAX_HEIGHT, useLaneWindow } from './use-lane-window'
import { liveCount, type StructureTreeState, type TreeNode } from './use-structure-tree'

const TEXT = {
  Loading: 'Loading',
  Retry: 'Retry',
  Refresh: 'Refresh',
  AlertGeneralErrorDefault: 'There was an error while processing your request.',
  Empty: 'There are no items to show.',
} as const

const EN = {
  canvas: 'Workflow pipeline',
  addStageGroup: 'Add stage group',
  addStage: 'Add stage',
  emptyStage: 'No stages yet.',
} as const

type PipelineCanvasProps = {
  workflowId: number
  tree: StructureTreeState
  canAdd: boolean
}

// Entrance stagger is capped so a long lane never waits on the one above it.
function StageNode({
  node,
  index,
  selected,
  onSelect,
}: {
  node: TreeNode
  index: number
  selected: boolean
  onSelect: (node: TreeNode) => void
}) {
  return (
    <li>
      <button
        type="button"
        aria-current={selected ? 'true' : undefined}
        style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
        onClick={() => onSelect(node)}
        className={cn(
          'lift-bloom animate-item-in flex h-9 w-full items-center gap-2 rounded-md border px-2.5 text-left text-xs',
          'transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-60',
          selected
            ? 'border-brand bg-brand/[0.08] font-semibold text-brand'
            : 'border-border bg-white text-foreground hover:border-brand/40 hover:bg-brand/[0.05] active:bg-brand/[0.1]',
        )}
      >
        {/* Fixed h-9 keeps the lane window exact, so the full label is offered as a title. */}
        <span className="min-w-0 flex-1 truncate" title={node.label}>
          {node.label}
        </span>
        {node.count !== undefined ? (
          <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{node.count}</span>
        ) : null}
      </button>
    </li>
  )
}

function Lane({
  tree,
  lane,
  canAdd,
  connected,
}: {
  tree: StructureTreeState
  lane: TreeNode
  canAdd: boolean
  connected: boolean
}) {
  const t = useScreenText(TEXT)
  const stages = tree.cache.get(lane.key) ?? []
  const loading = tree.loadingKeys.has(lane.key)
  const failed = tree.errorKeys.has(lane.key)
  const laneWindow = useLaneWindow(stages.length)
  const slice = stages.slice(laneWindow.start, laneWindow.end)

  return (
    <li className="relative flex min-w-[15rem] flex-1 flex-col lg:min-w-[13rem]">
      {connected ? <Connector /> : null}
      <div className="flex h-full flex-col rounded-xl border border-border bg-page p-3">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => tree.selectNode(lane)}
            className={cn(
              'min-w-0 flex-1 rounded-md px-1.5 py-1 text-left text-sm font-semibold break-words',
              'transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
              'hover:bg-brand/[0.06] active:bg-brand/[0.1] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              tree.selectedKey === lane.key ? 'text-brand' : 'text-foreground',
            )}
          >
            {lane.label}
          </button>
          {loading ? <GearworkLoader className="!h-5 !w-5 shrink-0" /> : null}
          {!loading && liveCount(lane, tree.cache) !== undefined ? (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {liveCount(lane, tree.cache)}
            </span>
          ) : null}
        </div>

        {failed ? (
          <button
            type="button"
            onClick={() => void tree.loadChildren(lane, true)}
            className="rounded-md border border-border px-2 py-1 text-xs font-medium text-brand transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-brand/[0.06] active:bg-brand/[0.1] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t('Retry')}
          </button>
        ) : !loading && stages.length === 0 ? (
          <p className="px-1.5 py-2 text-xs text-muted-foreground">{EN.emptyStage}</p>
        ) : (
          <ul
            className={cn('min-h-0 space-y-1.5', laneWindow.active && 'overflow-y-auto')}
            style={laneWindow.active ? { maxHeight: `${LANE_MAX_HEIGHT}px` } : undefined}
            onScroll={laneWindow.active ? laneWindow.onScroll : undefined}
          >
            {laneWindow.padTop > 0 ? <li aria-hidden style={{ height: `${laneWindow.padTop}px` }} /> : null}
            {slice.map((node, index) => (
              <StageNode
                key={node.key}
                node={node}
                index={index}
                selected={tree.selectedKey === node.key}
                onSelect={tree.selectNode}
              />
            ))}
            {laneWindow.padBottom > 0 ? (
              <li aria-hidden style={{ height: `${laneWindow.padBottom}px` }} />
            ) : null}
          </ul>
        )}

        {canAdd ? (
          <button
            type="button"
            onClick={() => tree.startDraft({ kind: 'stage', path: lane.path, parentKey: lane.key })}
            className="mt-2 flex h-8 items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-brand/50 hover:text-brand active:bg-brand/[0.08] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Plus aria-hidden className="size-3.5" />
            {EN.addStage}
          </button>
        ) : null}
      </div>
    </li>
  )
}

// The connector draws itself in once the lane mounts, and is a plain line under reduced motion.
function Connector() {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setDrawn(true))
    return () => window.cancelAnimationFrame(id)
  }, [])
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -top-4 left-1/2 h-4 w-0.5 origin-top bg-border transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none lg:top-1/2 lg:-left-5 lg:h-0.5 lg:w-5 lg:origin-left"
      style={{ transform: drawn ? 'scale(1)' : 'scale(0)' }}
    />
  )
}

export function PipelineCanvas({ workflowId, tree, canAdd }: PipelineCanvasProps) {
  const t = useScreenText(TEXT)
  const { roots, cache, loadingKeys, errorKeys, loadChildren } = tree

  // Lanes need their stages up front; the tree cache keeps each one from being fetched twice.
  useEffect(() => {
    roots.forEach(lane => {
      if (cache.has(lane.key) || loadingKeys.has(lane.key) || errorKeys.has(lane.key)) return
      void loadChildren(lane)
    })
  }, [roots, cache, loadingKeys, errorKeys, loadChildren])

  if (tree.loadingRoots) {
    return (
      <div className="grid min-h-[16rem] flex-1 place-items-center rounded-xl border border-border bg-white shadow-sm">
        <DelayedLoading active label={t('Loading')} />
      </div>
    )
  }

  if (tree.rootsError) {
    return (
      <div className="flex min-h-0 flex-1 items-center rounded-xl border border-border bg-white p-4 shadow-sm">
        <ErrorState
          message={t('AlertGeneralErrorDefault')}
          retryLabel={t('Refresh')}
          onRetry={() => void tree.loadRoots()}
        />
      </div>
    )
  }

  if (roots.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 rounded-xl border border-border bg-white shadow-sm">
        <EmptyState
          title={t('Empty')}
          icon={Workflow}
          action={
            canAdd ? (
              <button
                type="button"
                onClick={() => tree.startDraft({ kind: 'stageGroup', path: { workflowId }, parentKey: null })}
                className="lift-bloom inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-3 text-sm font-medium text-primary-foreground transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-brand/90 active:bg-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Plus aria-hidden className="size-4" />
                {EN.addStageGroup}
              </button>
            ) : undefined
          }
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto rounded-xl border border-border bg-white p-3 shadow-sm">
      <ul
        aria-label={EN.canvas}
        className="flex min-w-0 flex-col items-stretch gap-4 lg:flex-row lg:items-start lg:gap-5"
      >
        {roots.map((lane, index) => (
          <Lane key={lane.key} tree={tree} lane={lane} canAdd={canAdd} connected={index > 0} />
        ))}
        {canAdd ? (
          // Sits at the top of the row rather than stretching: an empty box as tall as a lane reads as a fault.
          <li className="flex shrink-0 self-start">
            <button
              type="button"
              onClick={() => tree.startDraft({ kind: 'stageGroup', path: { workflowId }, parentKey: null })}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-4 text-xs font-medium text-muted-foreground transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-brand/50 hover:text-brand active:bg-brand/[0.08] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Plus aria-hidden className="size-4" />
              {EN.addStageGroup}
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
