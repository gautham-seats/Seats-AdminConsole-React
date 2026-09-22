import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from './cn'
import { StateArt } from './StateArt'

export type EmptyStateProps = {
  title: string
  description?: string
  icon?: LucideIcon
  /** 'results' when a search is active, so the drawing and label say no match rather than no data. */
  kind?: 'empty' | 'results'
  action?: ReactNode
  /** Renders the title as a heading at this level; a paragraph when omitted. */
  headingLevel?: 2 | 3
  /** Resource word for the small "No results" label; the English fallback is used when absent. */
  resultsLabel?: string
  /** 'table' pins the block over the visible columns of a sideways-scrolling table. */
  surface?: 'plain' | 'table'
  className?: string
}

// English fallback: legacy resources have no short label for a search with no matches.
export const EMPTY_FALLBACK_ONLY = { resultsLabel: 'No results' } as const

// Shared "nothing here" block: open, no box, and centred in whatever height it is given.
export function EmptyState({
  title,
  description,
  icon,
  kind = 'empty',
  action,
  headingLevel,
  resultsLabel,
  surface = 'plain',
  className,
}: EmptyStateProps) {
  const titleClassName = 'text-[15px] font-semibold text-balance text-foreground'
  const block = (
    <div
      role="status"
      className={cn(
        'flex h-full min-h-72 flex-col items-center justify-center gap-3.5 px-6 py-12 text-center',
        surface === 'table' && 'sticky left-0 w-[100cqw] max-w-full',
        className,
      )}
    >
      <StateArt kind={kind} icon={kind === 'empty' ? icon : undefined} className="qs-rise size-28 shrink-0" />
      <div className="qs-rise flex flex-col gap-1.5 [animation-delay:120ms]">
        {kind === 'results' ? (
          <span className="text-[10.5px] font-bold tracking-[0.17em] text-slate-600 uppercase">
            {resultsLabel?.trim() || EMPTY_FALLBACK_ONLY.resultsLabel}
          </span>
        ) : null}
        {headingLevel === 2 ? (
          <h2 className={titleClassName}>{title}</h2>
        ) : headingLevel === 3 ? (
          <h3 className={titleClassName}>{title}</h3>
        ) : (
          <p className={titleClassName}>{title}</p>
        )}
        {description ? (
          <p className="max-w-sm text-sm text-balance text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="qs-rise [animation-delay:240ms]">{action}</div> : null}
    </div>
  )

  // Size containment keeps the 100cqw box out of the table's intrinsic width, as the table loader does.
  return surface === 'table' ? <div className="min-h-[inherit] [contain:inline-size]">{block}</div> : block
}
