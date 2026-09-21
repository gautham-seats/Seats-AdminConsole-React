'use client'

import Image from 'next/image'
import Link from 'next/link'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, LayoutGrid, User, type LucideIcon } from 'lucide-react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { SharedResourceKeys, useResources } from '@/shared/resources'
import { cn } from '@/shared/ui/cn'
import { legacyHref, menuResourceKeys, NOTIFICATIONS_ROUTE, type MenuLink, type TopEntry } from './admin-menu'
import { AccountMenu } from './AccountMenu'
import { MENU_ICONS as ICONS } from './menu-icons'
import { CARD_PANEL, MenuCard, MenuCardGrid } from './NavMenuCards'
import { NavSearch } from './NavSearch'
import logo from './seats-one-logo.png'
import { useNotificationCount, useSessionHeader, useShellMenu } from './use-shell-data'

type RouteTarget = Pick<MenuLink, 'legacyRoute' | 'reactRoute'>
type MenuAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & { link: RouteTarget }

// React screens use client routing under the basePath; everything else still opens the legacy Admin.
const MenuAnchor = forwardRef<HTMLAnchorElement, MenuAnchorProps>(({ link, ...props }, ref) =>
  link.reactRoute ? (
    <Link ref={ref} href={link.reactRoute} {...props} />
  ) : (
    <a ref={ref} href={legacyHref(link.legacyRoute)} {...props} />
  ),
)
MenuAnchor.displayName = 'MenuAnchor'

const LOGO_ALT = 'SEAtS ONE'
const MENU_LABEL = 'Admin menu'
const MORE_LINK: RouteTarget = { legacyRoute: '', reactRoute: '/more' }

const NAV_BUTTON =
  'relative z-10 inline-flex h-10 items-center whitespace-nowrap rounded-md px-3 text-sm font-medium text-white outline-none transition-colors duration-300 ease-out focus-visible:ring-2 focus-visible:ring-white/80 data-[state=open]:bg-white/15 [&>svg:first-child]:mr-2 [&>svg:first-child]:size-4 [&>svg:first-child]:transition-transform [&>svg:first-child]:duration-300 [&>svg:first-child]:ease-[cubic-bezier(.3,1.7,.5,1)] hover:[&>svg:first-child]:-translate-y-px hover:[&>svg:first-child]:scale-110'

type Label = (link: Pick<MenuLink, 'labelKey' | 'fallback'>) => string

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M6,14h4a2,2,0,1,1-4,0ZM1,13a1,1,0,0,1,0-2h.5A4.353,4.353,0,0,0,3,8V5A4.952,4.952,0,0,1,8,0a4.951,4.951,0,0,1,5,5V8a4.351,4.351,0,0,0,1.5,3H15a1,1,0,0,1,0,2Z"
      />
    </svg>
  )
}

const HOVER_OPEN_DELAY = 90
const HOVER_CLOSE_DELAY = 180

type MenuControl = {
  openId: string | null
  openedByHover: boolean
  enter: (id: string) => void
  leave: () => void
  setOpen: (id: string, open: boolean) => void
}

function useHoverMenus(): MenuControl {
  const [state, setState] = useState<{ id: string | null; hover: boolean }>({ id: null, hover: false })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openRef = useRef<string | null>(null)

  useEffect(() => {
    openRef.current = state.id
  }, [state.id])

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const enter = useCallback(
    (id: string) => {
      clear()
      // Moving between menus switches instantly; the first open waits a moment to avoid flicker.
      const delay = openRef.current === null ? HOVER_OPEN_DELAY : 0
      timer.current = setTimeout(
        () => setState(current => (current.id === id ? current : { id, hover: true })),
        delay,
      )
    },
    [clear],
  )

  const leave = useCallback(() => {
    clear()
    timer.current = setTimeout(
      () => setState(current => (current.hover ? { id: null, hover: false } : current)),
      HOVER_CLOSE_DELAY,
    )
  }, [clear])

  const setOpen = useCallback(
    (id: string, open: boolean) => {
      clear()
      setState(current =>
        open ? { id, hover: false } : current.id === id ? { id: null, hover: false } : current,
      )
    },
    [clear],
  )

  return { openId: state.id, openedByHover: state.hover, enter, leave, setOpen }
}

type HoverMenuProps = {
  id: string
  control: MenuControl
  icon: LucideIcon
  text: string
  link?: RouteTarget
  onHover: (el: HTMLElement) => void
  contentClassName?: string
  children: ReactNode
}

