'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowUpRight, Search, Star, X } from 'lucide-react'
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/ui/cn'
import {
  DEVICES_ROUTE,
  legacyHref,
  PermissionAction,
  PermissionItem,
  USERS_ROUTE,
  type MenuLink,
  type TopEntry,
} from './admin-menu'
import { MENU_ICONS } from './menu-icons'
import { useProfile } from './profile'
import { useApiRead } from '@/shared/api'
import { PEOPLE_DELAY_MS, PEOPLE_MIN_CHARS, searchPeople } from './nav-people'
import {
  buildSearchItems,
  completion,
  parseScope,
  pushRecent,
  rankItems,
  type Match,
  type SearchItem,
} from './nav-search'
import { guardedNavigate } from './use-leave-guard'
import { useUserStorage } from './use-user-storage'
import { useTypewriter } from './use-typewriter'

const TEXT = {
  pages: 'Pages',
  jumpTo: 'Jump to',
  inArea: 'In',
  recent: 'Recent',
  favourites: 'Favourites',
  selectedPage: 'Selected',
  openNewTab: 'Open in a new tab',
  addFavourite: 'Add to favourites',
  removeFavourite: 'Remove from favourites',
  inThisArea: 'In this area',
  pagesInArea: 'pages in this area',
  singlePage: 'Single page',
  people: 'People',
  person: 'User',
  starHint: 'Star a page to pin it here.',
  searchOneArea: 'for an area',
  forActions: 'for actions',
  clear: 'Clear',
  result: 'result',
  results: 'results',
  actions: 'Actions',
  noMatch: 'No pages match',
  tryArea: 'Try a shorter word, or search one area:',
  react: 'REACT',
  legacy: 'OLD ADMIN',
  opensIn: 'Opens in',
  address: 'Address',
  adminReact: 'Admin React',
  oldAdmin: 'Old Admin',
  action: 'Action',
  open: 'Open',
  newTabHint: 'Ctrl + Enter opens a new tab',
  removeScope: 'Remove area',
  clearSearch: 'Clear search',
  findAnything: 'Find anything',
  findHint: 'Pages, areas and actions across Admin.',
  scopeHint: '@area',
  actionHint: '> command',
  move: 'Move',
  complete: 'Complete',
  newTab: 'New tab',
  area: 'Area',
  close: 'Close',
  importFile: 'Import a file',
  recalculate: 'Re-calculate engagement',
  addUser: 'Add user',
  addDevice: 'Add device',
  shortcut: 'Ctrl K',
  crumb: '›',
  enter: '↵',
  quote: '“',
  unquote: '”',
  ellipsis: '…',
}
const KEY = { up: '↑', down: '↓', tab: 'Tab', enter: 'Enter', ctrl: 'Ctrl', esc: 'Esc', at: '@', gt: '>' }

const scopeChip = (area: string) => `${KEY.at}${area.toLowerCase()}`

const RECENT_MAX = 8
const RECENT_KEY = 'nav-search-recent'
const FAVOURITE_KEY = 'nav-search-favourites'
const CLOSE_MS = 260
const HOVER_SETTLE_MS = 500
const LISTBOX_ID = 'admin-nav-search-results'
const USERS_ACCESS = { item: PermissionItem.Users, action: PermissionAction.Access }
const USERS_ADD = { item: PermissionItem.Users, action: PermissionAction.Add }
const DEVICES_ADD = { item: PermissionItem.Devices, action: PermissionAction.Add }

const asKeys = (value: unknown) =>
  Array.isArray(value) && value.every(item => typeof item === 'string') ? (value as string[]) : null

function usePersistedKeys(key: string): [string[], (next: string[]) => void] {
  const storage = useUserStorage()
  const stored = useMemo(() => storage?.read(key, asKeys) ?? null, [storage, key])
  const [choice, setChoice] = useState<string[] | null>(null)
  // Recents picked before the user id was known are written once it arrives.
  useEffect(() => {
    if (storage && choice !== null) storage.write(key, choice)
  }, [storage, key, choice])
  const update = useCallback(
    (next: string[]) => {
      setChoice(next)
      storage?.write(key, next)
    },
    [key, storage],
  )
  return [choice ?? stored ?? [], update]
}

