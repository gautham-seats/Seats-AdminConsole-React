'use client'

import Link from 'next/link'
import { ArrowUpRight, Search } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { SharedResourceKeys, useResources } from '@/shared/resources'
import { legacyHref, menuResourceKeys, type MenuLink, type TopEntry } from '@/shared/shell/admin-menu'
import { AreaWorkspace } from '@/shared/shell/AreaWorkspace'
import { MENU_ICONS } from '@/shared/shell/menu-icons'
import { useShellMenu } from '@/shared/shell/use-shell-data'
import { DelayedLoading, ErrorState } from '@/shared/ui'
import { CountUp } from '@/shared/ui/CountUp'

const ELLIPSIS = '…'
const EXPAND = 'Expand'
const DOT = '·'

const HIT =
  'group relative flex items-center gap-3 rounded-xl border border-transparent bg-white p-3 outline-none shadow-[0_1px_2px_rgba(15,23,42,.05)] animate-rise-in [animation-fill-mode:both] transition-[transform,box-shadow,border-color] duration-300 ease-premium hover:translate-x-1 hover:border-brand/30 hover:shadow-[0_10px_24px_-12px_rgba(15,23,42,.35)] focus-visible:border-brand/40 focus-visible:shadow-[0_0_0_3px_rgba(21,102,162,.18)] motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-x-0'

function HitAnchor({ link, index, children }: { link: MenuLink; index: number; children: ReactNode }) {
  const style = { animationDelay: `${index * 30}ms` }
  return link.reactRoute ? (
    <Link href={link.reactRoute} className={HIT} style={style}>
      {children}
    </Link>
  ) : (
    <a href={legacyHref(link.legacyRoute)} className={HIT} style={style}>
      {children}
    </a>
  )
}

// Shows where the typed text matched, without changing what the search does.
function Highlight({ value, term }: { value: string; term: string }) {
  const at = term ? value.toLowerCase().indexOf(term) : -1
  if (at < 0) return <>{value}</>
  return (
    <>
      {value.slice(0, at)}
      <mark className="rounded-[3px] bg-brand/[0.16] px-px text-inherit">
        {value.slice(at, at + term.length)}
      </mark>
      {value.slice(at + term.length)}
    </>
  )
}

export function MoreScreen() {
  const menu = useShellMenu()
  const [query, setQuery] = useState('')
  const { text } = useResources(
    useMemo(
      () => [...menuResourceKeys(), 'Collapse', SharedResourceKeys.refresh, SharedResourceKeys.noRecords],
      [],
    ),
  )
  const label = useCallback(
    (link: Pick<MenuLink, 'labelKey' | 'fallback'>) => {
      if (!link.labelKey) return link.fallback
      const value = text(link.labelKey)
      return !value.trim() || value === link.labelKey ? link.fallback : value
    },
    [text],
  )
  const more = menu.layout.more
  const title = label({ labelKey: 'More', fallback: 'More' })
  const searchLabel = `${label({ labelKey: 'Search', fallback: 'Search' })}${ELLIPSIS}`
  const sections = useMemo(() => more.map(entry => ({ ...entry, label: label(entry) })), [more, label])

  if (menu.status === 'loading' || menu.status === 'idle') {
    return (
      <div className="grid flex-1 place-items-center">
        <h1 className="sr-only">{title}</h1>
        <DelayedLoading active label={title} variant="page" />
      </div>
    )
  }
  if (menu.status === 'error') {
    return (
      <div className="grid flex-1 place-items-center p-6">
        <ErrorState
          variant="page"
          headingLevel={1}
          message={text(SharedResourceKeys.generalError)}
          retryLabel={text(SharedResourceKeys.refresh)}
          onRetry={menu.reload}
          error={menu.error}
        />
      </div>
    )
  }

  const term = query.trim().toLowerCase()
  const linksOf = (entry: TopEntry) => (entry.children.length > 1 ? entry.children : [entry])
  const groups = more
    .map(entry => ({
      entry,
      links: linksOf(entry).filter(
        link => !term || `${label(link)} ${label(entry)}`.toLowerCase().includes(term),
      ),
    }))
    .filter(group => group.links.length > 0)
  const total = more.reduce((sum, entry) => sum + linksOf(entry).length, 0)
  let hitIndex = 0

  return (
    <AreaWorkspace
      areaLabel={title}
      sections={sections}
      activeId=""
      title={title}
      meta={
        <span className="rounded-full bg-brand/[0.08] px-2 py-0.5 text-xs font-semibold text-brand tabular-nums">
          <CountUp text={String(total)} />
        </span>
      }
      collapseLabel={text('Collapse')}
      expandLabel={EXPAND}
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <label className="group mt-2 flex h-12 w-full cursor-text items-center gap-3 rounded-xl border border-border bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,.06),0_10px_24px_-14px_rgba(15,23,42,.30)] transition-[border-color,box-shadow,transform] duration-300 ease-premium focus-within:-translate-y-px focus-within:border-brand/60 focus-within:shadow-[0_0_0_4px_rgba(21,102,162,.14),0_14px_28px_-16px_rgba(15,23,42,.36)] motion-reduce:transition-none">
          <Search
            aria-hidden
            className="size-[18px] shrink-0 text-muted-foreground transition-[transform,color] duration-300 ease-premium group-focus-within:-rotate-12 group-focus-within:text-brand motion-reduce:transition-none"
          />
          {/* The focus ring is the wrapping label's focus-within glow, so the field drops its own outline. */}
          <input
            type="search"
            value={query}
            placeholder={searchLabel}
            aria-label={searchLabel}
            onChange={event => setQuery(event.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </label>

        {groups.length === 0 ? (
          <div className="mt-4 grid flex-1 place-items-center rounded-lg border border-dashed border-border bg-white py-16 text-sm text-muted-foreground">
            {text(SharedResourceKeys.noRecords)}
          </div>
        ) : (
          <div className="mt-3 flex flex-col pb-4">
            {groups.map(({ entry, links }) => (
              <section key={entry.id} className="flex flex-col gap-1.5">
                <div className="mt-4 mb-0.5 flex items-center gap-2 text-[11px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                  <h2 className="m-0 text-[11px] font-bold tracking-[0.16em]">{label(entry)}</h2>
                  <span aria-hidden>{DOT}</span>
                  <span aria-hidden className="tabular-nums">
                    {links.length}
                  </span>
                </div>
                {links.map(link => {
                  const Icon = MENU_ICONS[link.icon]
                  const index = hitIndex++
                  return (
                    <HitAnchor key={link.id} link={link} index={index}>
                      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-brand/[0.08] text-brand transition-transform duration-300 ease-[cubic-bezier(.3,1.7,.5,1)] group-hover:-rotate-[5deg] group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:rotate-0">
                        <Icon aria-hidden className="size-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          title={label(link)}
                          className="block truncate text-sm font-semibold text-foreground"
                        >
                          <Highlight value={label(link)} term={term} />
                        </span>
                        <span className="block font-mono text-[11px] break-all text-muted-foreground">
                          {link.reactRoute ?? link.legacyRoute}
                        </span>
                      </span>
                      <ArrowUpRight
                        aria-hidden
                        className="size-4 shrink-0 -translate-x-1 text-slate-500 opacity-0 transition-[transform,opacity,color] duration-300 ease-premium group-hover:translate-x-0 group-hover:text-brand group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
                      />
                    </HitAnchor>
                  )
                })}
              </section>
            ))}
          </div>
        )}
      </div>
    </AreaWorkspace>
  )
}
