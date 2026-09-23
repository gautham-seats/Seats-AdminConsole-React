import { Link2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/ui/cn'

import { NAV_BAND, NAV_ICON_BOX, NavBandGlow } from '@/shared/ui/nav-band'

export { NAV_BAND, NAV_ICON_BOX, NavBandGlow }

type SettingsCardProps = {
  icon: LucideIcon
  title: string
  hint?: string
  delay?: number
  action?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}

export function SettingsCard({
  icon: Icon,
  title,
  hint,
  delay = 0,
  action = null,
  className,
  bodyClassName,
  children,
}: SettingsCardProps) {
  return (
    <section
      className={cn(
        'group/card animate-rise-in overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-[box-shadow,border-color] duration-300 focus-within:border-brand/30 focus-within:shadow-[0_10px_30px_-18px_rgba(21,102,162,.55)] motion-reduce:animate-none',
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Trimmed so a card header sits below the page title rather than competing with it. */}
      <div className={cn('flex items-center gap-2.5 rounded-t-xl px-4 py-2.5', NAV_BAND)}>
        <NavBandGlow />
        <span
          className={cn(
            'grid size-7 shrink-0 place-items-center transition-transform duration-300 ease-premium group-focus-within/card:scale-105 group-hover/card:-rotate-6',
            NAV_ICON_BOX,
          )}
        >
          <Icon aria-hidden className="size-[13px]" />
        </span>
        <div className="flex min-w-0 flex-col justify-center">
          <h2 className="text-[14.5px] leading-[19px] font-bold tracking-[-.005em] text-white">{title}</h2>
          {hint ? <p className="text-[11.5px] leading-[15px] font-medium text-white/85">{hint}</p> : null}
        </div>
        {action ? <div className="ml-auto flex items-center">{action}</div> : null}
      </div>
      <div className={cn('flex flex-col divide-y divide-border/70', bodyClassName)}>{children}</div>
    </section>
  )
}

type SettingsFieldProps = {
  htmlFor: string
  labelId?: string
  label: string
  hint?: string
  error?: string | null
  note?: ReactNode
  link?: boolean
  className?: string
  children: ReactNode
}

export function SettingsField({
  htmlFor,
  labelId,
  label,
  hint,
  error = null,
  note = null,
  link = false,
  className,
  children,
}: SettingsFieldProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 px-5 py-4 transition-colors duration-200 focus-within:bg-brand/[0.02]',
        className,
      )}
    >
      <div>
        {/* A custom group names itself with aria-labelledby, so its label has an id instead of htmlFor. */}
        <label
          id={labelId}
          htmlFor={labelId ? undefined : htmlFor}
          className="flex items-center gap-1.5 text-[13.5px] leading-5 font-semibold text-slate-800"
        >
          {link ? <Link2 aria-hidden className="size-3.5 shrink-0 text-brand/70" /> : null}
          {label}
        </label>
        {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        {children}
        {note}
        {error ? (
          <p id={`${htmlFor}-error`} className="mt-1.5 animate-fade-in text-xs font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
