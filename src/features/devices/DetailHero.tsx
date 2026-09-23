'use client'

import type { ReactNode } from 'react'
import { cn } from '@/shared/ui/cn'

// The brand band shared by the Room and Device detail pages, so the two screens read as one product.
const BAND =
  'relative shrink-0 overflow-hidden rounded-2xl bg-[linear-gradient(118deg,var(--color-nav-bar-start)_0%,var(--color-brand)_52%,var(--color-brand-avatar)_100%)] px-6 py-5 text-white shadow-[0_12px_28px_-14px_var(--color-nav-bar-shadow),inset_0_1px_0_rgba(255,255,255,.18)]'

// The tab strip under a DetailHero wears the same brand blue, so the band and the tabs read as one unit.
// The top padding lets each tab sit on the bar instead of filling it, and the selected one reaches the panel.
export const TAB_BAR =
  'relative flex shrink-0 flex-wrap items-end gap-1 bg-[linear-gradient(118deg,var(--color-nav-bar-start)_0%,var(--color-brand)_62%,var(--color-brand-avatar)_140%)] px-3 pt-2.5 shadow-[inset_0_-1px_0_rgba(255,255,255,.18)]'

export const TAB = {
  base: 'flex items-center gap-2 rounded-t-lg px-5 py-2.5 text-sm font-semibold outline-none transition-[background-color,color] duration-200 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-inset',
  // The selected tab is the white of the panel below it, so the two read as one surface.
  active: 'bg-white text-brand shadow-[0_-3px_10px_-6px_rgba(15,23,42,.45)]',
  idle: 'text-white/80 hover:bg-white/[0.12] hover:text-white',
  badgeActive: 'bg-brand text-white',
  badgeIdle: 'bg-white/20 text-white',
} as const

const PANE =
  'min-w-[104px] rounded-xl bg-white/[0.12] px-3.5 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,.16)]'

export function HeroPane({
  icon,
  value,
  label,
  sub,
  tone,
}: {
  icon: ReactNode
  value: string
  label: string
  sub?: string
  tone?: string
}) {
  return (
    <div className={PANE}>
      <span className="flex items-center gap-1.5 text-[22px] leading-tight font-semibold tabular-nums">
        <span aria-hidden className={cn('text-white/70 [&>svg]:size-4', tone)}>
          {icon}
        </span>
        {value}
      </span>
      <span className="block text-[11px] tracking-[0.06em] text-white/75 uppercase">{label}</span>
      {sub ? <span className="block text-[11px] text-white/60">{sub}</span> : null}
    </div>
  )
}

// A labelled record value inside the band, so the identity fields live in one place instead of a second strip.
export function HeroFact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-[10px] leading-4 tracking-[0.07em] text-white/60 uppercase">{label}</span>
      <span
        title={value}
        className={cn('max-w-[22rem] truncate text-[13px] leading-5 text-white/90', mono && 'font-mono')}
      >
        {value}
      </span>
    </span>
  )
}

export function HeroChip({ icon, children, warn }: { icon: ReactNode; children: string; warn?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,.18)]',
        warn ? 'bg-amber-300/25 text-amber-50' : 'bg-white/[0.16] text-white/90',
      )}
    >
      <span aria-hidden className="[&>svg]:size-3.5">
        {icon}
      </span>
      {children}
    </span>
  )
}

type DetailHeroProps = {
  icon: ReactNode
  /* The workspace header is already the page heading, so this name is never a second one. */
  name: string
  subtitle: ReactNode
  chips?: ReactNode
  panes: ReactNode
}

export function DetailHero({ icon, name, subtitle, chips, panes }: DetailHeroProps) {
  return (
    <section className={BAND}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_200px_at_78%_-40%,rgba(255,255,255,.3),transparent_68%)]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-14 -bottom-24 size-64 rounded-full bg-[radial-gradient(circle,rgba(86,189,234,.34),transparent_65%)]"
      />
      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-4">
        <span
          aria-hidden
          className="grid size-13 shrink-0 place-items-center rounded-xl bg-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,.35)] [&>svg]:size-6.5"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[27px] leading-tight font-semibold tracking-tight">{name}</p>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-[13px] text-white/85">
            {subtitle}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 empty:hidden">{chips}</div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">{panes}</div>
      </div>
    </section>
  )
}

export function HeroDot() {
  return <span aria-hidden className="size-[3px] rounded-full bg-white/50" />
}
