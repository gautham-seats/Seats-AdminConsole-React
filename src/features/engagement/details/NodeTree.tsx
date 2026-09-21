'use client'

import { ChevronRight, Play } from 'lucide-react'
import { useState } from 'react'
import { Checkbox, Input } from '@/shared/ui'
import { cn } from '@/shared/ui/cn'
import { ENGAGEMENT_FALLBACK_ONLY, type EngagementText, type EngagementTextKey } from '../engagement-text'
import {
  filterNodeInput,
  flattenNodes,
  isBackgroundNode,
  NODE_NUMBER_FIELDS,
  settingsDisabled,
  urlDisabled,
  weightHidden,
  type DetailsError,
  type EngagementNode,
  type NodeFields,
  type NodeNumberField,
} from './details-model'

export const NODE_FIELD_TEXT: Record<NodeNumberField, EngagementTextKey> = {
  weight: 'Weight',
  decay: 'Decay',
  patience: 'Patience',
  threshold: 'Threshold',
  minZ: 'MinZ',
  maxZ: 'MaxZ',
}

export const nodeInputId = (path: string, field: string) =>
  `engagement-node-${path.replaceAll('.', '-')}-${field}`

export type NodeTreeProps = {
  root: EngagementNode
  nodes: Record<string, NodeFields>
  errors: readonly DetailsError[]
  disabled: boolean
  t: EngagementText
  onChange: (path: string, patch: Partial<NodeFields>) => void
  /** Missing while a run is not offered, such as on a model that has never been saved. */
  onRun?: (node: EngagementNode) => void
  runningNodeId?: number | null
}

const CELL = 'border-b border-border px-2 py-1.5 align-middle'
const HEAD =
  'sticky top-0 z-10 h-10 bg-brand px-2 text-left align-middle text-xs font-medium tracking-[0.02em] whitespace-nowrap text-white'

