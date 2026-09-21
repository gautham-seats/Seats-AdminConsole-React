'use client'

import { cn } from './cn'
import { GearworkLoader, LoadingLabel, TideLoader } from './loaders'
import { useDelayedFlag } from './use-delayed-flag'

export type DelayedLoadingProps = {
  active: boolean
  label: string
  variant?: 'inline' | 'page'
  /** 'table' pins the loader over the visible columns of a sideways-scrolling table and adds skeleton rows. */
  surface?: 'plain' | 'table'
  className?: string
}

const LABEL_SIZE = 'text-xs'

// Gearwork for a component or table area, Tide for a whole page (docs/decisions.md D-017).
export function DelayedLoading({
  active,
  label,
  variant = 'inline',
  surface = 'plain',
  className,
}: DelayedLoadingProps) {
  const visible = useDelayedFlag(active)
  if (!visible) return null
  if (variant === 'page') return <TidePageLoading label={label} className={className} />
  return <InlineLoading label={label} surface={surface} className={className} />
}

function InlineLoading({
  label,
  surface,
  className,
}: {
  label: string
  surface: 'plain' | 'table'
  className?: string
}) {
  const loader = (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'relative flex min-h-[inherit] animate-fade-in flex-col items-center justify-center gap-3 p-6',
        // 100cqw pins the loader over the visible columns; max-w-full stops a stale cqw (measured before a
        // scrollbar appeared) from overflowing the cell, which made the two scrollbars summon each other.
        surface === 'table' && 'sticky left-0 w-[100cqw] max-w-full',
        className,
      )}
    >
      {surface === 'table' ? <SkeletonRows /> : null}
      <GearworkLoader className="relative" />
      <LoadingLabel label={label} className={cn('relative', LABEL_SIZE)} />
    </div>
  )
  // Size containment keeps the 100cqw box out of the table's intrinsic width.
  return surface === 'table' ? <div className="min-h-[inherit] [contain:inline-size]">{loader}</div> : loader
}

const SKELETON_ROWS = [72, 58, 66, 49, 61, 54]

// Shimmering placeholder rows behind a table's loader, faded towards the centre.
function SkeletonRows() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-4 px-6 [mask-image:radial-gradient(ellipse_at_center,transparent_18%,#000_62%)]"
    >
      {SKELETON_ROWS.map((width, index) => (
        <div key={index} className="flex items-center gap-4" style={{ opacity: 1 - index * 0.1 }}>
          <span className="skeleton-bar h-3 w-4 shrink-0 rounded" />
          <span className="skeleton-bar h-3 rounded-full" style={{ width: `${width * 0.35}%` }} />
          <span className="skeleton-bar h-3 rounded-full" style={{ width: `${width * 0.25}%` }} />
          <span className="skeleton-bar h-3 flex-1 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function TidePageLoading({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex min-h-[60vh] flex-1 animate-fade-in flex-col items-center justify-center gap-5',
        className,
      )}
    >
      <TideLoader />
      <LoadingLabel label={label} style="hop" className={LABEL_SIZE} />
    </div>
  )
}
