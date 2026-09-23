'use client'

import { DoorOpen, Radio, Router, Tag } from 'lucide-react'
import { DetailHero, HeroChip, HeroFact, HeroPane } from '../DetailHero'
import { DEVICES_FALLBACK_ONLY, type DevicesText } from '../index/devices-text'

type DeviceHeroProps = {
  serialNumber: string
  description: string
  assetTag: string
  macAddress: string
  ipAddress: string
  isBeacon: boolean
  isActive: boolean
  roomCount: number
  isNew: boolean
  t: DevicesText
}

// The same band as the Room page. It carries every identity field the record holds, so nothing is
// repeated in a second strip under it; the form below is where those fields are edited.
export function DeviceHero({
  serialNumber,
  description,
  assetTag,
  macAddress,
  ipAddress,
  isBeacon,
  isActive,
  roomCount,
  isNew,
  t,
}: DeviceHeroProps) {
  const dash = DEVICES_FALLBACK_ONLY.noValue
  // The description names the device to a person; the serial number is a fact about it, not its title.
  const name = description || serialNumber || (isNew ? DEVICES_FALLBACK_ONLY.newDevice : dash)
  return (
    <DetailHero
      icon={<Router />}
      name={name}
      subtitle={
        <>
          <HeroFact label={t('SerialNumber')} value={serialNumber || dash} mono />
          <HeroFact label={t('AssetTag')} value={assetTag || dash} mono />
          <HeroFact label={t('MacAddress')} value={macAddress || dash} mono />
          <HeroFact label={t('IPAddress')} value={ipAddress || dash} mono />
        </>
      }
      chips={
        <>
          {/* Only the states worth flagging; an active, non-beacon device shows nothing. */}
          {!isActive ? (
            <HeroChip icon={<Router />} warn>
              {DEVICES_FALLBACK_ONLY.outOfService}
            </HeroChip>
          ) : null}
          {isBeacon ? <HeroChip icon={<Radio />}>{t('IsBeacon')}</HeroChip> : null}
        </>
      }
      panes={
        <>
          <HeroPane
            icon={<Tag />}
            value={isActive ? t('InService') : DEVICES_FALLBACK_ONLY.outOfService}
            label={t('IsActive')}
            sub={isBeacon ? t('IsBeacon') : undefined}
          />
          <HeroPane icon={<DoorOpen />} value={String(roomCount)} label={DEVICES_FALLBACK_ONLY.rooms} />
        </>
      }
    />
  )
}
