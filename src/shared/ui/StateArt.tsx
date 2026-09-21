'use client'

import type { LucideIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from './cn'

// One animated drawing per state; the direction for each was chosen by Gautham (Halo, Drafting, Pulse, Aurora).
export type StateArtKind =
  'empty' | 'results' | 'connection' | 'server' | 'missing' | 'blocked' | 'noaccess' | 'unable'

const TONE: Record<StateArtKind, string> = {
  empty: 'text-brand',
  results: 'text-slate-600',
  connection: 'text-brand',
  server: 'text-destructive',
  missing: 'text-slate-600',
  blocked: 'text-amber-700',
  noaccess: 'text-amber-700',
  unable: 'text-brand',
}

export const STATE_ART_TONE = TONE

function Glyph({ kind, x, y, scale }: { kind: StateArtKind; x: number; y: number; scale: number }) {
  let body: ReactNode
  switch (kind) {
    case 'empty':
    case 'results':
      body = (
        <>
          <circle pathLength={1} cx="11" cy="11" r="7" />
          <path pathLength={1} d="m20 20-3.5-3.5" />
          <path pathLength={1} d="M8.5 11h5" />
        </>
      )
      break
    case 'connection':
      body = (
        <>
          <path d="M12 20h.01" />
          <path className="qs-arc" d="M8.5 16.4a5 5 0 0 1 7 0" />
          <path className="qs-arc qs-a2" d="M5 12.9a10 10 0 0 1 14 0" />
          <path className="qs-arc qs-a3" d="M1.5 9.3a15 15 0 0 1 21 0" />
          <path className="qs-slash" pathLength={1} d="M3 3l18 18" />
        </>
      )
      break
    case 'server':
      body = (
        <>
          <rect x="3" y="3" width="18" height="7" rx="2" />
          <rect x="3" y="14" width="18" height="7" rx="2" />
          <path d="M7 6.5h.01" />
          <circle className="qs-led" cx="7" cy="17.5" r="1.3" />
          <path d="M11 17.5h6" />
        </>
      )
      break
    case 'missing':
      body = (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
          <path d="m9 9 4 4" />
          <path d="m13 9-4 4" />
        </>
      )
      break
    case 'blocked':
      body = (
        <>
          <rect pathLength={1} x="4" y="11" width="16" height="10" rx="2" />
          <path pathLength={1} className="qs-shackle" d="M8 11V7a4 4 0 0 1 8 0v4" />
          <path pathLength={1} d="M12 15v2" />
        </>
      )
      break
    case 'noaccess':
      body = (
        <>
          <path
            pathLength={1}
            d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
          />
          <path pathLength={1} className="qs-mark" d="M9.5 12.5h5" />
        </>
      )
      break
    case 'unable':
      body = (
        <>
          <path pathLength={1} d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <path pathLength={1} d="M14 2v6h6" />
          <path pathLength={1} className="qs-mark" d="M12 11v3.5" />
          <path pathLength={1} className="qs-mark" d="M12 17.5h.01" />
        </>
      )
      break
  }
  return (
    <g className={`qs-glyph qs-gl-${kind}`} transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className="qs-gi">{body}</g>
    </g>
  )
}

function Halo({ kind, uid, icon: Icon }: { kind: StateArtKind; uid: string; icon?: LucideIcon }) {
  return (
    <>
      <defs>
        <filter id={`h${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>
      <g filter={`url(#h${uid})`}>
        <circle className="qs-blob qs-b1" cx="66" cy="76" r="26" />
        <circle className="qs-blob qs-b2" cx="96" cy="90" r="24" />
        <circle className="qs-blob qs-b3" cx="84" cy="62" r="20" />
      </g>
      {kind === 'results' ? <path className="qs-sweep" d="M80 80 L80 20 A60 60 0 0 1 132 50 Z" /> : null}
      <circle className="qs-ring qs-r1" cx="80" cy="80" r="70" />
      <circle className="qs-ring qs-r2" cx="80" cy="80" r="54" />
      <rect className="qs-tile" x="52" y="52" width="56" height="56" rx="17" />
      {Icon ? (
        <g className={`qs-glyph qs-gl-${kind}`}>
          <Icon x={66} y={66} width={28} height={28} strokeWidth={1.8} className="qs-gi" />
        </g>
      ) : (
        <Glyph kind={kind} x={66} y={66} scale={1.1667} />
      )}
    </>
  )
}

// The drawing sits low in the box so it reads as one piece with the state label beneath it (no caption line).
function Drafting({ kind, uid }: { kind: StateArtKind; uid: string }) {
  return (
    <g transform="translate(0 22)">
      <defs>
        <pattern id={`p${uid}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path className="qs-gridln" d="M10 0H0V10" />
        </pattern>
        <clipPath id={`c${uid}`}>
          <rect x="22" y="18" width="116" height="100" />
        </clipPath>
      </defs>
      <rect className="qs-paper" x="22" y="18" width="116" height="100" fill={`url(#p${uid})`} />
      <g clipPath={`url(#c${uid})`}>
        <rect className="qs-scan" x="22" y="58" width="116" height="16" />
      </g>
      <path className="qs-crop" d="M22 30V18h12M138 30V18h-12M22 106v12h12M138 106v12h-12" />
      <Glyph kind={kind} x={56} y={44} scale={2} />
    </g>
  )
}

function Pulse({ kind }: { kind: StateArtKind }) {
  const line = 'M6 80H22l5-12 6 24 5-16 4 4H52 M108 80h8l4-8 5 16 4-8H154'
  return (
    <>
      <path className="qs-base" d={line} />
      <path className="qs-flow" d={line} />
      <circle className="qs-ping" cx="80" cy="80" r="30" />
      <circle className="qs-badge" cx="80" cy="80" r="30" />
      <Glyph kind={kind} x={66} y={66} scale={1.1667} />
    </>
  )
}

function Aurora({ kind, uid, icon: Icon }: { kind: StateArtKind; uid: string; icon?: LucideIcon }) {
  return (
    <>
      <defs>
        <filter id={`f${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <clipPath id={`k${uid}`}>
          <rect x="46" y="46" width="68" height="68" rx="22" />
        </clipPath>
      </defs>
      <g filter={`url(#f${uid})`}>
        <circle className="qs-blob qs-b1" cx="62" cy="70" r="30" />
        <circle className="qs-blob qs-b2" cx="100" cy="92" r="28" />
        <circle className="qs-blob qs-b3" cx="84" cy="54" r="22" />
      </g>
      <rect className="qs-glass" x="46" y="46" width="68" height="68" rx="22" />
      <g clipPath={`url(#k${uid})`}>
        <rect className="qs-sheen" x="60" y="30" width="18" height="100" />
      </g>
      <circle className="qs-spark" cx="34" cy="50" r="2.2" />
      <circle className="qs-spark qs-k2" cx="128" cy="60" r="1.8" />
      <circle className="qs-spark qs-k3" cx="118" cy="124" r="2" />
      {Icon ? (
        <g className={`qs-glyph qs-gl-${kind}`}>
          <Icon x={63} y={63} width={34} height={34} strokeWidth={1.6} className="qs-gi" />
        </g>
      ) : (
        <Glyph kind={kind} x={63} y={63} scale={1.4167} />
      )}
    </>
  )
}

const DIRECTION = {
  empty: 'halo',
  results: 'halo',
  connection: 'halo',
  server: 'pulse',
  missing: 'aurora',
  blocked: 'draft',
  noaccess: 'draft',
  unable: 'draft',
} as const satisfies Record<StateArtKind, string>

// A screen-specific icon (such as a workflow) replaces the drawn glyph on Halo and Aurora states.
export function StateArt({
  kind,
  icon,
  className,
}: {
  kind: StateArtKind
  icon?: LucideIcon
  className?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const direction = DIRECTION[kind]
  return (
    <svg
      aria-hidden
      viewBox="0 0 160 160"
      className={cn('qs-art overflow-visible', `qs-${direction}`, `qs-st-${kind}`, TONE[kind], className)}
    >
      {direction === 'halo' ? <Halo kind={kind} uid={uid} icon={icon} /> : null}
      {direction === 'draft' ? <Drafting kind={kind} uid={uid} /> : null}
      {direction === 'pulse' ? <Pulse kind={kind} /> : null}
      {direction === 'aurora' ? <Aurora kind={kind} uid={uid} icon={icon} /> : null}
    </svg>
  )
}
