import { cn } from '@/shared/ui/cn'
import type { BatteryLevel } from './device-query'

// iPhone status-bar battery (battery.designs.html, Battery A): glass shell, rounded fill, light sweep.
const LEVEL_FILL: Record<BatteryLevel, string> = {
  good: 'from-[color-mix(in_srgb,var(--color-battery-good)_80%,white)] via-battery-good to-battery-good-deep shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_0_10px_-2px_var(--color-battery-good)]',
  medium:
    'from-[color-mix(in_srgb,var(--color-battery-medium)_80%,white)] via-battery-medium to-battery-medium-deep shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_0_10px_-2px_var(--color-battery-medium)]',
  low: 'from-[color-mix(in_srgb,var(--color-battery-low)_80%,white)] via-battery-low to-battery-low-deep shadow-[inset_0_1px_0_rgba(255,255,255,.55),0_0_10px_-2px_var(--color-battery-low)]',
}

export const SHELL =
  'relative rounded-md border-[1.5px] border-battery-shell bg-battery-track shadow-[inset_0_1px_1px_rgba(255,255,255,.7)] after:absolute after:top-[5px] after:-right-[5.5px] after:h-1.5 after:w-[3px] after:rounded-r-[3px] after:bg-battery-shell after:content-[""]'

const SWEEP =
  'after:absolute after:inset-0 after:animate-battery-sweep after:bg-[linear-gradient(105deg,transparent_30%,rgba(255,255,255,.55)_50%,transparent_70%)] after:bg-[length:200%_100%] after:content-[""] motion-reduce:after:animate-none'

type Props = { percent: number; level: BatteryLevel; delayMs?: number; className?: string }

export function fillWidth(percent: number): string {
  const clamped = Math.min(Math.max(percent, 0), 100)
  return `calc((100% - 4px) * ${clamped} / 100)`
}

export function BatteryGlyph({ percent, level, delayMs = 0, className }: Props) {
  return (
    <span
      aria-hidden
      className={cn(
        SHELL,
        'inline-block h-[18px] w-10 align-middle',
        level === 'low' &&
          'border-[color-mix(in_srgb,var(--color-battery-low)_60%,var(--color-battery-shell))] animate-battery-low motion-reduce:animate-none',
        className,
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 bottom-0.5 left-0.5 min-w-1 overflow-hidden rounded-[3.5px] bg-linear-to-b animate-battery-fill motion-reduce:animate-none',
          LEVEL_FILL[level],
          SWEEP,
        )}
        style={{ width: fillWidth(percent), animationDelay: `${delayMs}ms` }}
      />
    </span>
  )
}
