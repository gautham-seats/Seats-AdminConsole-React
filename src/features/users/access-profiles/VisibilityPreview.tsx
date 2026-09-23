'use client'

import { Lock, X } from 'lucide-react'
import { BRIEFING_EN, VISIBILITY_EN } from './briefing-text'
import { Kpi, PreviewSection, PreviewShell } from './ProfilePreview'
import { useJustChanged, useTypeIn } from './use-type-in'

export type VisibilityItem = { id: number; name: string }

export type VisibilityLens = {
  /** Which tab this lens belongs to, so the typing effect restarts on a tab change. */
  key: string
  hint: string
  /** Headline counts: visible, the second measure for the area, and hidden. */
  counts: { open: number; allowed: number; shut: number }
  labels: { open: string; allowed: string; shut: string }
  /** "On a timeline they see …" — the lead, then the typed part. */
  lead: string
  typed: string
  tail: string
  visible: readonly VisibilityItem[]
  hidden: readonly VisibilityItem[]
  shutTitle: string
  emptyVisible: string
}

const LIST_LIMIT = 8
const CLOSED_LIMIT = 6
const PAGE_LIMIT = 4

type Props = {
  title: string
  lens: VisibilityLens
  landing: React.ReactNode
  onToggle?: (id: number) => void
}

// The same panel as Site Access, reading one of the three visibility areas instead of the permission tree.
export function VisibilityPreview({ title, lens, landing, onToggle }: Props) {
  const typed = useTypeIn(lens.typed)
  const changed = useJustChanged(`${lens.key}:${lens.visible.map(item => item.id).join(',')}`)

  return (
    <PreviewShell title={title} busy={changed.active} pulse={changed.pulse}>
      <p className="mt-1 text-[11.5px] leading-relaxed text-white">{lens.hint}</p>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <Kpi value={lens.counts.open} label={lens.labels.open} tone="open" />
        <Kpi value={lens.counts.allowed} label={lens.labels.allowed} tone="allowed" />
        <Kpi value={lens.counts.shut} label={lens.labels.shut} tone="shut" />
      </div>

      {lens.visible.length === 0 ? (
        <p className="mt-3 flex items-center gap-2.5 rounded-xl border border-white/20 bg-slate-950/30 px-3.5 py-4 text-[12.5px] leading-relaxed text-white">
          <Lock aria-hidden className="size-4 shrink-0 text-white" />
          {lens.emptyVisible}
        </p>
      ) : (
        <>
          <p className="mt-3 rounded-xl border border-white/[0.17] bg-slate-950/30 px-3.5 py-3 text-[14.5px] leading-[1.62] text-white">
            {lens.lead}
            <span className="sr-only">{lens.typed}</span>
            <span
              aria-hidden
              className="rounded-[2px] bg-[linear-gradient(transparent_60%,rgba(110,231,183,.22)_60%)] px-0.5 font-semibold"
            >
              {typed.text}
              {typed.done ? null : (
                <span className="ml-px inline-block h-[0.95em] w-[2px] translate-y-[2px] animate-pulse rounded-full bg-sky-200" />
              )}
            </span>
            {lens.tail}
          </p>

          <PreviewSection
            title={VISIBILITY_EN.visibleHere}
            count={lens.visible.length}
            tone="good"
            items={lens.visible.slice(0, LIST_LIMIT).map(item => ({ id: item.id, name: item.name }))}
            more={
              lens.visible.length > LIST_LIMIT
                ? VISIBILITY_EN.moreVisible(lens.visible.length - LIST_LIMIT)
                : null
            }
            empty={lens.emptyVisible}
            hint={BRIEFING_EN.remove}
            on
            onToggle={onToggle}
          />

          <PreviewSection
            title={VISIBILITY_EN.hiddenHere}
            count={lens.hidden.length}
            tone="bad"
            items={lens.hidden.slice(0, CLOSED_LIMIT).map(item => ({ id: item.id, name: item.name }))}
            more={
              lens.hidden.length > CLOSED_LIMIT
                ? VISIBILITY_EN.moreHidden(lens.hidden.length - CLOSED_LIMIT)
                : null
            }
            empty={VISIBILITY_EN.nothingHidden}
            hint={BRIEFING_EN.allow}
            on={false}
            onToggle={onToggle}
          />
        </>
      )}

      <span aria-hidden className="min-h-3 flex-1" />

      <section className="rounded-xl border border-rose-200/45 bg-rose-900/40 bg-[linear-gradient(180deg,rgba(244,63,94,.42),rgba(225,29,72,.26))] p-3 shadow-[0_14px_30px_-18px_rgba(190,18,60,.8),inset_0_1px_0_rgba(255,255,255,.25)] backdrop-blur-md">
        <h3 className="flex items-center gap-2 text-[11px] font-semibold text-white">
          <Lock aria-hidden className="size-3.5" />
          {lens.shutTitle}
          <span className="ml-auto rounded-full bg-rose-950/35 px-2 py-0.5 text-[10px] text-white tabular-nums">
            {lens.hidden.length}
          </span>
        </h3>
        <div className="mt-2 grid gap-1">
          {lens.hidden.length === 0 ? (
            <p className="px-0.5 py-1 text-[11.5px] text-white">{VISIBILITY_EN.nothingHidden}</p>
          ) : (
            lens.hidden.slice(0, PAGE_LIMIT).map((item, index) => (
              <div
                key={item.id}
                style={{ animationDelay: `${index * 45}ms` }}
                className="grid animate-fade-in grid-cols-[1.125rem_minmax(0,1fr)] items-center gap-2.5 rounded-lg bg-rose-950/25 px-2.5 py-1.5 text-[11.5px] text-white ring-1 ring-white/10 motion-reduce:animate-none"
              >
                <span
                  aria-hidden
                  className="grid size-[1.125rem] place-items-center rounded-[5px] bg-white/25 text-white"
                >
                  <X className="size-2.5" strokeWidth={3} />
                </span>
                <span className="min-w-0 truncate font-semibold" title={item.name}>
                  {item.name}
                </span>
              </div>
            ))
          )}
          {lens.hidden.length > PAGE_LIMIT ? (
            <p className="px-2.5 pt-1 text-[10.5px] text-white">
              {VISIBILITY_EN.morePages(lens.hidden.length - PAGE_LIMIT)}
            </p>
          ) : null}
        </div>
      </section>

      {landing}
      {onToggle ? <p className="mt-2 text-center text-[10.5px] text-white">{VISIBILITY_EN.tapHint}</p> : null}
    </PreviewShell>
  )
}
