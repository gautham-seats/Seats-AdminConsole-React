'use client'

import { useId } from 'react'
import { cn } from '../cn'
import { LEAF_PATHS, WAVE_PATH } from './mark'

// Three drifting light bands in the wave's own coordinates (y 0 = the water line), each on its own tempo.
const AURORA = [
  {
    id: 'tide-aurora-a',
    color: '#8fe3ff',
    motion: 'animate-tide-aurora',
    d: 'M-20 8 C10 -4 30 24 60 10 S100 0 120 8 L120 20 C100 12 80 34 50 22 S10 6 -20 20 Z',
  },
  {
    id: 'tide-aurora-b',
    color: '#9df5e4',
    motion: 'animate-tide-aurora-slow',
    d: 'M-20 26 C15 14 35 40 65 28 S105 18 120 26 L120 36 C105 28 80 48 55 38 S15 24 -20 36 Z',
  },
  {
    id: 'tide-aurora-c',
    color: '#cfc3ff',
    motion: 'animate-tide-aurora-fast',
    d: 'M-20 44 C10 34 40 56 70 46 S100 38 120 44 L120 50 C100 44 70 62 40 52 S10 42 -20 50 Z',
  },
] as const

export function TideLoader({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  const disc = `tide-disc-${id}`
  const wet = `tide-wet-${id}`
  const glow = `tide-glow-${id}`
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn('size-[104px] shrink-0', className)}>
      <defs>
        <clipPath id={disc}>
          <circle cx="50" cy="50" r="44.8" />
        </clipPath>
        <clipPath id={wet}>
          <path d={WAVE_PATH} />
        </clipPath>
        <filter id={glow} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        {AURORA.map(ribbon => (
          <linearGradient key={ribbon.id} id={`${ribbon.id}-${id}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={ribbon.color} stopOpacity="0" />
            <stop offset="0.35" stopColor={ribbon.color} stopOpacity="0.9" />
            <stop offset="0.65" stopColor={ribbon.color} stopOpacity="0.75" />
            <stop offset="1" stopColor={ribbon.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      <circle cx="50" cy="50" r="46" className="fill-none stroke-brand" strokeWidth={2.4} />
      {LEAF_PATHS.map(d => (
        <path key={`under-${d}`} d={d} className="fill-brand opacity-90" />
      ))}
      <g clipPath={`url(#${disc})`}>
        <g className="animate-tide-rise motion-reduce:translate-y-[44px] motion-reduce:animate-none">
          <g className="animate-tide-drift-slow motion-reduce:animate-none">
            <path d={WAVE_PATH} transform="translate(0 -2)" className="fill-brand opacity-35" />
          </g>
          <g className="animate-tide-drift motion-reduce:animate-none">
            <path d={WAVE_PATH} className="fill-brand" />
            <g clipPath={`url(#${wet})`}>
              <g className="animate-tide-undrift motion-reduce:animate-none">
                {/* Aurora ribbons live in the water, behind the leaves; screen blend keeps them luminous. */}
                <g filter={`url(#${glow})`} style={{ mixBlendMode: 'screen' }}>
                  {AURORA.map(ribbon => (
                    <path
                      key={ribbon.id}
                      d={ribbon.d}
                      fill={`url(#${ribbon.id}-${id})`}
                      className={cn(ribbon.motion, 'motion-reduce:animate-none motion-reduce:opacity-60')}
                      style={{ transformOrigin: '50px 20px' }}
                    />
                  ))}
                </g>
                <g className="animate-tide-unrise motion-reduce:-translate-y-[44px] motion-reduce:animate-none">
                  {LEAF_PATHS.map(d => (
                    <path key={`over-${d}`} d={d} className="fill-white" />
                  ))}
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
}