function Highlight({ text, indices }: { text: string; indices: number[] }) {
  if (!indices.length) return text
  const marked = new Set(indices)
  return Array.from(text, (char, i) =>
    marked.has(i) ? (
      <mark
        key={i}
        className="bg-[linear-gradient(transparent_60%,rgba(21,102,162,.2)_60%)] font-bold text-brand"
      >
        {char}
      </mark>
    ) : (
      <Fragment key={i}>{char}</Fragment>
    ),
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="mr-1 rounded-[5px] bg-page px-1.5 py-0.5 font-sans text-[11px] font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--color-border)]">
      {children}
    </kbd>
  )
}

const CAPTION_BOX = 'px-2.5 pb-1.5 pt-2.5 text-[11px] font-bold uppercase tracking-[0.08em]'

// The group's aria-label carries the caption text, so the visible caption is hidden from the listbox tree.
function Caption({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden className={cn('flex items-center text-muted-foreground', CAPTION_BOX)}>
      <span>{children}</span>
    </div>
  )
}

type Row = { item: SearchItem; indices: number[] }
type Section = { key: string; label: string; showArea: boolean; rows: { row: Row; index: number }[] }

// Consecutive rows that share an area become one labelled group.
function groupByArea(rows: readonly Row[], start: number, pagesLabel: string, keyPrefix: string) {
  const sections: Section[] = []
  rows.forEach((row, i) => {
    const label = row.item.area ?? pagesLabel
    const last = sections[sections.length - 1]
    if (last && rows[i - 1]?.item.area === row.item.area) last.rows.push({ row, index: start + i })
    else
      sections.push({
        key: `${keyPrefix}:${label}:${start + i}`,
        label,
        showArea: false,
        rows: [{ row, index: start + i }],
      })
  })
  return sections
}

const APP_BASE_PATH = '/admin-next'
const itemHref = (link: MenuLink) => link.reactRoute ?? legacyHref(link.legacyRoute)

