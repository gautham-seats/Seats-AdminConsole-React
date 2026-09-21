'use client'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { forwardRef, type AnchorHTMLAttributes, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/shared/ui/cn'
import { legacyHref, type MenuLink } from './admin-menu'
import { MENU_ICONS } from './menu-icons'

// SEAtS Unified: the student apps' panel (website-2026 globals.css:2278-2310) with Scheduler inset rows.
export const CARD_PANEL =
  'z-50 min-w-[236px] rounded-lg border border-line-soft bg-white p-1 text-ink-muted shadow-[0_8px_24px_rgba(0,0,0,.12),0_1px_2px_rgba(0,0,0,.04)] origin-[var(--radix-dropdown-menu-content-transform-origin)] animate-menu-in [animation-duration:420ms] [animation-timing-function:cubic-bezier(.16,1,.3,1)] data-[state=closed]:animate-menu-out data-[state=closed]:[animation-duration:220ms] motion-reduce:animate-none'

export const ITEM =
  'group/item relative flex items-center gap-2.5 rounded-[5px] py-2 pl-3 pr-7 text-sm text-ink-muted outline-none animate-rise-in [animation-duration:400ms] [animation-fill-mode:both] transition-[background-color,color,padding] duration-[400ms] ease-[cubic-bezier(.16,1,.3,1)] hover:bg-neutral-100 hover:pl-[15px] hover:text-slate-800 data-[highlighted]:bg-neutral-100 data-[highlighted]:pl-[15px] data-[highlighted]:text-slate-800 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:animate-none motion-reduce:transition-none'

const CURRENT =
  'bg-brand/10 font-semibold text-brand hover:bg-brand/10 hover:text-brand data-[highlighted]:bg-brand/10 data-[highlighted]:text-brand after:absolute after:right-2.5 after:size-1.5 after:rounded-full after:bg-brand after:content-[""]'

export const ICON =
  'size-4 shrink-0 text-ink-faint transition-[color,transform] duration-[450ms] ease-[cubic-bezier(.3,1.6,.5,1)] group-hover/item:scale-[1.12] group-hover/item:text-[var(--icon-hue)] group-data-[highlighted]/item:scale-[1.12] group-data-[highlighted]/item:text-[var(--icon-hue)]'

// Each row lights its icon in its own colour on hover, in menu order.
export const ICON_HUES = [
  'var(--color-nav-hue-1)',
  'var(--color-nav-hue-2)',
  'var(--color-nav-hue-3)',
  'var(--color-nav-hue-4)',
  'var(--color-nav-hue-5)',
  'var(--color-nav-hue-6)',
  'var(--color-nav-hue-7)',
  'var(--color-nav-hue-8)',
]

type ItemAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & { link: MenuLink }

const ItemAnchor = forwardRef<HTMLAnchorElement, ItemAnchorProps>(({ link, ...props }, ref) =>
  link.reactRoute ? (
    <Link ref={ref} href={link.reactRoute} {...props} />
  ) : (
    <a ref={ref} href={legacyHref(link.legacyRoute)} {...props} />
  ),
)
ItemAnchor.displayName = 'ItemAnchor'

const under = (pathname: string, route?: string) =>
  !!route && (pathname === route || pathname.startsWith(`${route}/`))

// Only the deepest matching sibling is current, so /users/access-profiles does not also light up Users.
export const isCurrent = (pathname: string, route?: string, siblings: readonly MenuLink[] = []) =>
  under(pathname, route) &&
  !siblings.some(
    sibling =>
      sibling.reactRoute !== route &&
      under(pathname, sibling.reactRoute) &&
      (sibling.reactRoute?.length ?? 0) > (route?.length ?? 0),
  )

export function MenuCard({
  link,
  label,
  index,
  siblings,
}: {
  link: MenuLink
  label: string
  index: number
  siblings?: readonly MenuLink[]
}) {
  const pathname = usePathname() ?? ''
  const Icon = MENU_ICONS[link.icon]
  const here = isCurrent(pathname, link.reactRoute, siblings)
  return (
    <DropdownMenu.Item asChild>
      <ItemAnchor
        link={link}
        aria-current={here ? 'page' : undefined}
        style={{ animationDelay: `${70 + index * 45}ms` }}
        className={cn(ITEM, here && CURRENT)}
      >
        <Icon
          aria-hidden
          className={cn(ICON, here && 'text-brand')}
          style={{ '--icon-hue': ICON_HUES[index % ICON_HUES.length] } as CSSProperties}
        />
        {label}
      </ItemAnchor>
    </DropdownMenu.Item>
  )
}

// A named group keeps the menu to menuitem structure while holding the column layout.
export function MenuCardGrid({ title, children }: { title: string; children: ReactNode }) {
  return (
    <DropdownMenu.Group aria-label={title} className="flex flex-col gap-px">
      {children}
    </DropdownMenu.Group>
  )
}
