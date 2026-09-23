'use client'

import { BatteryLow, CalendarClock, DoorOpen, Router, TriangleAlert, Users } from 'lucide-react'
import { DetailHero, HeroChip, HeroDot, HeroPane } from '../DetailHero'
import { batteryLevel } from '../index/device-query'
import { DEVICES_FALLBACK_ONLY, type DevicesText } from '../index/devices-text'
import { isStale, timeAgo, type RoomDevices } from './room-devices-api'

type RoomHeroProps = {
  name: string
  buildingName: string | null
  code: string
  capacity: string
  devices: RoomDevices | null
  batteryEnabled: boolean
  // The screen owns "now" so every relative label on the page agrees.
  now: number
  t: DevicesText
}

// The gauge tokens, lightened against the blue band so each still reads at 3:1.
const BATTERY_TINT: Record<ReturnType<typeof batteryLevel>, string> = {
  good: 'text-[color-mix(in_srgb,var(--color-battery-good)_70%,white)]',
  medium: 'text-[color-mix(in_srgb,var(--color-battery-medium)_75%,white)]',
  low: 'text-[color-mix(in_srgb,var(--color-battery-low)_75%,white)]',
}

// The room's identity and everything its devices can tell us, above the tabs.
export function RoomHero({
  name,
  buildingName,
  code,
  capacity,
  devices,
  batteryEnabled,
  now,
  t,
}: RoomHeroProps) {
  const dash = DEVICES_FALLBACK_ONLY.noValue
  const total = devices?.total ?? null
  const inactive = devices ? devices.total - devices.activeCount : 0
  const battery = devices?.lowestBattery ?? null
  const stale = isStale(devices?.lastReadingAt ?? null, now)
  const inactiveText = `${inactive} ${DEVICES_FALLBACK_ONLY.inactiveLower}`
  const batteryText = `${DEVICES_FALLBACK_ONLY.lowBattery}: ${battery}%`

  const deviceSub =
    total === null
      ? undefined
      : inactive > 0
        ? `${devices?.activeCount ?? 0} ${DEVICES_FALLBACK_ONLY.activeLower}`
        : total > 0
          ? DEVICES_FALLBACK_ONLY.allActive
          : undefined

  const readingValue =
    devices?.lastReadingAt != null ? timeAgo(devices.lastReadingAt, now) : (devices?.lastReading ?? dash)

  return (
    <DetailHero
      icon={<DoorOpen />}
      name={name || DEVICES_FALLBACK_ONLY.newRoom}
      subtitle={
        <>
          <span className="truncate">{buildingName ?? dash}</span>
          {code ? (
            <>
              <HeroDot />
              <span className="font-mono text-xs">{code}</span>
            </>
          ) : null}
        </>
      }
      chips={
        <>
          {/* Only what the devices actually say, and only when it is worth saying. */}
          {stale ? (
            <HeroChip icon={<TriangleAlert />} warn>
              {DEVICES_FALLBACK_ONLY.staleReading}
            </HeroChip>
          ) : null}
          {inactive > 0 ? (
            <HeroChip icon={<Router />} warn>
              {inactiveText}
            </HeroChip>
          ) : null}
          {batteryEnabled && battery !== null && batteryLevel(battery) !== 'good' ? (
            <HeroChip icon={<BatteryLow />} warn>
              {batteryText}
            </HeroChip>
          ) : null}
        </>
      }
      panes={
        <>
          <HeroPane icon={<Users />} value={capacity || dash} label={t('RoomCapacity')} />
          <HeroPane
            icon={<Router />}
            value={total === null ? dash : String(total)}
            label={t('Devices')}
            sub={deviceSub}
          />
          {batteryEnabled ? (
            <HeroPane
              icon={<BatteryLow />}
              value={battery === null ? dash : `${battery}%`}
              label={DEVICES_FALLBACK_ONLY.lowestBattery}
              tone={battery === null ? undefined : BATTERY_TINT[batteryLevel(battery)]}
            />
          ) : null}
          <HeroPane
            icon={<CalendarClock />}
            value={readingValue}
            label={t('LastReadDate')}
            sub={devices?.lastReading ?? undefined}
          />
        </>
      }
    />
  )
}