// Node rows with legacy enable rules (seats-admin-engagement-node.html:60-159).
export function NodeTree({
  root,
  nodes,
  errors,
  disabled,
  t,
  onChange,
  onRun,
  runningNodeId,
}: NodeTreeProps) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const entries = flattenNodes(root).filter(
    entry => ![...collapsed].some(path => entry.path.startsWith(`${path}.`)),
  )

  const toggle = (path: string) =>
    setCollapsed(current => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  const errorFor = (path: string, field: string) =>
    errors.find(error => error.path === path && error.field === field)

  return (
    <div className="scroll-pt-10 overflow-x-auto">
      <table className="w-full min-w-[64rem] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th scope="col" className={cn(HEAD, 'pl-4')}>
              {t('Nodes')}
            </th>
            {NODE_NUMBER_FIELDS.map(field => (
              <th key={field} scope="col" className={HEAD}>
                {t(NODE_FIELD_TEXT[field])}
              </th>
            ))}
            <th scope="col" className={HEAD}>
              {t('Url')}
            </th>
            <th scope="col" className={HEAD}>
              {t('Key')}
            </th>
            {onRun ? (
              <th scope="col" className={HEAD}>
                {t('Run')}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {entries.map(({ path, node, parent }) => {
            const fields = nodes[path]
            if (!fields) return null
            const level = node.level ?? 1
            const name = node.name ?? ''
            const hasChildren = node.childs.length > 0
            const isOpen = !collapsed.has(path)
            const lockSettings = disabled || settingsDisabled(node, fields)
            const lockUrl = disabled || urlDisabled(node, fields)
            const placeholder = !settingsDisabled(node, fields)
              ? ENGAGEMENT_FALLBACK_ONLY.defaultPlaceholder
              : undefined
            return (
              <tr
                key={path}
                className={cn(
                  'transition-colors',
                  level === 1
                    ? 'bg-slate-50 font-semibold'
                    : fields.isActive
                      ? 'bg-white hover:bg-slate-50'
                      : 'bg-white text-slate-500',
                )}
              >
                <td className={cn(CELL, 'pl-4')}>
                  <div className="flex items-center gap-2" style={{ paddingLeft: `${(level - 1) * 1.5}rem` }}>
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggle(path)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? ENGAGEMENT_FALLBACK_ONLY.collapseNode : ENGAGEMENT_FALLBACK_ONLY.expandNode} ${name}`}
                        className="grid size-6 place-items-center rounded-sm text-slate-500 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <ChevronRight
                          aria-hidden
                          className={cn('size-4 transition-transform duration-200', isOpen && 'rotate-90')}
                        />
                      </button>
                    ) : (
                      <span aria-hidden className="size-6" />
                    )}
                    {level === 1 ? null : (
                      <Checkbox
                        checked={fields.isActive}
                        label={name}
                        disabled={disabled}
                        onCheckedChange={() => onChange(path, { isActive: !fields.isActive })}
                      />
                    )}
                    <span title={name} className="truncate">
                      {name}
                    </span>
                  </div>
                </td>
                {NODE_NUMBER_FIELDS.map(field => {
                  if (field === 'weight' && weightHidden(node, parent))
                    return <td key={field} className={CELL} />
                  const id = nodeInputId(path, field)
                  const error = errorFor(path, field)
                  const locked = field === 'weight' ? disabled || !fields.isActive : lockSettings
                  return (
                    <td key={field} className={CELL}>
                      <Input
                        id={id}
                        inputMode="decimal"
                        aria-label={`${t(NODE_FIELD_TEXT[field])} ${name}`}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? `${id}-error` : undefined}
                        value={fields[field]}
                        placeholder={field === 'weight' ? undefined : placeholder}
                        disabled={locked}
                        onChange={event =>
                          onChange(path, { [field]: filterNodeInput(field, event.target.value) })
                        }
                        className="h-8 w-20 bg-white tabular-nums placeholder:italic"
                      />
                      <FieldError id={id} message={error?.message} />
                    </td>
                  )
                })}
                <td className={CELL}>
                  <Input
                    id={nodeInputId(path, 'url')}
                    aria-label={`${t('Url')} ${name}`}
                    aria-invalid={Boolean(errorFor(path, 'url'))}
                    aria-describedby={errorFor(path, 'url') ? `${nodeInputId(path, 'url')}-error` : undefined}
                    maxLength={200}
                    value={fields.url}
                    disabled={lockUrl}
                    onChange={event => onChange(path, { url: event.target.value })}
                    className="h-8 w-56 bg-white"
                  />
                  <FieldError id={nodeInputId(path, 'url')} message={errorFor(path, 'url')?.message} />
                </td>
                <td className={CELL}>
                  <Input
                    id={nodeInputId(path, 'urlKey')}
                    aria-label={`${t('Key')} ${name}`}
                    maxLength={200}
                    value={fields.urlKey}
                    disabled={lockUrl}
                    onChange={event => onChange(path, { urlKey: event.target.value })}
                    className="h-8 w-28 bg-white"
                  />
                </td>
                {onRun ? (
                  <td className={CELL}>
                    {/* seats-admin-engagement-node.html:264-268: no Run on level 3 or the background node. */}
                    {level !== 3 && !isBackgroundNode(node) ? (
                      <button
                        type="button"
                        disabled={disabled || runningNodeId !== null}
                        title={ENGAGEMENT_FALLBACK_ONLY.runNodeHelp}
                        aria-label={`${t('Run')} ${name}`}
                        onClick={() => onRun(node)}
                        className="grid size-8 place-items-center rounded-md border border-border bg-white text-brand transition-colors duration-200 hover:bg-brand/[0.07] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                      >
                        <Play
                          aria-hidden
                          className={cn('size-4', runningNodeId === node.id && 'animate-pulse')}
                        />
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Visible error under its input, named by the input's aria-describedby.
function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return message ? (
    <p id={`${id}-error`} className="mt-1 max-w-56 text-xs font-medium whitespace-normal text-destructive">
      {message}
    </p>
  ) : null
}
