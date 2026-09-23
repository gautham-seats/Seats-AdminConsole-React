'use client'

import Image from 'next/image'
import { ArrowUp, ArrowUpDown, Bell, ChevronDown, CircleHelp, Layers, Search } from 'lucide-react'
import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { SharedResourceKeys } from '@/shared/resources/keys'
import { useResources } from '@/shared/resources/use-resources'
import { menuResourceKeys, type TopEntry } from '@/shared/shell/admin-menu'
import { MENU_ICONS } from '@/shared/shell/menu-icons'
import seatsLogo from '@/shared/shell/seats-one-logo.png'
import { useSessionHeader, useShellMenu } from '@/shared/shell/use-shell-data'
import { cn } from '@/shared/ui/cn'
import { contrastGrade, contrastRatio, previewColor } from './settings-form'
import { SETTINGS_FALLBACK_ONLY as EN } from './settings-text'

export type PreviewBrand = {
  menuColor: string
  tableColor: string
  tableTextColor: string
  logoUrl: string
  helpUrl: string
  statementName: string
}

type BrandPreviewProps = {
  brand: PreviewBrand
  labels: { menuColor: string; menuCustomLogo: string; onlineHelpUrl: string }
}

const BRAND = '#1566a2'
const DARK = '#0b1220'
const LIGHT = '#e2e8f0'
const COLUMNS = 'grid-cols-[28px_1.4fr_1.3fr_1fr_.8fr]'
const ROW_WIDTHS = [
  [62, 78, 58, 44],
  [48, 70, 66, 38],
  [70, 62, 50, 46],
  [55, 80, 60, 34],
  [66, 58, 72, 40],
  [44, 74, 54, 48],
]
const ROWS = Array.from({ length: 12 }, (_, index) => ROW_WIDTHS[index % ROW_WIDTHS.length])
const TONES = {
  ok: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-amber-50 text-amber-800',
  bad: 'bg-red-50 text-red-700',
}
// The preview bar is drawn from the live menu, so it shows the items and icons this user really has.
const PREVIEW_NAV_ITEMS = 4

function useNavPreview(): { entry: TopEntry; label: string }[] {
  const menu = useShellMenu()
  const keys = useMemo(
    () => [...menuResourceKeys(), SharedResourceKeys.refresh, SharedResourceKeys.noRecords],
    [],
  )
  const { text } = useResources(keys)
  return useMemo(
    () =>
      menu.layout.bar.slice(0, PREVIEW_NAV_ITEMS).map(entry => {
        const value = entry.labelKey ? text(entry.labelKey) : ''
        return { entry, label: !value.trim() || value === entry.labelKey ? entry.fallback : value }
      }),
    [menu.layout.bar, text],
  )
}

