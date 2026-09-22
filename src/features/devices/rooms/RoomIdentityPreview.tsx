'use client'

import { Building2, Hash } from 'lucide-react'
import { cn } from '@/shared/ui/cn'
import { DEVICES_FALLBACK_ONLY, type DevicesText } from '../index/devices-text'
import type { RoomForm } from './room-form'

const NO_CAPACITY = '—'

type RoomIdentityPreviewProps = {
  form: RoomForm
  buildingName: string | null
  t: DevicesText
}

// Capacity is a free-text field, so only a clean whole number is worth drawing.
const toCapacity = (raw: string): number | null => {
  const value = raw.trim()
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export function RoomIdentityPreview({ form, buildingName, t }: RoomIdentityPreviewProps) {
  const capacity = toCapacity(form.capacity)
  const name = form.name.trim()
  const code = form.externalCode.trim()

  return (
    <aside
      aria-label={DEVICES_FALLBACK_ONLY.roomPreview}
      className="rounded-lg border border-border bg-white p-5 text-center shadow-sm lg:sticky lg:top-4"
    >
      <span
        className={cn(
          'inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs',
          'transition-colors duration-300 ease-premium motion-reduce:transition-none',
          code
            ? 'border-border bg-secondary text-secondary-foreground'
            : 'border-dashed border-border text-muted-foreground',
        )}
      >
        <Hash aria-hidden className="size-3 shrink-0" />
        <span className="truncate">{code || DEVICES_FALLBACK_ONLY.noRoomCode}</span>
      </span>

      <p
        className={cn(
          'mt-3 text-lg leading-snug font-semibold break-words',
          name ? 'text-foreground' : 'text-muted-foreground italic',
        )}
      >
        {name || DEVICES_FALLBACK_ONLY.untitledRoom}
      </p>

      <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Building2 aria-hidden className="size-3.5 shrink-0" />
        <span className="truncate">{buildingName ?? DEVICES_FALLBACK_ONLY.noBuilding}</span>
      </p>

      <div className="mt-4 flex items-baseline justify-center gap-1.5 border-t border-border pt-4">
        <span className="text-3xl leading-none font-semibold tabular-nums text-brand">
          {capacity === null ? NO_CAPACITY : capacity.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">{DEVICES_FALLBACK_ONLY.seats}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t('RoomCapacity')}</p>
    </aside>
  )
}