export function NavSearch({
  entries,
  label,
  searchLabel,
  emptyText,
}: {
  entries: readonly TopEntry[]
  label: (link: Pick<MenuLink, 'labelKey' | 'fallback'>) => string
  searchLabel: string
  emptyText: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [recent, setRecent] = usePersistedKeys(RECENT_KEY)
  const { can } = useProfile()
  const router = useRouter()
  const [favourites, setFavourites] = usePersistedKeys(FAVOURITE_KEY)
  const [lingering, setLingering] = useState(false)
  const shown = open || lingering
  const optionRefs = useRef(new Map<number, HTMLDivElement>())
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const starRef = useRef<HTMLButtonElement>(null)

  const items = useMemo(() => buildSearchItems(entries, label), [entries, label])
  const areas = useMemo(() => [...new Set(items.flatMap(item => (item.area ? [item.area] : [])))], [items])
  const actions = useMemo<SearchItem[]>(() => {
    const byId = (...ids: string[]) => items.find(item => ids.includes(item.link.id))
    const make = (key: string, name: string, link: MenuLink): SearchItem => ({
      key,
      name,
      link,
      area: null,
      kind: 'action',
    })
    const users = byId('user', 'users')
    const devices = byId('device', 'devices')
    const imports = byId('imports')
    const engagement = byId('engagement-configuration', 'engagement')
    // Everyday shortcuts only, each gated like the Add button on its own page.
    return [
      ...(users && can(USERS_ADD)
        ? [make('action:add-user', TEXT.addUser, { ...users.link, reactRoute: `${USERS_ROUTE}/new` })]
        : []),
      ...(devices && can(DEVICES_ADD)
        ? [make('action:add-device', TEXT.addDevice, { ...devices.link, reactRoute: `${DEVICES_ROUTE}/new` })]
        : []),
      ...(imports ? [make('action:import', TEXT.importFile, { ...imports.link, icon: 'upload' })] : []),
      ...(engagement ? [make('action:recalc', TEXT.recalculate, { ...engagement.link, icon: 'gauge' })] : []),
    ]
  }, [items, can])
  const rollWords = useMemo(() => [TEXT.pages, ...areas.slice(0, 4)], [areas])

  // People: with Users access, a settled term of two or more characters searches the user list too.
  const usersLink = useMemo(() => items.find(item => ['user', 'users'].includes(item.link.id))?.link, [items])
  const [settledTerm, setSettledTerm] = useState('')
  const peopleTerm = !query.startsWith('>') && !scope ? query.trim() : ''
  useEffect(() => {
    if (peopleTerm === settledTerm) return
    const timer = window.setTimeout(() => setSettledTerm(peopleTerm), PEOPLE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [peopleTerm, settledTerm])
  const peopleLoad = useCallback((signal: AbortSignal) => searchPeople(settledTerm, signal), [settledTerm])
  const canSearchPeople = Boolean(usersLink) && can(USERS_ACCESS)
  const peopleRead = useApiRead(
    canSearchPeople && settledTerm.length >= PEOPLE_MIN_CHARS && settledTerm === peopleTerm
      ? `nav-people:${settledTerm}`
      : null,
    peopleLoad,
  )
  const people = useMemo<SearchItem[]>(
    () =>
      usersLink && peopleRead.status === 'success'
        ? (peopleRead.data ?? []).map(person => ({
            key: `person:${person.id}`,
            name: person.name,
            detail: person.detail,
            area: TEXT.people,
            kind: 'person',
            link: { ...usersLink, reactRoute: `${USERS_ROUTE}/${person.id}` },
          }))
        : [],
    [peopleRead.data, peopleRead.status, usersLink],
  )

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const actionMode = query.startsWith('>')
  const term = (actionMode ? query.slice(1) : query).trim().toLowerCase()
  const browsing = !term && !actionMode
  const inScope = (item: SearchItem) => !scope || item.area === scope
  const recents = browsing
    ? recent.flatMap(key => items.filter(item => item.key === key && inScope(item))).slice(0, 5)
    : []
  const favouriteItems = browsing
    ? favourites.flatMap(key => items.filter(item => item.key === key && inScope(item)))
    : []
  const matches: Match[] = browsing
    ? []
    : actionMode
      ? rankItems(actions, term, null)
      : rankItems(items, term, scope)
  // With no recent or favourite pages yet, browsing lists every page by area instead of an empty panel.
  // Browsing always ends with every page by area, below any recent and favourite pages.
  const allPages = browsing
    ? [
        ...items.filter(item => item.area && inScope(item)),
        ...items.filter(item => !item.area && inScope(item)),
      ]
    : []
  const rows = browsing
    ? [...recents, ...favouriteItems, ...allPages].map(item => ({ item, indices: [] as number[] }))
    : [
        ...matches.map(match => ({ item: match.item, indices: match.indices })),
        ...(actionMode ? [] : people.map(item => ({ item, indices: [] as number[] }))),
      ]
  const current = Math.max(0, Math.min(active, rows.length - 1))
  const selected = rows[current]?.item
  const selectedStarred = selected ? favourites.includes(selected.key) : false
  // The side panel follows the keyboard at once but waits for the mouse to rest on a row.
  const [contextKey, setContextKey] = useState<string | null>(null)
  const hoverTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(hoverTimer.current), [])
  const focusRow = (index: number, fromMouse: boolean) => {
    setActive(index)
    window.clearTimeout(hoverTimer.current)
    const key = rows[index]?.item.key ?? null
    if (fromMouse) hoverTimer.current = window.setTimeout(() => setContextKey(key), HOVER_SETTLE_MS)
    else setContextKey(key)
  }
  const contextItem = rows.find(row => row.item.key === contextKey)?.item ?? selected
  const ghost = completion(query, selected)
  const noMatchText = `${TEXT.noMatch} ${TEXT.quote}${query}${TEXT.unquote}`
  const rollText = useTypewriter(rollWords, open || Boolean(query))

  // Stays mounted briefly after closing so the panel can ease out.
  useEffect(() => {
    if (open || !lingering) return
    const timer = window.setTimeout(() => setLingering(false), CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [open, lingering])

  const rowSignature = rows.map(row => row.item.key).join('|')
  useLayoutEffect(() => {
    const node = optionRefs.current.get(current)
    const bar = indicatorRef.current
    if (bar) {
      bar.style.opacity = node ? '1' : '0'
      if (node) {
        bar.style.transform = `translateY(${node.offsetTop}px)`
        bar.style.height = `${node.offsetHeight}px`
      }
    }
    const star = starRef.current
    if (star && node)
      star.style.transform = `translateY(${node.offsetTop + (node.offsetHeight - star.offsetHeight) / 2}px)`
    node?.scrollIntoView?.({ block: 'nearest' })
  }, [current, rowSignature, shown])

  const toggleFavourite = (item: SearchItem) =>
    setFavourites(
      favourites.includes(item.key) ? favourites.filter(key => key !== item.key) : [...favourites, item.key],
    )

  const close = () => inputRef.current?.blur()
  const remember = (item: SearchItem) => {
    if (item.kind === 'page') setRecent(pushRecent(recent, item.key, RECENT_MAX))
  }
  const reset = () => {
    setQuery('')
    setScope(null)
    setActive(0)
  }
  const openItem = (item: SearchItem | undefined, newTab = false) => {
    if (!item) return
    remember(item)
    // Options hold no links (listbox children stay non-interactive), so React routes go through the router.
    const route = item.link.reactRoute
    if (newTab) window.open(route ? `${APP_BASE_PATH}${route}` : itemHref(item.link), '_blank', 'noopener')
    else if (route) void guardedNavigate(() => router.push(route))
    else void guardedNavigate(() => window.location.assign(legacyHref(item.link.legacyRoute)))
    reset()
    close()
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    const parsed = parseScope(value, areas)
    if (parsed) setScope(parsed.scope)
    setQuery(parsed ? parsed.rest : value)
    setActive(0)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusRow(Math.min(current + 1, rows.length - 1), false)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusRow(Math.max(current - 1, 0), false)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      openItem(selected, event.ctrlKey || event.metaKey)
    } else if (event.key === 'Tab' && ghost) {
      event.preventDefault()
      setQuery(query + ghost)
    } else if (event.key === 'Backspace' && !query && scope) {
      setScope(null)
    } else if (event.key === 'Escape') {
      close()
    }
  }

  const linkFor = (item: SearchItem, className: string, children: ReactNode, title?: string) => {
    const props = {
      title,
      className,
      tabIndex: -1,
      onClick: () => {
        remember(item)
        reset()
        close()
      },
    }
    return item.link.reactRoute ? (
      <Link href={item.link.reactRoute} {...props}>
        {children}
      </Link>
    ) : (
      <a href={legacyHref(item.link.legacyRoute)} {...props}>
        {children}
      </a>
    )
  }

  const renderRow = ({ row, index }: { row: Row; index: number }, showArea: boolean) => {
    const { item } = row
    const Icon = MENU_ICONS[item.link.icon]
    const isActive = index === current
    const starred = favourites.includes(item.key)
    return (
      <div
        key={`${index}:${item.key}`}
        ref={node => {
          if (node) optionRefs.current.set(index, node)
          else optionRefs.current.delete(index)
        }}
        id={`${LISTBOX_ID}-${index}`}
        role="option"
        aria-selected={isActive}
        onMouseEnter={() => focusRow(index, true)}
        onClick={event => openItem(item, event.ctrlKey || event.metaKey)}
        onAuxClick={event => {
          if (event.button === 1) openItem(item, true)
        }}
        style={{ animationDelay: `${80 + Math.min(index, 10) * 30}ms` }}
        className="group/row relative z-10 flex min-h-11 animate-item-in cursor-pointer items-center gap-2 rounded-[10px] py-1 pl-2.5 pr-1.5 text-sm text-foreground [animation-fill-mode:both] motion-reduce:animate-none"
      >
        <span className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-lg border transition-[background-color,border-color,color,transform] duration-300 ease-premium',
              isActive
                ? 'scale-105 border-brand bg-brand text-white'
                : 'border-border bg-page text-slate-600',
            )}
          >
            <Icon aria-hidden className="size-[15px]" />
          </span>
          <span className="min-w-0 break-words font-medium">
            <Highlight text={item.name} indices={row.indices} />
          </span>
          {item.kind === 'person' && item.detail ? (
            <span className="min-w-0 truncate text-xs text-muted-foreground">{item.detail}</span>
          ) : showArea && item.area ? (
            <span className="whitespace-nowrap text-xs text-muted-foreground">{item.area}</span>
          ) : null}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-0.5">
          {item.kind === 'page' ? (
            <span aria-hidden className="grid size-7 place-items-center text-amber-600">
              {starred && !isActive ? <Star className="size-3.5 fill-current" /> : null}
            </span>
          ) : null}
          <span
            aria-hidden
            className={cn(
              'grid size-6 place-items-center rounded-md bg-brand/10 text-[13px] font-semibold text-brand transition-[opacity,transform] duration-300 ease-premium',
              isActive ? 'translate-x-0 opacity-100' : '-translate-x-1 opacity-0',
            )}
          >
            {TEXT.enter}
          </span>
        </span>
      </div>
    )
  }

  const sections: Section[] = (() => {
    if (browsing) {
      const list: Section[] = []
      let index = 0
      const take = (group: readonly SearchItem[]) =>
        group.map(item => ({ row: { item, indices: [] }, index: index++ }))
      if (recents.length)
        list.push({
          key: 'recent',
          label: scope ? `${TEXT.recent} ${TEXT.inArea.toLowerCase()} ${scope}` : TEXT.recent,
          showArea: true,
          rows: take(recents),
        })
      if (favouriteItems.length)
        list.push({ key: 'favourites', label: TEXT.favourites, showArea: true, rows: take(favouriteItems) })
      const pages = allPages.map(item => ({ item, indices: [] }))
      return [...list, ...groupByArea(pages, index, TEXT.pages, 'all')]
    }
    if (actionMode)
      return rows.length
        ? [
            {
              key: 'actions',
              label: TEXT.actions,
              showArea: false,
              rows: rows.map((row, index) => ({ row, index })),
            },
          ]
        : []
    return groupByArea(rows, 0, TEXT.pages, 'match')
  })()

  const renderResults = () =>
    sections.map(section => (
      <div key={section.key} role="group" aria-label={section.label}>
        <Caption>{section.label}</Caption>
        {section.rows.map(entry => renderRow(entry, section.showArea))}
      </div>
    ))

  const renderEmpty = () => (
    <div className="px-4 py-10 text-center text-sm text-muted-foreground">
      <b className="mb-1 block text-[15px] text-foreground">{noMatchText}</b>
      {areas.length ? TEXT.tryArea : emptyText}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {areas.map(area => (
          <button
            key={area}
            type="button"
            tabIndex={-1}
            onClick={() => {
              setScope(area)
              setQuery('')
            }}
            className="rounded-full border border-border px-2.5 py-0.5 text-xs outline-none transition-colors hover:border-brand hover:text-brand focus-visible:ring-2 focus-visible:ring-ring"
          >
            {scopeChip(area)}
          </button>
        ))}
      </div>
    </div>
  )

  const sideLink =
    'flex min-h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-[background-color,color,transform] duration-200 ease-premium hover:translate-x-0.5 hover:bg-slate-900/[0.05]'
  const sideCaption = 'px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground'

  const renderContext = () => {
    const selected = contextItem
    const owner = selected?.area ? entries.find(entry => label(entry) === selected.area) : undefined
    const siblings = selected?.area ? items.filter(item => item.area === selected.area) : []
    const AreaIcon = MENU_ICONS[owner?.icon ?? selected?.link.icon ?? 'users']
    const subtitle =
      selected?.kind === 'action'
        ? TEXT.action
        : selected?.kind === 'person'
          ? (selected.detail ?? TEXT.person)
          : siblings.length > 1
            ? `${siblings.length} ${TEXT.pagesInArea}`
            : TEXT.singlePage
    const pinned = favourites.flatMap(key => items.filter(item => item.key === key))
    const siblingAt = siblings.findIndex(item => item.key === selected?.key)
    const starred = selected ? favourites.includes(selected.key) : false
    const stagger = (i: number) => ({ animationDelay: `${120 + i * 45}ms` })
    const quickButton =
      'group/qa flex min-h-8 w-full items-center gap-2.5 rounded-md px-2 text-left text-[13px] text-slate-600 transition-[background-color,color,transform] duration-200 ease-premium hover:translate-x-0.5 hover:bg-slate-900/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[.98] motion-reduce:transform-none'
    return (
      <>
        {selected ? (
          <div
            key={`head:${selected.area ?? selected.key}`}
            className="flex animate-item-in items-center gap-3 motion-reduce:animate-none"
          >
            <span className="grid size-10 shrink-0 animate-[badge-in_520ms_cubic-bezier(.3,1.6,.5,1)_both] place-items-center rounded-xl bg-brand text-white shadow-[0_10px_20px_-10px_rgba(21,102,162,.7)] motion-reduce:animate-none">
              <AreaIcon aria-hidden className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p
                title={selected.area ?? selected.name}
                className="truncate text-sm font-semibold text-foreground"
              >
                {selected.kind === 'person' ? selected.name : (selected.area ?? selected.name)}
              </p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
        ) : null}

        {selected ? (
          <div className="grid gap-0.5">
            <p className={sideCaption}>{TEXT.selectedPage}</p>
            <button type="button" tabIndex={-1} onClick={() => openItem(selected)} className={quickButton}>
              <ArrowRight
                aria-hidden
                className="size-3.5 shrink-0 transition-transform duration-300 ease-premium group-hover/qa:translate-x-0.5"
              />
              <span title={`${TEXT.open} ${selected.name}`} className="min-w-0 flex-1 truncate">
                {TEXT.open} {selected.name}
              </span>
              <Kbd>{KEY.enter}</Kbd>
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => openItem(selected, true)}
              className={quickButton}
            >
              <ArrowUpRight
                aria-hidden
                className="size-3.5 shrink-0 transition-transform duration-300 ease-premium group-hover/qa:-translate-y-0.5 group-hover/qa:translate-x-0.5"
              />
              <span title={TEXT.openNewTab} className="min-w-0 flex-1 truncate">
                {TEXT.openNewTab}
              </span>
              <Kbd>{KEY.ctrl}</Kbd>
            </button>
            {selected.kind === 'page' ? (
              <button
                type="button"
                tabIndex={-1}
                aria-pressed={starred}
                onClick={() => toggleFavourite(selected)}
                className={quickButton}
              >
                <Star
                  aria-hidden
                  className={cn(
                    'size-3.5 shrink-0 transition-[transform,color] duration-300 ease-[cubic-bezier(.3,1.7,.5,1)] group-hover/qa:rotate-[18deg] group-hover/qa:scale-110',
                    starred && 'fill-amber-500 text-amber-600',
                  )}
                />
                <span
                  title={starred ? TEXT.removeFavourite : TEXT.addFavourite}
                  className="min-w-0 flex-1 truncate"
                >
                  {starred ? TEXT.removeFavourite : TEXT.addFavourite}
                </span>
              </button>
            ) : null}
          </div>
        ) : null}

        {siblings.length > 1 ? (
          <div key={`area:${selected?.area}`} className="grid gap-0.5">
            <p className={sideCaption}>{TEXT.inThisArea}</p>
            <div className="relative grid gap-0.5">
              <span
                aria-hidden
                className={cn(
                  'pointer-events-none absolute inset-x-0 top-0 h-8 rounded-md bg-brand/[0.07] transition-[transform,opacity] duration-300 ease-premium motion-reduce:transition-none',
                  siblingAt < 0 && 'opacity-0',
                )}
                style={{ transform: `translateY(${Math.max(siblingAt, 0) * 34}px)` }}
              />
              {siblings.map((item, i) => {
                const Icon = MENU_ICONS[item.link.icon]
                return (
                  <span
                    key={item.key}
                    style={stagger(i)}
                    className="relative animate-item-in motion-reduce:animate-none"
                  >
                    {linkFor(
                      item,
                      cn(
                        sideLink,
                        item.key === selected?.key
                          ? 'font-semibold text-brand'
                          : 'text-slate-600 hover:text-foreground',
                      ),
                      <>
                        <Icon aria-hidden className="size-3.5 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </>,
                      item.name,
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="grid gap-0.5">
          <p className={sideCaption}>{TEXT.favourites}</p>
          {pinned.length ? (
            pinned.map((item, i) => (
              <span key={item.key} style={stagger(i)} className="animate-item-in motion-reduce:animate-none">
                {linkFor(
                  item,
                  cn(sideLink, 'text-slate-600 hover:text-foreground'),
                  <>
                    <Star aria-hidden className="size-3.5 shrink-0 fill-amber-500 text-amber-600" />
                    <span className="truncate">{item.name}</span>
                  </>,
                  item.name,
                )}
              </span>
            ))
          ) : (
            <p className="px-2 text-xs text-muted-foreground">{TEXT.starHint}</p>
          )}
        </div>

        {actions.length ? (
          <div className="mt-auto grid gap-0.5 border-t border-border pt-3">
            <p className={sideCaption}>{TEXT.actions}</p>
            {actions.map((action, i) => {
              const Icon = MENU_ICONS[action.link.icon]
              return (
                <button
                  key={action.key}
                  type="button"
                  tabIndex={-1}
                  style={stagger(i)}
                  onClick={() => openItem(action)}
                  className={cn(quickButton, 'animate-item-in motion-reduce:animate-none')}
                >
                  <Icon
                    aria-hidden
                    className="size-3.5 shrink-0 transition-transform duration-300 ease-premium group-hover/qa:scale-110"
                  />
                  <span title={action.name} className="min-w-0 flex-1 truncate">
                    {action.name}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
      </>
    )
  }

  return (
    <div className="relative flex w-full min-w-0 justify-end">
      <label
        className={cn(
          // Full width up to a cap, so a narrow window shrinks the pill instead of pushing it over the menu.
          'group relative flex h-9 w-full min-w-0 cursor-text items-center rounded-full text-white transition-[max-width,transform,box-shadow] duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none',
          open
            ? 'max-w-[400px] shadow-[0_8px_30px_rgba(120,200,255,.35)]'
            : 'max-w-[232px] hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(0,0,0,.2)] motion-reduce:hover:translate-y-0',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute -inset-[2px] overflow-hidden rounded-full transition-opacity duration-300',
            open ? 'opacity-100' : 'opacity-0',
          )}
        >
          <span className="absolute left-1/2 top-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 animate-spin bg-[conic-gradient(var(--color-search-ring-1),var(--color-search-ring-sheen),var(--color-search-ring-2),var(--color-search-ring-3),var(--color-search-ring-1))] [animation-duration:4s] motion-reduce:animate-none" />
        </span>
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 rounded-full transition-[background-color,box-shadow] duration-300',
            open
              ? 'bg-brand'
              : // Lighter than the bar, not darker. white/10 keeps white text at 5.76:1; hover brightens the
                // rim only, because lifting the fill any further drops the text under 4.5:1.
                'bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,.18),inset_0_-1px_0_rgba(0,0,0,.10)] group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,.26),0_0_0_1px_rgba(255,255,255,.34)]',
          )}
        />
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 overflow-hidden rounded-full transition-opacity duration-500',
            open ? 'opacity-0' : 'opacity-100',
          )}
        >
          {/* Aurora inside the pill. Three blobs at 5% each: even fully overlapped the text holds 4.70:1. */}
          <span className="absolute -inset-y-6 -left-1/4 w-[150%] animate-search-aurora bg-[radial-gradient(90px_34px_at_18%_50%,rgba(127,211,255,.05),transparent_72%),radial-gradient(110px_38px_at_58%_42%,rgba(154,184,255,.05),transparent_72%),radial-gradient(80px_30px_at_88%_58%,rgba(111,240,210,.05),transparent_72%)] blur-[5px] motion-reduce:animate-none" />
        </span>
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
          <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_30%,rgba(255,255,255,.32)_50%,transparent_70%)] transition-transform duration-700 ease-out group-hover:translate-x-full motion-reduce:hidden" />
        </span>

        <span className="relative flex h-full min-w-0 flex-1 items-center gap-2 pl-[13px] pr-1.5">
          <Search
            aria-hidden
            className="size-[15px] shrink-0 transition-transform duration-[400ms] ease-[cubic-bezier(.3,1.7,.5,1)] group-hover:-rotate-[14deg] group-hover:scale-[1.22]"
          />
          {scope ? (
            <span className="inline-flex shrink-0 animate-badge-in items-center gap-1 rounded-full bg-white py-0.5 pl-2.5 pr-1 text-xs font-semibold text-brand motion-reduce:animate-none">
              {scope}
              <button
                type="button"
                aria-label={TEXT.removeScope}
                onMouseDown={event => event.preventDefault()}
                onClick={() => setScope(null)}
                className="grid size-4 place-items-center rounded-full bg-brand/10 outline-none hover:bg-brand/20 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden className="size-2.5" />
              </button>
            </span>
          ) : null}
          <span className="relative h-full min-w-0 flex-1">
            {!query ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 flex items-center gap-1 overflow-hidden whitespace-nowrap text-sm font-medium text-white/85"
              >
                {searchLabel}
                <span>{rollText}</span>
              </span>
            ) : null}
            {ghost ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre text-sm font-medium"
              >
                <span className="text-transparent">{query}</span>
                <span className="text-white/80">{ghost}</span>
              </span>
            ) : null}
            <input
              ref={inputRef}
              type="text"
              value={query}
              aria-label={searchLabel}
              role="combobox"
              aria-expanded={open}
              aria-controls={LISTBOX_ID}
              aria-activedescendant={open && rows.length ? `${LISTBOX_ID}-${current}` : undefined}
              autoComplete="off"
              spellCheck={false}
              className="absolute inset-0 bg-transparent text-sm font-medium text-white caret-white outline-none"
              onChange={onChange}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                setOpen(false)
                setLingering(true)
              }}
              onKeyDown={onKeyDown}
            />
          </span>
          {query || scope ? (
            <button
              type="button"
              aria-label={TEXT.clearSearch}
              onMouseDown={event => event.preventDefault()}
              onClick={reset}
              className="grid size-6 shrink-0 animate-badge-in place-items-center rounded-full bg-white/20 outline-none transition-[transform,background-color] duration-200 hover:rotate-90 hover:bg-white/30 focus-visible:ring-2 focus-visible:ring-white motion-reduce:animate-none"
            >
              <X aria-hidden className="size-3" />
            </button>
          ) : (
            <kbd className="shrink-0 whitespace-nowrap rounded-full bg-black/15 px-2 py-[5px] font-sans text-[11px] font-semibold leading-none text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.24)] transition-colors group-hover:bg-black/25">
              {TEXT.shortcut}
            </kbd>
          )}
        </span>
      </label>

      {shown ? (
        <div
          onMouseDown={event => event.preventDefault()}
          className={cn(
            // Below sm the panel pins to the viewport edges so it never starts off-screen.
            'absolute right-0 top-[calc(100%+10px)] z-50 grid w-[min(760px,calc(100vw-1.5rem))] origin-top-right max-sm:fixed max-sm:inset-x-3 max-sm:top-auto max-sm:mt-[46px] max-sm:w-auto grid-cols-[1fr] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-[0_40px_80px_-28px_rgba(8,25,45,.5),0_6px_16px_rgba(8,25,45,.08)] sm:grid-cols-[1fr_260px] motion-reduce:animate-none',
            open ? 'animate-search-in' : 'pointer-events-none animate-search-out',
          )}
        >
          <div className="relative min-h-0 sm:min-h-[420px]">
            <div className="relative max-h-[min(470px,55vh)] overflow-y-auto overscroll-contain p-2 sm:absolute sm:inset-0 sm:max-h-none">
              <span
                ref={indicatorRef}
                aria-hidden
                className="pointer-events-none absolute inset-x-2 top-0 z-0 h-11 rounded-[10px] bg-brand/[0.08] opacity-0 shadow-[inset_0_0_0_1px_rgba(21,102,162,.12)] transition-[transform,height,opacity] duration-300 ease-premium motion-reduce:transition-none"
              />
              {/* listbox owns only groups and options; captions, buttons and the empty state sit beside it */}
              <div id={LISTBOX_ID} role="listbox" aria-label={searchLabel}>
                {renderResults()}
              </div>
              {browsing && recents.length ? (
                <div
                  className={cn(
                    'pointer-events-none absolute inset-x-2 top-2 z-20 flex justify-end',
                    CAPTION_BOX,
                  )}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setRecent([])}
                    className="pointer-events-auto rounded px-1.5 font-medium normal-case tracking-normal text-muted-foreground outline-none transition-colors hover:bg-slate-900/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {TEXT.clear}
                  </button>
                </div>
              ) : null}
              {selected?.kind === 'page' ? (
                <button
                  ref={starRef}
                  type="button"
                  tabIndex={-1}
                  aria-label={selectedStarred ? TEXT.removeFavourite : TEXT.addFavourite}
                  aria-pressed={selectedStarred}
                  onClick={() => toggleFavourite(selected)}
                  className={cn(
                    'absolute right-10 top-0 z-20 grid size-7 place-items-center rounded-md outline-none transition-[transform,background-color,color] duration-300 ease-premium hover:bg-slate-900/[0.06] focus-visible:ring-2 focus-visible:ring-ring active:scale-90 motion-reduce:transition-none',
                    selectedStarred ? 'text-amber-600' : 'text-muted-foreground',
                  )}
                >
                  <Star aria-hidden className={cn('size-3.5', selectedStarred && 'fill-current')} />
                </button>
              ) : null}
              {!browsing && !rows.length ? renderEmpty() : null}
            </div>
          </div>
          <aside className="hidden flex-col gap-4 border-l border-border bg-[linear-gradient(180deg,rgba(21,102,162,.05),transparent_40%)] p-4 sm:flex">
            {renderContext()}
          </aside>
          <div className="col-span-full flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3.5 py-2 text-xs text-muted-foreground">
            <span>
              <Kbd>{KEY.up}</Kbd>
              <Kbd>{KEY.down}</Kbd>
              {TEXT.move}
            </span>
            <span>
              <Kbd>{KEY.enter}</Kbd>
              {TEXT.open}
            </span>
            <span>
              <Kbd>{KEY.ctrl}</Kbd>
              <Kbd>{KEY.enter}</Kbd>
              {TEXT.newTab}
            </span>
            <span className="ml-auto">
              <Kbd>{KEY.at}</Kbd>
              {TEXT.searchOneArea}
              <span className="mx-2 text-border">{TEXT.crumb}</span>
              <Kbd>{KEY.gt}</Kbd>
              {TEXT.forActions}
            </span>
          </div>
        </div>
      ) : null}

      {shown && typeof document !== 'undefined'
        ? createPortal(
            <div
              aria-hidden
              onMouseDown={close}
              className={cn(
                'fixed inset-x-0 bottom-0 top-[50px] z-30 bg-slate-950/25 backdrop-blur-[2px] transition-opacity duration-500 ease-premium motion-reduce:transition-none',
                open ? 'animate-[fade-in_500ms_ease-out] opacity-100' : 'pointer-events-none opacity-0',
              )}
            />,
            document.body,
          )
        : null}
    </div>
  )
}
