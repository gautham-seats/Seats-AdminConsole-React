'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { useCallback } from 'react'
import { useApiRead } from '@/shared/api'
import { DEVICES_ROUTE } from '@/shared/shell/admin-menu'
import { DelayedLoading, ErrorState } from '@/shared/ui'
import { EmptyState } from '@/shared/ui/EmptyState'
import { cn } from '@/shared/ui/cn'
import { HEAD_CELL } from '@/shared/ui/HeadBackdrop'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/Table'
import { StatusBadge } from '@/shared/ui/StatusBadge'
import { batteryLevel, type BatteryLevel } from '../index/device-query'
import { DEVICES_FALLBACK_ONLY, type DevicesText } from '../index/devices-text'
import { fetchRoomDevices, type RoomDevices } from './room-devices-api'

const LEVEL_COLOR: Record<BatteryLevel, string> = {
  good: 'var(--color-battery-good)',
  medium: 'var(--color-battery-medium)',
  low: 'var(--color-battery-low)',
}

const HEAD = HEAD_CELL

type RoomDevicesRead = ReturnType<typeof useRoomDevices>

// The room's devices come from the devices grid call, so the room page adds no new endpoint.
export function useRoomDevices(roomId: number | null) {
  const load = useCallback((signal: AbortSignal) => fetchRoomDevices(roomId ?? 0, signal), [roomId])
  return useApiRead(roomId === null || roomId === 0 ? null : `room-devices:${roomId}`, load)
}

function Battery({ percent }: { percent: number | null }) {
  if (percent === null) return <span className="text-muted-foreground">{DEVICES_FALLBACK_ONLY.noValue}</span>
  const width = Math.min(Math.max(percent, 0), 100)
  const label = `${width}%`
  return (
    <span className="flex items-center gap-2 tabular-nums">
      <span
        aria-hidden
        className="relative h-[15px] w-[30px] rounded-[3px] border-[1.5px] border-battery-shell bg-battery-track after:absolute after:top-1/2 after:-right-[3.5px] after:h-1.5 after:w-[2.5px] after:-translate-y-1/2 after:rounded-r-[2px] after:bg-battery-shell after:content-['']"
      >
        <span
          className="absolute top-0.5 bottom-0.5 left-0.5 rounded-[1.5px]"
          style={{
            width: `calc((100% - 4px) * ${width} / 100)`,
            background: LEVEL_COLOR[batteryLevel(width)],
          }}
        />
      </span>
      {label}
    </span>
  )
}

type PanelProps = { read: RoomDevicesRead; batteryEnabled: boolean; t: DevicesText }

export function RoomDevicesPanel({ read, batteryEnabled, t }: PanelProps) {
  if (read.status === 'error') {
    return (
      <div className="grid flex-1 place-items-center">
        <ErrorState
          variant="page"
          message={t('AlertGeneralErrorDefault')}
          retryLabel={t('Refresh')}
          onRetry={read.reload}
          error={read.error}
        />
      </div>
    )
  }
  if (!read.data) {
    return (
      <div className="grid flex-1 place-items-center">
        <DelayedLoading active variant="page" label={t('Loading')} />
      </div>
    )
  }
  return <DeviceRows data={read.data} batteryEnabled={batteryEnabled} t={t} />
}

function DeviceRows({
  data,
  batteryEnabled,
  t,
}: {
  data: RoomDevices
  batteryEnabled: boolean
  t: DevicesText
}) {
  if (data.items.length === 0) {
    return (
      <div className="grid flex-1 place-items-center">
        <EmptyState title={DEVICES_FALLBACK_ONLY.noItems} />
      </div>
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <p className="text-xs text-muted-foreground">{DEVICES_FALLBACK_ONLY.roomDevicesHint}</p>
      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead scope="col" className={cn(HEAD, 'pl-4')}>
                {t('SerialNumber')}
              </TableHead>
              <TableHead scope="col" className={HEAD}>
                {t('Description')}
              </TableHead>
              {batteryEnabled ? (
                <TableHead scope="col" className={HEAD}>
                  {t('BatteryPercent')}
                </TableHead>
              ) : null}
              <TableHead scope="col" className={HEAD}>
                {t('LastReadDate')}
              </TableHead>
              <TableHead scope="col" className={HEAD}>
                {t('IsActive')}
              </TableHead>
              <TableHead scope="col" className={cn(HEAD, 'w-12 pr-4')}>
                <span className="sr-only">{DEVICES_FALLBACK_ONLY.details}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map(device => (
              <TableRow key={device.id}>
                <TableCell className="pl-4 font-mono text-[12.5px]">
                  {device.serialNumber || DEVICES_FALLBACK_ONLY.noValue}
                </TableCell>
                <TableCell>{device.description || DEVICES_FALLBACK_ONLY.noValue}</TableCell>
                {batteryEnabled ? (
                  <TableCell>
                    <Battery percent={device.batteryPercent} />
                  </TableCell>
                ) : null}
                <TableCell className="font-mono text-[12.5px] whitespace-nowrap">
                  {device.displayLastReadDate || DEVICES_FALLBACK_ONLY.noValue}
                </TableCell>
                <TableCell>
                  <StatusBadge tone={device.isActive ? 'success' : 'warning'}>
                    {device.isActive ? t('Yes') : t('No')}
                  </StatusBadge>
                </TableCell>
                <TableCell className="pr-4">
                  <Link
                    href={`${DEVICES_ROUTE}/${device.id}`}
                    aria-label={`${DEVICES_FALLBACK_ONLY.details} ${device.serialNumber ?? ''}`.trim()}
                    className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-page hover:text-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <ExternalLink aria-hidden className="size-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>
    </div>
  )
}