function HoverMenu({
  id,
  control,
  icon: Icon,
  text,
  link,
  onHover,
  contentClassName,
  children,
}: HoverMenuProps) {
  const open = control.openId === id
  const triggerProps = {
    className: cn(NAV_BUTTON, 'group'),
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'mouse') return
      onHover(event.currentTarget)
      control.enter(id)
    },
    onPointerLeave: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse') control.leave()
    },
  }
  // Touch path for link triggers (their pointerdown is cancelled); keyboard opens with Space or ArrowDown.
  const chevron = (
    <ChevronDown
      aria-hidden="true"
      className="ml-1.5 size-3.5 opacity-80 transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)] group-data-[state=open]:rotate-180"
      onClick={event => {
        event.preventDefault()
        event.stopPropagation()
        control.setOpen(id, !open)
      }}
    />
  )

  return (
    <DropdownMenu.Root open={open} onOpenChange={next => control.setOpen(id, next)} modal={false}>
      <DropdownMenu.Trigger asChild>
        {link ? (
          <MenuAnchor
            link={link}
            {...triggerProps}
            onPointerDown={event => event.preventDefault()}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.click()
              }
            }}
          >
            <Icon />
            {text}
            {chevron}
          </MenuAnchor>
        ) : (
          <button type="button" {...triggerProps}>
            <Icon />
            {text}
            {chevron}
          </button>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={10}
          className={cn(CARD_PANEL, contentClassName)}
          onPointerEnter={event => {
            if (event.pointerType === 'mouse') control.enter(id)
          }}
          onPointerLeave={event => {
            if (event.pointerType === 'mouse') control.leave()
          }}
          onCloseAutoFocus={event => {
            if (control.openedByHover) event.preventDefault()
          }}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function TopItem({
  entry,
  label,
  control,
  onHover,
}: {
  entry: TopEntry
  label: Label
  control: MenuControl
  onHover: (el: HTMLElement) => void
}) {
  const Icon = ICONS[entry.icon]
  if (entry.children.length <= 1) {
    return (
      <MenuAnchor
        link={entry}
        className={NAV_BUTTON}
        onMouseEnter={event => {
          onHover(event.currentTarget)
          control.leave()
        }}
      >
        <Icon />
        {label(entry)}
      </MenuAnchor>
    )
  }
  return (
    <HoverMenu id={entry.id} control={control} icon={Icon} text={label(entry)} link={entry} onHover={onHover}>
      <MenuCardGrid title={label(entry)}>
        {entry.children.map((child, index) => (
          <MenuCard
            key={child.id}
            link={child}
            label={label(child)}
            index={index}
            siblings={entry.children}
          />
        ))}
      </MenuCardGrid>
    </HoverMenu>
  )
}

function MoreMenu({
  entries,
  label,
  moreLabel,
  control,
  onHover,
}: {
  entries: TopEntry[]
  label: Label
  moreLabel: string
  control: MenuControl
  onHover: (el: HTMLElement) => void
}) {
  return (
    <HoverMenu
      id="more"
      control={control}
      icon={LayoutGrid}
      text={moreLabel}
      link={MORE_LINK}
      onHover={onHover}
    >
      <MenuCardGrid title={moreLabel}>
        {entries.map((entry, index) => (
          <MenuCard key={entry.id} link={entry} label={label(entry)} index={index} siblings={entries} />
        ))}
      </MenuCardGrid>
    </HoverMenu>
  )
}

// Each cloud joins its back-and-forth loop at a random moment, so no two page loads look alike.
function randomAuroraStart(seconds: number) {
  return (node: HTMLSpanElement | null) => {
    if (node && !node.style.animationDelay)
      node.style.animationDelay = `-${(Math.random() * seconds * 2).toFixed(2)}s`
  }
}

export function NavBar() {
  const menu = useShellMenu()
  const session = useSessionHeader()
  const notificationCount = useNotificationCount(menu.canSeeNotifications)
  const resources = useResources(
    useMemo(() => [...menuResourceKeys(), SharedResourceKeys.refresh, SharedResourceKeys.noRecords], []),
  )
  const { text } = resources

  const label = useCallback<Label>(
    link => {
      if (!link.labelKey) return link.fallback
      const value = text(link.labelKey)
      return !value.trim() || value === link.labelKey ? link.fallback : value
    },
    [text],
  )

  const menuRef = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState({ left: 0, width: 0 })
  const movePill = useCallback((el: HTMLElement) => {
    const container = menuRef.current
    if (!container) return
    const box = container.getBoundingClientRect()
    const target = el.getBoundingClientRect()
    setPill({ left: target.left - box.left, width: target.width })
  }, [])

  const menus = useHoverMenus()
  const { bar, more } = menu.layout
  const allEntries = useMemo(() => [...bar, ...more], [bar, more])
  const moreLabel = label({ labelKey: 'More', fallback: 'More' })
  const searchLabel = label({ labelKey: 'Search', fallback: 'Search' })
  const notificationsLabel = label({ labelKey: 'UserNotifications', fallback: 'User Notifications' })

  return (
    <header className="relative z-40 flex min-h-[50px] w-full min-w-0 shrink-0 flex-wrap items-center gap-y-1 bg-brand bg-[linear-gradient(90deg,var(--color-nav-bar-start)_0%,var(--color-nav-bar-mid)_45%,var(--color-nav-bar-end)_100%)] pl-4 pr-3 md:pr-10 [html[data-contrast=high]_&]:bg-none shadow-[inset_0_1px_0_rgba(255,255,255,.22),inset_0_-1px_0_rgba(0,0,0,.12),0_6px_22px_-8px_rgba(15,82,136,.55)]">
      {/* Approved look at full strength; High Contrast mode swaps to a solid bar for readable text. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden [html[data-contrast=high]_&]:hidden"
      >
        <span className="absolute inset-0">
          <span className="absolute -inset-x-[10%] -inset-y-[60px] animate-aurora bg-[radial-gradient(260px_90px_at_20%_50%,rgba(86,189,234,.10),transparent_70%),radial-gradient(320px_100px_at_70%_40%,rgba(255,255,255,.04),transparent_70%),radial-gradient(240px_80px_at_95%_60%,rgba(86,189,234,.08),transparent_70%)] blur-[6px] motion-reduce:animate-none" />
          <span ref={randomAuroraStart(26)} className="nav-aurora nav-aurora-a" />
          <span ref={randomAuroraStart(32)} className="nav-aurora nav-aurora-b" />
          <span ref={randomAuroraStart(38)} className="nav-aurora nav-aurora-c" />
        </span>
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,.12)_0%,rgba(255,255,255,.03)_48%,rgba(255,255,255,0)_54%,rgba(0,0,0,.05)_100%)]" />
        <span className="absolute inset-0 animate-sheen bg-[linear-gradient(112deg,transparent_38%,rgba(255,255,255,.05)_45%,rgba(255,255,255,.24)_50%,rgba(255,255,255,.05)_55%,transparent_62%)] bg-[length:240%_100%] bg-no-repeat motion-reduce:animate-none" />
        <span className="absolute inset-x-0 bottom-0 h-px animate-hairline-in bg-[linear-gradient(90deg,transparent,rgba(160,220,248,.9),transparent)] motion-reduce:animate-none" />
      </span>
      <div className="relative flex min-w-0 flex-wrap items-center">
        <Image
          src={logo}
          alt={LOGO_ALT}
          priority
          unoptimized
          className="h-8 w-auto animate-logo-glint transition-transform duration-300 hover:scale-[1.03] motion-reduce:animate-none"
        />
        <span className="ml-4 mr-3.5 h-[30px] w-px bg-white/30" />
        <nav aria-label={MENU_LABEL} aria-busy={menu.status === 'loading' || undefined}>
          {menu.status === 'error' ? (
            <button type="button" onClick={menu.reload} className={NAV_BUTTON}>
              {text(SharedResourceKeys.refresh)}
            </button>
          ) : (
            <div ref={menuRef} className="group/menu relative flex flex-wrap items-center gap-2.5">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-0 h-10 rounded-md bg-white/10 opacity-0 transition-[left,width,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] group-hover/menu:opacity-100"
                style={{ left: pill.left, width: pill.width }}
              />
              {menu.status === 'success'
                ? bar.map(entry => (
                    <TopItem key={entry.id} entry={entry} label={label} control={menus} onHover={movePill} />
                  ))
                : [0, 1, 2, 3, 4, 5].map(i => (
                    <span key={i} className="mx-1 h-4 w-20 animate-pulse rounded bg-white/20" />
                  ))}
              {menu.status === 'success' && more.length > 0 ? (
                <MoreMenu
                  entries={more}
                  label={label}
                  moreLabel={moreLabel}
                  control={menus}
                  onHover={movePill}
                />
              ) : null}
            </div>
          )}
        </nav>
      </div>

      <div className="relative flex min-w-[10rem] flex-1 justify-end pl-2 pr-2 md:pl-8 md:pr-5">
        <NavSearch
          entries={allEntries}
          label={label}
          searchLabel={searchLabel}
          emptyText={text(SharedResourceKeys.noRecords)}
        />
      </div>

      <div className="relative flex min-w-0 flex-none items-center">
        {menu.canSeeNotifications ? (
          <Link
            href={NOTIFICATIONS_ROUTE}
            // The unread count is part of the name; a badge alone is never read by a screen reader.
            aria-label={
              notificationCount !== null && notificationCount > 0
                ? `${notificationsLabel} (${notificationCount})`
                : notificationsLabel
            }
            title={notificationsLabel}
            className="group grid size-10 place-items-center rounded-full outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <span className="relative block size-5">
              <BellIcon className="block size-5 text-white origin-[50%_2px] group-hover:animate-bell-ring motion-reduce:group-hover:animate-none" />
              {notificationCount !== null && notificationCount > 0 ? (
                <span className="absolute -right-[9px] -top-1 flex h-[22px] min-w-[22px] animate-badge-in motion-reduce:animate-none items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-semibold text-slate-950">
                  {notificationCount}
                </span>
              ) : null}
            </span>
          </Link>
        ) : null}

        <span className="ml-3 mr-2.5 h-[30px] border-l border-white/90" />

        <AccountMenu
          triggerClassName="grid size-9 place-items-center rounded-full bg-brand-avatar text-sm font-semibold text-foreground outline-none ring-1 ring-white/80 transition-[box-shadow,transform] duration-200 hover:scale-105 hover:shadow-[0_0_0_3px_rgba(255,255,255,.35)] focus-visible:ring-2 focus-visible:ring-white data-[state=open]:shadow-[0_0_0_3px_rgba(255,255,255,.35)]"
          trigger={session?.initials ? session.initials : <User className="size-4" />}
        />
      </div>
    </header>
  )
}
