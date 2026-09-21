import { cn } from '../cn'
import { gearPath, LEAF_PATHS } from './mark'

type CogProps = {
  cx: number
  cy: number
  teeth: number
  outer: number
  inner: number
  fill: string
  spin: string
  keep: string
}

// Leaves counter-rotate so the SEAtS mark stays upright while its cog turns.
function Cog({ cx, cy, teeth, outer, inner, fill, spin, keep }: CogProps) {
  const origin = { transformBox: 'view-box' as const, transformOrigin: `${cx}px ${cy}px` }
  const scale = (inner * 1.02) / 46
  return (
    <g className={cn('will-change-transform', spin)} style={origin}>
      <path className={fill} d={gearPath(cx, cy, teeth, outer, inner)} />
      <g className={cn('will-change-transform', keep)} style={origin}>
        <g transform={`translate(${cx} ${cy}) scale(${scale.toFixed(4)}) translate(-50 -50)`}>
          {LEAF_PATHS.map(d => (
            <path key={d} className="fill-white" d={d} />
          ))}
        </g>
      </g>
    </g>
  )
}

export function GearworkLoader({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 110" aria-hidden="true" className={cn('h-[53px] w-[58px] shrink-0', className)}>
      <Cog
        cx={79}
        cy={29}
        teeth={8}
        outer={24.5}
        inner={19.5}
        fill="fill-[var(--color-gear-cog)]"
        spin="animate-cog-b motion-reduce:animate-none"
        keep="animate-cog-b-keep motion-reduce:animate-none"
      />
      <Cog
        cx={44}
        cy={64}
        teeth={10}
        outer={30}
        inner={25}
        fill="fill-brand"
        spin="animate-cog-a motion-reduce:animate-none"
        keep="animate-cog-a-keep motion-reduce:animate-none"
      />
    </svg>
  )
}
