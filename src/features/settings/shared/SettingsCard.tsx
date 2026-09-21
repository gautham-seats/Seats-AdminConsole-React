import { Link2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/ui/cn'

// Same blue glass band as the Admin nav bar (src/shared/shell/NavBar.tsx header).
export const NAV_BAND =
  'bg-brand bg-[linear-gradient(180deg,rgba(255,255,255,.13)_0%,rgba(255,255,255,.04)_46%,rgba(255,255,255,0)_54%,rgba(0,0,0,.05)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.22),inset_0_-1px_0_rgba(0,0,0,.12)]'

export const NAV_ICON_BOX =
  'bg-white/15 text-white ring-1 ring-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,.2)]'

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
      <div className={cn('flex items-center gap-2.5 px-4 py-2', NAV_BAND)}>
        <span
          className={cn(
            'grid size-7 shrink-0 place-items-center rounded-md transition-transform duration-300 ease-premium group-focus-within/card:scale-105 group-hover/card:-rotate-6',
            NAV_ICON_BOX,
          )}
        >
          <Icon aria-hidden className="size-3.5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[13.5px] leading-5 font-semibold tracking-tight text-white">{title}</h2>
          {hint ? <p className="text-[11.5px] leading-4 text-white/90">{hint}</p> : null}
        </div>
        {action ? <div className="ml-auto">{action}</div> : null}
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
      <div className="min-w-0">
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