export function BrandPreview({ brand, labels }: BrandPreviewProps) {
  const navItems = useNavPreview()
  const session = useSessionHeader()
  const initials = session?.initials ?? ''
  const menu = previewColor(brand.menuColor, BRAND)
  const header = previewColor(brand.tableColor, BRAND)
  const headerText = previewColor(brand.tableTextColor, '#ffffff')
  const ratio = contrastRatio(headerText, header)
  const grade = ratio === null ? null : contrastGrade(ratio)
  const helpShort = brand.helpUrl.replace(/^https?:\/\//, '') || EN.noHelpLink
  const headerStyle: CSSProperties = { backgroundColor: header, color: headerText }
  const dash = '—'
  const gradeLabel = grade && ratio !== null ? `${ratio.toFixed(1)}:1 · ${grade.label}` : ''
  const headerTag = `${EN.headerTag} ${brand.tableColor || dash}`
  const textTag = `${EN.textTag} ${brand.tableTextColor || dash}`

  return (
    <aside
      aria-label={EN.livePreview}
      className="flex h-full min-h-0 animate-rise-in flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm [animation-delay:160ms] motion-reduce:animate-none"
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2.5 px-4 py-2.5 bg-brand bg-[linear-gradient(180deg,rgba(255,255,255,.13)_0%,rgba(255,255,255,.04)_46%,rgba(255,255,255,0)_54%,rgba(0,0,0,.05)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.22),inset_0_-1px_0_rgba(0,0,0,.12)]">
        <span className="grid size-7 place-items-center rounded-md bg-white/15 text-white ring-1 ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,.2)]">
          <Layers aria-hidden className="size-4" />
        </span>
        <h2 className="text-sm font-semibold text-white">{EN.livePreview}</h2>
        <span className="ml-auto text-xs text-white/90">{EN.eachSetting}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto bg-page p-4">
        <Scene
          number={1}
          title={EN.menuBar}
          detail={`${labels.menuColor} · ${labels.menuCustomLogo}`}
          delay={0}
        >
          <div className="relative mt-7">
            <Callout className="-top-6 left-2" dot={menu}>
              {EN.logoTag}
            </Callout>
            <Callout className="-top-6 right-16 hidden sm:flex" dot={menu}>
              <span className="font-mono">{brand.menuColor || dash}</span>
            </Callout>
            <AppNav menu={menu} logoUrl={brand.logoUrl} items={navItems} initial={initials} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {[
              { ground: menu, caption: EN.onMenuColour },
              { ground: LIGHT, caption: EN.onLight },
              { ground: DARK, caption: EN.onDark },
            ].map(tile => (
              <figure key={tile.caption} className="m-0">
                <div
                  className="grid h-16 place-items-center rounded-lg border border-border transition-colors duration-500 ease-premium"
                  style={{ backgroundColor: tile.ground }}
                >
                  <Logo url={brand.logoUrl} className="max-h-8 max-w-[80%]" />
                </div>
                <figcaption className="mt-1 text-center text-[11px] text-muted-foreground">
                  {tile.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </Scene>

        <Scene
          number={2}
          title={EN.tables}
          detail={`${EN.headerTag} · ${EN.textTag}`}
          delay={80}
          grow
          badge={
            grade && ratio !== null ? (
              <span
                className={cn(
                  'ml-auto inline-flex h-[22px] shrink-0 items-center rounded-full px-2.5 text-[11.5px] font-semibold tabular-nums transition-colors',
                  TONES[grade.tone],
                )}
              >
                {gradeLabel}
              </span>
            ) : null
          }
        >
          <div className="relative mt-7 flex min-h-0 flex-1 flex-col">
            <Callout className="-top-6 left-3" dot={header}>
              {headerTag}
            </Callout>
            <Callout className="-top-6 left-48 hidden sm:flex" dot={headerText}>
              {textTag}
            </Callout>
            <div className="flex min-h-24 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-white">
              <div
                className={cn(
                  'grid shrink-0 items-center transition-colors duration-500 ease-premium',
                  COLUMNS,
                )}
                style={headerStyle}
              >
                <span />
                {EN.columns.map((column, index) => (
                  <span
                    key={column}
                    className="flex min-w-0 items-center gap-1.5 px-2.5 py-2 text-xs font-semibold break-words"
                  >
                    {column}
                    {index === 0 ? (
                      <ArrowUp aria-hidden className="size-3 opacity-80" />
                    ) : index < 3 ? (
                      <ArrowUpDown aria-hidden className="size-3 opacity-60" />
                    ) : null}
                  </span>
                ))}
              </div>
              <div aria-hidden className="min-h-0 flex-1 overflow-hidden">
                {ROWS.map((widths, row) => (
                  <div key={row} className={cn('grid items-center border-t border-border', COLUMNS)}>
                    <span className="ml-2 size-3 rounded-[3px] border-[1.5px] border-slate-300" />
                    {widths.map((width, cell) => (
                      <span key={cell} className="px-2.5 py-3">
                        <span
                          className={cn(
                            'block h-1.5 rounded-full',
                            cell === 0 ? 'bg-slate-300' : 'bg-slate-200',
                          )}
                          style={{ width: `${width}%` }}
                        />
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-2.5 grid shrink-0 grid-cols-3 gap-2">
            <Sample style={headerStyle} title={EN.sampleNormal} caption={EN.normalText} />
            <Sample style={headerStyle} title={EN.sampleLarge} caption={EN.largeText} large />
            <Sample
              style={headerStyle}
              title={grade?.label ?? dash}
              caption={grade ? EN.wcagLevel : EN.notMeasurable}
              small
            />
          </div>
        </Scene>

        <Scene
          number={3}
          title={EN.footerLinks}
          detail={`${labels.onlineHelpUrl} · ${EN.accessibility}`}
          delay={160}
        >
          <div className="relative mt-7 flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 px-3.5 py-3 text-[12.5px]">
            <Callout className="-top-6 left-1.5" dot={BRAND}>
              <span className="max-w-64 truncate">{helpShort}</span>
            </Callout>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <CircleHelp aria-hidden className="size-4" />
              {EN.helpLink}
            </span>
            {brand.statementName ? (
              <span className="min-w-0 text-brand underline underline-offset-2 break-words">
                {brand.statementName}
              </span>
            ) : null}
          </div>
        </Scene>
      </div>
    </aside>
  )
}

type SceneProps = {
  number: number
  title: string
  detail: string
  delay: number
  grow?: boolean
  badge?: ReactNode
  children: ReactNode
}

function Scene({ number, title, detail, delay, grow = false, badge = null, children }: SceneProps) {
  return (
    <section
      className={cn(
        'relative animate-rise-in rounded-xl border border-border bg-white p-3.5 shadow-sm motion-reduce:animate-none',
        grow ? 'flex min-h-[14rem] flex-1 flex-col' : 'shrink-0',
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="grid size-[22px] shrink-0 place-items-center rounded-full bg-brand text-[11px] font-extrabold text-white">
          {number}
        </span>
        <h3 className="shrink-0 text-[13px] font-semibold text-foreground">{title}</h3>
        <span className="min-w-0 text-xs break-words text-muted-foreground">{detail}</span>
        {badge}
      </header>
      {children}
    </section>
  )
}

function Callout({ className, dot, children }: { className: string; dot: string; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute z-10 flex animate-bob items-center gap-1.5 rounded-full bg-slate-900 py-[3px] pr-2 pl-1 text-[11px] font-semibold whitespace-nowrap text-white shadow-md motion-reduce:animate-none',
        "after:absolute after:-bottom-[3px] after:left-3.5 after:size-2 after:rotate-45 after:bg-slate-900 after:content-['']",
        className,
      )}
    >
      <span
        className="size-3.5 shrink-0 rounded-full shadow-[0_0_0_2px_#fff] transition-colors duration-500"
        style={{ backgroundColor: dot }}
      />
      {children}
    </span>
  )
}

function AppNav({
  menu,
  logoUrl,
  items,
  initial,
}: {
  menu: string
  logoUrl: string
  items: { entry: TopEntry; label: string }[]
  initial: string
}) {
  return (
    <div
      aria-hidden
      className="relative flex h-[46px] items-center gap-2.5 overflow-hidden rounded-lg px-3.5 text-white transition-colors duration-500 ease-premium"
      style={{ backgroundColor: menu }}
    >
      <span className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/20 to-transparent to-55%" />
      <Logo url={logoUrl} className="relative h-[26px] max-w-24" />
      <span className="relative h-[22px] w-px bg-white/35" />
      {items.map(({ entry, label }, index) => {
        const Icon = MENU_ICONS[entry.icon]
        return (
          <span
            key={entry.id}
            className={cn(
              'relative inline-flex h-[30px] items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium whitespace-nowrap',
              index === 0 && 'bg-white/15',
            )}
          >
            <Icon className="size-3.5" />
            {label}
            {entry.children.length > 1 ? <ChevronDown className="size-3 opacity-80" /> : null}
          </span>
        )
      })}
      <span className="relative ml-auto flex items-center gap-2.5">
        <span className="hidden items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] text-white/85 sm:inline-flex">
          <Search className="size-3" />
          {EN.previewSearch}
        </span>
        <Bell className="size-4" />
        <span className="grid size-[26px] place-items-center rounded-full bg-brand-avatar text-[11px] font-bold text-white shadow-[0_0_0_2px_rgba(255,255,255,.4)]">
          {initial}
        </span>
      </span>
    </div>
  )
}

function Logo({ url, className }: { url: string; className: string }) {
  return url ? (
    <Image
      key={url}
      src={url}
      alt=""
      width={120}
      height={36}
      unoptimized
      className={cn('w-auto animate-zoom-in object-contain motion-reduce:animate-none', className)}
    />
  ) : (
    <Image src={seatsLogo} alt="" className={cn('w-auto object-contain', className)} />
  )
}

type SampleProps = { style: CSSProperties; title: string; caption: string; large?: boolean; small?: boolean }

function Sample({ style, title, caption, large = false, small = false }: SampleProps) {
  return (
    <div
      className="flex h-[52px] flex-col justify-center rounded-lg px-3 transition-colors duration-500 ease-premium"
      style={style}
    >
      <b className={cn('leading-tight font-bold', large ? 'text-xl' : small ? 'text-xs' : 'text-[15px]')}>
        {title}
      </b>
      <small className="text-[10.5px] opacity-85">{caption}</small>
    </div>
  )
}
