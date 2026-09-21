'use client'

import Link from 'next/link'
import { ChevronRight, ChevronsUpDown, PanelLeftClose, PanelLeftOpen, User } from 'lucide-react'
import { ViewTransition, type ReactNode } from 'react'
import { cn } from '@/shared/ui/cn'
import { AccountMenu } from './AccountMenu'
import { legacyHref, type MenuLink } from './admin-menu'
import { MENU_ICONS } from './menu-icons'
import { useMoreNav } from './use-more-nav'
import { useRememberedFlag } from './use-remembered-flag'
import { useSessionHeader } from './use-shell-data'

export type WorkspaceSection = MenuLink & { label: string; nested?: boolean }

export type AreaWorkspaceProps = {
  areaLabel: string
  sections: readonly WorkspaceSection[]
  activeId: string
  title: string
  meta?: ReactNode
  actions?: ReactNode
  collapseLabel: string
  expandLabel: string
  children: ReactNode
  // Kept for callers; every area now shows the same section sidebar.
  navigation?: 'sections' | 'admin'
}

const LINK =
  'group relative flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-left text-sm leading-5 font-medium outline-none transition-[background-color,color] duration-200 ease-premium focus-visible:ring-2 focus-visible:ring-ring'

// Area frame for every Admin screen: section sidebar, breadcrumb and title (docs/decisions.md D-018).
export function AreaWorkspace({
  areaLabel,
  sections,
  activeId,
  title,
  meta,
  actions,
  collapseLabel,
  expandLabel,
  children,
}: AreaWorkspaceProps) {
  const [collapsed, setCollapsed] = useRememberedFlag('workspace-collapsed')
  const session = useSessionHeader()
  const active = sections.find(section => section.id === activeId)
  const moreNav = useMoreNav(activeId, sections)
  const navSections = moreNav?.sections ?? sections
  const toggleLabel = collapsed ? expandLabel : collapseLabel
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <div
      className={cn(
        // Below md the sidebar stacks above the page so content keeps the full width.
        'grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] transition-[grid-template-columns] duration-300 ease-premium md:grid-rows-none motion-reduce:transition-none',
        collapsed ? 'md:grid-cols-[4rem_minmax(0,1fr)]' : 'md:grid-cols-[15rem_minmax(0,1fr)]',
      )}
    >
      <aside
        aria-label={moreNav?.label ?? areaLabel}
        className="relative flex max-h-[45vh] min-h-0 flex-col overflow-hidden border-b border-border bg-white px-2.5 pt-4 shadow-[1px_0_0_rgba(15,23,42,.02)] md:max-h-none md:border-r md:border-b-0"
      >
        <p
          className={cn(
            'px-3 pb-3 text-[11px] font-bold tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase transition-opacity duration-200',
            collapsed && 'md:pointer-events-none md:opacity-0',
          )}
        >
          {moreNav?.label ?? areaLabel}
        </p>
        <nav className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto pb-3 [scrollbar-width:thin]">
          {navSections.map(section => {
            const Icon = MENU_ICONS[section.icon]
            const current = section.id === activeId
            const className = cn(
              LINK,
              collapsed && 'md:whitespace-nowrap',
              section.nested && 'min-h-9 text-[13px]',
              section.nested && (collapsed ? 'ml-4 md:ml-0' : 'ml-4'),
              current
                ? 'bg-brand/[0.08] text-brand before:absolute before:inset-y-2 before:-left-2.5 before:w-[3px] before:origin-center before:animate-[rise-in_300ms_var(--ease-premium)_both] before:rounded-r before:bg-brand'
                : 'lift-slide text-slate-600 hover:bg-slate-100 hover:text-foreground',
            )
            const content = (
              <>
                <Icon aria-hidden className={cn('shrink-0', section.nested ? 'size-4' : 'size-[18px]')} />
                <span
                  className={cn(
                    'min-w-0 text-balance transition-opacity duration-200',
                    collapsed && 'md:opacity-0',
                  )}
                >
                  {section.label}
                </span>
              </>
            )
            return section.reactRoute ? (
              <Link
                key={section.id}
                href={section.reactRoute}
                aria-current={current ? 'page' : undefined}
                title={section.label}
                className={className}
              >
                {content}
              </Link>
            ) : (
              <a
                key={section.id}
                href={legacyHref(section.legacyRoute)}
                title={section.label}
                className={className}
              >
                {content}
              </a>
            )
          })}
        </nav>
        <div className="-mx-2.5 mt-auto flex shrink-0 flex-col gap-1 border-t border-border px-2.5 py-2.5">
          <button
            type="button"
            onClick={() => setCollapsed(value => !value)}
            aria-expanded={!collapsed}
            aria-label={toggleLabel}
            title={collapsed ? toggleLabel : undefined}
            className={cn(
              'group hidden h-9 items-center gap-3 rounded-md px-3 text-[13px] font-medium whitespace-nowrap text-slate-600 transition-[background-color,color] duration-200 outline-none hover:bg-page hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring md:flex',
            )}
          >
            <ToggleIcon
              aria-hidden
              className="size-[18px] shrink-0 transition-transform duration-300 ease-premium group-hover:-translate-x-0.5"
            />
            <span className={cn('transition-opacity duration-200', collapsed && 'md:opacity-0')}>
              {toggleLabel}
            </span>
          </button>
          {session && (session.fullName || session.email || session.initials) ? (
            <AccountMenu
              side={collapsed ? 'right' : 'top'}
              align={collapsed ? 'end' : 'start'}
              triggerClassName="group flex h-12 w-full animate-fade-in items-center gap-3 rounded-lg px-1.5 text-left outline-none transition-[background-color,box-shadow] duration-200 hover:bg-page focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-brand/[0.06] data-[state=open]:shadow-[inset_0_0_0_1px_rgba(21,102,162,.18)] motion-reduce:animate-none"
              trigger={
                <>
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-avatar text-[13px] font-semibold text-foreground shadow-sm ring-2 ring-white transition-transform duration-200 group-hover:scale-105"
                  >
                    {session.initials || <User className="size-4" />}
                  </span>
                  <span
                    className={cn(
                      'min-w-0 flex-1 transition-opacity duration-200',
                      collapsed && 'md:opacity-0',
                    )}
                  >
                    {session.fullName ? (
                      <span
                        title={session.fullName}
                        className="block truncate text-[13px] leading-[18px] font-semibold text-slate-800"
                      >
                        {session.fullName}
                      </span>
                    ) : null}
                    {session.email ? (
                      <span title={session.email} className="block truncate text-xs leading-4 text-slate-600">
                        {session.email}
                      </span>
                    ) : null}
                  </span>
                  <ChevronsUpDown
                    aria-hidden
                    className={cn(
                      'size-4 shrink-0 text-slate-600 transition-[opacity,color] duration-200 group-hover:text-slate-700',
                      collapsed && 'md:opacity-0',
                    )}
                  />
                </>
              }
            />
          ) : null}
        </div>
      </aside>

      <section className="page-enter flex min-h-0 min-w-0 flex-col gap-4 px-4 pt-5 pb-6 md:px-6">
        {/* One shared name across screens: the header glides between pages while the body cross-fades. */}
        <ViewTransition name="workspace-head" default="vt-head">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <nav
                // Named after its trail, so it never shares a name with the section sidebar landmark.
                aria-label={`${areaLabel} › ${active?.label ?? title}`}
                className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground"
              >
                <span>{areaLabel}</span>
                <ChevronRight aria-hidden className="size-3.5" />
                <span className="text-foreground">{active?.label ?? title}</span>
              </nav>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl leading-7 font-semibold tracking-tight text-foreground">{title}</h1>
                {meta}
              </div>
            </div>
            {actions}
          </header>
        </ViewTransition>
        <ViewTransition default="vt-body">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">{children}</div>
        </ViewTransition>
      </section>
    </div>
  )
}
